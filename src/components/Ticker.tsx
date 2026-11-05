import { Link } from "react-router-dom";
import { members, daysUntilBirthday, isBirthdayToday, sortByUpcoming } from "@/data/birthday-members";

/** Pita berjalan tipis: ulang tahun member terdekat (data lokal, tanpa API). */
export function Ticker() {
  const now = new Date();
  const upcoming = sortByUpcoming(members, now).slice(0, 8);
  if (!upcoming.length) return null;

  const items = upcoming.map((m) => {
    const today = isBirthdayToday(m.birthday, now);
    const d = daysUntilBirthday(m.birthday, now);
    return { id: m.id, name: m.nickname, text: today ? "ulang tahun hari ini" : d === 1 ? "besok" : `${d} hari lagi` , today };
  });

  const row = (suffix: string) => (
    <div className="flex items-center gap-8 pr-8" key={suffix}>
      {items.map((it) => (
        <span key={it.id + suffix} className="flex items-center gap-2 whitespace-nowrap">
          <span className={it.today ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" : "text-foreground"}>{it.name}</span>
          <span className="text-muted-foreground">{it.text}</span>
        </span>
      ))}
    </div>
  );

  return (
    <Link
      to="/member-birthdays"
      className="ticker tech-label glass relative flex h-[var(--ticker-h)] items-center overflow-hidden !border-x-0 !border-t-0"
      aria-label="Ulang tahun member terdekat"
    >
      <span className="z-10 flex h-full flex-shrink-0 items-center gap-2 bg-neon px-3 uppercase text-primary-foreground [clip-path:polygon(0_0,100%_0,calc(100%-10px)_100%,0_100%)] pr-5">
        <span className="radar text-white" /> Ulang tahun
      </span>
      <div className="ticker-track">
        {row("a")}
        {row("b")}
      </div>
    </Link>
  );
}