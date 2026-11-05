/**
 * Client untuk endpoint Theater JKT48Connect API (generasi terbaru) —
 * https://api.jkt48connect.app/docs/guide/jadwal-dan-theater
 *
 *   daftar jadwal : GET /api/theater?page=&perpage=   -> { theater: [...], page, perpage, total_count }
 *   detail show   : GET /api/theater/:id              -> { shows: [ {...} ] }
 *
 * ── Apa yang berubah dari API lama ───────────────────────────────────────────────────────────────
 *   lama : https://jkt48connect.com/api/v1/theater/{reference_code}   header `x-api-key: jk48c_…`
 *   baru : https://api.jkt48connect.app/api/theater/{id}              header `X-API-Key: jkc_…`
 *
 * Field yang TIDAK lagi tersedia dari API: harga default, kuota, periode & tier penjualan tiket
 * (`sales_period`), jam selesai. Dokumentasi mengarahkan info pembelian ke tautan resmi pada respons
 * (`link` di sini), jadi UI menampilkan tombol "Info & tiket resmi" menggantikan kartu periode penjualan.
 * Field BARU yang dimanfaatkan: setlist, member graduation, rekaman YouTube, foto lineup dari API.
 *
 * ── Transport ────────────────────────────────────────────────────────────────────────────────────
 * API key `jkc_…` tidak boleh berada di browser, jadi request dilakukan oleh Supabase Edge Function
 * `theater` (`supabase/functions/theater/index.ts`) yang mengembalikan data yang SUDAH dinormalisasi ke
 * bentuk di bawah ini (lihat `shapeTheaterPage` / `shapeTheaterDetail` di `supabase/functions/_shared`).
 */

import { callEdge } from "@/lib/edge";
import { MEMBERS, getMemberPhotoUrl } from "@/data/members";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Anggota lineup pada list & detail show. `img` = foto dari API (bisa kosong). */
export interface TheaterLineupMember {
  id: string | number;
  name: string;
  url_key: string;
  img?: string;
}

/** Anggota pada `birthday_members` / `graduation_members` di show. */
export interface TheaterApiMember {
  name: string;
  type: string;
  member_id: number | string;
  img: string;
}

/** Rekaman show yang sudah diunggah ke YouTube (unlisted). */
export interface TheaterRecording {
  title: string;
  youtube_url: string;
  thumbnail: string;
}

/** Satu entri pada daftar jadwal theater. */
export interface TheaterListItem {
  /** ID show dari API — dipakai untuk route `/theater/:referenceCode` dan `GET /api/theater/:id`. */
  reference_code: string;
  /** Tautan halaman resmi show (info tiket), "" bila tidak ada. */
  link: string;
  /** YYYY-MM-DD (WIB). */
  date: string;
  /** HH:mm (WIB), "" bila API tidak memberi jam. */
  start_time: string;
  /** HH:mm (WIB), "" bila API tidak memberi jam selesai. */
  end_time: string;
  title: string;
  /** LOVE / DREAM / PASSION / TRAINEE, "" bila tidak ada. */
  jkt48_member_type: string;
  is_birthday_show: boolean;
  /** "" bila gambar jadwal belum selesai dirender API (status bukan `ready`). */
  banner: string;
  poster: string;
  short_description: string | null;
  lineup: TheaterLineupMember[];
  birthday_members: TheaterApiMember[];
}

/** Detail lengkap satu show. */
export interface TheaterDetail extends TheaterListItem {
  /** Judul lagu pada setlist (kosong bila belum diumumkan). */
  set_list: string[];
  graduation_members: TheaterApiMember[];
  recordings: TheaterRecording[];
}

// ─── Fetchers ───────────────────────────────────────────────────────────────

/** Satu halaman daftar jadwal (`GET /api/theater?page=N`). */
export interface TheaterSchedulePage {
  items: TheaterListItem[];
  page: number;
  perpage: number;
  total: number;
  /** Batas halaman yang diizinkan Edge Function. */
  max_pages?: number;
}

/**
 * Ambil SATU halaman jadwal. Daftar tidak lagi diminta sekaligus: request besar sering melewati batas waktu
 * API, jadi halaman 1 diambil dulu (cepat tampil), lalu halaman lain lewat `fetchTheaterRemaining`.
 */
export async function fetchTheaterPage(page = 1): Promise<TheaterSchedulePage> {
  const data = await callEdge<TheaterSchedulePage>(
    "theater",
    { action: "list", page: String(page) },
    "Gagal menghubungi layanan jadwal theater.",
  );
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    page: data?.page ?? page,
    perpage: data?.perpage ?? 0,
    total: data?.total ?? 0,
    max_pages: data?.max_pages,
  };
}

/** Jumlah halaman yang perlu diambil berdasarkan halaman 1 (dibatasi `max_pages` dari server). */
export function theaterPageCount(first: TheaterSchedulePage): number {
  const size = first.perpage || first.items.length;
  if (size <= 0 || first.total <= first.items.length) return 1;
  return Math.max(1, Math.min(first.max_pages ?? 5, Math.ceil(first.total / size)));
}

/**
 * Ambil halaman 2..N SECARA PARALEL. Halaman yang gagal dilewati (tidak menggagalkan yang lain), sehingga
 * daftar tetap tampil walau sebagian halaman lambat/error.
 */
export async function fetchTheaterRemaining(first: TheaterSchedulePage): Promise<TheaterListItem[]> {
  const count = theaterPageCount(first);
  const results = await Promise.allSettled(
    Array.from({ length: count - 1 }, (_, i) => fetchTheaterPage(i + 2)),
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value.items : []));
}

/** Gabungkan beberapa daftar; entri yang muncul belakangan menimpa yang lama (berdasarkan reference_code). */
export function mergeTheaterShows(...lists: TheaterListItem[][]): TheaterListItem[] {
  const map = new Map<string, TheaterListItem>();
  for (const list of lists) for (const s of list) map.set(s.reference_code, s);
  return [...map.values()];
}

// ─── Cache lokal jadwal (tampil instan, diperbarui di latar) ────────────────

const SCHEDULE_CACHE_KEY = "jkt48:theater-schedule:v1";
/** Salinan lokal lebih tua dari ini tidak dipakai lagi. */
const SCHEDULE_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 3;

export function readCachedSchedule(): { data: TheaterListItem[]; at: number } | null {
  try {
    const raw = localStorage.getItem(SCHEDULE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: TheaterListItem[]; at?: number };
    if (!Array.isArray(parsed.data) || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > SCHEDULE_CACHE_MAX_AGE) return null;
    return { data: parsed.data, at: parsed.at };
  } catch {
    return null;
  }
}

export function writeCachedSchedule(data: TheaterListItem[]) {
  try {
    localStorage.setItem(SCHEDULE_CACHE_KEY, JSON.stringify({ data, at: Date.now() }));
  } catch {
    /* penyimpanan penuh / diblokir — abaikan */
  }
}

/**
 * Ambil detail lengkap satu show teater berdasarkan `reference_code`-nya
 * (didapat dari hasil `fetchTheaterSchedule`).
 */
export async function fetchTheaterDetail(referenceCode: string): Promise<TheaterDetail | null> {
  if (!referenceCode) return null;
  const data = await callEdge<TheaterDetail | null>(
    "theater",
    { action: "detail", reference_code: referenceCode },
    "Gagal menghubungi layanan jadwal theater.",
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
 * Mapping LANGSUNG `url_key` (dari API JKT48Connect) -> path foto lokal
 * (public/assets/foto/<team>/<file>.webp), untuk SEMUA tim (Love, Dream,
 * Passion, Trainee).
 *
 * Alasan mapping ini perlu terpisah dari `MEMBERS`: `url_key` yang dikirim
 * API selalu berupa nickname pendek (mis. "fera", "alya", "gracie", "kimmy"
 * — lihat contoh field `lineup`/`url_key` pada endpoint detail show),
 * sedangkan `id`/`photoFile` di `MEMBERS` kebanyakan memakai nama lengkap
 * (mis. "alya_amanda", "grace_octaviani", "victoria_kimberly") yang malah
 * TIDAK sama dengan nama file foto yang sebenarnya ada di
 * `public/assets/foto/<team>/`. Karena itu match berbasis `id`/nama di
 * bawah sering gagal dan jatuh ke avatar generatif. Nama file foto di semua
 * folder tim justru sudah konsisten memakai nickname yang sama persis
 * dengan `url_key` API, jadi paling aman dan akurat untuk di-match langsung
 * lewat mapping eksplisit ini (bukan fuzzy match).
 *
 * Key selalu huruf kecil (dibandingkan lewat `normalizeUrlKey`). Hanya
 * mendaftarkan nickname yang foto lokalnya benar-benar ada di
 * `public/assets/foto/`; kalau ada member baru/foto yang belum ditambahkan
 * (mis. saat ini "cathy" & "gendis" belum punya file), otomatis jatuh ke
 * pencocokan fallback (`id`/nama) atau avatar generatif di bawah — supaya
 * tidak ada gambar rusak (404).
 */
const LOCAL_PHOTO_BY_URL_KEY: Record<string, string> = {
  // ─── Trainee ──────────────────────────────────────────────────────────
  fera: "/assets/foto/trainee/fera.webp",
  virgi: "/assets/foto/trainee/virgi.webp",
  auwia: "/assets/foto/trainee/auwia.webp",
  rilly: "/assets/foto/trainee/rilly.webp",
  carissa: "/assets/foto/trainee/carissa.webp",
  bella: "/assets/foto/trainee/bella.webp",
  fahira: "/assets/foto/trainee/fahira.webp",
  rara: "/assets/foto/trainee/rara.webp",
  giaa: "/assets/foto/trainee/giaa.webp",
  heidi: "/assets/foto/trainee/heidi.webp",
  maira: "/assets/foto/trainee/maira.webp",
  ekin: "/assets/foto/trainee/ekin.webp",
  jemima: "/assets/foto/trainee/jemima.webp",
  maxine: "/assets/foto/trainee/maxine.webp",
  mikaela: "/assets/foto/trainee/mikaela.webp",
  intan: "/assets/foto/trainee/intan.webp",
  jazzy: "/assets/foto/trainee/jazzy.webp",
  ralyne: "/assets/foto/trainee/ralyne.webp",
  sona: "/assets/foto/trainee/sona.webp",

  // ─── Team Love ────────────────────────────────────────────────────────
  anindya: "/assets/foto/love/anindya.webp",
  lia: "/assets/foto/love/lia.webp",
  lana: "/assets/foto/love/lana.webp",
  elin: "/assets/foto/love/elin.webp",
  cynthia: "/assets/foto/love/cynthia.webp",
  fiony: "/assets/foto/love/fiony.webp",
  fritzy: "/assets/foto/love/fritzy.webp",
  gracie: "/assets/foto/love/gracie.webp",
  lily: "/assets/foto/love/lily.webp",
  indah: "/assets/foto/love/indah.webp",
  trisha: "/assets/foto/love/trisha.webp",
  michie: "/assets/foto/love/michie.webp",
  nayla: "/assets/foto/love/nayla.webp",

  // ─── Team Dream ───────────────────────────────────────────────────────
  delynn: "/assets/foto/dream/delynn.webp",
  olla: "/assets/foto/dream/olla.webp",
  freya: "/assets/foto/dream/freya.webp",
  ella: "/assets/foto/dream/ella.webp",
  gita: "/assets/foto/dream/gita.webp",
  greesel: "/assets/foto/dream/greesel.webp",
  eli: "/assets/foto/dream/eli.webp",
  lyn: "/assets/foto/dream/lyn.webp",
  marsha: "/assets/foto/dream/marsha.webp",
  nachia: "/assets/foto/dream/nachia.webp",
  oline: "/assets/foto/dream/oline.webp",
  nala: "/assets/foto/dream/nala.webp",

  // ─── Team Passion ─────────────────────────────────────────────────────
  aralie: "/assets/foto/passion/aralie.webp",
  christy: "/assets/foto/passion/christy.webp",
  erine: "/assets/foto/passion/erine.webp",
  oniel: "/assets/foto/passion/oniel.webp",
  danella: "/assets/foto/passion/danella.webp",
  daisy: "/assets/foto/passion/daisy.webp",
  feni: "/assets/foto/passion/feni.webp",
  jessi: "/assets/foto/passion/jessi.webp",
  kathrina: "/assets/foto/passion/kathrina.webp",
  lulu: "/assets/foto/passion/lulu.webp",
  levi: "/assets/foto/passion/levi.webp",
  muthe: "/assets/foto/passion/muthe.webp",
  raisha: "/assets/foto/passion/raisha.webp",
  ribka: "/assets/foto/passion/ribka.webp",
  kimmy: "/assets/foto/passion/kimmy.webp",
};

/** Normalisasi `url_key` API supaya bisa dibandingkan ke key di atas (huruf kecil, `-`/spasi -> `_`, trim). */
function normalizeUrlKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/**
 * Cari foto member secara lokal (public/assets/foto/<team>/<file>.webp) — dipakai
 * karena field `lineup` pada API Theater tidak menyertakan foto sama sekali.
 * Urutan pencocokan: url_key -> foto lokal (mapping langsung, lihat
 * `LOCAL_PHOTO_BY_URL_KEY`, berlaku untuk semua tim) -> url_key (exact ke
 * `MEMBERS.id`) -> url_key (fuzzy) -> nama (exact) -> nama (fuzzy) -> nama
 * panggilan -> foto dari API (jika ada) -> avatar generatif (fallback terakhir, sama seperti
 * dipakai di Member Birthdays).
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
    const normalizedUrlKey = normalizeUrlKey(urlKey);

    // `url_key` API terbaru kadang berformat "jkt48_gracie" (seperti username IDN/Showroom) — coba juga
    // tanpa prefix "jkt48_" supaya tetap cocok dengan mapping nickname di atas.
    const localPhoto =
      LOCAL_PHOTO_BY_URL_KEY[normalizedUrlKey] ??
      LOCAL_PHOTO_BY_URL_KEY[normalizedUrlKey.replace(/^jkt48_/, "")];
    if (localPhoto) return localPhoto;

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

  // Nama panggilan (kata pertama) → foto lokal, mis. API mengirim nama "Gracie" saja.
  const firstWord = normalizeUrlKey(name).split("_")[0];
  const byNickname = firstWord ? LOCAL_PHOTO_BY_URL_KEY[firstWord] : undefined;
  if (byNickname) return byNickname;

  if (apiImg) return apiImg;

  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}&backgroundColor=ffdfbf,ffd5dc,c0aede,d1d4f9,b6e3f4`;
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

/** `true` jika tanggal show (YYYY-MM-DD) sudah lewat dari hari ini. */
export function isTheaterShowPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const showDate = new Date(`${dateStr}T00:00:00`);
  return showDate.getTime() < today.getTime();
}