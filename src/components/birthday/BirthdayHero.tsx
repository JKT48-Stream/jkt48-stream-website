import { Cake, PartyPopper } from "lucide-react";
import { useCallback, useMemo } from "react";
import { members, daysUntilBirthday, getMemberPhoto } from "@/data/birthday-members";

import { useNow, useIsBirthdayToday } from "@/hooks/use-birthday-countdown";

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Tim yang tampil di Hero (Love / Dream / Passion). Trainee tidak termasuk. */
const HERO_TEAMS = ["Love", "Dream", "Passion"] as const;

export function BirthdayHero() {
  // Tick tiap menit agar daftar "Berikutnya" otomatis bergeser saat lewat tengah malam.
  const now = useNow(60_000);

  const upcoming = useMemo(() => {
    const coreMembers = members.filter((m) =>
      HERO_TEAMS.includes(m.team as (typeof HERO_TEAMS)[number]),
    );
    const sorted = [...coreMembers].sort(
      (a, b) => daysUntilBirthday(a.birthday, now) - daysUntilBirthday(b.birthday, now),
    );
    if (sorted.length === 0) return [];
    const first = sorted[0];
    // Ambil semua member yang punya tanggal ulang tahun sama dengan yang terdekat.
    return sorted.filter((m) => m.birthday === first.birthday);
  }, [now]);

  const days = upcoming.length > 0 ? daysUntilBirthday(upcoming[0].birthday, now) : 0;
  const [mm, dd] = upcoming.length > 0 ? upcoming[0].birthday.split("-").map(Number) : [0, 0];
  const dateLabel = upcoming.length > 0 ? `${dd} ${MONTHS_ID[mm - 1]}` : "";

  // scrollIntoView dipakai (bukan sekadar href="#...") supaya animasi scroll
  // selalu satu gerakan yang konsisten & smooth — termasuk memperhitungkan
  // sticky Navbar lewat class "scroll-mt-header" pada section tujuan — dan
  // tidak "patah" karena tercampur dengan efek lompat-hash bawaan browser.
  const scrollToMembers = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById("birthday-members");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 -z-10 bg-gradient-birthday-hero" />
      <div className="absolute inset-0 -z-10 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,hsl(var(--primary))_0,transparent_45%),radial-gradient(circle_at_80%_60%,hsl(var(--team-love))_0,transparent_40%)]" />

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.2fr_1fr] md:py-24">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Live Countdown
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Hitung Mundur{" "}
            <span className="bg-gradient-birthday bg-clip-text text-transparent">
              Ulang Tahun
            </span>{" "}
            Member JKT48
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
            Jangan sampai ketinggalan momen spesial oshi-mu. Pantau ulang tahun
            member Tim Passion, Love, dan Dream di satu tempat.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#birthday-members"
              onClick={scrollToMembers}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-birthday-glow transition-transform hover:scale-105"
            >
              Lihat Semua Member
            </a>
          </div>
        </div>

        {/* Next-up card(s) */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-birthday-card">
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {upcoming.length > 1 ? `Berikutnya · ${upcoming.length} Member` : "Berikutnya"}
              </span>
              <span className="shrink-0 whitespace-nowrap rounded-full bg-gradient-birthday px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                {days === 0 ? "Hari ini!" : `${days} hari lagi`}
              </span>
            </div>

            <div className="mb-3 inline-flex items-center gap-1.5 text-xs text-primary">
              <Cake className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{dateLabel}</span>
            </div>

            <ul className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 scrollbar-none">
              {upcoming.map((m) => (
                <NextUpRow
                  key={m.id}
                  member={m}
                  solo={upcoming.length === 1}
                />
              ))}
            </ul>

          </div>
          <div className="absolute -bottom-6 -right-6 -z-10 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
        </div>
      </div>
    </section>
  );
}

function NextUpRow({ member, solo }: { member: (typeof members)[number]; solo: boolean }) {
  const isToday = useIsBirthdayToday(member.birthday);
  return (
    <li
      className={`flex items-center gap-4 rounded-2xl p-3 transition-all ${
        isToday
          ? "bg-gradient-birthday text-primary-foreground shadow-birthday-glow ring-1 ring-primary/40"
          : "bg-secondary/40"
      }`}
    >
      <img
        src={getMemberPhoto(member)}
        alt={member.name}
        className={`shrink-0 rounded-2xl object-cover ring-2 ${
          isToday ? "ring-white/60" : "ring-primary/30"
        } ${solo ? "h-20 w-20 sm:h-24 sm:w-24" : "h-16 w-16 sm:h-[72px] sm:w-[72px]"}`}
      />
      <div className="min-w-0 flex-1">
        <div
          className={`truncate font-black ${
            solo ? "text-xl sm:text-2xl" : "text-lg"
          } ${isToday ? "text-primary-foreground" : "text-foreground"}`}
        >
          {member.nickname}
        </div>
        <div
          className={`truncate ${solo ? "text-sm" : "text-xs"} ${
            isToday ? "text-primary-foreground/85" : "text-muted-foreground"
          }`}
        >
          {member.name}
        </div>
      </div>
      {isToday && (
        <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
          <PartyPopper className="h-3 w-3" aria-hidden="true" />
          HBD
        </span>
      )}
    </li>
  );
}