import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Theater, Clock, Cake, AlertCircle, Users } from "lucide-react";
import {
  fetchTheaterSchedule,
  fetchTheaterDetail,
  formatTheaterDate,
  getTheaterTeamBadgeClass,
  isTheaterShowPast,
  type TheaterListItem,
} from "@/lib/theater";
import { cn } from "@/lib/utils";

// ─── Skeleton ───────────────────────────────────────────────────────────────

function TheaterCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-video w-full animate-pulse bg-muted" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────

function TheaterShowCard({
  show,
  birthdayNames,
}: {
  show: TheaterListItem;
  birthdayNames?: string[] | null;
}) {
  const past = isTheaterShowPast(show.date);

  return (
    <Link
      to={`/theater/${show.reference_code}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
        past && "opacity-70 hover:opacity-100",
      )}
    >
      {/* Banner — pakai aspect-video supaya proporsional dengan banner API */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <img
          src={show.banner}
          alt={show.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {show.is_birthday_show && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-[11px] font-semibold text-amber-950 shadow-sm">
            <Cake className="h-3.5 w-3.5" />
            Birthday Show
          </div>
        )}
        {past && (
          <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
            Selesai
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-semibold leading-snug text-foreground">
          {show.title}
        </h3>

        <p className="text-sm text-muted-foreground">
          {formatTheaterDate(show.date)}
        </p>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            {show.start_time} – {show.end_time}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              getTheaterTeamBadgeClass(show.jkt48_member_type),
            )}
          >
            Team {show.jkt48_member_type}
          </span>
        </div>

        {show.is_birthday_show && (
          <div className="mt-1 flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-500">
            <Cake className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span className="leading-snug">
              {birthdayNames && birthdayNames.length > 0
                ? `Birthday: ${birthdayNames.join(", ")}`
                : "Special Birthday Show"}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────

function ScheduleSection({
  title,
  shows,
  birthdayNamesByCode,
}: {
  title: string;
  shows: TheaterListItem[];
  birthdayNamesByCode: Map<string, string[]>;
}) {
  if (shows.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-bold text-foreground">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shows.map((show) => (
          <TheaterShowCard
            key={show.reference_code}
            show={show}
            birthdayNames={birthdayNamesByCode.get(show.reference_code)}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TheaterSchedulePage() {
  const {
    data: schedule = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["theater-schedule"],
    queryFn: fetchTheaterSchedule,
    staleTime: 1000 * 60 * 5,
  });

  const { upcoming, past } = useMemo(() => {
    const sorted = [...schedule].sort((a, b) => {
      const da = `${a.date}T${a.start_time}`;
      const db = `${b.date}T${b.start_time}`;
      return da.localeCompare(db);
    });
    return {
      upcoming: sorted.filter((s) => !isTheaterShowPast(s.date)),
      past: sorted.filter((s) => isTheaterShowPast(s.date)).reverse(),
    };
  }, [schedule]);

  // Ambil nama member yang berulang tahun — hanya untuk show birthday, karena
  // field `lineup` pada list API tidak menyertakan info ini, harus dari detail.
  const birthdayShows = useMemo(
    () => schedule.filter((s) => s.is_birthday_show),
    [schedule],
  );

  const birthdayDetailQueries = useQueries({
    queries: birthdayShows.map((show) => ({
      queryKey: ["theater-detail", show.reference_code],
      queryFn: () => fetchTheaterDetail(show.reference_code),
      staleTime: 1000 * 60 * 10,
      enabled: birthdayShows.length > 0,
    })),
  });

  const birthdayNamesByCode = useMemo(() => {
    const map = new Map<string, string[]>();
    birthdayShows.forEach((show, i) => {
      const detail = birthdayDetailQueries[i]?.data;
      if (detail?.birthday_members?.length) {
        map.set(
          show.reference_code,
          detail.birthday_members.map((m) => m.name),
        );
      }
    });
    return map;
  }, [birthdayShows, birthdayDetailQueries]);

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-4 flex items-center gap-2">
        <Theater className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Jadwal Theater JKT48</h1>
      </div>

      {isError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Gagal memuat jadwal theater. Coba muat ulang halaman.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <TheaterCardSkeleton key={i} />
          ))}
        </div>
      ) : schedule.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Belum ada jadwal theater yang tersedia saat ini.
          </p>
        </div>
      ) : (
        <>
          <ScheduleSection
            title="Akan Datang"
            shows={upcoming}
            birthdayNamesByCode={birthdayNamesByCode}
          />
          <ScheduleSection
            title="Sudah Berlangsung"
            shows={past}
            birthdayNamesByCode={birthdayNamesByCode}
          />
        </>
      )}
    </div>
  );
}