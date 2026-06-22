import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOWROOM_API = 'https://www.showroom-live.com/api';
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://www.showroom-live.com/',
};

interface ShowroomCheckResult {
  room_url_key: string;
  is_live: boolean;
  room_id: number | null;
  room_name: string | null;
  started_at: number | null;
  image: string | null;
  stream_url: string | null;
  stream_url_low: string | null;
  checked_at: string;
}

async function checkSingleRoom(roomUrlKey: string): Promise<ShowroomCheckResult> {
  const checkedAt = new Date().toISOString();
  const base: ShowroomCheckResult = {
    room_url_key: roomUrlKey,
    is_live: false,
    room_id: null,
    room_name: null,
    started_at: null,
    image: null,
    stream_url: null,
    stream_url_low: null,
    checked_at: checkedAt,
  };

  try {
    const statusRes = await fetch(
      `${SHOWROOM_API}/room/status?room_url_key=${encodeURIComponent(roomUrlKey)}`,
      { headers: FETCH_HEADERS }
    );
    if (!statusRes.ok) return base;

    const statusData = await statusRes.json();
    const isLive = statusData?.is_live === true || statusData?.live_status === 2;
    const roomId: number | null = statusData?.room_id ?? null;

    if (!isLive) {
      return {
        ...base,
        is_live: false,
        room_id: roomId,
        room_name: statusData?.room_name ?? null,
        image: statusData?.image_s ?? null,
      };
    }

    // Fetch streaming URL only if live
    let streamUrl: string | null = null;
    let streamUrlLow: string | null = null;

    if (roomId) {
      try {
        const streamRes = await fetch(
          `${SHOWROOM_API}/live/streaming_url?room_id=${roomId}`,
          { headers: FETCH_HEADERS }
        );
        const streamData = await streamRes.json();
        const urlList: any[] = streamData?.streaming_url_list ?? [];
        const hlsStreams = urlList
          .filter((s: any) => s?.type === 'hls' && s?.url)
          .sort((a: any, b: any) => (b?.quality ?? 0) - (a?.quality ?? 0));

        if (hlsStreams.length > 0) {
          streamUrl = hlsStreams[0].url;
          streamUrlLow = hlsStreams[hlsStreams.length - 1].url;
        }

        if (!streamUrl) {
          const allStreams = urlList.filter((s: any) => s?.url);
          if (allStreams.length > 0) streamUrl = allStreams[0].url;
        }
      } catch (e) {
        console.error(`[Showroom] Failed to fetch stream URL for ${roomUrlKey}:`, e);
      }
    }

    return {
      room_url_key: roomUrlKey,
      is_live: true,
      room_id: roomId,
      room_name: statusData?.room_name ?? null,
      started_at: statusData?.started_at ?? null,
      image: statusData?.image_s ?? null,
      stream_url: streamUrl,
      stream_url_low: streamUrlLow,
      checked_at: checkedAt,
    };
  } catch (e) {
    console.error(`[Showroom] Error checking ${roomUrlKey}:`, e);
    return base;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let roomUrlKeys: string[] = [];
    try {
      const body = await req.json();
      if (Array.isArray(body?.room_url_keys)) {
        roomUrlKeys = body.room_url_keys.filter((k: any) => typeof k === 'string' && k.trim());
      } else if (typeof body?.room_url_key === 'string') {
        // Backward compat: single room key
        roomUrlKeys = [body.room_url_key];
      }
    } catch { /* use empty */ }

    if (roomUrlKeys.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No room_url_keys provided', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[Showroom Bulk] Checking ${roomUrlKeys.length} rooms in parallel`);

    // ─── Check ALL rooms concurrently ────────────────────────────────────────
    // Showroom has no unified "all live" endpoint, so we fire all status
    // requests in parallel — much faster than sequential one-by-one.
    // For rooms that ARE live, we additionally fetch their stream URL (also in parallel).
    const results = await Promise.all(
      roomUrlKeys.map(key => checkSingleRoom(key))
    );

    const liveCount = results.filter(r => r.is_live).length;
    console.log(`[Showroom Bulk] Done: ${liveCount}/${roomUrlKeys.length} live`);

    return new Response(
      JSON.stringify({ results, checked_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-showroom-live-bulk:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to check Showroom live status',
        results: [],
        checked_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});