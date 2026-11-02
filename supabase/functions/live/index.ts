// JKT48Connect Live API proxy — JKT48Connect API terbaru (https://api.jkt48connect.app/docs)
//
// Browser -> Supabase Edge Function (function ini) -> api.jkt48connect.app (server-to-server).
// API key `jkc_...` disimpan sebagai SECRET Supabase, tidak pernah ikut ke bundle frontend:
//   supabase secrets set JKT48CONNECT_API_KEY=jkc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// (secret yang sama dipakai juga oleh function `theater`).
//
// Action:
//   GET /live                                     -> GET /api/now_live?group=jkt48
//        Mengembalikan array sesi live yang sudah dinormalisasi (lihat `shapeLive` di _shared).
//   GET /live?action=watch&platform=idn&key=<url_key>
//        -> GET /api/watch/<url_key>/idn          (sumber stream IDN)
//   GET /live?action=watch&platform=showroom&key=<room_url_key>
//        -> GET /api/watch/<room_url_key>         (sumber stream Showroom)
//        Dipanggil HANYA saat user menekan "Tonton" untuk sesi yang `now_live`-nya tidak membawa URL stream
//        (kasus umum untuk IDN), supaya tidak memboroskan kuota API key.
//
// Hemat kuota (Free = 1.000 request / bulan per key): request bersamaan digabung (inflight), hasil di-cache
// singkat per isolate, dan saat upstream gagal salinan lama masih disajikan.

import {
  TtlCache,
  UpstreamError,
  corsHeaders,
  errorResponse,
  jsonResponse,
  shapeLive,
  shapeWatch,
  upstreamGet,
  validateApiKey,
} from "../_shared/jkt48connect.ts";

// Dokumentasi menyarankan cache 20–60 detik untuk data live.
const LIVE_TTL = 30 * 1000;
const LIVE_STALE = 5 * 60 * 1000;
const WATCH_TTL = 20 * 1000;
const WATCH_STALE = 60 * 1000;

const KEY_PARAM = /^[A-Za-z0-9_.-]{1,100}$/;

const cache = new TtlCache();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const check = validateApiKey(Deno.env.get("JKT48CONNECT_API_KEY"));
  if (!check.ok) {
    return jsonResponse({ error: check.message, code: "CONFIG_ERROR" }, 500);
  }
  const apiKey = check.key;

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "list";

    if (action === "list") {
      const { data } = await cache.getOrLoad("live", LIVE_TTL, LIVE_STALE, async () => {
        const { body } = await upstreamGet("/api/now_live", { apiKey, query: { group: "jkt48" } });
        return shapeLive(body);
      });
      return jsonResponse(data);
    }

    if (action === "watch") {
      const platform = (url.searchParams.get("platform") ?? "").toLowerCase();
      const key = url.searchParams.get("key") ?? "";
      if (platform !== "idn" && platform !== "showroom") {
        return jsonResponse({ error: "platform harus 'idn' atau 'showroom'", code: "BAD_REQUEST" }, 400);
      }
      if (!KEY_PARAM.test(key)) {
        return jsonResponse({ error: "parameter key tidak valid", code: "BAD_REQUEST" }, 400);
      }

      const path =
        platform === "idn"
          ? `/api/watch/${encodeURIComponent(key)}/idn`
          : `/api/watch/${encodeURIComponent(key)}`;

      const { data } = await cache.getOrLoad(`watch:${platform}:${key}`, WATCH_TTL, WATCH_STALE, async () => {
        try {
          const { body } = await upstreamGet(path, { apiKey });
          return { available: true, ...shapeWatch(body) };
        } catch (e) {
          // 404 / 400 = sumber stream memang belum tersedia untuk sesi ini → bukan error aplikasi.
          if (e instanceof UpstreamError && (e.code === "NOT_FOUND" || e.code === "BAD_REQUEST")) {
            return { available: false, stream_url: "", streaming: [] };
          }
          throw e;
        }
      });
      return jsonResponse(data);
    }

    return jsonResponse({ error: "unknown action", code: "BAD_REQUEST" }, 400);
  } catch (e) {
    if (!(e instanceof UpstreamError)) console.error("live fn error:", e);
    return errorResponse(e);
  }
});
