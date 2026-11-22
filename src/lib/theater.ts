import { callEdge } from "@/lib/edge";
import { MEMBERS, getMemberPhotoUrl } from "@/data/members";

export interface TheaterLineupMember {
  id: string | number;
  name: string;
  url_key: string;
  img?: string;
}

export interface TheaterApiMember {
  name: string;
  type: string;
  member_id: number | string;
  img: string;
}

export interface TheaterRecording {
  title: string;
  youtube_url: string;
  thumbnail: string;
}

export interface TheaterListItem {
  reference_code: string;
  link: string;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  jkt48_member_type: string;
  is_birthday_show: boolean;
  banner: string;
  poster: string;
  short_description: string | null;
  lineup: TheaterLineupMember[];
  birthday_members: TheaterApiMember[];
}

export interface TheaterDetail extends TheaterListItem {
  set_list: string[];
  graduation_members: TheaterApiMember[];
  recordings: TheaterRecording[];
}

export interface TheaterSchedulePage {
  items: TheaterListItem[];
  page: number;
  perpage: number;
  total: number;
  max_pages?: number;
}

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

export function theaterPageCount(first: TheaterSchedulePage): number {
  const size = first.perpage || first.items.length;
  if (size <= 0 || first.total <= first.items.length) return 1;
  return Math.max(1, Math.min(first.max_pages ?? 5, Math.ceil(first.total / size)));
}

export async function fetchTheaterRemaining(first: TheaterSchedulePage): Promise<TheaterListItem[]> {
  const count = theaterPageCount(first);
  const results = await Promise.allSettled(
    Array.from({ length: count - 1 }, (_, i) => fetchTheaterPage(i + 2)),
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value.items : []));
}

export function mergeTheaterShows(...lists: TheaterListItem[][]): TheaterListItem[] {
  const map = new Map<string, TheaterListItem>();
  for (const list of lists) for (const s of list) map.set(s.reference_code, s);
  return [...map.values()];
}

const SCHEDULE_CACHE_KEY = "jkt48:theater-schedule:v1";
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
  }
}

export async function fetchTheaterDetail(referenceCode: string): Promise<TheaterDetail | null> {
  if (!referenceCode) return null;
  const data = await callEdge<TheaterDetail | null>(
    "theater",
    { action: "detail", reference_code: referenceCode },
    "Gagal menghubungi layanan jadwal theater.",
  );
  return data ?? null;
}

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

function slugToMemberId(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, "_");
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function idsFuzzyMatch(idA: string, idB: string): boolean {
  const wordsA = idA.split("_").filter(Boolean);
  const wordsB = idB.split("_").filter(Boolean);
  const [shorter, longer] =
    wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA];
  if (shorter.length === 0) return false;
  return shorter.every((word, i) => longer[i] === word);
}

function namesFuzzyMatch(nameA: string, nameB: string): boolean {
  const wordsA = normalizeName(nameA).split(/\s+/).filter(Boolean);
  const wordsB = normalizeName(nameB).split(/\s+/).filter(Boolean);
  const [shorter, longer] =
    wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA];
  if (shorter.length === 0) return false;
  return shorter.every((word, i) => longer[i] === word);
}

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

function normalizeUrlKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function resolveTheaterMemberPhoto(opts: {
  urlKey?: string | null;
  name: string;
  apiImg?: string | null;
}): string {
  const { urlKey, name, apiImg } = opts;

  if (urlKey) {
    const normalizedUrlKey = normalizeUrlKey(urlKey);
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

  const firstWord = normalizeUrlKey(name).split("_")[0];
  const byNickname = firstWord ? LOCAL_PHOTO_BY_URL_KEY[firstWord] : undefined;
  if (byNickname) return byNickname;

  if (apiImg) return apiImg;

  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}&backgroundColor=ffdfbf,ffd5dc,c0aede,d1d4f9,b6e3f4`;
}

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

export function isTheaterShowPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const showDate = new Date(`${dateStr}T00:00:00`);
  return showDate.getTime() < today.getTime();
}