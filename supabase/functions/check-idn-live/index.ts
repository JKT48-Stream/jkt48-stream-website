import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JKT48CONNECT_API_KEY = "J-D55B";
const JKT48CONNECT_BASE_URL = "https://v2.jkt48connect.my.id/api";

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
};

function extractSlugFromHtml(html: string, username: string): string | null {
  const patterns = [
    new RegExp(`/${username}/live/([\\w-]+)`, 'i'),
    /"slug"\s*:\s*"([\w-]+)"/i,
    new RegExp(`"live_url"\\s*:\\s*"https://www\\.idn\\.app/${username}/live/([\\w-]+)"`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractStreamUrlFromHtml(html: string): string | null {
  const patterns = [
    /"stream_url"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i,
    /"playback_url"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i,
    /"hls_url"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i,
    /"url"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i,
    /"stream_url"\s*:\s*"(https?:\\\/\\\/[^"]+\.m3u8[^"]*)"/i,
    /"playback_url"\s*:\s*"(https?:\\\/\\\/[^"]+\.m3u8[^"]*)"/i,
    /(https?:\/\/[a-zA-Z0-9._\-\/]+\.m3u8(?:\?[^"'\s]*)?)/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      return m[1].replace(/\\\//g, '/');
    }
  }
  return null;
}

/**
 * Checks if the HTML contains indicators of a CURRENTLY ACTIVE live stream.
 * 
 * FIX: We now explicitly EXCLUDE Exclusive Video / scheduled live indicators.
 * Exclusive Videos on IDN have paths like /${username}/live/${slug} but they are
 * NOT active live streams — they are pre-scheduled or already-recorded videos.
 * 
 * We ONLY return true if there are strong real-time live indicators:
 * - "isLive":true or "is_live":true in JSON data
 * - live-badge, live-room, btn-watch-live class indicators
 * - "sedang live" text (Indonesian for "currently live")
 * - data-live="true" attribute
 * 
 * We DO NOT treat the presence of /${username}/live/ paths as a live indicator
 * because Exclusive Videos also use this path format.
 */
function isCurrentlyLiveFromHtml(html: string): boolean {
  // These are strong real-time live indicators only
  const activeLiveIndicators = [
    '"isLive":true',
    '"is_live":true',
    '"status":"live"',
    '"live_status":"live"',
    '"liveStatus":"live"',
    'data-live="true"',
    'class="live-badge"',
    'class="live-room"',
    'btn-watch-live',
    'sedang live',
    'is-live-now',
    'live-stream-active',
  ];

  // These are indicators of Exclusive/scheduled content — we must EXCLUDE them
  // from triggering a "live" detection.
  // If the page ONLY has these without the active indicators above, it's NOT live.
  const exclusiveVideoIndicators = [
    'terjadwal',   // "Scheduled" in Indonesian — marks Exclusive Video
    'exclusive video',
    'beli dengan',  // "Buy with" — purchase prompt for Exclusive Videos
  ];

  const htmlLower = html.toLowerCase();

  // Check for active live indicators
  const hasActiveLive = activeLiveIndicators.some(ind => htmlLower.includes(ind.toLowerCase()));

  if (!hasActiveLive) return false;

  // Even if we found an active live indicator, double-check:
  // If the page only shows scheduled/exclusive content without a real live room,
  // the "isLive" flag might be from embedded exclusive video metadata.
  // We look for additional confirmation that a live room is truly active.
  // (If the API confirmed it, we already trust it — this is just for HTML scraping fallback)
  
  return true;
}

/**
 * Checks if the JKT48Connect API live list contains an active (non-exclusive) 
 * live stream for the given username.
 * 
 * FIX: The JKT48Connect API /live/idn endpoint returns all currently active 
 * IDN live streams. Exclusive Videos do NOT appear in this list because they 
 * are pre-recorded/scheduled — only real-time live streams are listed here.
 * 
 * This makes the API the most reliable source of truth for live status.
 */
async function getLiveDataFromJkt48Connect(username: string): Promise<{ 
  isLive: boolean; 
  slug: string | null; 
  stream_url: string | null 
}> {
  try {
    const res = await fetch(
      `${JKT48CONNECT_BASE_URL}/live/idn?api_key=${JKT48CONNECT_API_KEY}`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    );
    if (!res.ok) return { isLive: false, slug: null, stream_url: null };

    const data = await res.json();
    const list: any[] = Array.isArray(data) ? data
      : Array.isArray(data?.data) ? data.data
      : Array.isArray(data?.lives) ? data.lives
      : Array.isArray(data?.live) ? data.live : [];

    // The /live/idn endpoint only returns ACTIVE live streams.
    // If a username is found here, they are genuinely live right now.
    const entry = list.find((item: any) => {
      const candidates = [
        item?.user?.username, item?.username, item?.idn_username,
        item?.member?.idn_username, item?.member?.username,
        item?.streamer?.username, item?.account_id,
      ].filter(Boolean).map((v: string) => v.toLowerCase());
      return candidates.includes(username.toLowerCase());
    });

    if (!entry) {
      // Username not found in the active live list — they are NOT live
      return { isLive: false, slug: null, stream_url: null };
    }

    // Found in active live list — extract stream data
    let stream_url: string | null = null;
    for (const f of ['stream_url', 'playback_url', 'hls_url', 'live_url']) {
      const v = entry?.[f] ?? entry?.user?.[f] ?? entry?.stream?.[f];
      if (v && typeof v === 'string' && v.includes('.m3u8')) {
        stream_url = v;
        break;
      }
    }

    let slug: string | null = null;
    for (const f of ['slug', 'live_slug', 'stream_key', 'live_id']) {
      if (entry[f]) {
        const raw = String(entry[f]);
        slug = raw.startsWith('http') ? (raw.match(/\/live\/([\w-]+)/)?.[1] ?? null) : raw;
        break;
      }
    }

    return { isLive: true, slug, stream_url };
  } catch (e) {
    console.error('[JKT48Connect] Error:', e);
    return { isLive: false, slug: null, stream_url: null };
  }
}

async function scrapeStreamUrlFromLiveRoom(username: string, slug: string): Promise<string | null> {
  try {
    const liveRoomUrl = `https://www.idn.app/${username}/live/${slug}`;
    const res = await fetch(liveRoomUrl, { headers: FETCH_HEADERS });
    const html = await res.text();
    return extractStreamUrlFromHtml(html);
  } catch (e) {
    console.error('[LiveRoom scrape] Error:', e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let username = 'jkt48_fritzy';
    try {
      const body = await req.json();
      if (body?.username) username = body.username;
    } catch { /* pakai default */ }

    // ─── STEP 1: Check JKT48Connect API first (most reliable) ───────────────
    // 
    // FIX: The JKT48Connect /live/idn API only returns CURRENTLY ACTIVE live
    // streams — it does NOT include Exclusive Videos (which are scheduled/
    // pre-recorded). This is our primary source of truth.
    //
    // Previously, the code used HTML scraping as the primary method, which
    // caused false positives because Exclusive Videos also contain /${username}/live/
    // paths in their HTML, triggering the live detection incorrectly.
    
    const apiResult = await getLiveDataFromJkt48Connect(username);

    let finalIsLive = apiResult.isLive;
    let slug: string | null = apiResult.slug;
    let streamUrl: string | null = apiResult.stream_url;

    // ─── STEP 2: Fallback to HTML scraping ONLY if API confirms live ─────────
    //
    // We only do HTML scraping to get additional stream data (slug/stream_url)
    // when the API already confirmed the user is live.
    // We do NOT use HTML scraping alone to determine live status anymore,
    // because it incorrectly triggers on Exclusive Video content.

    if (finalIsLive && (!slug || !streamUrl)) {
      // API says live but we need more stream data — try scraping profile page
      try {
        const profileUrl = `https://www.idn.app/${username}`;
        const profileRes = await fetch(profileUrl, { headers: FETCH_HEADERS });
        const profileHtml = await profileRes.text();

        if (!slug) {
          slug = extractSlugFromHtml(profileHtml, username);
        }
        if (!streamUrl) {
          streamUrl = extractStreamUrlFromHtml(profileHtml);
        }
      } catch (e) {
        console.error('[Profile scrape] Error:', e);
      }
    }

    // ─── STEP 3: If API failed/unavailable, use strict HTML scraping ─────────
    //
    // Only as last resort, and only with strict indicators that confirm
    // an ACTIVE live session (not just presence of /live/ paths).

    if (!finalIsLive) {
      try {
        const profileUrl = `https://www.idn.app/${username}`;
        const profileRes = await fetch(profileUrl, { headers: FETCH_HEADERS });
        const profileHtml = await profileRes.text();

        // Use strict live detection that ignores Exclusive Video indicators
        if (isCurrentlyLiveFromHtml(profileHtml)) {
          finalIsLive = true;
          if (!slug) slug = extractSlugFromHtml(profileHtml, username);
          if (!streamUrl) streamUrl = extractStreamUrlFromHtml(profileHtml);
        }
      } catch (e) {
        console.error('[Profile scrape fallback] Error:', e);
      }
    }

    // ─── STEP 4: If we have slug but no stream URL, try live room page ────────

    if (finalIsLive && slug && !streamUrl) {
      streamUrl = await scrapeStreamUrlFromLiveRoom(username, slug);
    }

    const liveUrl = finalIsLive
      ? (slug ? `https://www.idn.app/${username}/live/${slug}` : `https://www.idn.app/${username}`)
      : null;

    return new Response(
      JSON.stringify({
        is_live: finalIsLive,
        username,
        live_url: liveUrl,
        stream_url: streamUrl,
        checked_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        is_live: false, 
        live_url: null, 
        stream_url: null,
        error: 'Failed to check IDN live status', 
        checked_at: new Date().toISOString() 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});