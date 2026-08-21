// ============================================================
// JKT48 Members Data — khusus tab "Member Birthdays Counter"
// ------------------------------------------------------------
// File ini terpisah dari src/data/members.ts (dipakai fitur Member Live)
// agar tidak saling bentrok. Ubah data di sini untuk menambah / mengedit /
// menghapus member pada Birthdays Counter.
//
// Field `photo` menerima:
//   1. URL online, contoh:
//        photo: "https://example.com/foto.jpg"
//   2. Gambar lokal — taruh file di `src/assets/members/`
//      lalu import di atas dan pakai variabel-nya:
//        import freyaPhoto from "@/assets/members/freya.jpg";
//        ...
//        { ..., photo: freyaPhoto }
//   3. Path publik dari folder `public/`, contoh:
//        photo: "/members/freya.jpg"
//
// Jika `photo` dikosongkan, aplikasi otomatis pakai avatar
// generatif berbasis nama (DiceBear).
// ============================================================

// Contoh import gambar lokal (uncomment & sesuaikan file-nya):
// import freyaPhoto from "@/assets/members/freya.jpg";

export type Team = "Passion" | "Love" | "Dream" | "Trainee";

export interface BirthdayMember {
  id: string;
  name: string;
  nickname: string;
  team: Team;
  birthday: string;
  birthYear?: number;
  photo?: string;
}

/**
 * Helper: hasilkan avatar fallback jika `photo` kosong.
 */
export function getMemberPhoto(m: BirthdayMember): string {
  if (m.photo && m.photo.trim().length > 0) return m.photo;
  const seed = encodeURIComponent(m.nickname || m.name);
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}&backgroundColor=ffdfbf,ffd5dc,c0aede,d1d4f9,b6e3f4`;
}

export const members: BirthdayMember[] = [

  // -------------------- Tim Love --------------------

  { id: "l1", name: "Alya Amanda", nickname: "Alya", team: "Love", birthday: "08-26", birthYear: 2006, photo: "/assets/foto/love/alya.jpg" },

  { id: "l2", name: "Anindya Ramadhani", nickname: "Anindya", team: "Love", birthday: "10-18", birthYear: 2005, photo: "/assets/foto/love/anindya.jpg" },

  { id: "l3", name: "Aurellia", nickname: "Lia", team: "Love", birthday: "10-29", birthYear: 2002, photo: "/assets/foto/love/lia.jpg" },

  { id: "l4", name: "Aurhel Alana", nickname: "Lana", team: "Love", birthday: "09-14", birthYear: 2006, photo: "/assets/foto/love/lana.jpg" },

  { id: "l5", name: "Celline Thefani", nickname: "Elin", team: "Love", birthday: "04-09", birthYear: 2007, photo: "/assets/foto/love/elin.jpg" },

  { id: "l6", name: "Cynthia Yaputera", nickname: "Cynthia", team: "Love", birthday: "11-22", birthYear: 2003, photo: "/assets/foto/love/cynthia.jpg" },

  { id: "l7", name: "Fiony Alveria", nickname: "Fiony", team: "Love", birthday: "02-04", birthYear: 2002, photo: "/assets/foto/love/fiony.jpg" },

  { id: "l8", name: "Fritzy Rosmerian", nickname: "Fritzy", team: "Love", birthday: "07-28", birthYear: 2008, photo: "/assets/foto/love/fritzy.jpg" },

  { id: "l9", name: "Grace Octaviani", nickname: "Gracie", team: "Love", birthday: "10-18", birthYear: 2007, photo: "/assets/foto/love/gracie.jpg" },

  { id: "l10", name: "Hillary Abigail", nickname: "Lily", team: "Love", birthday: "10-17", birthYear: 2007, photo: "/assets/foto/love/lily.jpg" },

  { id: "l11", name: "Indah Cahya", nickname: "Indah", team: "Love", birthday: "03-20", birthYear: 2001, photo: "/assets/foto/love/indah.jpg" },

  { id: "l12", name: "Jazzlyn Trisha", nickname: "Trisha", team: "Love", birthday: "02-16", birthYear: 2011, photo: "/assets/foto/love/trisha.jpg" },

  { id: "l13", name: "Michelle Alexandra", nickname: "Michie", team: "Love", birthday: "04-22", birthYear: 2009, photo: "/assets/foto/love/michie.jpg" },

  { id: "l14", name: "Nayla Suji", nickname: "Nayla", team: "Love", birthday: "06-18", birthYear: 2007, photo: "/assets/foto/love/nayla.jpg" },

  // -------------------- Tim Dream --------------------

  { id: "d1", name: "Adeline Wijaya", nickname: "Delynn", team: "Dream", birthday: "09-01", birthYear: 2007, photo: "/assets/foto/dream/delynn.jpg" },

  { id: "d2", name: "Febriola Sinambela", nickname: "Olla", team: "Dream", birthday: "02-26", birthYear: 2005, photo: "/assets/foto/dream/olla.jpg" },

  { id: "d3", name: "Freya Jayawardana", nickname: "Freya", team: "Dream", birthday: "02-13", birthYear: 2006, photo: "/assets/foto/dream/freya.jpg" },

  { id: "d4", name: "Gabriela Abigail", nickname: "Ella", team: "Dream", birthday: "08-07", birthYear: 2006, photo: "/assets/foto/dream/ella.jpg" },

  { id: "d5", name: "Gita Sekar Andarini", nickname: "Gita", team: "Dream", birthday: "06-30", birthYear: 2001, photo: "/assets/foto/dream/gita.jpg" },

  { id: "d6", name: "Greesella Adhalia", nickname: "Greesel", team: "Dream", birthday: "01-10", birthYear: 2006, photo: "/assets/foto/dream/greesel.jpg" },

  { id: "d7", name: "Helisma Putri", nickname: "Eli", team: "Dream", birthday: "06-15", birthYear: 2000, photo: "/assets/foto/dream/eli.jpg" },

  { id: "d8", name: "Jesslyn Elly", nickname: "Lyn", team: "Dream", birthday: "09-13", birthYear: 2001, photo: "/assets/foto/dream/lyn.jpg" },

  { id: "d9", name: "Marsha Lenathea", nickname: "Marsha", team: "Dream", birthday: "01-09", birthYear: 2006, photo: "/assets/foto/dream/marsha.jpg" },

  { id: "d10", name: "Nina Tutachia", nickname: "Nachia", team: "Dream", birthday: "10-16", birthYear: 2009, photo: "/assets/foto/dream/nachia.jpg" },

  { id: "d11", name: "Oline Manuel", nickname: "Oline", team: "Dream", birthday: "11-03", birthYear: 2007, photo: "/assets/foto/dream/oline.jpg" },

  { id: "d12", name: "Shabilqis Naila", nickname: "Nala", team: "Dream", birthday: "09-01", birthYear: 2008, photo: "/assets/foto/dream/nala.jpg" },

  // -------------------- Tim Passion --------------------

  { id: "p1", name: "Abigail Rachel", nickname: "Aralie", team: "Passion", birthday: "08-06", birthYear: 2008, photo: "/assets/foto/passion/aralie.jpg" },

  { id: "p2", name: "Angelina Christy", nickname: "Christy", team: "Passion", birthday: "12-05", birthYear: 2005, photo: "/assets/foto/passion/christy.jpg" },

  { id: "p3", name: "Catherina Vallencia", nickname: "Erine", team: "Passion", birthday: "08-21", birthYear: 2007, photo: "/assets/foto/passion/erine.jpg" },

  { id: "p4", name: "Cornelia Vanisa", nickname: "Oniel", team: "Passion", birthday: "07-26", birthYear: 2002, photo: "/assets/foto/passion/oniel.jpg" },

  { id: "p5", name: "Dena Natalia", nickname: "Danella", team: "Passion", birthday: "12-16", birthYear: 2005, photo: "/assets/foto/passion/danella.jpg" },

  { id: "p6", name: "Desy Natalia", nickname: "Daisy", team: "Passion", birthday: "12-16", birthYear: 2005, photo: "/assets/foto/passion/daisy.jpg" },

  { id: "p7", name: "Feni Fitriyanti", nickname: "Feni", team: "Passion", birthday: "01-16", birthYear: 1999, photo: "/assets/foto/passion/feni.jpg" },

  { id: "p8", name: "Jessica Chandra", nickname: "Jessi", team: "Passion", birthday: "09-23", birthYear: 2005, photo: "/assets/foto/passion/jessi.jpg" },

  { id: "p9", name: "Kathrina Irene", nickname: "Kathrina", team: "Passion", birthday: "07-26", birthYear: 2005, photo: "/assets/foto/passion/kathrina.jpg" },

  { id: "p10", name: "Lulu Salsabila", nickname: "Lulu", team: "Passion", birthday: "10-23", birthYear: 2002, photo: "/assets/foto/passion/lulu.jpg" },

  { id: "p11", name: "Michelle Levia", nickname: "Levi", team: "Passion", birthday: "01-24", birthYear: 2009, photo: "/assets/foto/passion/levi.jpg" },

  { id: "p12", name: "Mutiara Azzahra", nickname: "Muthe", team: "Passion", birthday: "07-12", birthYear: 2004, photo: "/assets/foto/passion/muthe.jpg" },

  { id: "p13", name: "Raisha Syifa", nickname: "Raisha", team: "Passion", birthday: "11-11", birthYear: 2007, photo: "/assets/foto/passion/raisha.jpg" },

  { id: "p14", name: "Ribka Budiman", nickname: "Ribka", team: "Passion", birthday: "01-13", birthYear: 2009, photo: "/assets/foto/passion/ribka.jpg" },

  { id: "p15", name: "Victoria Kimberly", nickname: "Kimmy", team: "Passion", birthday: "03-08", birthYear: 2010, photo: "/assets/foto/passion/kimmy.jpg" },

  // -------------------- Trainee --------------------

  { id: "t1", name: "Afera Thalia", nickname: "Fera", team: "Trainee", birthday: "10-20", birthYear: 2012, photo: "/assets/foto/trainee/fera.jpg" },

  { id: "t2", name: "Astrella Virgiananda", nickname: "Virgi", team: "Trainee", birthday: "08-06", birthYear: 2010, photo: "/assets/foto/trainee/virgi.jpg" },

  { id: "t3", name: "Aulia Riza", nickname: "Auwia", team: "Trainee", birthday: "07-14", birthYear: 2007, photo: "/assets/foto/trainee/auwia.jpg" },

  { id: "t4", name: "Bong Aprilli", nickname: "Rilly", team: "Trainee", birthday: "04-01", birthYear: 2010, photo: "/assets/foto/trainee/rilly.jpg" },

  { id: "t5", name: "Carissa Dini", nickname: "Carissa", team: "Trainee", birthday: "02-02", birthYear: 2012, photo: "/assets/foto/trainee/carissa.jpg" },

  { id: "t6", name: "Christabella Bonita", nickname: "Bella", team: "Trainee", birthday: "03-02", birthYear: 2011, photo: "/assets/foto/trainee/bella.jpg" },

  { id: "t7", name: "Fahira Putri", nickname: "Fahira", team: "Trainee", birthday: "08-13", birthYear: 2012, photo: "/assets/foto/trainee/fahira.jpg" },

  { id: "t8", name: "Fatimah Azzahra", nickname: "Rara", team: "Trainee", birthday: "08-30", birthYear: 2010, photo: "/assets/foto/trainee/rara.jpg" },

  { id: "t9", name: "Hagia Sopia", nickname: "Giaa", team: "Trainee", birthday: "07-01", birthYear: 2008, photo: "/assets/foto/trainee/giaa.jpg" },

  { id: "t10", name: "Heidi Suyangga", nickname: "Heidi", team: "Trainee", birthday: "08-27", birthYear: 2008, photo: "/assets/foto/trainee/heidi.jpg" },

  { id: "t11", name: "Humaira Ramadhani", nickname: "Maira", team: "Trainee", birthday: "08-13", birthYear: 2011, photo: "/assets/foto/trainee/maira.jpg" },

  { id: "t12", name: "Jacqueline Immanuela", nickname: "Ekin", team: "Trainee", birthday: "07-09", birthYear: 2009, photo: "/assets/foto/trainee/ekin.jpg" },

  { id: "t13", name: "Jemima Evodie", nickname: "Jemima", team: "Trainee", birthday: "11-09", birthYear: 2009, photo: "/assets/foto/trainee/jemima.jpg" },

  { id: "t14", name: "Maxine Faye", nickname: "Maxine", team: "Trainee", birthday: "12-02", birthYear: 2011, photo: "/assets/foto/trainee/maxine.jpg" },

  { id: "t15", name: "Mikaela Kusjanto", nickname: "Mikaela", team: "Trainee", birthday: "12-15", birthYear: 2007, photo: "/assets/foto/trainee/mikaela.jpg" },

  { id: "t16", name: "Nur Intan", nickname: "Intan", team: "Trainee", birthday: "02-24", birthYear: 2006, photo: "/assets/foto/trainee/intan.jpg" },

  { id: "t17", name: "Putry Jazyta", nickname: "Jazzy", team: "Trainee", birthday: "03-12", birthYear: 2011, photo: "/assets/foto/trainee/jazzy.jpg" },

  { id: "t18", name: "Ralyne Van Irwan", nickname: "Ralyne", team: "Trainee", birthday: "10-15", birthYear: 2011, photo: "/assets/foto/trainee/ralyne.jpg" },

  { id: "t19", name: "Sona Kalyana", nickname: "Sona", team: "Trainee", birthday: "12-01", birthYear: 2011, photo: "/assets/foto/trainee/sona.jpg" },

];

// ============================================================
// Utilitas seleksi member berdasarkan tab.
// ============================================================

/** Hitung berapa hari lagi menuju ulang tahun (0 = hari-H). */
export function daysUntilBirthday(birthday: string, now: Date = new Date()): number {
  const [m, d] = birthday.split("-").map(Number);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
  const diff = next.getTime() - today.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/** True jika hari ini (waktu lokal) sama dengan tanggal ulang tahun. */
export function isBirthdayToday(birthday: string, now: Date = new Date()): boolean {
  const [m, d] = birthday.split("-").map(Number);
  return now.getMonth() + 1 === m && now.getDate() === d;
}

/** Hitung umur member berdasarkan birthYear. Mengembalikan undefined jika birthYear tidak ada. */
export function getMemberAge(birthday: string, birthYear: number | undefined, now: Date = new Date()): number | undefined {
  if (!birthYear) return undefined;
  const [bMonth, bDay] = birthday.split("-").map(Number);
  let age = now.getFullYear() - birthYear;
  if (now.getMonth() + 1 < bMonth || (now.getMonth() + 1 === bMonth && now.getDate() < bDay)) {
    age--;
  }
  return age;
}

/** Urutkan member berdasarkan ulang tahun terdekat. */
export function sortByUpcoming(list: BirthdayMember[], now: Date = new Date()): BirthdayMember[] {
  return [...list].sort(
    (a, b) => daysUntilBirthday(a.birthday, now) - daysUntilBirthday(b.birthday, now),
  );
}

/** Urutkan ID secara numerik (l1, l2, ..., l9, l10, l11) alih-alih leksikografis (l1, l10, l11, l2). */
function compareIds(a: string, b: string): number {
  const ma = a.match(/^([a-zA-Z]+)(\d+)$/);
  const mb = b.match(/^([a-zA-Z]+)(\d+)$/);
  if (ma && mb) {
    const prefixCmp = ma[1].localeCompare(mb[1]);
    if (prefixCmp !== 0) return prefixCmp;
    return parseInt(ma[2], 10) - parseInt(mb[2], 10);
  }
  return a.localeCompare(b);
}

/** Urutkan member berdasarkan tim (Love → Dream → Passion → Trainee) lalu ID. */
export function sortByTeamAndId(list: BirthdayMember[]): BirthdayMember[] {
  const teamOrder: Record<Team, number> = {
    Love: 0,
    Dream: 1,
    Passion: 2,
    Trainee: 3,
  };
  return [...list].sort((a, b) => {
    const diff = teamOrder[a.team] - teamOrder[b.team];
    if (diff !== 0) return diff;
    return compareIds(a.id, b.id);
  });
}

// Urutan tab: Ulang Tahun Terdekat → Love → Dream → Passion → Trainee → Semua → Favorit
export const TAB_KEYS = [
  "upcoming",
  "love",
  "dream",
  "passion",
  "trainee",
  "all",
  "favorites",
] as const;
export type TabKey = (typeof TAB_KEYS)[number];

export const TAB_LABELS: Record<TabKey, string> = {
  upcoming: "Ulang Tahun Terdekat",
  favorites: "Favorit",
  love: "Tim Love",
  dream: "Tim Dream",
  passion: "Tim Passion",
  trainee: "Trainee",
  all: "Semua Member",
};

/**
 * Ambil member untuk sebuah tab.
 * - "upcoming": dibatasi 5 member dengan ulang tahun terdekat.
 * - Tab tim (love/dream/passion/trainee): tampilkan SEMUA member tim tersebut,
 *   diurutkan berdasarkan ulang tahun terdekat.
 */
export function getMembersForTab(
  tab: TabKey,
  favoriteIds: string[] = [],
  now: Date = new Date(),
): BirthdayMember[] {
  if (tab === "all") return sortByTeamAndId(members);
  if (tab === "upcoming") {
    // Legacy flat list (dipakai jika ada konsumen lain). MemberTabs pakai getUpcomingGrouped.
    const teams = sortByUpcoming(members.filter((m) => m.team !== "Trainee"), now).slice(0, 5);
    const trainees = sortByUpcoming(members.filter((m) => m.team === "Trainee"), now).slice(0, 5);
    return [...teams, ...trainees];
  }
  if (tab === "favorites") {
    return sortByUpcoming(members.filter((m) => favoriteIds.includes(m.id)), now);
  }
  const teamMap: Record<Exclude<TabKey, "upcoming" | "all" | "favorites">, Team> = {
    love: "Love",
    dream: "Dream",
    passion: "Passion",
    trainee: "Trainee",
  };
  const team = teamMap[tab as Exclude<TabKey, "upcoming" | "all" | "favorites">];
  return sortByUpcoming(members.filter((m) => m.team === team), now);
}

/**
 * Kelompokkan tab "Ulang Tahun Terdekat" menjadi dua seksi:
 * - Tim (Love / Dream / Passion) — 5 member terdekat.
 * - Trainee — 5 member terdekat.
 */
export function getUpcomingGrouped(now: Date = new Date()): {
  teams: BirthdayMember[];
  trainees: BirthdayMember[];
} {
  return {
    teams: sortByUpcoming(members.filter((m) => m.team !== "Trainee"), now).slice(0, 5),
    trainees: sortByUpcoming(members.filter((m) => m.team === "Trainee"), now).slice(0, 5),
  };
}