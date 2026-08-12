/**
 * Client untuk endpoint Theater JKT48Connect Developer API v1 —
 * https://jkt48connect.com/dev/docs (bagian "Theater" -> Jadwal theater / Detail show).
 *
 * PENTING soal transport: endpoint upstream `/api/v1/theater` butuh header
 * `x-api-key` dan tidak mengirim header CORS untuk request langsung dari
 * browser (selalu gagal dengan "blocked by CORS policy" kalau di-fetch dari
 * frontend). Karena itu, permintaan ke API ini TIDAK dipanggil langsung dari
 * sini — melainkan lewat Supabase Edge Function `theater`
 * (`supabase/functions/theater/index.ts`), yang meneruskan request ke
 * jkt48connect.com secara server-to-server lalu mengembalikan hasilnya
 * dengan header CORS yang benar. Pola ini sama seperti yang dipakai
 * `src/lib/youtube.ts` untuk YouTube Data API.
 *
 * API key (`jk48c_...`) disimpan sebagai SECRET Supabase bernama
 * `JKT48CONNECT_API_KEY` (bukan VITE_ env var), supaya tidak ikut ter-bundle
 * ke kode browser. Lihat instruksi setup di bagian bawah file ini.
 */

import { supabase } from "@/integrations/supabase/client";
import { MEMBERS, getMemberPhotoUrl } from "@/data/members";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Anggota lineup pada list & detail show — TANPA foto dari API. */
export interface TheaterLineupMember {
  id: string | number;
  name: string;
  url_key: string;
}

/** Anggota pada `jkt48_member` / `birthday_members` di detail show — DENGAN foto dari API. */
export interface TheaterApiMember {
  name: string;
  type: string;
  member_id: number;
  img: string;
}

export interface TheaterPricingTier {
  label: string;
  price: number;
  quota: number;
  is_ofc_only?: boolean;
}

export interface TheaterSalesPeriod {
  label: string;
  start_date: string;
  end_date: string;
  sales_method: string;
  pricing: TheaterPricingTier[];
}

/** Satu entri pada GET /api/v1/theater (daftar jadwal). */
export interface TheaterListItem {
  link: string;
  schedule_id: number;
  date: string;
  start_time: string;
  end_time: string;
  type: string;
  status: boolean;
  title: string;
  jkt48_member_type: string;
  reference_code: string;
  is_birthday_show: boolean;
  banner: string;
  poster: string;
  short_description: string | null;
  lineup: TheaterLineupMember[];
}

/** Response lengkap GET /api/v1/theater/{reference_code} (detail satu show). */
export interface TheaterDetail {
  success?: boolean;
  reference_code: string;
  banner: string;
  poster: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  status: boolean;
  jkt48_member_type: string;
  default_price: number;
  total_quota: number;
  max_purchase: number;
  set_list: string;
  seating_layout: string;
  reception_start_time: string | null;
  reception_end_time: string | null;
  is_birthday_show: boolean;
  short_description: string | null;
  content_body: string | null;
  birthday_members: TheaterApiMember[];
  lineup: TheaterLineupMember[];
  jkt48_member: TheaterApiMember[];
  sales_period: TheaterSalesPeriod[];
}

// ─── Transport: panggil lewat Supabase Edge Function `theater` ────────────

async function callTheaterFn<T>(query: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke(`theater?${query}`, {
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
      payload?.error ?? "Gagal menghubungi layanan jadwal theater."
    );
  }

  if (data && typeof data === "object" && "error" in data) {
    throw new Error((data as { error: string }).error);
  }

  // Envelope upstream JKT48Connect: { ok, data, cached_at, cache_ttl, tier }
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

// ─── Fetchers ───────────────────────────────────────────────────────────────

/**
 * Ambil seluruh jadwal show teater JKT48 (lampau & akan datang).
 */
export async function fetchTheaterSchedule(): Promise<TheaterListItem[]> {
  const data = await callTheaterFn<TheaterListItem[]>("action=list");
  return Array.isArray(data) ? data : [];
}

/**
 * Ambil detail lengkap satu show teater berdasarkan `reference_code`-nya
 * (didapat dari hasil `fetchTheaterSchedule`).
 */
export async function fetchTheaterDetail(
  referenceCode: string
): Promise<TheaterDetail | null> {
  if (!referenceCode) return null;
  const data = await callTheaterFn<TheaterDetail>(
    `action=detail&reference_code=${encodeURIComponent(referenceCode)}`
  );
  return data ?? null;
}

// ─── Badge warna per tim (jkt48_member_type dari API: LOVE/DREAM/PASSION/TRAINEE) ──

export const THEATER_TEAM_BADGE_COLORS: Record<string, string> = {
  LOVE: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  DREAM: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  PASSION: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  TRAINEE: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

export function getTheaterTeamBadgeClass(memberType?: string | null): string {
  if (!memberType) return "bg-muted text-muted-foreground border-border";
  return (
    THEATER_TEAM_BADGE_COLORS[memberType.toUpperCase()] ??
    "bg-muted text-muted-foreground border-border"
  );
}

// ─── Resolusi foto member lineup/birthday dari koleksi foto lokal project ────

function slugToMemberId(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, "_");
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Bandingkan dua slug/id secara "prefix per kata" (dipisah `_`). Dipakai
 * karena `url_key` dari API kadang cuma sebagian dari id lokal, mis. API
 * mengirim slug "maxine-faye" (-> "maxine_faye") sedangkan id lokal member
 * yang sama adalah "maxine_faye_lee" (ada nama keluarga tambahan). Selama
 * kata-kata di slug yang lebih pendek cocok berurutan dengan awal id yang
 * lebih panjang, ini dianggap match.
 */
function idsFuzzyMatch(idA: string, idB: string): boolean {
  const wordsA = idA.split("_").filter(Boolean);
  const wordsB = idB.split("_").filter(Boolean);
  const [shorter, longer] =
    wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA];
  if (shorter.length === 0) return false;
  return shorter.every((word, i) => longer[i] === word);
}

/**
 * Sama seperti `idsFuzzyMatch` tapi untuk nama yang sudah dinormalisasi
 * (dipisah spasi). Menangani kasus nama dari API cuma sebagian dari nama
 * lengkap lokal, mis. API mengirim "Maxine Faye" sedangkan nama lokal member
 * yang sama adalah "Maxine Faye Lee".
 */
function namesFuzzyMatch(nameA: string, nameB: string): boolean {
  const wordsA = normalizeName(nameA).split(/\s+/).filter(Boolean);
  const wordsB = normalizeName(nameB).split(/\s+/).filter(Boolean);
  const [shorter, longer] =
    wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA];
  if (shorter.length === 0) return false;
  return shorter.every((word, i) => longer[i] === word);
}

/**
 * Cari foto member secara lokal (public/assets/foto/<team>/<file>.jpg) — dipakai
 * karena field `lineup` pada API Theater tidak menyertakan foto sama sekali.
 * Urutan pencocokan: url_key (exact) -> url_key (fuzzy) -> nama (exact) ->
 * nama (fuzzy) -> foto dari API (jika ada) -> avatar generatif (fallback
 * terakhir, sama seperti dipakai di Member Birthdays).
 *
 * Pencocokan "fuzzy" diperlukan karena nama/slug dari API kadang tidak
 * lengkap dibanding data lokal (mis. API: "Maxine Faye", lokal: "Maxine Faye
 * Lee" / id "maxine_faye_lee") — match exact akan gagal walau member-nya
 * sama, sehingga sebelumnya jatuh ke avatar random.
 */
export function resolveTheaterMemberPhoto(opts: {
  urlKey?: string | null;
  name: string;
  apiImg?: string | null;
}): string {
  const { urlKey, name, apiImg } = opts;

  if (urlKey) {
    const slugId = slugToMemberId(urlKey);

    const byId = MEMBERS.find((m) => m.id === slugId);
    if (byId) return getMemberPhotoUrl(byId);

    const byIdFuzzy = MEMBERS.find((m) => idsFuzzyMatch(m.id, slugId));
    if (byIdFuzzy) return getMemberPhotoUrl(byIdFuzzy);
  }

  const byName = MEMBERS.find(
    (m) => normalizeName(m.name) === normalizeName(name)
  );
  if (byName) return getMemberPhotoUrl(byName);

  const byNameFuzzy = MEMBERS.find((m) => namesFuzzyMatch(m.name, name));
  if (byNameFuzzy) return getMemberPhotoUrl(byNameFuzzy);

  if (apiImg) return apiImg;

  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}&backgroundColor=ffdfbf,ffd5dc,c0aede,d1d4f9,b6e3f4`;
}

/**
 * Persingkat label tier tiket, mis. "General Admission" -> "General".
 * Cuma membuang akhiran kata "Admission" (kalau ada) supaya badge/heading
 * tidak kepanjangan, sisanya label API dipakai apa adanya.
 */
export function shortenTicketLabel(label: string): string {
  const shortened = label.replace(/\s*admission\s*$/i, "").trim();
  return shortened || label;
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

export function formatTheaterDate(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatTheaterPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Format tanggal-jam singkat untuk kartu periode penjualan tiket,
 * mis. "01 Agu, 21.30" — dipakai untuk rentang "start_date → end_date"
 * pada `sales_period`. Selalu diformat dalam zona waktu Asia/Jakarta
 * (WIB) supaya tampilannya konsisten untuk semua user, apa pun timezone
 * device mereka.
 */
export function formatTheaterPeriodDateTime(dateStr: string): string {
  try {
    const parts = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).formatToParts(new Date(dateStr));

    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";

    const day = get("day");
    const month = get("month").replace(/\.$/, "");
    const hour = get("hour");
    const minute = get("minute");

    return `${day} ${month}, ${hour}.${minute}`;
  } catch {
    return dateStr;
  }
}

/** `true` jika tanggal show (YYYY-MM-DD) sudah lewat dari hari ini. */
export function isTheaterShowPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const showDate = new Date(`${dateStr}T00:00:00`);
  return showDate.getTime() < today.getTime();
}