/**
 * Client untuk JKT48Connect API — https://docs.jkt48connect.com
 *
 * Dipakai untuk mengambil status live seluruh member JKT48 (IDN Live,
 * Showroom, YouTube) dalam SATU request, menggantikan pendekatan lama yang
 * memanggil Supabase Edge Function (`check-idn-live-bulk` /
 * `check-showroom-live-bulk`) satu-per-satu / per-batch.
 *
 * Endpoint upstream yang benar adalah Developer API v1 di
 * `https://jkt48connect.com/api/v1/live` (header `x-api-key`) — SAMA
 * persis dengan yang dipakai `src/lib/theater.ts`. (Ada versi API lain,
 * `v2.jkt48connect.com` dengan `?apikey=` di query string, dari dokumentasi
 * docs.jkt48connect.com yang berbeda — itu BUKAN yang dipakai project ini,
 * jangan tertukar.)
 *
 * PENTING soal transport: endpoint di atas juga tidak mengirim header CORS
 * untuk request langsung dari browser, jadi request ke API ini TIDAK
 * dipanggil langsung dari sini — melainkan lewat Supabase Edge Function
 * `live` (`supabase/functions/live/index.ts`), yang meneruskan request ke
 * jkt48connect.com secara server-to-server (tanpa masalah CORS) lalu
 * mengembalikan hasilnya dengan header CORS yang benar.
 *
 * API key (`jk48c_...`) disimpan sebagai SECRET Supabase bernama
 * `JKT48CONNECT_API_KEY` (bukan VITE_ env var lagi), supaya tidak ikut
 * ter-bundle ke kode browser. Set lewat:
 *   supabase secrets set JKT48CONNECT_API_KEY=jk48c_xxxxx
 * (kalau function `theater` sudah pakai secret ini, tidak perlu diulang —
 * function `live` memakai nama secret yang sama).
 */

import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/**
 * Bungkus URL stream (.m3u8 IDN/Showroom) supaya diambil lewat Edge Function
 * `hls-proxy` (`supabase/functions/hls-proxy/index.ts`), bukan langsung dari
 * browser. Ini WAJIB, bukan opsional — kalau hls.js/video element diarahkan
 * langsung ke URL upstream (live-video.net dkk), sebagian besar akan gagal
 * total (layar hitam) karena playback-restriction/CORS di level CDN mereka
 * menolak request yang originnya bukan domain resmi JKT48Connect. Lihat
 * komentar lengkap di hls-proxy/index.ts untuk detail kenapa ini beda
 * dengan proxy JSON biasa (theater/live).
 *
 * URL target dikirim sebagai parameter `u` dalam bentuk BASE64URL (bukan
 * `?url=<encodeURIComponent(...)>` biasa) — versi awal proxy ini yang pakai
 * `url=` mentah SELALU ditolak 400 oleh gateway Supabase (kemungkinan besar
 * WAF Cloudflare di depannya menolak pola "URL absolut di dalam query
 * parameter"). Base64url menghilangkan pola itu. `apikey` juga WAJIB ikut
 * disisipkan di URL (bukan cuma di header) — elemen `<video src="...">` /
 * native HLS player tidak bisa menyisipkan header custom sama sekali.
 */
function toBase64Url(input: string): string {
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

export type JKT48ConnectPlatform = "idn" | "showroom" | "youtube";

export interface JKT48ConnectStreamQuality {
  label: string;
  quality: number;
  url: string;
}

/**
 * Satu entri live member dari GET /api/v1/live (Developer API v1,
 * jkt48connect.com — lihat supabase/functions/live/index.ts). Beberapa
 * field tidak selalu ada tergantung platform, jadi ditandai optional.
 * `platform` adalah field resmi di dokumentasi; `type` sering muncul juga
 * dengan nilai yang sama — kode di bawah cek keduanya untuk jaga-jaga.
 */
export interface JKT48ConnectLiveEntry {
  name: string;
  img: string;
  img_alt?: string;
  url_key?: string;
  slug?: string;
  room_id?: number;
  is_graduate?: boolean;
  is_group?: boolean;
  chat_room_id?: string;
  started_at?: string;
  /** URL HLS tunggal (selalu ada). */
  stream_url?: string;
  /** Daftar kualitas stream (nama field upstream saat ini: "streaming"). */
  streaming?: JKT48ConnectStreamQuality[];
  /** Nama field lama, dijaga untuk kompatibilitas kalau upstream berubah lagi. */
  streaming_url_list?: JKT48ConnectStreamQuality[];
  platform?: JKT48ConnectPlatform;
  type?: JKT48ConnectPlatform;
}

/** Ambil platform dari entry, cek `platform` dulu baru fallback ke `type`. */
function entryPlatform(entry: JKT48ConnectLiveEntry): JKT48ConnectPlatform | undefined {
  return entry.platform ?? entry.type;
}

/** Ambil daftar kualitas stream, dengan fallback berlapis supaya tahan perubahan nama field upstream. */
function entryQualities(entry: JKT48ConnectLiveEntry): JKT48ConnectStreamQuality[] {
  if (entry.streaming && entry.streaming.length > 0) return entry.streaming;
  if (entry.streaming_url_list && entry.streaming_url_list.length > 0) return entry.streaming_url_list;
  if (entry.stream_url) return [{ label: "original", quality: 1, url: entry.stream_url }];
  return [];
}

/**
 * Ambil seluruh member yang sedang live (IDN Live, Showroom, YouTube)
 * dalam satu kali panggilan, lewat Supabase Edge Function `live` (lihat
 * catatan transport di atas — TIDAK fetch langsung ke v2.jkt48connect.com
 * dari browser karena akan selalu diblokir CORS oleh upstream-nya).
 *
 * Return array kosong jika tidak ada yang live. Kalau function-nya error
 * (mis. secret `JKT48CONNECT_API_KEY` belum di-set di Supabase), error
 * dilempar ke pemanggil supaya bisa ditangani/di-log di sana — tidak lagi
 * ditelan diam-diam di sini.
 */
export async function fetchJKT48ConnectLive(): Promise<JKT48ConnectLiveEntry[]> {
  const { data, error } = await supabase.functions.invoke("live", {
    method: "GET",
  });

  if (error) {
    let payload: any = null;
    try {
      const ctx: any = (error as any)?.context;
      if (ctx && typeof ctx.json === "function") payload = await ctx.json();
      else if (ctx && typeof ctx.text === "function") {
        const t = await ctx.text();
        try {
          payload = JSON.parse(t);
        } catch {
          payload = { error: t };
        }
      }
    } catch {
      /* ignore */
    }
    throw new Error(
      payload?.error ?? "Gagal menghubungi layanan status live JKT48Connect."
    );
  }

  if (data && typeof data === "object" && !Array.isArray(data) && "error" in data) {
    throw new Error((data as { error: string }).error);
  }

  return Array.isArray(data) ? (data as JKT48ConnectLiveEntry[]) : [];
}

export interface JKT48ConnectLiveIndex {
  /** key = url_key (lowercase) -> semua entri live dengan url_key itu (bisa beda platform) */
  byUrlKey: Map<string, JKT48ConnectLiveEntry[]>;
  /** key = room_id -> entri live (dipakai sebagai fallback pencocokan Showroom) */
  byRoomId: Map<number, JKT48ConnectLiveEntry>;
}

/** Bangun index pencarian cepat dari hasil fetchJKT48ConnectLive(). */
export function indexJKT48ConnectLive(
  entries: JKT48ConnectLiveEntry[]
): JKT48ConnectLiveIndex {
  const byUrlKey = new Map<string, JKT48ConnectLiveEntry[]>();
  const byRoomId = new Map<number, JKT48ConnectLiveEntry>();

  for (const entry of entries) {
    if (entry.url_key) {
      const key = entry.url_key.toLowerCase();
      const list = byUrlKey.get(key) ?? [];
      list.push(entry);
      byUrlKey.set(key, list);
    }
    if (typeof entry.room_id === "number") {
      byRoomId.set(entry.room_id, entry);
    }
  }

  return { byUrlKey, byRoomId };
}

/**
 * Cari entri live untuk sebuah member di platform tertentu.
 * Pencocokan dicoba lewat url_key (idnUsername / showroomKey) lalu
 * di-fallback ke room_id (khusus Showroom).
 */
export function findLiveEntry(
  index: JKT48ConnectLiveIndex,
  platform: JKT48ConnectPlatform,
  identifiers: {
    idnUsername?: string | null;
    showroomKey?: string | null;
    showroomRoomId?: number | null;
  }
): JKT48ConnectLiveEntry | null {
  const candidates: JKT48ConnectLiveEntry[] = [];

  if (identifiers.idnUsername) {
    candidates.push(...(index.byUrlKey.get(identifiers.idnUsername.toLowerCase()) ?? []));
  }
  if (identifiers.showroomKey) {
    candidates.push(...(index.byUrlKey.get(identifiers.showroomKey.toLowerCase()) ?? []));
  }
  if (typeof identifiers.showroomRoomId === "number") {
    const byRoom = index.byRoomId.get(identifiers.showroomRoomId);
    if (byRoom) candidates.push(byRoom);
  }

  return candidates.find((e) => entryPlatform(e) === platform) ?? null;
}

/* ────────────────────────────────────────────────────────────────────────
 * Helper level tinggi: hitung status live lengkap (IDN + Showroom) untuk
 * satu member sekaligus, dipakai bareng-bareng di MemberLivePage &
 * StreamingPlayerPage supaya logikanya konsisten di satu tempat.
 * ──────────────────────────────────────────────────────────────────────── */

export type JKT48ConnectSimpleStatus = "live" | "offline";

export interface MemberLiveIdentifiers {
  idnUsername?: string | null;
  showroomKey?: string | null;
  showroomRoomId?: number | null;
}

export interface MemberLiveStatus {
  idn: JKT48ConnectSimpleStatus;
  showroom: JKT48ConnectSimpleStatus;
  idnUrl: string | null;
  showroomUrl: string | null;
  idnStreamUrl: string | null;
  showroomStreamUrl: string | null;
  showroomStreamUrlLow: string | null;
  idnSlug: string | null;
  /** Thumbnail live (dari IDN kalau live di IDN, kalau tidak dari Showroom) */
  liveImg: string | null;
}

export function buildMemberLiveStatus(
  index: JKT48ConnectLiveIndex,
  identifiers: MemberLiveIdentifiers
): MemberLiveStatus {
  const idnEntry = findLiveEntry(index, "idn", identifiers);
  const showroomEntry = findLiveEntry(index, "showroom", identifiers);
  const showroomQualities = showroomEntry ? entryQualities(showroomEntry) : [];

  return {
    idn: idnEntry ? "live" : "offline",
    showroom: showroomEntry ? "live" : "offline",
    idnUrl: idnEntry
      ? (idnEntry.slug
          ? `https://www.idn.app/${identifiers.idnUsername}/live/${idnEntry.slug}`
          : `https://www.idn.app/${identifiers.idnUsername}`)
      : (identifiers.idnUsername ? `https://www.idn.app/${identifiers.idnUsername}` : null),
    showroomUrl: showroomEntry
      ? `https://www.showroom-live.com/r/${identifiers.showroomKey}`
      : (identifiers.showroomRoomId
          ? `https://www.showroom-live.com/room/profile?room_id=${identifiers.showroomRoomId}`
          : null),
    idnStreamUrl: toProxiedStreamUrl(
      (idnEntry ? entryQualities(idnEntry)[0]?.url : null) ?? idnEntry?.stream_url ?? ""
    ) || null,
    showroomStreamUrl: toProxiedStreamUrl(showroomQualities[0]?.url ?? "") || null,
    showroomStreamUrlLow: toProxiedStreamUrl(showroomQualities[1]?.url ?? "") || null,
    idnSlug: idnEntry?.slug ?? null,
    liveImg: idnEntry?.img ?? showroomEntry?.img ?? null,
  };
}