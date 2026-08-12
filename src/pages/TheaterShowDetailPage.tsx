import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  Cake,
  Users,
  Ticket,
  ListMusic,
  Armchair,
  DoorOpen,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import {
  fetchTheaterDetail,
  formatTheaterDate,
  formatTheaterPrice,
  formatTheaterPeriodDateTime,
  getTheaterTeamBadgeClass,
  resolveTheaterMemberPhoto,
  isTheaterShowPast,
  shortenTicketLabel,
} from "@/lib/theater";
import { cn } from "@/lib/utils";

// ─── Small info stat block ──────────────────────────────────────────────────

function InfoStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Member avatar (lineup / birthday) ──────────────────────────────────────

function MemberAvatar({
  photo,
  name,
  highlight = false,
}: {
  photo: string;
  name: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 bg-muted",
          highlight ? "border-amber-400 shadow-[0_0_0_3px_rgba(245,158,11,0.15)]" : "border-border",
        )}
      >
        <img
          src={photo}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            const seed = encodeURIComponent(name);
            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}&backgroundColor=ffdfbf,ffd5dc,c0aede,d1d4f9,b6e3f4`;
          }}
        />
        {highlight && (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-semibold text-amber-950 shadow-sm sm:text-[10px]">
            <Cake className="h-2.5 w-2.5" /> HBD
          </span>
        )}
      </div>
      <span className="truncate text-center text-xs font-medium text-foreground sm:text-sm">
        {name}
      </span>
    </div>
  );
}

// ─── Skeleton foto member (dipakai saat loading, biar mirip layout asli) ────

function MemberAvatarSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="aspect-[3/4] w-full animate-pulse rounded-xl border-2 border-border bg-muted" />
      <div className="mx-auto h-3 w-3/4 animate-pulse rounded bg-muted" />
    </div>
  );
}

// ─── Kartu periode penjualan tiket ──────────────────────────────────────────

function SalesPeriodCard({
  label,
  startDate,
  endDate,
  salesMethod,
  pricing,
}: {
  label: string;
  startDate: string;
  endDate: string;
  salesMethod: string;
  pricing: { label: string; price: number; quota: number; is_ofc_only?: boolean }[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold text-foreground sm:text-lg">
          {shortenTicketLabel(label)}
        </h3>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {formatTheaterPeriodDateTime(startDate)} → {formatTheaterPeriodDateTime(endDate)}
      </p>

      {pricing.length > 0 && (
        <>
          <div className="my-3 border-t border-border" />
          <div className="space-y-2">
            {pricing.map((p, j) => (
              <div key={j} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-muted-foreground">
                  {shortenTicketLabel(p.label)}
                  {p.is_ofc_only && (
                    <span className="ml-1 text-[10px] uppercase text-muted-foreground/70">
                    </span>
                  )}
                </span>
                <span className="flex-shrink-0 whitespace-nowrap">
                  <span className="text-muted-foreground">
                    {p.quota} slot
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TheaterShowDetailPage() {
  const { referenceCode = "" } = useParams<{ referenceCode: string }>();

  const {
    data: show,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["theater-detail", referenceCode],
    queryFn: () => fetchTheaterDetail(referenceCode),
    staleTime: 1000 * 60 * 5,
    enabled: !!referenceCode,
  });

  if (isLoading) {
    return (
      <div className="px-3 py-4 sm:px-6">
        <div className="mb-4 h-5 w-24 animate-pulse rounded bg-muted" />

        {/* Banner */}
        <div className="mx-auto aspect-[11/6] w-full max-w-2xl animate-pulse rounded-2xl bg-muted md:max-w-3xl" />

        {/* Quick info grid — Harga, Tim, Waktu, Kuota */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>

        {/* Deskripsi singkat */}
        <div className="mt-4 h-11 w-full animate-pulse rounded-xl bg-muted" />

        {/* Lineup member — dengan placeholder foto biar lebih hidup */}
        <div className="mt-6">
          <div className="mb-3 h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 lg:gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <MemberAvatarSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Info penjualan tiket */}
        <div className="mt-6 mb-4">
          <div className="mb-3 h-6 w-52 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-14 animate-pulse rounded bg-muted" />
                </div>
                <div className="mt-2 h-3 w-44 animate-pulse rounded bg-muted" />
                <div className="my-3 border-t border-border" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !show) {
    return (
      <div className="px-3 py-8 text-center sm:px-6">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive/60" />
        <p className="mb-4 text-sm text-muted-foreground">
          Jadwal theater tidak ditemukan atau gagal dimuat.
        </p>
        <Link
          to="/theater"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Jadwal
        </Link>
      </div>
    );
  }

  const past = isTheaterShowPast(show.date);

  return (
    <div className="px-3 py-4 sm:px-6">
      {/* Back */}
      <Link
        to="/theater"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Jadwal
      </Link>

      {/* Banner hero — rasio tetap 11:6, ukuran dibatasi biar tidak raksasa di layar lebar */}
      <div className="relative mx-auto aspect-[11/6] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-muted md:max-w-3xl">
        <img
          src={show.banner}
          alt={show.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        <div className="absolute left-0 right-0 top-0 flex items-center gap-2 p-3">
          {show.is_birthday_show && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-[11px] font-semibold text-amber-950 shadow-sm">
              <Cake className="h-3.5 w-3.5" /> Birthday Show
            </span>
          )}
          {past && (
            <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
              Selesai
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <h1 className="text-xl font-bold leading-snug text-white drop-shadow sm:text-2xl">
            {show.title}
          </h1>
          <p className="mt-1 text-sm text-white/85">
            {formatTheaterDate(show.date)}
          </p>
        </div>
      </div>

      {/* Quick info grid — Harga sejajar dengan Tim / Waktu / Kuota */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoStat
          icon={Users}
          label="Tim"
          value={
            <span
              className={cn(
                "inline-block rounded-full border px-2 py-0.5 text-xs",
                getTheaterTeamBadgeClass(show.jkt48_member_type),
              )}
            >
              Team {show.jkt48_member_type}
            </span>
          }
        />
        <InfoStat
          icon={Clock}
          label="Waktu"
          value={`${show.start_time} – ${show.end_time}`}
        />
        <InfoStat
          icon={Users}
          label="Kuota"
          value={`${show.total_quota} orang`}
        />
        <InfoStat
          icon={Ticket}
          label="Harga"
          value={formatTheaterPrice(show.default_price)}
        />
      </div>

      {show.short_description && (
        <p className="mt-4 rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
          {show.short_description}
        </p>
      )}

      {/* Birthday spotlight */}
      {show.is_birthday_show && show.birthday_members?.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-foreground">
            <Cake className="h-5 w-5 text-amber-500" /> Special Birthday Show
          </h2>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 lg:gap-3">
              {show.birthday_members.map((m) => (
                <MemberAvatar
                  key={m.member_id}
                  name={m.name}
                  highlight
                  photo={resolveTheaterMemberPhoto({
                    name: m.name,
                    apiImg: m.img,
                  })}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lineup */}
      {show.lineup?.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold text-foreground">
            Lineup Member
          </h2>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 lg:gap-3">
              {show.lineup.map((m) => (
                <MemberAvatar
                  key={m.id}
                  name={m.name}
                  photo={resolveTheaterMemberPhoto({
                    urlKey: m.url_key,
                    name: m.name,
                  })}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sales period */}
      {show.sales_period?.length > 0 && (
        <section className="mt-6 mb-4">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-foreground">
            <CalendarDays className="h-5 w-5 text-primary" /> Info Penjualan Tiket
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {show.sales_period.map((period, i) => (
              <SalesPeriodCard
                key={`${period.label}-${i}`}
                label={period.label}
                startDate={period.start_date}
                endDate={period.end_date}
                salesMethod={period.sales_method}
                pricing={period.pricing ?? []}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}