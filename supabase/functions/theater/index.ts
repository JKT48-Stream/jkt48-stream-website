// JKT48Connect Theater API proxy — Developer API v1 (https://jkt48connect.com/dev/docs)
//
// Endpoint upstream `/api/v1/theater` butuh header `x-api-key` dan TIDAK
// mengirim header CORS untuk request dari browser, jadi kalau dipanggil
// langsung dari frontend akan selalu gagal dengan:
//   "Access to fetch at '...' has been blocked by CORS policy"
// Function ini jadi perantara: browser -> Supabase Edge Function (function
// ini) -> jkt48connect.com (server-to-server, tanpa masalah CORS), lalu
// hasilnya diteruskan balik ke browser dengan header CORS yang benar.
// Bonus: API key `x-api-key` jadi tidak perlu ikut ter-bundle di kode
// frontend (disimpan sebagai Supabase secret, bukan VITE_ env var).
//
// Query params yang didukung:
//   ?action=list                                -> GET /api/v1/theater
//   ?action=detail&reference_code=SH9A7D         -> GET /api/v1/theater/{reference_code}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const JKT48CONNECT_BASE_URL = "https://jkt48connect.com";
const LIST_TTL = 5 * 60 * 1000;
const DETAIL_TTL = 10 * 60 * 1000;

// Cache in-memory sederhana per isolate (sama seperti supabase/functions/youtube)
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
    const action = url.searchParams.get("action") ?? "list";
    const cacheKey = url.search;

    const cached = cacheGet(cacheKey);
    if (cached) return json(cached);

    let upstreamPath = "/api/v1/theater";
    let ttl = LIST_TTL;

    if (action === "detail") {
      const referenceCode = url.searchParams.get("reference_code") ?? "";
      if (!referenceCode) {
        return json({ error: "reference_code required", code: "BAD_REQUEST" }, 400);
      }
      upstreamPath = `/api/v1/theater/${encodeURIComponent(referenceCode)}`;
      ttl = DETAIL_TTL;
    } else if (action !== "list") {
      return json({ error: "unknown action", code: "BAD_REQUEST" }, 400);
    }

    const upstream = await fetch(`${JKT48CONNECT_BASE_URL}${upstreamPath}`, {
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

    cacheSet(cacheKey, body, ttl);
    return json(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("theater fn error:", e);
    return json({ error: msg, code: "UNKNOWN" }, 500);
  }
});