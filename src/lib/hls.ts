/**
 * Pembungkus URL stream (.m3u8 IDN / Showroom) supaya diambil lewat Edge Function `hls-proxy`
 * (`supabase/functions/hls-proxy/index.ts`), bukan langsung dari browser.
 *
 * Ini WAJIB, bukan opsional — kalau hls.js / video element diarahkan langsung ke URL upstream
 * (live-video.net dkk), sebagian besar akan gagal total (layar hitam) karena playback-restriction / CORS di level
 * CDN mereka menolak request yang originnya bukan domain yang diizinkan. Lihat komentar lengkap di
 * `hls-proxy/index.ts`. (Tidak terkait dengan perubahan versi JKT48Connect API: yang diproksikan di sini
 * adalah CDN IDN/Showroom, bukan api.jkt48connect.app.)
 *
 * URL target dikirim sebagai parameter `u` dalam bentuk BASE64URL (bukan `?url=<encodeURIComponent(...)>`)
 * karena pola "URL absolut di dalam query" ditolak 400 oleh gateway Supabase. `apikey` (anon key Supabase,
 * BUKAN key JKT48Connect) juga WAJIB ikut di URL karena `<video src>` / native HLS tidak bisa mengirim header.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function toProxiedStreamUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  const params = new URLSearchParams({ u: toBase64Url(rawUrl), apikey: SUPABASE_ANON_KEY });
  return `${SUPABASE_URL}/functions/v1/hls-proxy?${params.toString()}`;
}
