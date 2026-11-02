// JKT48Connect Theater API proxy — JKT48Connect API terbaru (https://api.jkt48connect.app/docs)
//
// Browser -> Supabase Edge Function (function ini) -> api.jkt48connect.app (server-to-server).
// API key `jkc_...` disimpan sebagai SECRET Supabase (`JKT48CONNECT_API_KEY`), bukan VITE_ env var.
//
// Query params:
//   ?action=list&page=N                       -> GET /api/theater?page=N&perpage=20 (SATU halaman; frontend
//                                                memintanya bertahap & paralel, lihat src/lib/theater.ts)
//   ?action=detail&reference_code=<id show>   -> GET /api/theater/<id show>
//
// `reference_code` = ID show yang diberikan API pada daftar theater (field `code`/`id`). Dokumentasi:
// "Gunakan ID yang diberikan API; slug dan ID antarplatform tidak selalu sama."
//
// Respons yang dikirim ke browser sudah dinormalisasi (lihat `shapeTheaterPage` / `shapeTheaterDetail`
// di ../_shared/jkt48connect.ts) — tidak lagi dibungkus envelope { ok, data } seperti API lama.

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

// Jadwal jarang berubah → cache panjang untuk menghemat kuota.
const LIST_TTL = 15 * 60 * 1000;
const DETAIL_TTL = 30 * 60 * 1000;
// Data lama boleh disajikan (sambil diperbarui di latar) sampai 24 jam.
const STALE = 24 * 60 * 60 * 1000;

// Halaman kecil → tiap request upstream lebih ringan (sebelumnya 40 show/request sering melewati batas waktu).
const PER_PAGE = 20;
// Batas pengaman jumlah halaman yang boleh diminta frontend (= 100 show).
const MAX_PAGES = 5;
// Beri API waktu cukup: lebih baik lambat daripada gagal. Frontend menampilkan halaman 1 begitu siap.
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
    // Terlihat di Supabase → Edge Functions → theater → Logs; berguna untuk mengetahui seberapa lambat API upstream.
    console.log(`[theater] page ${page} upstream ${Date.now() - t0}ms`);
  }
}

// Menjaga pembaruan latar belakang (SWR) tetap berjalan setelah respons dikirim (tersedia di Supabase Edge Runtime).
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
