// JKT48Connect Live Streaming API proxy — Developer API v1 (https://jkt48connect.com/dev/docs)
//
// PENTING: sebelumnya function ini sempat memanggil upstream yang SALAH
// (`v2.jkt48connect.com/api/jkt48/live?apikey=...`, dari dokumentasi lama
// docs.jkt48connect.com). Itu bukan endpoint yang benar untuk key
// `jk48c_...` yang dipakai project ini — endpoint yang benar (dan
// konsisten dengan `supabase/functions/theater`) adalah Developer API v1
// di `https://jkt48connect.com`, dengan header `x-api-key`, BUKAN query
// param `?apikey=`.
//
// Endpoint upstream ini juga tidak mengirim header CORS untuk request
// langsung dari browser, jadi tetap harus lewat proxy server-to-server
// seperti ini (sama seperti theater):
//   browser -> Supabase Edge Function (function ini) -> jkt48connect.com
//   (server-to-server, tanpa masalah CORS) -> hasil diteruskan balik ke
//   browser dengan header CORS yang benar.
//
// Endpoint: GET /api/v1/live
// Response envelope upstream: { ok, data: [...], cached_at, cache_ttl, tier }
// Tiap entri di `data` (field bisa lebih lengkap dari yang didokumentasikan,
// contoh nyata per Agustus 2026):
//   { name, url_key, img, img_alt, is_graduate, started_at,
//     platform: "idn" | "showroom", room_id, slug, type,
//     stream_url, streaming: [{ label, quality, url }], viewers, title, thumbnail }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const JKT48CONNECT_BASE_URL = "https://jkt48connect.com";
// Live status berubah cepat, tapi upstream sendiri sudah cache di edge
// (`cache_ttl` di response, 5-30 detik tergantung tier) — cache lokal di
// sini dibuat pendek juga, cukup untuk meredam klik "refresh" beruntun.
const LIVE_TTL = 10 * 1000;

// Cache in-memory sederhana per isolate (sama seperti supabase/functions/theater & youtube)
const cache: Record<string, { data: unknown; exp: number }> = {};
const now = () => Date.now();
function cacheGet(key: string) {
  const hit = cache[key];
  if (hit && hit.exp > now()) return hit.data;
  if (hit) delete cache[key];
  return null;
}
function cacheSet(key: string, data: unknown, ttl: number) {
  cache[key] = { data, exp: now() + ttl };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Secret yang sama dengan function `theater` (satu API key untuk semua
  // endpoint Developer API v1 jkt48connect.com):
  //   supabase secrets set JKT48CONNECT_API_KEY=jk48c_xxxxx
  const apiKey = Deno.env.get("JKT48CONNECT_API_KEY");
  if (!apiKey) {
    return json(
      {
        error:
          "JKT48CONNECT_API_KEY belum diatur sebagai secret di Supabase Edge Functions.",
        code: "CONFIG_ERROR",
      },
      500,
    );
  }

  try {
    const url = new URL(req.url);
    // Cache key statis karena cuma ada satu endpoint (/api/v1/live).
    const cacheKey = "live";

    const cached = cacheGet(cacheKey);
    if (cached) return json(cached);

    const upstream = await fetch(`${JKT48CONNECT_BASE_URL}/api/v1/live`, {
      headers: { "x-api-key": apiKey },
    });

    const body = await upstream.json().catch(() => null);

    if (!upstream.ok || (body && typeof body === "object" && (body as any).ok === false)) {
      const message =
        (body && typeof body === "object" && (body as any).error) ||
        `HTTP ${upstream.status}`;
      const code =
        (body && typeof body === "object" && (body as any).code) || "UPSTREAM_ERROR";
      return json({ error: message, code }, upstream.status >= 400 ? upstream.status : 502);
    }

    // Upstream membungkus hasil dalam envelope { ok, data, cached_at, ... }
    const data = (body && typeof body === "object" && Array.isArray((body as any).data))
      ? (body as any).data
      : [];
    cacheSet(cacheKey, data, LIVE_TTL);
    return json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("live fn error:", e);
    return json({ error: msg, code: "UNKNOWN" }, 500);
  }
});