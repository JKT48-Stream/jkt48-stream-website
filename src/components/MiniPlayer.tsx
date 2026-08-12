import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { X, Maximize2, ExternalLink, TriangleAlert } from "lucide-react";
import { useMiniPlayer } from "@/lib/miniPlayer";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
  return ytApiPromise;
}

// 100 = video dihapus/privat, 101 & 150 = embedding dinonaktifkan pemilik video
const YT_EMBED_BLOCKED_CODES = [100, 101, 150];

export function MiniPlayer() {
  const { videoId, title, channelTitle, isMini, close } = useMiniPlayer();
  const navigate = useNavigate();
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [embedBlocked, setEmbedBlocked] = useState(false);

  useEffect(() => {
    if (!videoId || !isMini) return;
    let destroyed = false;
    setEmbedBlocked(false);

    loadYouTubeAPI().then(() => {
      if (destroyed || !hostRef.current) return;
      hostRef.current.innerHTML = "";
      const div = document.createElement("div");
      div.id = `yt-mini-player-${videoId}`;
      hostRef.current.appendChild(div);

      try {
        playerRef.current = new window.YT!.Player(div.id, {
          videoId,
          playerVars: { autoplay: 1, rel: 0 },
          events: {
            onError: (e: any) => {
              if (YT_EMBED_BLOCKED_CODES.includes(e?.data)) setEmbedBlocked(true);
            },
          },
        });
      } catch {
        setEmbedBlocked(true);
      }
    });

    return () => {
      destroyed = true;
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [videoId, isMini]);

  if (!videoId || !isMini) return null;

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const thumbUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div className="fixed bottom-16 right-3 z-50 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-player animate-mini-player-in md:bottom-4 md:w-96 group">
      {/* Player */}
      <div className="relative aspect-video bg-black overflow-hidden">
        <div
          ref={hostRef}
          className="absolute inset-0 h-full w-full transition-transform duration-300 group-hover:scale-[1.01]"
        />
        {/* Fallback saat YouTube menolak embed (dinonaktifkan oleh pemilik video) */}
        {embedBlocked && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-3 text-center"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.8),rgba(0,0,0,0.92)), url(${thumbUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <TriangleAlert className="h-5 w-5 text-red-400" />
            <p className="text-[11px] leading-snug text-white/80">
              Tidak bisa diputar di sini. Pemutaran dinonaktifkan oleh pemilik video.
            </p>
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white"
              style={{ background: "linear-gradient(135deg,hsl(0,80%,50%),hsl(0,70%,38%))" }}
            >
              <ExternalLink className="h-3 w-3" />
              Tonton di YouTube
            </a>
          </div>
        )}
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