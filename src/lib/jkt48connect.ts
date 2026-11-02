/**
 * Client untuk JKT48Connect API (generasi terbaru) — https://api.jkt48connect.app/docs
 *
 * Dipakai untuk mengambil status live seluruh member JKT48 (IDN Live & Showroom) dalam SATU request.
 *
 * ── Apa yang berubah dari versi API lama ────────────────────────────────────────────────────────────
 *   lama : https://jkt48connect.com/api/v1/live        header `x-api-key: jk48c_…`   envelope { ok, data }
 *   baru : https://api.jkt48connect.app/api/now_live   header `X-API-Key: jkc_…`     array langsung
 *
 * ── Transport ──────────────────────────────────────────────────────────────────────────────────────
 * Browser TIDAK memanggil API ini langsung. Dokumentasi resmi menegaskan API key harus berada di server
 * ("Frontend memanggil backend-mu; backend menambahkan key"). Karena itu semua request lewat Supabase Edge
 * Function `live` (`supabase/functions/live/index.ts`), yang menambahkan key dari secret
 * `JKT48CONNECT_API_KEY`, melakukan retry/cache, lalu mengembalikan data yang SUDAH dinormalisasi
 * (bentuknya = `JKT48ConnectLiveEntry` di bawah).
 *
 * ── Sumber stream ──────────────────────────────────────────────────────────────────────────────────
 *  • Showroom: `now_live` membawa `streaming_url_list` → sudah masuk `streaming[]` di sini.
 *  • IDN     : `now_live` umumnya TIDAK membawa URL HLS. Saat user menekan "Tonton", URL diambil lewat
 *              `resolveMemberLiveStatus()` → function `live?action=watch` → `/api/watch/:key/idn`.
 *              Bila sumber tidak tersedia, UI jatuh ke tombol "buka di idn.app" seperti sebelumnya.
 */

import { toProxiedStreamUrl } from "@/lib/hls";
import { callEdge } from "@/lib/edge";

export { toProxiedStreamUrl };

export type JKT48ConnectPlatform = "idn" | "showroom" | "youtube";

export interface JKT48ConnectStreamQuality {
  label: string;
  quality: number;
  url: string;
}

/**
 * Satu sesi live (hasil normalisasi `GET /api/now_live`). Lihat `shapeLive` di
 * `supabase/functions/_shared/jkt48connect.ts` untuk pemetaan dari field mentah API.
 */
export interface JKT48ConnectLiveEntry {
  /** ID sesi (`notification_data_id`, mis. "sr-510000-1" atau "idn-…"). */
  id?: string;
  name: string;
  img: string;
  img_alt?: string;
  /** IDN: username IDN. Showroom: `room_url_key` (mis. "JKT48_Erine"). */
  url_key?: string;
  room_url_key?: string;
  slug?: string | null;
  room_id?: number | null;
  is_graduate?: boolean;
  started_at?: string;
  /** Tautan halaman live resmi (IDN / Showroom) bila API menyediakannya. */
  link?: string;
  /** URL HLS tunggal (kosong bila sumber stream belum diketahui). */
  stream_url?: string;
  /** Daftar kualitas stream HLS, kualitas tertinggi lebih dulu. */
  streaming?: JKT48ConnectStreamQuality[];
  /** Nama field lama — dijaga supaya kode yang masih membacanya tidak rusak. */
  streaming_url_list?: JKT48ConnectStreamQuality[];
  platform?: JKT48ConnectPlatform;
  type?: JKT48ConnectPlatform;
}

/** Ambil platform dari entry, cek `platform` dulu baru fallback ke `type`. */
function entryPlatform(entry: JKT48ConnectLiveEntry): JKT48ConnectPlatform | undefined {
  return entry.platform ?? entry.type;
}

/** Daftar kualitas stream, dengan fallback berlapis supaya tahan perubahan nama field. */
function entryQualities(entry: JKT48ConnectLiveEntry): JKT48ConnectStreamQuality[] {
  if (entry.streaming && entry.streaming.length > 0) return entry.streaming;
  if (entry.streaming_url_list && entry.streaming_url_list.length > 0) return entry.streaming_url_list;
  if (entry.stream_url) return [{ label: "original", quality: 1, url: entry.stream_url }];
  return [];
}

// ─── Fetch ──────────────────────────────────────────────────────────────────

/** Panggilan yang datang bersamaan / berdekatan memakai hasil yang sama → menghemat kuota API key. */
const LIVE_MEMO_MS = 5_000;
let liveMemo: { at: number; promise: Promise<JKT48ConnectLiveEntry[]> } | null = null;

/**
 * Ambil seluruh member yang sedang live (IDN Live, Showroom) dalam satu kali panggilan
 * (`GET /api/now_live?group=jkt48`, lewat Edge Function `live`).
 *
 * Return array kosong jika tidak ada yang live. Error (key salah, kuota habis, jaringan) dilempar sebagai
 * `EdgeError` (lihat `src/lib/edge.ts`) dan juga memunculkan `ApiStatusBanner`.
 */
export function fetchJKT48ConnectLive(): Promise<JKT48ConnectLiveEntry[]> {
  const now = Date.now();
  if (liveMemo && now - liveMemo.at < LIVE_MEMO_MS) return liveMemo.promise;

  const promise = callEdge<JKT48ConnectLiveEntry[]>(
    "live",
    {},
    "Gagal menghubungi layanan status live JKT48Connect.",
  ).then((data) => (Array.isArray(data) ? data : []));

  liveMemo = { at: now, promise };
  // Jangan simpan hasil gagal: panggilan berikutnya harus mencoba lagi.
  promise.catch(() => {
    if (liveMemo?.promise === promise) liveMemo = null;
  });
  return promise;
}

export interface JKT48ConnectWatchSource {
  available: boolean;
  stream_url: string;
  streaming: JKT48ConnectStreamQuality[];
}

const WATCH_MEMO_MS = 15_000;
const watchMemo = new Map<string, { at: number; promise: Promise<JKT48ConnectWatchSource> }>();

/**
 * Ambil sumber stream sebuah sesi live lewat `/api/watch/*` (fallback bila `now_live` tidak membawa URL stream).
 * `key` = `url_key` (IDN) atau `room_url_key` (Showroom).
 */
export function fetchLiveWatchSource(
  platform: "idn" | "showroom",
  key: string,
): Promise<JKT48ConnectWatchSource> {
  const memoKey = `${platform}:${key}`;
  const now = Date.now();
  const hit = watchMemo.get(memoKey);
  if (hit && now - hit.at < WATCH_MEMO_MS) return hit.promise;

  const promise = callEdge<JKT48ConnectWatchSource>(
    "live",
    { action: "watch", platform, key },
    "Gagal mengambil sumber stream live.",
  );
  watchMemo.set(memoKey, { at: now, promise });
  promise.catch(() => {
    if (watchMemo.get(memoKey)?.promise === promise) watchMemo.delete(memoKey);
  });
  return promise;
}

// ─── Index & pencocokan ─────────────────────────────────────────────────────

export interface JKT48ConnectLiveIndex {
  /** key = url_key / room_url_key (lowercase) -> semua entri live dengan key itu (bisa beda platform) */
  byUrlKey: Map<string, JKT48ConnectLiveEntry[]>;
  /** key = room_id -> entri live (dipakai sebagai fallback pencocokan Showroom) */
  byRoomId: Map<number, JKT48ConnectLiveEntry>;
}

/** Bangun index pencarian cepat dari hasil fetchJKT48ConnectLive(). */
export function indexJKT48ConnectLive(entries: JKT48ConnectLiveEntry[]): JKT48ConnectLiveIndex {
  const byUrlKey = new Map<string, JKT48ConnectLiveEntry[]>();
  const byRoomId = new Map<number, JKT48ConnectLiveEntry>();

  const add = (key: string | undefined, entry: JKT48ConnectLiveEntry) => {
    if (!key) return;
    const k = key.toLowerCase();
    const list = byUrlKey.get(k) ?? [];
    if (!list.includes(entry)) list.push(entry);
    byUrlKey.set(k, list);
  };

  for (const entry of entries) {
    add(entry.url_key, entry);
    add(entry.room_url_key, entry);
    if (typeof entry.room_id === "number") {
      byRoomId.set(entry.room_id, entry);
    }
  }

  return { byUrlKey, byRoomId };
}

/**
 * Cari entri live untuk sebuah member di platform tertentu.
 * Pencocokan dicoba lewat url_key (idnUsername / showroomKey) lalu di-fallback ke room_id (khusus Showroom).
 */
export function findLiveEntry(
  index: JKT48ConnectLiveIndex,
  platform: JKT48ConnectPlatform,
  identifiers: {
    idnUsername?: string | null;
    showroomKey?: string | null;
    showroomRoomId?: number | null;
  },
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

/** Pakai tautan resmi dari API hanya bila memang menuju host yang diharapkan. */
function trustedLink(link: string | undefined, hostPattern: RegExp): string | null {
  if (!link) return null;
  try {
    const u = new URL(link);
    return u.protocol === "https:" && hostPattern.test(u.hostname) ? u.href : null;
  } catch {
    return null;
  }
}

/** Kualitas tertinggi & terendah dari daftar (daftar sudah urut tinggi → rendah). */
function pickHighLow(qualities: JKT48ConnectStreamQuality[]) {
  const high = qualities[0]?.url ?? "";
  const lowCandidate = qualities.length > 1 ? qualities[qualities.length - 1]?.url ?? "" : "";
  return { high, low: lowCandidate && lowCandidate !== high ? lowCandidate : "" };
}

export function buildMemberLiveStatus(
  index: JKT48ConnectLiveIndex,
  identifiers: MemberLiveIdentifiers,
): MemberLiveStatus {
  const idnEntry = findLiveEntry(index, "idn", identifiers);
  const showroomEntry = findLiveEntry(index, "showroom", identifiers);
  const idnQualities = idnEntry ? entryQualities(idnEntry) : [];
  const showroomQualities = showroomEntry ? entryQualities(showroomEntry) : [];
  const showroom = pickHighLow(showroomQualities);

  const idnUser = identifiers.idnUsername ?? idnEntry?.url_key ?? null;
  const showroomKey = identifiers.showroomKey ?? showroomEntry?.room_url_key ?? showroomEntry?.url_key ?? null;

  const idnLive = idnEntry
    ? trustedLink(idnEntry.link, /(^|\.)idn\.app$/i) ??
      (idnUser
        ? idnEntry.slug
          ? `https://www.idn.app/${idnUser}/live/${idnEntry.slug}`
          : `https://www.idn.app/${idnUser}`
        : null)
    : null;

  const showroomLive = showroomEntry
    ? trustedLink(showroomEntry.link, /(^|\.)showroom-live\.com$/i) ??
      (showroomKey ? `https://www.showroom-live.com/r/${showroomKey}` : null)
    : null;

  return {
    idn: idnEntry ? "live" : "offline",
    showroom: showroomEntry ? "live" : "offline",
    idnUrl:
      idnLive ?? (identifiers.idnUsername ? `https://www.idn.app/${identifiers.idnUsername}` : null),
    showroomUrl:
      showroomLive ??
      (identifiers.showroomRoomId
        ? `https://www.showroom-live.com/room/profile?room_id=${identifiers.showroomRoomId}`
        : null),
    idnStreamUrl: toProxiedStreamUrl(idnQualities[0]?.url ?? "") || null,
    showroomStreamUrl: toProxiedStreamUrl(showroom.high) || null,
    showroomStreamUrlLow: toProxiedStreamUrl(showroom.low) || null,
    idnSlug: idnEntry?.slug ?? null,
    liveImg: idnEntry?.img ?? showroomEntry?.img ?? null,
  };
}

/**
 * Seperti `buildMemberLiveStatus`, tetapi bila member LIVE namun `now_live` belum membawa URL stream
 * (umum untuk IDN), URL-nya diambil lewat `/api/watch/*`. Hanya melakukan request tambahan untuk platform
 * yang benar-benar live & belum punya URL, jadi aman dipanggil saat user menekan "Tonton" / membuka player.
 *
 * Kegagalan mengambil sumber stream TIDAK dilempar: field stream dibiarkan `null` sehingga UI jatuh ke
 * tombol "buka di idn.app / showroom-live.com" seperti perilaku sebelumnya.
 */
export async function resolveMemberLiveStatus(
  index: JKT48ConnectLiveIndex,
  identifiers: MemberLiveIdentifiers,
): Promise<MemberLiveStatus> {
  const status = buildMemberLiveStatus(index, identifiers);
  const jobs: Promise<void>[] = [];

  if (status.idn === "live" && !status.idnStreamUrl) {
    const entry = findLiveEntry(index, "idn", identifiers);
    const key = entry?.url_key || identifiers.idnUsername;
    if (key) {
      jobs.push(
        fetchLiveWatchSource("idn", key)
          .then((src) => {
            const url = src.streaming[0]?.url || src.stream_url;
            if (url) status.idnStreamUrl = toProxiedStreamUrl(url) || null;
          })
          .catch(() => undefined),
      );
    }
  }

  if (status.showroom === "live" && !status.showroomStreamUrl) {
    const entry = findLiveEntry(index, "showroom", identifiers);
    const key = entry?.room_url_key || entry?.url_key || identifiers.showroomKey;
    if (key) {
      jobs.push(
        fetchLiveWatchSource("showroom", key)
          .then((src) => {
            const { high, low } = pickHighLow(src.streaming);
            if (high) {
              status.showroomStreamUrl = toProxiedStreamUrl(high) || null;
              status.showroomStreamUrlLow = toProxiedStreamUrl(low) || null;
            }
          })
          .catch(() => undefined),
      );
    }
  }

  await Promise.all(jobs);
  return status;
}
