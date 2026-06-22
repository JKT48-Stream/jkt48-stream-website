import { useNavigate } from "react-router-dom";
import { X, Maximize2 } from "lucide-react";
import { useMiniPlayer } from "@/lib/miniPlayer";

export function MiniPlayer() {
  const { videoId, title, channelTitle, isMini, close } = useMiniPlayer();
  const navigate = useNavigate();
  if (!videoId || !isMini) return null;

  return (
    <div className="fixed bottom-16 right-3 z-50 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-player animate-mini-player-in md:bottom-4 md:w-96 group">
      {/* Iframe */}
      <div className="relative aspect-video bg-black overflow-hidden">
        <iframe
          className="absolute inset-0 h-full w-full transition-transform duration-300 group-hover:scale-[1.01]"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
        />
        {/* Controls overlay */}
        <div className="absolute right-1 top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => navigate(`/watch?v=${videoId}`)}
            className="rounded-full bg-black/70 p-1.5 text-white hover:bg-black/90 transition-all duration-150 hover:scale-110 active:scale-90 backdrop-blur-sm"
            aria-label="Buka penuh"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={close}
            className="rounded-full bg-black/70 p-1.5 text-white hover:bg-black/90 transition-all duration-150 hover:scale-110 hover:rotate-90 active:scale-90 backdrop-blur-sm"
            aria-label="Tutup"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Info bar */}
      <div className="p-2 flex items-center gap-2 transition-colors duration-200 group-hover:bg-surface-2">
        <div className="flex-1 min-w-0">
          <p className="line-clamp-1 text-xs font-semibold transition-colors duration-150">{title}</p>
          <p className="line-clamp-1 text-[11px] text-muted-foreground">{channelTitle}</p>
        </div>
        {/* Always-visible close on mobile */}
        <button
          onClick={close}
          className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all duration-150 hover:rotate-90 md:hidden"
          aria-label="Tutup"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bottom progress bar animation */}
      <div className="h-0.5 bg-primary/20 overflow-hidden">
        <div
          className="h-full bg-primary"
          style={{
            animation: "mini-progress 1.5s ease-in-out infinite alternate",
            width: "40%",
          }}
        />
      </div>

      <style>{`
        @keyframes mini-progress {
          from { width: 20%; margin-left: 0; }
          to   { width: 60%; margin-left: 40%; }
        }
      `}</style>
    </div>
  );
}