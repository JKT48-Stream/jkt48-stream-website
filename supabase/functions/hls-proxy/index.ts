// HLS proxy — untuk stream IDN Live (AWS IVS, *.live-video.net) & Showroom.
//
// KENAPA INI PERLU (beda dengan kasus theater/live yang "sekadar" CORS JSON):
// Membuka URL .m3u8 langsung di address bar browser SELALU terlihat normal,
// karena navigasi top-level (ketik URL / klik link) TIDAK tunduk pada aturan
// CORS sama sekali — itu cuma request GET biasa. CORS baru berlaku ketika
// JavaScript di halaman kita (di sini: hls.js, lewat XHR/fetch) yang
// mengambil resource dari origin lain. AWS IVS (*.live-video.net) menerapkan
// playback restriction / CORS policy di level channel yang menolak request
// semacam itu kalau origin pemanggilnya bukan domain yang mereka izinkan
// (biasanya cuma domain resmi JKT48Connect sendiri) — makanya video terlihat
// "ada" kalau dibuka manual, tapi begitu dimuat lewat hls.js di website kita,
// manifest & segmennya gagal diambil dan videonya cuma layar hitam.
//
// Proxy ini menaruh SEMUA request (manifest + sub-manifest + tiap segmen
// .ts/.m4s) di belakang server kita sendiri:
//   browser (hls.js) -> Supabase Edge Function ini -> live-video.net/dst
//   (server-to-server, tanpa CORS/origin check browser) -> hasil diteruskan
//   balik dengan header CORS yang benar.
// Manifest (.m3u8) di-parse & semua URI di dalamnya (sub-playlist, segmen,
// #EXT-X-KEY, #EXT-X-MAP) di-rewrite supaya ikut lewat proxy ini juga —
// jadi hls.js tidak pernah menyentuh live-video.net langsung sama sekali.
//
// Pemakaian:
//   GET /hls-proxy?u=<base64url(url manifest/segmen asli)>&apikey=<anon key project>
//
// CATATAN PENTING #1 — kenapa `u` di-base64url, BUKAN `url=<encodeURIComponent(...)>`:
// Versi awal proxy ini pakai `?url=https%3A%2F%2F...` dan SELALU gagal
// dengan 400 untuk URL apa pun (bahkan URL dummy yang jelas valid) —
// termasuk error "missing url param" pun tidak muncul, jadi bukan salah
// kode di sini. Penyebab paling mungkin: Supabase Edge Functions ada di
// belakang Cloudflare, dan WAF Cloudflare punya kecenderungan menolak
// request yang salah satu query parameter-nya berisi URL absolut lain di
// dalamnya (pola umum yang dicurigai sebagai percobaan SSRF/open-redirect)
// — ditolak duluan sebelum sempat masuk ke kode function ini. Encode
// target URL sebagai base64url menghilangkan pola "URL di dalam URL" itu.
//
// CATATAN PENTING #2 — soal `apikey`: meskipun function ini di-deploy
// dengan verify_jwt = false (lihat supabase/config.toml), Supabase API
// Gateway TETAP mewajibkan API key project di SETIAP request ke
// *.supabase.co (ini beda dari verify_jwt milik function itu sendiri — ini
// cek di level gateway/project, berlaku untuk semua produk Supabase
// termasuk Edge Functions; kalau ini yang jadi masalah, errornya harusnya
// 401 "No API key found in request", bukan 400 — tapi tetap disisipkan
// untuk jaga-jaga). Biasanya key ini dikirim lewat header `apikey`, tapi
// <video src="...">/native HLS player TIDAK BISA menyisipkan header custom
// apa pun — makanya key-nya disisipkan lewat QUERY PARAMETER di sini
// (Supabase gateway menerima keduanya).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Expose-Headers": "content-length, content-range, accept-ranges",
};

function jsonError(message: string, code: string, status: number): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Encode string ke base64url (tanpa padding '=', aman dipakai di query string tanpa perlu encodeURIComponent lagi). */
function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Kebalikan dari toBase64Url. Melempar error kalau inputnya bukan base64url valid. */
function fromBase64Url(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// Proteksi dasar supaya endpoint ini tidak jadi open proxy sembarangan:
// tolak target yang mengarah ke jaringan lokal/private (SSRF guard) dan
// wajib https. Domain CDN Showroom/IDN bervariasi & sering ganti-ganti edge
// node, jadi TIDAK di-allowlist ketat per-domain — cukup blokir target yang
// jelas-jelas bukan resource publik di internet.
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h === "0.0.0.0" || h === "127.0.0.1" || h === "::1") return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

function isPlaylist(targetUrl: URL, contentType: string): boolean {
  if (targetUrl.pathname.toLowerCase().endsWith(".m3u8")) return true;
  const ct = contentType.toLowerCase();
  return ct.includes("mpegurl") || ct.includes("x-mpegurl");
}

function buildProxyUrl(proxyBase: string, absoluteTargetUrl: string, apikey: string | null): string {
  let url = `${proxyBase}?u=${toBase64Url(absoluteTargetUrl)}`;
  if (apikey) url += `&apikey=${encodeURIComponent(apikey)}`;
  return url;
}

/** Rewrite isi file .m3u8: setiap baris URI (biasa maupun di dalam atribut URI="...") diarahkan lewat proxy ini juga, resolved relatif terhadap URL manifest aslinya. */
function rewritePlaylist(text: string, targetUrl: URL, proxyBase: string, apikey: string | null): string {
  const lines = text.split(/\r?\n/);
  const out = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    if (trimmed.startsWith("#")) {
      const uriMatch = trimmed.match(/URI="([^"]+)"/);
      if (!uriMatch) return line;
      try {
        const abs = new URL(uriMatch[1], targetUrl).toString();
        return line.replace(uriMatch[1], buildProxyUrl(proxyBase, abs, apikey));
      } catch {
        return line;
      }
    }

    try {
      const abs = new URL(trimmed, targetUrl).toString();
      return buildProxyUrl(proxyBase, abs, apikey);
    } catch {
      return line;
    }
  });
  return out.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const reqUrl = new URL(req.url);
  const apikeyParam = reqUrl.searchParams.get("apikey");

  // Dukung parameter baru `u` (base64url) DAN yang lama `url`
  // (encodeURIComponent biasa) sekaligus — supaya kalau nanti ternyata
  // base64 juga kena blokir karena alasan lain, gampang di-diagnosis mana
  // yang bermasalah lewat kode error yang berbeda.
  const uParam = reqUrl.searchParams.get("u");
  const legacyUrlParam = reqUrl.searchParams.get("url");

  let target: string | null = null;
  if (uParam) {
    try {
      target = fromBase64Url(uParam);
    } catch {
      return jsonError("Parameter 'u' bukan base64url yang valid.", "BAD_REQUEST", 400);
    }
  } else if (legacyUrlParam) {
    target = legacyUrlParam;
  }

  if (!target) {
    return jsonError("Parameter 'u' (atau 'url') wajib diisi.", "BAD_REQUEST", 400);
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return jsonError(`URL tidak valid: ${target}`, "BAD_REQUEST", 400);
  }

  if (targetUrl.protocol !== "https:") {
    return jsonError("Hanya URL https:// yang diizinkan.", "BAD_REQUEST", 400);
  }

  if (isBlockedHost(targetUrl.hostname)) {
    return jsonError("Host tidak diizinkan.", "FORBIDDEN", 403);
  }

  try {
    const upstreamHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    };
    const range = req.headers.get("range");
    if (range) upstreamHeaders["range"] = range;

    const upstream = await fetch(targetUrl.toString(), { headers: upstreamHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      return jsonError(`Upstream HTTP ${upstream.status} untuk ${targetUrl.toString()}`, "UPSTREAM_ERROR", upstream.status);
    }

    const contentType = upstream.headers.get("content-type") ?? "";

    if (isPlaylist(targetUrl, contentType)) {
      const text = await upstream.text();
      // PENTING: JANGAN pakai `reqUrl.origin`/`reqUrl.pathname` di sini.
      // Di dalam Supabase Edge Function, `req.url` sudah ditranslasi ke URL
      // INTERNAL oleh runtime-nya (contoh nyata yang ketahuan lewat mode
      // debug: jadi "http://<project-ref>.supabase.co/hls-proxy", padahal
      // seharusnya "https://<project-ref>.supabase.co/functions/v1/hls-proxy")
      // — beda skema (http vs https) DAN hilang prefix "/functions/v1/".
      // Akibatnya semua URL sub-playlist/segmen hasil rewrite jadi rusak
      // total (404/gagal connect), padahal manifest utamanya sendiri
      // sukses dimuat (makanya browser masih sempat menampilkan UI player).
      // `SUPABASE_URL` adalah environment variable yang OTOMATIS tersedia
      // di semua Edge Function Supabase (tidak perlu di-set manual) dan
      // selalu berupa URL publik yang benar — dipakai untuk menyusun ulang
      // base URL proxy ini secara eksplisit & benar.
      const publicBase = Deno.env.get("SUPABASE_URL") ?? `${reqUrl.protocol}//${reqUrl.host}`;
      const proxyBase = `${publicBase}/functions/v1/hls-proxy`;
      const rewritten = rewritePlaylist(text, targetUrl, proxyBase, apikeyParam);
      // Mode debug: &debug=1 -> paksa Content-Type text/plain supaya browser
      // menampilkan isi manifest apa adanya (bukan mencoba memutarnya
      // sebagai video, yang di mobile bikin susah lihat isi aslinya).
      const debug = reqUrl.searchParams.get("debug") === "1";
      return new Response(rewritten, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": debug ? "text/plain; charset=utf-8" : "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store",
        },
      });
    }

    const passHeaders: Record<string, string> = { ...corsHeaders };
    if (contentType) passHeaders["Content-Type"] = contentType;
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) passHeaders["Content-Length"] = contentLength;
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) passHeaders["Content-Range"] = contentRange;
    const acceptRanges = upstream.headers.get("accept-ranges");
    if (acceptRanges) passHeaders["Accept-Ranges"] = acceptRanges;
    passHeaders["Cache-Control"] = "public, max-age=31536000, immutable";

    return new Response(upstream.body, { status: upstream.status, headers: passHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("hls-proxy error:", e);
    return jsonError(msg, "UNKNOWN", 500);
  }
});