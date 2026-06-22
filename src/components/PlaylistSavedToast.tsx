import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ListVideo, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  playlistTitle: string;
  videoTitle: string;
  videoThumb?: string;
  onClose: () => void;
  duration?: number;
};

export function PlaylistSavedToast({
  playlistTitle,
  videoTitle,
  videoThumb,
  onClose,
  duration = 4000,
}: Props) {
  const [state, setState] = useState<"entering" | "visible" | "leaving">("entering");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    if (state === "leaving") return;
    setState("leaving");
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimeout(onClose, 380);
  };

  useEffect(() => {
    const raf = requestAnimationFrame(() => setState("visible"));
    timerRef.current = setTimeout(dismiss, duration);
    return () => {
      cancelAnimationFrame(raf);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const toast = (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{ zIndex: 99999 }}
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm",
        "pointer-events-auto select-none",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl shadow-2xl",
          "bg-background border border-border",
          "transition-all duration-[380ms]",
          state === "entering"
            ? "opacity-0 translate-y-6 scale-95"
            : state === "leaving"
            ? "opacity-0 translate-y-3 scale-95"
            : "opacity-100 translate-y-0 scale-100",
          "ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        )}
      >
        {/* Progress bar */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-primary/20 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-glow origin-left"
            style={{
              animation:
                state === "visible"
                  ? `playlist-toast-shrink ${duration}ms linear forwards`
                  : undefined,
            }}
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-3.5">
          {/* Animated check icon */}
          <div className="relative flex-shrink-0">
            <span
              className={cn(
                "absolute inset-0 rounded-full bg-primary/20",
                state === "visible" && "animate-[pulse-ring_0.8s_ease-out_forwards]",
              )}
            />
            <CheckCircle2
              className={cn(
                "h-9 w-9 text-primary relative z-10 transition-all duration-500",
                state === "visible"
                  ? "scale-100 opacity-100 rotate-0"
                  : "scale-50 opacity-0 rotate-[-30deg]",
              )}
              strokeWidth={2.2}
            />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">
              Tersimpan ke playlist!
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ListVideo className="h-3 w-3 text-primary flex-shrink-0" />
              <p className="text-xs text-primary font-medium truncate">{playlistTitle}</p>
            </div>
            {videoTitle && (
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-[180px]">
                {videoTitle}
              </p>
            )}
          </div>

          {/* Thumbnail */}
          {videoThumb && (
            <img
              src={videoThumb}
              alt=""
              className="h-11 w-[72px] flex-shrink-0 rounded-xl object-cover shadow-sm"
            />
          )}

          {/* Close button */}
          <button
            onClick={dismiss}
            className="flex-shrink-0 ml-1 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all duration-200 hover:rotate-90"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Decorative left strip */}
        <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-primary to-primary-glow rounded-l-2xl" />
      </div>
    </div>
  );

  return createPortal(toast, document.body);
}