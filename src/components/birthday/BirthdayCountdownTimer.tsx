import { useEffect, useState } from "react";
import { PartyPopper } from "lucide-react";
import { isBirthdayToday } from "@/data/birthday-members";

interface Props {
  birthday: string; // "MM-DD"
  variant?: "default" | "celebration";
}

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isToday: boolean;
}

function computeParts(birthday: string): Parts {
  const [m, d] = birthday.split("-").map(Number);
  const now = new Date();
  const today = isBirthdayToday(birthday, now);
  let target = new Date(now.getFullYear(), m - 1, d, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target = new Date(now.getFullYear() + 1, m - 1, d, 0, 0, 0);
  }
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, isToday: today };
}

export function BirthdayCountdownTimer({ birthday, variant = "default" }: Props) {
  const [parts, setParts] = useState<Parts>(() => computeParts(birthday));

  useEffect(() => {
    const id = setInterval(() => setParts(computeParts(birthday)), 1000);
    return () => clearInterval(id);
  }, [birthday]);

  if (parts.isToday) {
    const big = variant === "celebration";
    return (
      <div
        className={`mt-3 relative overflow-hidden rounded-xl bg-white/95 text-primary shadow-lg ring-1 ring-white/60 ${
          big ? "py-3 px-4" : "py-2.5 px-3"
        }`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-[bday-shimmer_2.4s_ease-in-out_infinite]"
        />
        <div className="relative flex items-center justify-center gap-2">
          <PartyPopper
            className={`${big ? "h-5 w-5" : "h-4 w-4"} shrink-0 text-primary animate-[bday-wiggle_1.2s_ease-in-out_infinite]`}
            aria-hidden="true"
          />
          <span
            className={`font-black tracking-tight ${big ? "text-sm" : "text-xs"}`}
          >
            Sedang Ulang Tahun!
          </span>
          <PartyPopper
            className={`${big ? "h-5 w-5" : "h-4 w-4"} shrink-0 text-primary -scale-x-100 animate-[bday-wiggle_1.2s_ease-in-out_infinite]`}
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  const cells: [string, number][] = [
    ["Hari", parts.days],
    ["Jam", parts.hours],
    ["Menit", parts.minutes],
    ["Detik", parts.seconds],
  ];

  return (
    <div className="mt-3 grid grid-cols-4 gap-1 sm:gap-1.5">
      {cells.map(([label, value]) => (
        <div
          key={label}
          className="min-w-0 rounded-lg bg-secondary/60 px-0.5 py-1 text-center backdrop-blur-sm sm:py-1.5"
        >
          <div className="font-mono text-xs font-bold leading-none tabular-nums text-foreground sm:text-base">
            {String(value).padStart(2, "0")}
          </div>
          <div className="mt-1 whitespace-nowrap text-[8px] font-medium uppercase leading-none tracking-normal text-muted-foreground sm:mt-0.5 sm:text-[10px] sm:tracking-wider">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}