import { motion } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CHANNELS, type ChannelKey } from "@/lib/youtube";
import { cn } from "@/lib/utils";

/* ─── Icons ───────────────────────────────────────────────────────────────── */
const IconArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
  </svg>
);
const IconExternalLink = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
const IconShare = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconWarning = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-red-400">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconExpand = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);
const IconShrink = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
  </svg>
);

/* ─── Live Dot Badge ──────────────────────────────────────────────────────── */
function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white",
        className,
      )}
      style={{ background: "#ff0000" }}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      Live
    </span>
  );
}

/* ─── Elapsed Timer ───────────────────────────────────────────────────────── */
function ElapsedTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const label = h > 0
    ? `${h}:${pad(m)}:${pad(s)}`
    : `${pad(m)}:${pad(s)}`;
  return <span className="text-xs text-muted-foreground tabular-nums">{label}</span>;
}

/* ─── YouTube Embed Player ────────────────────────────────────────────────── */
function YouTubeEmbedPlayer({
  videoId,
  isMobile,
  isPortrait = false,
}: {
  videoId: string;
  isMobile: boolean;
  isPortrait?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isPortraitRef = useRef(isPortrait);
  useEffect(() => { isPortraitRef.current = isPortrait; }, [isPortrait]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const isMobileDevice = () =>
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const lockLandscape = async () => {
      try {
        if (screen.orientation?.lock) await screen.orientation.lock("landscape");
      } catch { /* ignore */ }
    };

    const lockPortrait = async () => {
      try {
        if (screen.orientation?.lock) await screen.orientation.lock("portrait");
        else screen.orientation?.unlock?.();
      } catch {
        try { screen.orientation?.unlock?.(); } catch { /* ignore */ }
      }
    };

    const unlockOrientation = () => {
      try { screen.orientation?.unlock?.(); } catch { /* ignore */ }
    };

    const handler = () => {
      const fsEl = document.fullscreenElement || (document as any).webkitFullscreenElement;
      setIsFullscreen(!!fsEl);
      if (fsEl) {
        if (isMobileDevice()) {
          if (isPortraitRef.current) lockPortrait();
          else lockLandscape();
        }
      } else {
        if (isMobileDevice()) unlockOrientation();
      }
    };

    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
      try { screen.orientation?.unlock?.(); } catch { /* ignore */ }
    };
  }, []);

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black overflow-hidden"
      style={{
        borderRadius: isFullscreen ? "0" : "0.75rem",
        aspectRatio: "16/9",
        border: "1px solid rgba(220,38,38,0.15)",
      }}
    >
      <iframe
        src={embedUrl}
        title="YouTube Live Stream"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-none"
      />
      {/* Fullscreen button overlay */}
      {!isMobile && (
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-3 right-3 z-10 rounded-lg bg-black/60 p-2 text-white opacity-0 transition-opacity hover:opacity-100 hover:bg-black/80 backdrop-blur-sm group-hover:opacity-100"
          title={isFullscreen ? "Keluar fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <IconShrink /> : <IconExpand />}
        </button>
      )}
    </div>
  );
}

/* ─── Channel Info Bar ────────────────────────────────────────────────────── */
function ChannelInfoBar({
  channelKey,
  videoId,
  title,
  onShare,
  shared,
}: {
  channelKey: ChannelKey;
  videoId: string;
  title: string;
  onShare: () => void;
  shared: boolean;
}) {
  const channel = CHANNELS[channelKey];
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface-hover/40 px-4 py-3">
      <div className="flex items-start gap-3">
        {/* Channel icon placeholder */}
        <div
          className="h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-black text-white"
          style={{ background: `hsl(${channel.color})` }}
        >
          YT
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold truncate">{channel.name}</span>
            <LiveBadge />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{title}</p>
          <div className="mt-1 flex items-center gap-2">
            <ElapsedTimer />
            <span className="text-xs text-muted-foreground">· Sedang live di YouTube</span>
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <a
            href={ytUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-surface-hover"
            title="Buka di YouTube"
          >
            <IconExternalLink />
            <span className="hidden sm:inline">YouTube</span>
          </a>
          <button
            onClick={onShare}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
              shared
                ? "border-green-500/40 bg-green-500/10 text-green-500"
                : "border-border hover:bg-surface-hover",
            )}
            title="Bagikan"
          >
            {shared ? <IconCheck /> : <IconShare />}
            <span className="hidden sm:inline">{shared ? "Tersalin" : "Bagikan"}</span>
          </button>
        </div>
      </div>
      {/* Description note */}
      <div className="mt-3 rounded-lg bg-primary/5 px-3 py-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Kamu sedang menonton <span className="font-semibold text-foreground">live stream resmi</span> dari{" "}
          <span className="font-semibold text-foreground">{channel.name}</span> di YouTube.
          Untuk pengalaman lengkap (live chat, super chat), buka di YouTube langsung.
        </p>
      </div>
    </div>
  );
}

/* ─── Main YouTubeLivePlayerPage ─────────────────────────────────────────── */
export default function YouTubeLivePlayerPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const videoId = params.get("videoId");
  const channelKey = params.get("channelKey") as ChannelKey | null;
  const titleParam = params.get("title");

  const title = titleParam ? decodeURIComponent(titleParam) : "";

  const [shared, setShared] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false,
  );

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobileLayout(e.matches);
    mql.addEventListener("change", onChange);
    setIsMobileLayout(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Lock scroll on mobile
  useEffect(() => {
    if (!isMobileLayout) return;
    const main = document.querySelector("main");
    const prevMain = main?.style.overflow ?? "";
    const prevBody = document.body.style.overflow;
    if (main) main.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      if (main) main.style.overflow = prevMain;
      document.body.style.overflow = prevBody;
    };
  }, [isMobileLayout]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} - YouTube Live`, url });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {}
  }, [title]);

  const handleBack = useCallback(() => {
    if (channelKey) navigate(`/channel/${channelKey}`);
    else navigate(-1);
  }, [channelKey, navigate]);

  if (!videoId || !channelKey || !(channelKey in CHANNELS)) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <IconWarning />
        </div>
        <div className="text-center">
          <p className="text-foreground font-semibold mb-1">Live stream tidak ditemukan</p>
          <p className="text-muted-foreground text-sm">Parameter stream tidak valid atau telah berakhir.</p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm text-white"
          style={{ background: "linear-gradient(135deg,hsl(0,80%,50%),hsl(0,70%,38%))" }}
        >
          <IconArrowLeft />
          Kembali ke Beranda
        </button>
      </motion.div>
    );
  }

  const backButton = (
    <button
      onClick={handleBack}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-full px-3 py-1.5 hover:bg-surface-hover"
    >
      <IconArrowLeft />
      {CHANNELS[channelKey].name}
    </button>
  );

  const playerNode = (
    <YouTubeEmbedPlayer
      videoId={videoId}
      isMobile={isMobileLayout}
    />
  );

  const infoNode = (
    <ChannelInfoBar
      channelKey={channelKey}
      videoId={videoId}
      title={title}
      onShare={handleShare}
      shared={shared}
    />
  );

  // ── Mobile: sticky player + scroll below ──────────────────────────────────
  if (isMobileLayout) {
    return (
      <div className="flex flex-col" style={{ height: "calc(100dvh - 56px)" }}>
        <div className="flex-shrink-0 bg-black w-full">
          {playerNode}
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-3 pb-24">
            <div className="pt-2 pb-1">{backButton}</div>
            {infoNode}
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop: single column (no sidebar needed for YouTube embed) ──────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="page-enter"
    >
      <div className="px-3 sm:px-6 pt-3 pb-1">{backButton}</div>
      <div className="mx-auto px-3 py-4 sm:px-6 max-w-[900px]">
        {playerNode}
        {infoNode}
      </div>
    </motion.div>
  );
}