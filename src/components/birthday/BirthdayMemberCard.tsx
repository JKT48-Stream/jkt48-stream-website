import { Cake, Sparkles, Heart, Crown, Medal, Award, Star, Gift, PartyPopper } from "lucide-react";
import { BirthdayCountdownTimer } from "./BirthdayCountdownTimer";
import { getMemberPhoto, type BirthdayMember } from "@/data/birthday-members";
import { useIsBirthdayToday } from "@/hooks/use-birthday-countdown";
import { useBirthdayFavorites } from "@/hooks/use-birthday-favorites";

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const TEAM_STYLE: Record<BirthdayMember["team"], string> = {
  Passion: "bg-team-passion/15 text-team-passion border-team-passion/30",
  Love:    "bg-team-love/15 text-team-love border-team-love/30",
  Dream:   "bg-team-dream/15 text-team-dream border-team-dream/30",
  Trainee: "bg-team-trainee/15 text-team-trainee border-team-trainee/30",
};

interface Props {
  member: BirthdayMember;
  rank?: number;
  /** "podium" enables tiered styling for ranks 1-5 (upcoming birthdays tab). */
  variant?: "default" | "podium";
  /** Show a subtle favorite indicator on the card frame (used in upcoming top 5). */
  favoriteHighlight?: boolean;
}

type PodiumStyle = {
  ring: string;
  badgeBg: string;
  badgeText: string;
  Icon: typeof Crown;
  label: string;
  glow: string;
  cardExtra: string;
};

const PODIUM: Record<number, PodiumStyle> = {
  1: {
    ring: "ring-2 ring-amber-400/70",
    badgeBg: "bg-gradient-to-br from-amber-300 to-amber-500",
    badgeText: "text-amber-950",
    Icon: Crown,
    label: "#1",
    glow: "shadow-[0_20px_50px_-18px_rgba(245,158,11,0.55)]",
    cardExtra: "bg-gradient-to-b from-amber-50/60 to-card dark:from-amber-500/10",
  },
  2: {
    ring: "ring-2 ring-slate-300/70",
    badgeBg: "bg-gradient-to-br from-slate-200 to-slate-400",
    badgeText: "text-slate-900",
    Icon: Medal,
    label: "#2",
    glow: "shadow-[0_16px_40px_-18px_rgba(148,163,184,0.55)]",
    cardExtra: "bg-gradient-to-b from-slate-50/60 to-card dark:from-slate-400/10",
  },
  3: {
    ring: "ring-2 ring-orange-400/60",
    badgeBg: "bg-gradient-to-br from-orange-300 to-orange-600",
    badgeText: "text-orange-950",
    Icon: Award,
    label: "#3",
    glow: "shadow-[0_14px_36px_-18px_rgba(234,88,12,0.5)]",
    cardExtra: "bg-gradient-to-b from-orange-50/60 to-card dark:from-orange-500/10",
  },
  4: {
    ring: "ring-1 ring-primary/30",
    badgeBg: "bg-primary/15 border border-primary/30",
    badgeText: "text-primary",
    Icon: Star,
    label: "#4",
    glow: "",
    cardExtra: "",
  },
  5: {
    ring: "ring-1 ring-primary/20",
    badgeBg: "bg-primary/10 border border-primary/20",
    badgeText: "text-primary",
    Icon: Star,
    label: "#5",
    glow: "",
    cardExtra: "",
  },
};

export function BirthdayMemberCard({ member, rank, variant = "default", favoriteHighlight = false }: Props) {
  const [mm, dd] = member.birthday.split("-").map(Number);
  const dateLabel = member.birthYear
    ? `${dd} ${MONTHS_ID[mm - 1]} ${member.birthYear}`
    : `${dd} ${MONTHS_ID[mm - 1]}`;
  const isToday = useIsBirthdayToday(member.birthday);
  const { isFavorite, toggle } = useBirthdayFavorites();
  const fav = isFavorite(member.id);

  const podium =
    !isToday && variant === "podium" && rank && rank >= 1 && rank <= 5
      ? PODIUM[rank]
      : null;

  const showFavBadge = favoriteHighlight && !isToday && fav;

  const cardEl = (
    <article
      className={`group relative overflow-hidden rounded-2xl border shadow-birthday-card transition-all duration-300 hover:-translate-y-1 hover:shadow-birthday-glow ${
        isToday
          ? "border-transparent bg-gradient-birthday text-primary-foreground shadow-birthday-glow"
          : podium
            ? `border-border/60 bg-card ${podium.ring} ${podium.glow} ${podium.cardExtra}`
            : "border-border bg-card"
      } ${showFavBadge ? "ring-2 ring-rose-400/50 ring-offset-2 ring-offset-background" : ""}`}
    >
      {isToday && (
        <>
          <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-white/30 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary shadow-lg">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            HBD!
          </div>
        </>
      )}

      {podium && (
        <div
          className={`absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black shadow-lg ${podium.badgeBg} ${podium.badgeText}`}
        >
          <podium.Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {podium.label}
        </div>
      )}
      {!podium && rank !== undefined && !isToday && (
        <div className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-lg">
          #{rank}
        </div>
      )}

      <span
        className={`absolute right-3 top-3 z-10 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md ${
          isToday
            ? "border-white/40 bg-white/20 text-primary-foreground"
            : TEAM_STYLE[member.team]
        }`}
      >
        {member.team}
      </span>

      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-secondary to-muted">
        <img
          src={getMemberPhoto(member)}
          alt={member.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div
          className={`absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t ${
            isToday
              ? "from-primary/85 via-primary/60 to-transparent"
              : "from-card via-card/70 to-transparent"
          }`}
        />
        {showFavBadge && (
          <div className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-rose-500 shadow-md ring-1 ring-rose-200 backdrop-blur-md dark:bg-rose-500/95 dark:text-white dark:ring-rose-300/40">
            <Heart className="h-3 w-3 fill-current" aria-hidden="true" />
            Favorit
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3
              className={`truncate text-lg font-bold ${
                isToday ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              {member.nickname}
            </h3>
            <p
              className={`truncate text-xs ${
                isToday ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}
            >
              {member.name}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle(member.id);
            }}
            aria-label={fav ? `Hapus ${member.nickname} dari favorit` : `Tambahkan ${member.nickname} ke favorit`}
            aria-pressed={fav}
            className={`-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-90 ${
              fav
                ? isToday
                  ? "text-white"
                  : "text-primary"
                : isToday
                  ? "text-primary-foreground/70 hover:text-white"
                  : "text-muted-foreground hover:text-primary"
            }`}
          >
            <Heart
              className={`h-[18px] w-[18px] transition-all ${fav ? "fill-current scale-110" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>

        <div
          className={`mt-2 inline-flex items-center gap-1.5 text-xs ${
            isToday ? "text-primary-foreground/90" : "text-muted-foreground"
          }`}
        >
          <Cake
            className={`h-3.5 w-3.5 shrink-0 ${
              isToday ? "text-primary-foreground" : "text-primary"
            }`}
            aria-hidden="true"
          />
          <span className="truncate">{dateLabel}</span>
        </div>

        <BirthdayCountdownTimer birthday={member.birthday} variant="default" />
      </div>
    </article>
  );

  if (!isToday) return cardEl;

  // Birthday decoration: static gradient halo + SVG icons floating on left/right sides only.
  const leftIcons = [
    { Icon: Gift, color: "text-pink-400", top: "8%", delay: "0s", size: "h-5 w-5" },
    { Icon: Sparkles, color: "text-amber-300", top: "32%", delay: "0.6s", size: "h-4 w-4" },
    { Icon: Heart, color: "text-rose-400 fill-rose-400", top: "58%", delay: "1.2s", size: "h-4 w-4" },
    { Icon: Star, color: "text-amber-300 fill-amber-300", top: "82%", delay: "1.8s", size: "h-3.5 w-3.5" },
  ];
  const rightIcons = [
    { Icon: Crown, color: "text-amber-400 fill-amber-400", top: "10%", delay: "0.3s", size: "h-5 w-5" },
    { Icon: PartyPopper, color: "text-pink-400", top: "34%", delay: "0.9s", size: "h-5 w-5" },
    { Icon: Sparkles, color: "text-fuchsia-400", top: "60%", delay: "1.5s", size: "h-4 w-4" },
    { Icon: Cake, color: "text-rose-400", top: "84%", delay: "2.1s", size: "h-4 w-4" },
  ];

  return (
    <div className="relative">
      {/* Static soft halo behind the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 -z-10 rounded-[1.4rem] bg-gradient-birthday opacity-25 blur-2xl"
      />

      {/* Side rails: vertical gradient strips flanking the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-1.5 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b from-transparent via-primary/70 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-1.5 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b from-transparent via-primary/70 to-transparent"
      />

      {/* Left side SVG icons */}
      {leftIcons.map(({ Icon, color, top, delay, size }, i) => (
        <Icon
          key={`l-${i}`}
          aria-hidden="true"
          className={`pointer-events-none absolute -left-4 z-20 ${size} ${color} drop-shadow-md animate-[bday-float-y_2.8s_ease-in-out_infinite]`}
          style={{ top, animationDelay: delay }}
        />
      ))}

      {/* Right side SVG icons */}
      {rightIcons.map(({ Icon, color, top, delay, size }, i) => (
        <Icon
          key={`r-${i}`}
          aria-hidden="true"
          className={`pointer-events-none absolute -right-4 z-20 ${size} ${color} drop-shadow-md animate-[bday-float-y_2.8s_ease-in-out_infinite]`}
          style={{ top, animationDelay: delay }}
        />
      ))}

      <div className="relative">{cardEl}</div>
    </div>
  );
}