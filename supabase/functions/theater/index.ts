import {
  TtlCache,
  UpstreamError,
  corsHeaders,
  errorResponse,
  jsonResponse,
  shapeTheaterDetail,
  shapeTheaterPage,
  upstreamGet,
  validateApiKey,
} from "../_shared/jkt48connect.ts";

const LIST_TTL = 15 * 60 * 1000;
const DETAIL_TTL = 30 * 60 * 1000;
const STALE = 24 * 60 * 60 * 1000;
const PER_PAGE = 20;
const MAX_PAGES = 5;
const PAGE_TIMEOUT_MS = 25_000;
const ID_PARAM = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,99}$/;
const cache = new TtlCache();

async function fetchPage(apiKey: string, page: number) {
  const t0 = Date.now();
  try {
    const { body } = await upstreamGet("/api/theater", {
      apiKey,
      query: { page, perpage: PER_PAGE },
      timeoutMs: PAGE_TIMEOUT_MS,
      retries: 1,
    });
    return shapeTheaterPage(body);
  } finally {
    console.log(`[theater] page ${page} upstream ${Date.now() - t0}ms`);
  }
}

const waitUntil = (p: Promise<unknown>) => {
  try {
    (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil?.(p);
  } catch { /* abaikan */ }
};

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
      const page = Math.min(MAX_PAGES, Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1));
      const { data } = await cache.getOrLoad(
        `theater:page:${page}`,
        LIST_TTL,
        STALE,
        () => fetchPage(apiKey, page),
        { swr: true, waitUntil },
      );
      return jsonResponse({ ...data, max_pages: MAX_PAGES });
    }

    if (action === "detail") {
      const referenceCode = url.searchParams.get("reference_code") ?? "";
      if (!referenceCode) {
        return jsonResponse({ error: "reference_code required", code: "BAD_REQUEST" }, 400);
      }
      if (!ID_PARAM.test(referenceCode)) {
        return jsonResponse({ error: "reference_code tidak valid", code: "BAD_REQUEST" }, 400);
      }

      const { data } = await cache.getOrLoad(`theater:detail:${referenceCode}`, DETAIL_TTL, STALE, async () => {
        const { body } = await upstreamGet(`/api/theater/${encodeURIComponent(referenceCode)}`, { apiKey, timeoutMs: PAGE_TIMEOUT_MS, retries: 1 });
        const detail = shapeTheaterDetail(body, referenceCode);
        if (!detail) throw new UpstreamError(404, "Show tidak ditemukan.", "NOT_FOUND");
        return detail;
      }, { swr: true, waitUntil });
      return jsonResponse(data);
    }

    return jsonResponse({ error: "unknown action", code: "BAD_REQUEST" }, 400);
  } catch (e) {
    if (!(e instanceof UpstreamError)) console.error("theater fn error:", e);
    return errorResponse(e);
  }
});
