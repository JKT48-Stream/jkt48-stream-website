import { useEffect, useState } from "react";
import { AlertTriangle, WifiOff, Clock, X, ServerCrash, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiStatusEvent } from "@/lib/youtube";

type ActiveError = Extract<ApiStatusEvent, { type: "error" }> & { since: number };

function formatHMS(ms: number): string {
  if (ms <= 0) return "sebentar lagi";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} jam ${m} menit`;
  if (m > 0) return `${m} menit ${sec} detik`;
  return `${sec} detik`;
}

function formatClockWIB(ts: number): string {
  // Render as HH:mm WIB (UTC+7).
  const d = new Date(ts);
  const wib = new Date(d.getTime() + 7 * 3600 * 1000);
  const hh = wib.getUTCHours().toString().padStart(2, "0");
  const mm = wib.getUTCMinutes().toString().padStart(2, "0");
  return `${hh}:${mm} WIB`;
}

export function ApiStatusBanner() {
  const [err, setErr] = useState<ActiveError | null>(null);
  const [now, setNow] = useState(Date.now());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = (e as CustomEvent<ApiStatusEvent>).detail;
      if (!ev) return;
      if (ev.type === "ok") {
        setErr(null);
        setDismissed(false);
        return;
      }
      setErr((prev) => {
        // Don't reset the "since" timer if the same error keeps firing.
        if (prev && prev.code === ev.code) return prev;
        return { ...ev, since: Date.now() };
      });
      setDismissed(false);
    };
    window.addEventListener("api-status", handler as EventListener);
    return () => window.removeEventListener("api-status", handler as EventListener);
  }, []);

  // Tick once per second so countdowns update live.
  useEffect(() => {
    if (!err) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [err]);

  if (!err || dismissed) return null;

  const variant = (() => {
    switch (err.code) {
      case "QUOTA_EXCEEDED": return "warning" as const;
      case "RATE_LIMITED":   return "warning" as const;
      case "NETWORK":        return "danger"  as const;
      case "UPSTREAM_ERROR": return "danger"  as const;
      case "CONFIG_ERROR":   return "danger"  as const;
      default:               return "danger"  as const;
    }
  })();

  const Icon = (() => {
    switch (err.code) {
      case "QUOTA_EXCEEDED": return Clock;
      case "RATE_LIMITED":   return Clock;
      case "NETWORK":        return WifiOff;
      case "UPSTREAM_ERROR": return ServerCrash;
      case "CONFIG_ERROR":   return KeyRound;
      default:               return AlertTriangle;
    }
  })();

  const title = (() => {
    switch (err.code) {
      case "QUOTA_EXCEEDED": return "Kuota YouTube API habis";
      case "RATE_LIMITED":   return "Terlalu banyak permintaan";
      case "NETWORK":        return "Koneksi terputus";
      case "UPSTREAM_ERROR": return "Server YouTube bermasalah";
      case "CONFIG_ERROR":   return "Konfigurasi API bermasalah";
      default:               return "Terjadi masalah";
    }
  })();

  let detail = err.message;
  if (err.code === "QUOTA_EXCEEDED" && err.resetAt) {
    const remain = err.resetAt - now;
    detail = `Akan otomatis pulih kira-kira pukul ${formatClockWIB(err.resetAt)} (sekitar ${formatHMS(remain)} lagi).`;
  } else if (err.code === "RATE_LIMITED" && err.retryAfterSec) {
    const elapsed = Math.floor((now - err.since) / 1000);
    const remain = Math.max(0, err.retryAfterSec - elapsed) * 1000;
    detail = `Tunggu sekitar ${formatHMS(remain)} sebelum mencoba lagi.`;
  }

  return (
    <div
      role="alert"
      className={cn(
        "fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-3 pointer-events-none",
        "animate-fade-in",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex w-full max-w-3xl items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur",
          "bg-background/95",
          variant === "warning"
            ? "border-amber-500/40 ring-1 ring-amber-500/20"
            : "border-destructive/40 ring-1 ring-destructive/20",
        )}
      >
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            variant === "warning"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : "bg-destructive/15 text-destructive",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
            {detail}
          </p>
          {err.code === "QUOTA_EXCEEDED" && (
            <p className="mt-1 text-[11px] text-muted-foreground/80">
              Kuota YouTube di-reset setiap hari oleh Google. Banner ini akan hilang sendiri saat layanan kembali normal.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Tutup notifikasi"
          className="-mr-1 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}