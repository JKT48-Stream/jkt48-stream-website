import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Theater, Clock, Cake, AlertCircle, Users } from "lucide-react";
import {
  fetchTheaterPage,
  fetchTheaterRemaining,
  mergeTheaterShows,
  readCachedSchedule,
  writeCachedSchedule,
  theaterPageCount,
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

function TheaterShowCard({ show }: { show: TheaterListItem }) {
  const past = isTheaterShowPast(show.date);
  // API terbaru membawa nama member birthday langsung di daftar jadwal (tidak perlu request detail per show).
  const birthdayNames = show.birthday_members.map((m) => m.name);

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
        {show.banner ? (
          <img
            src={show.banner}
            alt={show.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          // Gambar jadwal dibuat otomatis oleh API; sebelum statusnya `ready` tampilkan placeholder.
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-muted">
            <Theater className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
        {show.is_birthday_show && (
          <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-semibold text-amber-950 shadow-sm sm:left-2 sm:top-2 sm:px-2.5 sm:py-1 sm:text-[11px]">
            <Cake className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Birthday Show</span>
            <span className="sm:hidden">Birthday</span>
          </div>
        )}
        {past && (
          <div className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white sm:right-2 sm:top-2 sm:px-2.5 sm:py-1 sm:text-[11px]">
            Selesai
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:gap-2 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground sm:text-base">
          {show.title}
        </h3>

        <p className="text-xs text-muted-foreground sm:text-sm">
          {formatTheaterDate(show.date)}
        </p>

        {show.start_time && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground sm:gap-1.5 sm:text-sm">
            <Clock className="h-3 w-3 flex-shrink-0 sm:h-3.5 sm:w-3.5" />
            <span>
              {show.start_time}
              {show.end_time ? ` – ${show.end_time}` : " WIB"}
            </span>
          </div>
        )}

        {show.jkt48_member_type && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 sm:mt-1">
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold sm:px-2 sm:text-[11px]",
                getTheaterTeamBadgeClass(show.jkt48_member_type),
              )}
            >
              Team {show.jkt48_member_type}
            </span>
          </div>
        )}

        {show.is_birthday_show && (
          <div className="mt-0.5 flex items-start gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] text-amber-500 sm:mt-1 sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs">
            <Cake className="mt-0.5 h-3 w-3 flex-shrink-0 sm:h-3.5 sm:w-3.5" />
            <span className="line-clamp-2 leading-snug">
              {birthdayNames.length > 0
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

function ScheduleSection({ title, shows }: { title: string; shows: TheaterListItem[] }) {
  if (shows.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-bold text-foreground">{title}</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {shows.map((show) => (
          <TheaterShowCard key={show.reference_code} show={show} />
        ))}
      </div>
    </section>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TheaterSchedulePage() {
  // Jadwal terakhir (dari kunjungan sebelumnya) langsung ditampilkan sambil data baru dimuat di latar.
  const cached = useMemo(() => readCachedSchedule(), []);

  // 1) Halaman pertama — kecil & cepat, langsung tampil begitu siap.
  const first = useQuery({
    queryKey: ["theater-schedule", "first"],
    queryFn: () => fetchTheaterPage(1),
    staleTime: 1000 * 60 * 10,
  });

  // 2) Halaman berikutnya diambil paralel di latar setelah halaman pertama datang.
  const rest = useQuery({
    queryKey: ["theater-schedule", "rest", first.data?.total, first.data?.perpage],
    queryFn: () => fetchTheaterRemaining(first.data!),
    enabled: !!first.data && theaterPageCount(first.data) > 1,
    staleTime: 1000 * 60 * 10,
  });

  const restDone = !first.data || theaterPageCount(first.data) <= 1 || rest.isSuccess || rest.isError;

  const schedule = useMemo(() => {
    if (!first.data) return cached?.data ?? [];
    // Selama halaman lain belum selesai, pertahankan salinan lama agar daftar tidak "menyusut" sesaat.
    return restDone
      ? mergeTheaterShows(first.data.items, rest.data ?? [])
      : mergeTheaterShows(cached?.data ?? [], first.data.items);
  }, [first.data, rest.data, restDone, cached]);

  // Simpan hasil lengkap untuk kunjungan berikutnya.
  useEffect(() => {
    // Hanya simpan bila semua halaman berhasil, supaya salinan lokal tidak menyusut karena halaman yang gagal.
    const complete = !!first.data && (theaterPageCount(first.data) <= 1 || rest.isSuccess);
    if (complete && schedule.length > 0) writeCachedSchedule(schedule);
  }, [first.data, rest.isSuccess, schedule]);

  const isLoading = first.isLoading && schedule.length === 0;
  const isError = first.isError && schedule.length === 0;
  const isLoadingMore = !!first.data && !restDone;

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

      {isLoadingMore && (
        <p className="mb-3 text-xs text-muted-foreground">Memuat jadwal lainnya…</p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
          <ScheduleSection title="Akan Datang" shows={upcoming} />
          <ScheduleSection title="Sudah Berlangsung" shows={past} />
        </>
      )}
    </div>
  );
}