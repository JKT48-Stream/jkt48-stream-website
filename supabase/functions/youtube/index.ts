// JKT48 Tube YouTube proxy
// Endpoints (querystring):
//   ?action=channel&handle=...&order=date|viewCount|oldest&pageToken=...
//   ?action=channelInfo&handle=...
//   ?action=videos&ids=id1,id2,...
//   ?action=search&q=...&pageToken=...
//   ?action=suggest&q=...
//   ?action=related&videoId=...
//   ?action=playlists&handle=...&pageToken=...
//   ?action=playlistItems&playlistId=...&pageToken=...
//   ?action=playlistInfo&playlistId=...
//   ?action=liveReplays&handle=...

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const YT = "https://www.googleapis.com/youtube/v3";

const HANDLES: Record<string, string> = {
  JKT48: "JKT48",
  JKT48TV: "JKT48TV",
  "48DailyLive": "48DailyLive",
  IDNApp: "idnapp",
};

// Cache in memory (per isolate)
const channelIdCache: Record<string, string> = {};
const uploadsPlaylistCache: Record<string, string> = {};
const channelInfoCache: Record<string, { data: any; exp: number }> = {};
const responseCache: Record<string, { data: any; exp: number }> = {};

const now = () => Date.now();
const CHANNEL_INFO_TTL = 6 * 60 * 60 * 1000;
const LIST_TTL = 10 * 60 * 1000;
const RELATED_TTL = 30 * 60 * 1000;
const VIDEOS_TTL = 60 * 60 * 1000;
const SUGGEST_TTL = 60 * 60 * 1000;
const PLAYLIST_TTL = 15 * 60 * 1000;
const PLAYLIST_ITEMS_TTL = 10 * 60 * 1000;
const REPLAYS_TTL = 15 * 60 * 1000;

async function ytFetch(path: string, key: string) {
  const sep = path.includes("?") ? "&" : "?";
  const r = await fetch(`${YT}${path}${sep}key=${key}`);
  if (!r.ok) {
    const text = await r.text();
    const err: any = new Error(`YouTube API ${r.status}: ${text}`);
    err.status = r.status;
    err.body = text;
    throw err;
  }
  return r.json();
}

function cacheGet(key: string) {
  const hit = responseCache[key];
  if (hit && hit.exp > now()) return hit.data;
  if (hit) delete responseCache[key];
  return null;
}
function cacheSet(key: string, data: any, ttl: number) {
  responseCache[key] = { data, exp: now() + ttl };
}

async function getChannelMeta(handle: string, key: string) {
  const cached = channelInfoCache[handle];
  if (cached && cached.exp > now()) return cached.data;
  const j = await ytFetch(
    `/channels?part=id,snippet,brandingSettings,statistics,contentDetails&forHandle=${encodeURIComponent("@" + handle)}`,
    key,
  );
  const item = j?.items?.[0];
  if (!item) throw new Error(`Channel not found: ${handle}`);
  channelIdCache[handle] = item.id;
  uploadsPlaylistCache[handle] =
    item.contentDetails?.relatedPlaylists?.uploads ?? "";
  const meta = {
    id: item.id,
    title: item.snippet?.title,
    description: item.snippet?.description,
    customUrl: item.snippet?.customUrl,
    thumbnails: item.snippet?.thumbnails,
    banner: item.brandingSettings?.image?.bannerExternalUrl ?? null,
    subscriberCount: item.statistics?.subscriberCount,
    videoCount: item.statistics?.videoCount,
    viewCount: item.statistics?.viewCount,
    uploadsPlaylistId: uploadsPlaylistCache[handle],
  };
  channelInfoCache[handle] = { data: meta, exp: now() + CHANNEL_INFO_TTL };
  return meta;
}

async function hydrateVideos(ids: string[], key: string) {
  if (!ids.length) return [];
  const data = await ytFetch(
    `/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=${ids.join(",")}&maxResults=50`,
    key,
  );
  return data.items ?? [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const key = Deno.env.get("YOUTUBE_API_KEY");
  if (!key) {
    return new Response(
      JSON.stringify({ error: "YOUTUBE_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "channel";
    const cacheKey = url.search;

    const cached = cacheGet(cacheKey);
    if (cached) return json(cached);

    if (action === "channelInfo") {
      const handle = url.searchParams.get("handle") ?? "JKT48";
      if (!HANDLES[handle]) return json({ error: "invalid handle" }, 400);
      const meta = await getChannelMeta(HANDLES[handle], key);
      cacheSet(cacheKey, meta, CHANNEL_INFO_TTL);
      return json(meta);
    }

    if (action === "channel") {
      const handle = url.searchParams.get("handle") ?? "JKT48";
      const order = url.searchParams.get("order") ?? "date";
      const pageToken = url.searchParams.get("pageToken") ?? "";
      if (!HANDLES[handle]) return json({ error: "invalid handle" }, 400);

      const meta = await getChannelMeta(HANDLES[handle], key);
      const uploads = meta.uploadsPlaylistId;

      if (order === "viewCount") {
        const searchData = await ytFetch(
          `/search?part=snippet&channelId=${meta.id}&type=video&order=viewCount&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ""}`,
          key,
        );
        const ids = (searchData.items ?? [])
          .map((i: any) => i.id?.videoId)
          .filter(Boolean);
        const videos = await hydrateVideos(ids, key);
        const payload = {
          videos,
          nextPageToken: searchData.nextPageToken ?? null,
          channelId: meta.id,
        };
        cacheSet(cacheKey, payload, LIST_TTL);
        return json(payload);
      }

      if (!uploads) throw new Error("uploads playlist not found");
      const pl = await ytFetch(
        `/playlistItems?part=snippet,contentDetails&playlistId=${uploads}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ""}`,
        key,
      );
      const ids = (pl.items ?? [])
        .map((i: any) => i.contentDetails?.videoId)
        .filter(Boolean);
      const videos = await hydrateVideos(ids, key);
      const payload = {
        videos,
        nextPageToken: pl.nextPageToken ?? null,
        channelId: meta.id,
      };
      cacheSet(cacheKey, payload, LIST_TTL);
      return json(payload);
    }

    if (action === "videos") {
      const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean);
      const videos = await hydrateVideos(ids, key);
      const payload = { videos };
      cacheSet(cacheKey, payload, VIDEOS_TTL);
      return json(payload);
    }

    if (action === "search") {
      const q = url.searchParams.get("q") ?? "";
      const pageToken = url.searchParams.get("pageToken") ?? "";
      const finalQ = /jkt48/i.test(q) ? q : `${q} JKT48`;
      const data = await ytFetch(
        `/search?part=snippet&type=video&q=${encodeURIComponent(finalQ)}&maxResults=24${pageToken ? `&pageToken=${pageToken}` : ""}`,
        key,
      );
      const ids = (data.items ?? [])
        .map((i: any) => i.id?.videoId)
        .filter(Boolean);
      const videos = await hydrateVideos(ids, key);
      const payload = { videos, nextPageToken: data.nextPageToken ?? null };
      cacheSet(cacheKey, payload, LIST_TTL);
      return json(payload);
    }

    if (action === "suggest") {
      const q = url.searchParams.get("q") ?? "";
      const r = await fetch(
        `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q + " JKT48")}`,
      );
      const text = await r.text();
      const m = text.match(/\[(.*)\]/s);
      let suggestions: string[] = [];
      if (m) {
        try {
          const parsed = JSON.parse("[" + m[1] + "]");
          suggestions = (parsed[1] ?? []).map((x: any) =>
            Array.isArray(x) ? x[0] : x,
          );
        } catch {
          suggestions = [];
        }
      }
      const payload = { suggestions };
      cacheSet(cacheKey, payload, SUGGEST_TTL);
      return json(payload);
    }

    if (action === "related") {
      const videoId = url.searchParams.get("videoId") ?? "";
      const handles = Object.keys(HANDLES);
      const metas = await Promise.all(
        handles.map((h) => getChannelMeta(h, key).catch(() => null)),
      );
      const playlistIds = metas
        .map((m) => m?.uploadsPlaylistId)
        .filter(Boolean) as string[];
      const lists = await Promise.all(
        playlistIds.map((pid) =>
          ytFetch(
            `/playlistItems?part=contentDetails&playlistId=${pid}&maxResults=10`,
            key,
          ).catch(() => ({ items: [] })),
        ),
      );
      const ids: string[] = [];
      lists.forEach((l: any) => {
        (l.items ?? []).forEach((i: any) => {
          const id = i.contentDetails?.videoId;
          if (id && id !== videoId && !ids.includes(id)) ids.push(id);
        });
      });
      ids.sort(() => Math.random() - 0.5);
      const videos = await hydrateVideos(ids.slice(0, 18), key);
      const payload = { videos };
      cacheSet(cacheKey, payload, RELATED_TTL);
      return json(payload);
    }

    // ── PLAYLISTS ──────────────────────────────────────────────────────────────
    if (action === "playlists") {
      const handle = url.searchParams.get("handle") ?? "JKT48";
      const pageToken = url.searchParams.get("pageToken") ?? "";
      if (!HANDLES[handle]) return json({ error: "invalid handle" }, 400);

      const meta = await getChannelMeta(HANDLES[handle], key);
      const data = await ytFetch(
        `/playlists?part=snippet,contentDetails&channelId=${meta.id}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ""}`,
        key,
      );

      const playlists = (data.items ?? []).map((item: any) => ({
        id: item.id,
        title: item.snippet?.title ?? "",
        description: item.snippet?.description ?? "",
        publishedAt: item.snippet?.publishedAt ?? "",
        channelId: item.snippet?.channelId ?? "",
        channelTitle: item.snippet?.channelTitle ?? "",
        thumbnails: item.snippet?.thumbnails ?? {},
        itemCount: item.contentDetails?.itemCount ?? 0,
      }));

      const payload = {
        playlists,
        nextPageToken: data.nextPageToken ?? null,
        totalResults: data.pageInfo?.totalResults ?? 0,
        channelId: meta.id,
      };
      cacheSet(cacheKey, payload, PLAYLIST_TTL);
      return json(payload);
    }

    // ── PLAYLIST ITEMS ─────────────────────────────────────────────────────────
    if (action === "playlistItems") {
      const playlistId = url.searchParams.get("playlistId") ?? "";
      const pageToken = url.searchParams.get("pageToken") ?? "";
      if (!playlistId) return json({ error: "playlistId required" }, 400);

      const pl = await ytFetch(
        `/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ""}`,
        key,
      );
      const ids = (pl.items ?? [])
        .map((i: any) => i.contentDetails?.videoId)
        .filter(Boolean);
      const videos = await hydrateVideos(ids, key);

      const videoMap: Record<string, any> = {};
      videos.forEach((v: any) => { videoMap[v.id] = v; });
      const orderedVideos = ids.map((id: string) => videoMap[id]).filter(Boolean);

      const payload = {
        videos: orderedVideos,
        nextPageToken: pl.nextPageToken ?? null,
        totalResults: pl.pageInfo?.totalResults ?? 0,
      };
      cacheSet(cacheKey, payload, PLAYLIST_ITEMS_TTL);
      return json(payload);
    }

    // ── LIVE REPLAYS (completed streams only, no live check) ──────────────────
    if (action === "liveReplays") {
      const handle = url.searchParams.get("handle") ?? "JKT48";
      if (!HANDLES[handle]) return json({ error: "invalid handle" }, 400);

      const meta = await getChannelMeta(HANDLES[handle], key);

      // Fetch only completed (replay) streams — no live status check
      const completedData = await ytFetch(
        `/search?part=snippet&channelId=${meta.id}&eventType=completed&type=video&order=date&maxResults=24`,
        key,
      ).catch(() => ({ items: [] }));

      const replays = (completedData.items ?? [])
        .map((item: any) => ({
          videoId: item.id?.videoId ?? "",
          title: item.snippet?.title ?? "",
          description: item.snippet?.description ?? "",
          publishedAt: item.snippet?.publishedAt ?? "",
          channelId: item.snippet?.channelId ?? "",
          channelTitle: item.snippet?.channelTitle ?? "",
          thumbnails: item.snippet?.thumbnails ?? {},
          liveBroadcastContent: "completed",
        }))
        .filter((v: any) => v.videoId);

      // Hydrate replays with duration & viewCount
      const replayIds = replays.map((r: any) => r.videoId).filter(Boolean);
      let replayVideos: any[] = [];
      if (replayIds.length > 0) {
        const videoData = await ytFetch(
          `/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=${replayIds.join(",")}&maxResults=50`,
          key,
        ).catch(() => ({ items: [] }));
        replayVideos = videoData.items ?? [];
      }

      const replayMap: Record<string, any> = {};
      replayVideos.forEach((v: any) => { replayMap[v.id] = v; });

      const hydratedReplays = replays.map((r: any) => {
        const v = replayMap[r.videoId];
        if (!v) return r;
        return {
          ...r,
          duration: v.contentDetails?.duration ?? "",
          viewCount: v.statistics?.viewCount ?? "0",
          actualStartTime: v.liveStreamingDetails?.actualStartTime ?? null,
        };
      });

      const payload = {
        lives: [],
        replays: hydratedReplays,
        channelId: meta.id,
        isLive: false,
      };
      cacheSet(cacheKey, payload, REPLAYS_TTL);
      return json(payload);
    }

    // ── PLAYLIST INFO ──────────────────────────────────────────────────────────
    if (action === "playlistInfo") {
      const playlistId = url.searchParams.get("playlistId") ?? "";
      if (!playlistId) return json({ error: "playlistId required" }, 400);

      const data = await ytFetch(
        `/playlists?part=snippet,contentDetails&id=${playlistId}`,
        key,
      );
      const item = data.items?.[0];
      if (!item) return json({ error: "Playlist not found" }, 404);

      const playlist = {
        id: item.id,
        title: item.snippet?.title ?? "",
        description: item.snippet?.description ?? "",
        publishedAt: item.snippet?.publishedAt ?? "",
        channelId: item.snippet?.channelId ?? "",
        channelTitle: item.snippet?.channelTitle ?? "",
        thumbnails: item.snippet?.thumbnails ?? {},
        itemCount: item.contentDetails?.itemCount ?? 0,
      };
      cacheSet(cacheKey, playlist, PLAYLIST_TTL);
      return json(playlist);
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = (e as any)?.status as number | undefined;
    const body = (e as any)?.body as string | undefined;
    console.error("youtube fn error:", e);

    const computeQuotaReset = () => {
      const nowMs = Date.now();
      const pacificOffsetH = -8;
      const nowPacific = new Date(nowMs + pacificOffsetH * 3600 * 1000);
      const nextMidnightPacific = new Date(
        Date.UTC(
          nowPacific.getUTCFullYear(),
          nowPacific.getUTCMonth(),
          nowPacific.getUTCDate() + 1,
          0, 0, 0, 0,
        ),
      );
      return nextMidnightPacific.getTime() - pacificOffsetH * 3600 * 1000;
    };

    const isQuota =
      (status === 403 && /quota/i.test(msg)) ||
      /quotaExceeded/i.test(body ?? "") ||
      /dailyLimitExceeded/i.test(body ?? "");

    if (isQuota) {
      const resetAt = computeQuotaReset();
      return new Response(
        JSON.stringify({
          error: "Kuota harian YouTube API sudah habis. Layanan akan otomatis pulih saat kuota di-reset oleh Google.",
          code: "QUOTA_EXCEEDED",
          resetAt,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (status === 429) {
      return new Response(
        JSON.stringify({
          error: "Terlalu banyak permintaan dalam waktu singkat. Coba lagi sebentar.",
          code: "RATE_LIMITED",
          retryAfterSec: 60,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (status && status >= 500) {
      return new Response(
        JSON.stringify({
          error: "Server YouTube sedang bermasalah. Coba lagi beberapa saat.",
          code: "UPSTREAM_ERROR",
          status,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (status === 400 || status === 401) {
      return new Response(
        JSON.stringify({
          error: "Konfigurasi YouTube API bermasalah (kunci tidak valid atau request salah).",
          code: "CONFIG_ERROR",
          status,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ error: msg, code: "UNKNOWN" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});