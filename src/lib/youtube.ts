import { supabase } from "@/integrations/supabase/client";

export type ApiStatusEvent =
  | { type: "ok" }
  | {
      type: "error";
      code: "QUOTA_EXCEEDED" | "RATE_LIMITED" | "UPSTREAM_ERROR" | "CONFIG_ERROR" | "NETWORK" | "UNKNOWN";
      message: string;
      resetAt?: number;
      retryAfterSec?: number;
    };

function emitApiStatus(ev: ApiStatusEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ApiStatusEvent>("api-status", { detail: ev }));
}

export type ChannelKey = "JKT48" | "JKT48TV" | "48DailyLive" | "IDNApp";

export const CHANNELS: Record<ChannelKey, { name: string; handle: string; tagline: string; color: string }> = {
  JKT48: {
    name: "JKT48 Official",
    handle: "@JKT48",
    tagline: "Music videos & pengumuman resmi",
    color: "350 88% 50%",
  },
  JKT48TV: {
    name: "JKT48 TV",
    handle: "@JKT48TV",
    tagline: "Hiburan & aktivitas member",
    color: "200 90% 50%",
  },
  "48DailyLive": {
    name: "JKT48 LIVE",
    handle: "@48DailyLive",
    tagline: "Siaran langsung & arsip live",
    color: "280 70% 55%",
  },
  IDNApp: {
    name: "IDN App",
    handle: "@idnapp",
    tagline: "Live streaming & hiburan Gen Z",
    color: "24 92% 53%",
  },
};

export type YTVideo = {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelId: string;
    channelTitle: string;
    liveBroadcastContent?: "live" | "completed" | "upcoming" | "none";
    thumbnails: {
      default?: { url: string; width?: number; height?: number };
      medium?: { url: string; width?: number; height?: number };
      high?: { url: string; width?: number; height?: number };
      standard?: { url: string; width?: number; height?: number };
      maxres?: { url: string; width?: number; height?: number };
    };
  };
  contentDetails: { duration: string };
  statistics: { viewCount?: string; likeCount?: string };
  liveStreamingDetails?: {
    concurrentViewers?: string;
    activeLiveChatId?: string;
    actualStartTime?: string;
    scheduledStartTime?: string;
  };
};

export type YTPlaylist = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  thumbnails: {
    default?: { url: string; width?: number; height?: number };
    medium?: { url: string; width?: number; height?: number };
    high?: { url: string; width?: number; height?: number };
    standard?: { url: string; width?: number; height?: number };
    maxres?: { url: string; width?: number; height?: number };
  };
  itemCount: number;
};

export type YTChannelInfo = {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnails?: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
  };
  banner?: string | null;
  subscriberCount?: string;
  videoCount?: string;
  viewCount?: string;
  uploadsPlaylistId?: string;
};

async function callFn(query: string) {
  try {
    const { data, error } = await supabase.functions.invoke(
      `youtube?${query}`,
      { method: "GET" },
    );
    if (error) {
      let payload: any = null;
      try {
        const ctx: any = (error as any)?.context;
        if (ctx && typeof ctx.json === "function") payload = await ctx.json();
        else if (ctx && typeof ctx.text === "function") {
          const t = await ctx.text();
          try { payload = JSON.parse(t); } catch { payload = { error: t }; }
        }
      } catch { /* ignore */ }

      if (payload?.code) {
        emitApiStatus({
          type: "error",
          code: payload.code,
          message: payload.error ?? "Terjadi masalah pada YouTube API.",
          resetAt: payload.resetAt,
          retryAfterSec: payload.retryAfterSec,
        });
      } else {
        emitApiStatus({
          type: "error",
          code: "NETWORK",
          message: "Koneksi ke layanan YouTube terputus. Periksa internet kamu lalu coba lagi.",
        });
      }
      throw error;
    }
    if (data?.error) {
      if (data.code) {
        emitApiStatus({
          type: "error",
          code: data.code,
          message: data.error,
          resetAt: data.resetAt,
          retryAfterSec: data.retryAfterSec,
        });
      }
      throw new Error(data.error);
    }
    emitApiStatus({ type: "ok" });
    return data;
  } catch (e) {
    if (e instanceof TypeError) {
      emitApiStatus({
        type: "error",
        code: "NETWORK",
        message: "Tidak dapat terhubung ke server. Periksa koneksi internet kamu.",
      });
    }
    throw e;
  }
}

export async function fetchChannel(
  handle: ChannelKey,
  order: "date" | "viewCount" | "oldest" = "date",
  pageToken?: string,
): Promise<{ videos: YTVideo[]; nextPageToken: string | null }> {
  const q = new URLSearchParams({ action: "channel", handle, order });
  if (pageToken) q.set("pageToken", pageToken);
  return callFn(q.toString());
}

export async function searchVideos(
  q: string,
  pageToken?: string,
): Promise<{ videos: YTVideo[]; nextPageToken: string | null }> {
  const params = new URLSearchParams({ action: "search", q });
  if (pageToken) params.set("pageToken", pageToken);
  return callFn(params.toString());
}

export async function fetchSuggestions(q: string): Promise<string[]> {
  if (!q.trim()) return [];
  const data = await callFn(`action=suggest&q=${encodeURIComponent(q)}`);
  return data.suggestions ?? [];
}

export async function fetchVideoById(id: string): Promise<YTVideo | null> {
  const data = await callFn(`action=videos&ids=${id}`);
  return data.videos?.[0] ?? null;
}

export async function fetchRelated(videoId: string): Promise<YTVideo[]> {
  const data = await callFn(`action=related&videoId=${videoId}`);
  return data.videos ?? [];
}

export async function fetchPlaylists(
  handle: ChannelKey,
  pageToken?: string,
): Promise<{ playlists: YTPlaylist[]; nextPageToken: string | null; totalResults: number }> {
  const q = new URLSearchParams({ action: "playlists", handle });
  if (pageToken) q.set("pageToken", pageToken);
  return callFn(q.toString());
}

export async function fetchPlaylistItems(
  playlistId: string,
  pageToken?: string,
): Promise<{ videos: YTVideo[]; nextPageToken: string | null; totalResults: number }> {
  const q = new URLSearchParams({ action: "playlistItems", playlistId });
  if (pageToken) q.set("pageToken", pageToken);
  return callFn(q.toString());
}

export async function fetchPlaylistInfo(playlistId: string): Promise<YTPlaylist | null> {
  const data = await callFn(`action=playlistInfo&playlistId=${playlistId}`);
  return data ?? null;
}

export type YTLiveBroadcast = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
    standard?: { url: string };
    maxres?: { url: string };
  };
  liveBroadcastContent: "live" | "completed" | "upcoming" | "none";
  duration?: string;
  viewCount?: string;
  actualStartTime?: string | null;
};

/**
 * Fetch only completed (replay) streams for a channel.
 * Does NOT check for live status — no live search API call is made.
 */
export async function fetchLiveReplays(
  handle: ChannelKey,
): Promise<{ replays: YTLiveBroadcast[] }> {
  const q = new URLSearchParams({ action: "liveReplays", handle });
  const data = await callFn(q.toString());
  return { replays: data.replays ?? [] };
}

const channelInfoMemo: Record<string, Promise<YTChannelInfo>> = {};
export const channelIdToKey: Record<string, ChannelKey> = {};

export function fetchChannelInfo(handle: ChannelKey): Promise<YTChannelInfo> {
  if (!channelInfoMemo[handle]) {
    channelInfoMemo[handle] = callFn(`action=channelInfo&handle=${handle}`).then(
      (info: YTChannelInfo) => {
        if (info?.id) channelIdToKey[info.id] = handle;
        return info;
      },
    );
  }
  return channelInfoMemo[handle];
}

export function channelKeyFromVideo(channelId?: string, channelTitle?: string): ChannelKey | null {
  if (channelId && channelIdToKey[channelId]) return channelIdToKey[channelId];
  const t = (channelTitle ?? "").toLowerCase().trim();
  if (!t) return null;
  if (/48dailylive|jkt48\s*daily\s*live|jkt48\s*live/.test(t)) return "48DailyLive";
  if (/jkt48\s*tv/.test(t)) return "JKT48TV";
  if (/jkt48/.test(t)) return "JKT48";
  if (/idn\s*app/.test(t)) return "IDNApp";
  return null;
}

export function formatCount(n: string | number | undefined): string {
  const v = typeof n === "string" ? parseInt(n, 10) : (n ?? 0);
  if (!v) return "0";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + " jt";
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, "") + " rb";
  return v.toString();
}

export function formatDuration(iso: string): string {
  if (!iso || !iso.startsWith("PT")) return "";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = parseInt(m[1] ?? "0", 10);
  const min = parseInt(m[2] ?? "0", 10);
  const s = parseInt(m[3] ?? "0", 10);
  if (h === 0 && min === 0 && s === 0) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(min)}:${pad(s)}`;
  return `${min}:${pad(s)}`;
}

export function formatViews(n: string | number | undefined): string {
  const v = typeof n === "string" ? parseInt(n, 10) : (n ?? 0);
  if (!v) return "0";
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + " jt";
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, "") + " rb";
  return v.toString();
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s} detik lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} hari lalu`;
  const w = Math.floor(days / 7);
  if (w < 5) return `${w} minggu lalu`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo} bulan lalu`;
  const y = Math.floor(days / 365);
  return `${y} tahun lalu`;
}

export function bestThumb(v: YTVideo): string {
  const t = v.snippet.thumbnails;
  return (
    t.maxres?.url ??
    t.standard?.url ??
    t.high?.url ??
    t.medium?.url ??
    t.default?.url ??
    ""
  );
}

/**
 * Deteksi apakah sebuah video YouTube berorientasi potret/vertikal
 * (mis. YouTube Shorts), agar saat full screen di mobile layar tidak
 * dipaksa landscape — persis seperti perilaku aplikasi YouTube asli.
 *
 * IFrame Player API tidak memberi akses ke videoWidth/videoHeight asli
 * (iframe-nya cross-origin ke youtube.com), jadi kita pakai rasio
 * thumbnail beresolusi tertinggi yang tersedia dari YouTube Data API
 * sebagai sinyal orientasi — thumbnail resolusi tinggi (terutama
 * "maxres") mengikuti rasio aspek video aslinya, termasuk untuk Shorts.
 * Diutamakan dari resolusi tertinggi ke terendah agar hasil paling akurat.
 */
export function isPortraitVideo(v: YTVideo | null | undefined): boolean {
  if (!v) return false;
  const t = v.snippet?.thumbnails;
  if (!t) return false;
  const candidates = [t.maxres, t.standard, t.high, t.medium, t.default];
  for (const c of candidates) {
    if (c && c.width && c.height) {
      return c.height > c.width;
    }
  }
  return false;
}

export function bestPlaylistThumb(pl: YTPlaylist): string {
  const t = pl.thumbnails;
  return (
    t.maxres?.url ??
    t.standard?.url ??
    t.high?.url ??
    t.medium?.url ??
    t.default?.url ??
    ""
  );
}