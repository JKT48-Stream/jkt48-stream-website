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

function isCurrentlyLiveFromHtml(html: string): boolean {
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

  const htmlLower = html.toLowerCase();
  return activeLiveIndicators.some(ind => htmlLower.includes(ind.toLowerCase()));
}

/**
 * Fetch the full IDN live list ONCE from JKT48Connect API.
 * Returns a map of username (lowercase) -> live entry data.
 */
async function fetchAllIdnLiveList(): Promise<Map<string, any>> {
  const result = new Map<string, any>();
  try {
    const res = await fetch(
      `${JKT48CONNECT_BASE_URL}/live/idn?api_key=${JKT48CONNECT_API_KEY}`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    );
    if (!res.ok) return result;

    const data = await res.json();
    const list: any[] = Array.isArray(data) ? data
      : Array.isArray(data?.data) ? data.data
      : Array.isArray(data?.lives) ? data.lives
      : Array.isArray(data?.live) ? data.live : [];

    for (const entry of list) {
      const candidates = [
        entry?.user?.username, entry?.username, entry?.idn_username,
        entry?.member?.idn_username, entry?.member?.username,
        entry?.streamer?.username, entry?.account_id,
      ].filter(Boolean).map((v: string) => v.toLowerCase());

      for (const uname of candidates) {
        result.set(uname, entry);
      }
    }
  } catch (e) {
    console.error('[JKT48Connect] Error fetching IDN live list:', e);
  }
  return result;
}

function extractDataFromLiveEntry(entry: any): { slug: string | null; stream_url: string | null } {
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

  return { slug, stream_url };
}

async function scrapeProfileForLiveData(username: string): Promise<{
  isLive: boolean; slug: string | null; stream_url: string | null;
}> {
  try {
    const profileUrl = `https://www.idn.app/${username}`;
    const profileRes = await fetch(profileUrl, { headers: FETCH_HEADERS });
    const profileHtml = await profileRes.text();

    if (isCurrentlyLiveFromHtml(profileHtml)) {
      return {
        isLive: true,
        slug: extractSlugFromHtml(profileHtml, username),
        stream_url: extractStreamUrlFromHtml(profileHtml),
      };
    }
  } catch (e) {
    console.error(`[Profile scrape] Error for ${username}:`, e);
  }
  return { isLive: false, slug: null, stream_url: null };
}

interface IdnCheckResult {
  username: string;
  is_live: boolean;
  live_url: string | null;
  stream_url: string | null;
  checked_at: string;
}

async function checkSingleUsername(
  username: string,
  liveListMap: Map<string, any>
): Promise<IdnCheckResult> {
  const checkedAt = new Date().toISOString();
  const entry = liveListMap.get(username.toLowerCase());

  if (entry) {
    const { slug, stream_url } = extractDataFromLiveEntry(entry);
    const liveUrl = slug
      ? `https://www.idn.app/${username}/live/${slug}`
      : `https://www.idn.app/${username}`;
    return { username, is_live: true, live_url: liveUrl, stream_url, checked_at: checkedAt };
  }

  // Fallback: HTML scrape (only if API list is empty/failed)
  if (liveListMap.size === 0) {
    const scraped = await scrapeProfileForLiveData(username);
    if (scraped.isLive) {
      const liveUrl = scraped.slug
        ? `https://www.idn.app/${username}/live/${scraped.slug}`
        : `https://www.idn.app/${username}`;
      return { username, is_live: true, live_url: liveUrl, stream_url: scraped.stream_url, checked_at: checkedAt };
    }
  }

  return { username, is_live: false, live_url: null, stream_url: null, checked_at: checkedAt };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let usernames: string[] = [];
    try {
      const body = await req.json();
      if (Array.isArray(body?.usernames)) {
        usernames = body.usernames.filter((u: any) => typeof u === 'string' && u.trim());
      } else if (typeof body?.username === 'string') {
        // Backward compat: single username
        usernames = [body.username];
      }
    } catch { /* use empty */ }

    if (usernames.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No usernames provided', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // ─── STEP 1: Fetch the FULL IDN live list ONCE ──────────────────────────
    // One API call covers ALL members at once — massive speed improvement.
    const liveListMap = await fetchAllIdnLiveList();
    console.log(`[IDN Bulk] Live list fetched: ${liveListMap.size} entries, checking ${usernames.length} usernames`);

    // ─── STEP 2: Check all usernames in parallel against the cached list ────
    const results = await Promise.all(
      usernames.map(username => checkSingleUsername(username, liveListMap))
    );

    return new Response(
      JSON.stringify({ results, checked_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to check IDN live status',
        results: [],
        checked_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});