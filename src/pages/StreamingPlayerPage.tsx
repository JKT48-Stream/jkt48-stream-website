import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  MEMBERS,
  JKT48_OFFICIAL,
  getMemberPhotoUrl,
  TEAM_BADGE_COLORS,
  type Member,
} from "@/data/members";

// Synthetic Member object untuk JKT48 Official agar kompatibel dengan StreamingPlayerPage
const OFFICIAL_MEMBER: Member = {
  id: JKT48_OFFICIAL.id,
  name: JKT48_OFFICIAL.name,
  photoFile: "logo",
  team: "Team Love", // placeholder — tidak ditampilkan untuk official
  teamFolder: "love",
  idnUsername: JKT48_OFFICIAL.idnUsername,
  showroomKey: JKT48_OFFICIAL.showroomKey,
  showroomRoomId: JKT48_OFFICIAL.showroomRoomId,
};
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Platform = "idn" | "showroom";
type PlayerState = "loading" | "playing" | "error" | "refreshing";

type UrlQuality = { label: string; url: string };
type HlsQuality = { index: number; label: string; height: number };

/* ─── Icons ───────────────────────────────────────────────────────────────── */
const IconVolume = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>;
const IconMute = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>;
const IconExpand = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>;
const IconShrink = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>;
const IconRefresh = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
const IconQuality = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>;
const IconPiP = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="2" /><rect x="12" y="13" width="8" height="6" rx="1" fill="currentColor" stroke="none" /></svg>;
const IconExternalLink = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>;
const IconArrowLeft = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>;
const IconShare = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>;
const IconCheck = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12" /></svg>;
const IconWarning = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-red-400"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;

/* ─── Icon Landscape / Portrait ───────────────────────────────────────────── */
const IconLandscape = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <line x1="6" y1="6" x2="6" y2="18" />
    <line x1="18" y1="6" x2="18" y2="18" />
  </svg>
);
const IconPortrait = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="6" y="2" width="12" height="20" rx="2" />
    <line x1="6" y1="6" x2="18" y2="6" />
    <line x1="6" y1="18" x2="18" y2="18" />
  </svg>
);

/* ─── Deteksi apakah device adalah mobile/tablet (touch device) ───────────── */
const isTouchDevice = () =>
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);

/* ─── Live Stats Bar ──────────────────────────────────────────────────────── */
const LiveStatsBar = ({
  member,
  platform,
  liveUrl,
  onShare,
  shared,
}: {
  member: Member;
  platform: Platform;
  liveUrl: string;
  onShare: () => void;
  shared: boolean;
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatElapsed = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isOfficial = member.id === JKT48_OFFICIAL.id;
  const badgeClass = TEAM_BADGE_COLORS[member.team];
  const photoSrc = isOfficial ? "/logo.jpg" : getMemberPhotoUrl(member);

  return (
    <div className="mt-4">
      {/* Baris judul */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-600 text-white text-xs font-black tracking-widest">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-white"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              />
              LIVE
            </div>
            {isOfficial ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-500/15 text-red-400 border-red-500/30">
                Akun Resmi
              </span>
            ) : (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                {member.team}
              </span>
            )}
            <span className="text-xs text-muted-foreground font-mono">{formatElapsed(elapsed)}</span>
          </div>
          <h1 className="text-lg font-bold leading-snug">
            {member.name} Sedang Live di {platform === "idn" ? "IDN Live" : "Showroom"}
          </h1>
        </div>
      </div>

      {/* Baris channel */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-red-500/50 flex-shrink-0">
            <img
              src={photoSrc}
              alt={member.name}
              className="w-full h-full object-cover object-top"
              onError={(e) => { (e.target as HTMLImageElement).src = "/logo.jpg"; }}
            />
          </div>
          <div>
            <p className="font-semibold leading-tight">{member.name}</p>
            <p className="text-xs text-muted-foreground">{isOfficial ? "JKT48 Official" : `JKT48 · ${member.team}`}</p>
          </div>
        </div>

        {/* Tombol aksi */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 rounded-full bg-surface-hover px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            style={{ background: "var(--surface-hover)" }}
          >
            {shared ? <IconCheck /> : <IconShare />}
            <span className="hidden sm:inline">{shared ? "Tersalin" : "Bagikan"}</span>
          </button>
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: "var(--surface-hover)" }}
          >
            <IconExternalLink />
            <span className="hidden sm:inline">Buka di {platform === "idn" ? "IDN Live" : "Showroom"}</span>
          </a>
        </div>
      </div>

      {/* Panel deskripsi */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4 rounded-xl p-4 text-sm"
        style={{ background: "var(--surface-2, hsl(0 0% 10%))" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <motion.span
            className="w-2 h-2 rounded-full bg-red-500"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
          <span className="font-semibold text-red-400 text-xs uppercase tracking-widest">Sedang Live Sekarang</span>
        </div>
        <p className="text-foreground/70 leading-relaxed">
          {member.name} sedang melakukan siaran langsung di platform {platform === "idn" ? "IDN Live" : "Showroom Live"}.
          Saksikan penampilan spesial dari {member.name} secara real-time.
          Dukung idolamu dengan membuka langsung di platform aslinya.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Platform: {platform === "idn" ? "IDN Live" : "Showroom Live"} ·{" "}
          {platform === "idn"
            ? `@${member.idnUsername}`
            : `@${member.showroomKey}`}
        </p>
      </motion.div>
    </div>
  );
};

/* ─── HLS Video Player ────────────────────────────────────────────────────── */
const HlsVideoPlayer = ({
  streamUrl,
  streamQualities,
  onRefresh,
  isMobile = false,
}: {
  streamUrl: string;
  streamQualities: UrlQuality[];
  onRefresh: () => Promise<string | null>;
  isMobile?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringRef = useRef(false);
  const volTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playerState, setPlayerState] = useState<PlayerState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hlsQualities, setHlsQualities] = useState<HlsQuality[]>([]);
  const [currentHlsLevel, setCurrentHlsLevel] = useState(-1);
  const [activeUrlQuality, setActiveUrlQuality] = useState("");
  const [showQuality, setShowQuality] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [isPiPActive, setIsPiPActive] = useState(false);

  // ── Orientasi: hanya aktif di mobile saat fullscreen ──
  const [isLandscapeMode, setIsLandscapeMode] = useState(false);
  const isOrientationLockedRef = useRef(false);

  // Deteksi mobile menggunakan state agar reaktif (bukan ref yang hanya dihitung sekali)
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    const check = () => {
      const isMob =
        ("ontouchstart" in window || navigator.maxTouchPoints > 0) &&
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      setIsMobileDevice(isMob);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Tombol orientasi hanya tampil di mobile device saat fullscreen
  const showOrientationBtn = isMobileDevice && isFullscreen;

  // ── Reset orientasi saat keluar fullscreen ──
  useEffect(() => {
    if (!isFullscreen) {
      // Keluar fullscreen → unlock orientasi & reset state
      if (isOrientationLockedRef.current) {
        try {
          screen.orientation?.unlock?.();
        } catch { /* ignore */ }
        isOrientationLockedRef.current = false;
      }
      setIsLandscapeMode(false);
    }
  }, [isFullscreen]);

  // ── Sync isLandscapeMode dengan orientasi fisik device ──
  useEffect(() => {
    if (!isFullscreen) return;

    const handleOrientationChange = () => {
      const type = screen.orientation?.type ?? "";
      if (type.includes("landscape")) {
        setIsLandscapeMode(true);
      } else if (type.includes("portrait")) {
        setIsLandscapeMode(false);
      }
    };

    screen.orientation?.addEventListener?.("change", handleOrientationChange);
    return () => {
      screen.orientation?.removeEventListener?.("change", handleOrientationChange);
    };
  }, [isFullscreen]);

  /* ── Toggle orientasi: hanya berfungsi saat fullscreen ── */
  const toggleOrientation = useCallback(() => {
    if (!isFullscreen) return;

    const nextLandscape = !isLandscapeMode;
    setIsLandscapeMode(nextLandscape);

    // Coba lock orientasi (best-effort, hanya berhasil di mobile browser yang support)
    const tryLock = async () => {
      try {
        if (screen.orientation && typeof screen.orientation.lock === "function") {
          const lockType = nextLandscape ? "landscape" : "portrait";
          await screen.orientation.lock(lockType);
          isOrientationLockedRef.current = true;
        }
      } catch {
        // Lock gagal (desktop/browser tidak support) — UI state tetap berubah
        isOrientationLockedRef.current = false;
      }
    };
    tryLock();
  }, [isFullscreen, isLandscapeMode]);

  // ── Blank/stall detection ──
  const [showRefreshHint, setShowRefreshHint] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHintTimer = useCallback(() => {
    if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
    if (frameCheckRef.current) { clearInterval(frameCheckRef.current); frameCheckRef.current = null; }
    setShowRefreshHint(false);

    hintTimerRef.current = setTimeout(() => {
      const video = videoRef.current;
      const hasFrame = video && video.videoWidth > 0 && video.readyState >= 3;
      if (!hasFrame) {
        setShowRefreshHint(true);
      }
      frameCheckRef.current = setInterval(() => {
        const v = videoRef.current;
        if (v && v.videoWidth > 0 && v.readyState >= 3) {
          setShowRefreshHint(false);
          if (frameCheckRef.current) { clearInterval(frameCheckRef.current); frameCheckRef.current = null; }
        }
      }, 2000);
    }, 7000);
  }, []);

  const clearHintTimer = useCallback(() => {
    if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
    if (frameCheckRef.current) { clearInterval(frameCheckRef.current); frameCheckRef.current = null; }
    setShowRefreshHint(false);
  }, []);

  const startHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isHoveringRef.current) setShowControls(false);
    }, 5000);
  }, []);

  const cancelHideTimer = useCallback(() => {
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
  }, []);

  // ── Track fullscreen state ── (support webkit prefix for mobile browsers)
  useEffect(() => {
    const fn = () => {
      const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);
      if (isFs) {
        setShowControls(true);
        startHideTimer();
      }
    };
    document.addEventListener("fullscreenchange", fn);
    document.addEventListener("webkitfullscreenchange", fn);
    return () => {
      document.removeEventListener("fullscreenchange", fn);
      document.removeEventListener("webkitfullscreenchange", fn);
    };
  }, [startHideTimer]);

  useEffect(() => {
    const video = videoRef.current; if (!video) return;
    const onEnter = () => setIsPiPActive(true);
    const onLeave = () => setIsPiPActive(false);
    video.addEventListener("enterpictureinpicture", onEnter);
    video.addEventListener("leavepictureinpicture", onLeave);
    return () => {
      video.removeEventListener("enterpictureinpicture", onEnter);
      video.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") toggleMute();
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadIdRef = useRef(0);

  const destroyHls = useCallback(() => {
    loadIdRef.current += 1;

    if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
    if (frameCheckRef.current) { clearInterval(frameCheckRef.current); frameCheckRef.current = null; }

    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch { }
      hlsRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      try { video.pause(); } catch { }
      video.muted = true;
      video.srcObject = null;
      video.removeAttribute("src");
      while (video.firstChild) video.removeChild(video.firstChild);
      video.load();
    }
  }, []);

  const loadStream = useCallback(async (url: string) => {
    const video = videoRef.current; if (!video) return;

    destroyHls();

    const myId = loadIdRef.current;

    setPlayerState("loading");
    setHlsQualities([]); setCurrentHlsLevel(-1);
    setErrorMsg("");
    startHintTimer();

    video.muted = false;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      if (loadIdRef.current !== myId) return;
      video.src = url;
      try { await video.play(); } catch { }
      if (loadIdRef.current !== myId) return;
      setPlayerState("playing");
      startHideTimer();
      return;
    }

    try {
      const { default: Hls } = await import("hls.js");
      if (loadIdRef.current !== myId) return;

      if (!Hls.isSupported()) {
        setErrorMsg("Browser tidak mendukung HLS.");
        setPlayerState("error");
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        autoStartLoad: true,
      });

      if (loadIdRef.current !== myId) { hls.destroy(); return; }

      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (_: any, data: any) => {
        if (loadIdRef.current !== myId) return;
        try { video.play().catch(() => { }); } catch { }
        setPlayerState("playing");
        startHideTimer();
        if (data.levels && data.levels.length > 1) {
          const seen = new Set<string>();
          const levels: HlsQuality[] = data.levels
            .map((lvl: any, i: number) => ({ index: i, label: lvl.height ? `${lvl.height}p` : `Level ${i + 1}`, height: lvl.height ?? 0 }))
            .sort((a: HlsQuality, b: HlsQuality) => b.height - a.height)
            .filter((l: HlsQuality) => { if (seen.has(l.label)) return false; seen.add(l.label); return true; });
          setHlsQualities(levels); setCurrentHlsLevel(-1);
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        if (loadIdRef.current !== myId) return;
        try { const lat = (hls as any).latency; if (lat != null && isFinite(lat)) setLatency(Math.round(lat)); } catch { }
      });

      hls.on(Hls.Events.ERROR, (_: any, data: any) => {
        if (loadIdRef.current !== myId) return;
        if (data.fatal) {
          setErrorMsg(data.type === "networkError"
            ? "Stream tidak dapat dimuat. Token mungkin sudah expire."
            : "Terjadi kesalahan saat memutar stream.");
          setPlayerState("error");
        }
      });

      hls.loadSource(url);
      hls.attachMedia(video);

    } catch {
      if (loadIdRef.current !== myId) return;
      setErrorMsg("Gagal memuat HLS player.");
      setPlayerState("error");
    }
  }, [destroyHls, startHintTimer, startHideTimer]);

  useEffect(() => {
    if (streamUrl) {
      if (streamQualities.length > 0) setActiveUrlQuality(streamUrl);
      loadStream(streamUrl);
    }
    return () => { destroyHls(); clearHintTimer(); };
  }, [streamUrl, loadStream, destroyHls, clearHintTimer]);

  const handleRefreshStream = useCallback(async () => {
    setPlayerState("refreshing");
    const newUrl = await onRefresh();
    if (newUrl) await loadStream(newUrl);
    else { setErrorMsg("Gagal refresh. Coba buka langsung di platform."); setPlayerState("error"); }
  }, [onRefresh, loadStream]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current; if (!video) return;
    video.muted = !video.muted; setIsMuted(video.muted);
  }, []);

  const handleVolume = useCallback((val: number) => {
    const video = videoRef.current; if (!video) return;
    video.volume = val; video.muted = val === 0; setVolume(val); setIsMuted(val === 0);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
    try {
      if (!isFs) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
      }
    } catch { /* ignore */ }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current; if (!video) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture().catch(() => { });
    else await video.requestPictureInPicture().catch(() => { });
  }, []);

  const switchHlsLevel = useCallback((levelIndex: number) => {
    const hls = hlsRef.current; if (!hls) return;
    hls.currentLevel = levelIndex; setCurrentHlsLevel(levelIndex); setShowQuality(false);
  }, []);

  const switchUrlQuality = useCallback((urlQ: UrlQuality) => {
    setActiveUrlQuality(urlQ.url); setShowQuality(false); loadStream(urlQ.url);
  }, [loadStream]);

  const hasUrlQualities = streamQualities.length > 1;
  const hasHlsQualities = hlsQualities.length > 1;
  const showQualityBtn = hasUrlQualities || hasHlsQualities;
  const currentQualityLabel = hasUrlQualities
    ? (streamQualities.find(q => q.url === activeUrlQuality)?.label ?? streamQualities[0]?.label ?? "Kualitas")
    : currentHlsLevel === -1 ? "Auto" : (hlsQualities.find(q => q.index === currentHlsLevel)?.label ?? "Auto");

  // Saat fullscreen native: browser otomatis mengisi layar penuh,
  // kita hanya perlu pastikan tidak ada constraint aspect ratio & border radius.
  // Saat tidak fullscreen: gunakan aspect ratio 16/9 normal.
  const containerStyle: React.CSSProperties = isFullscreen
    ? {
        width: "100%",
        height: "100%",
        borderRadius: 0,
        border: "none",
        background: "#000",
      }
    : {
        border: "1px solid rgba(220,38,38,0.15)",
        aspectRatio: "16/9",
      };

  return (
    <div className={isFullscreen ? "fixed inset-0 z-[9999]" : "w-full"}>
      {/* Kontainer video */}
      <div
        ref={containerRef}
        className={`relative bg-zinc-950 overflow-hidden shadow-2xl w-full h-full ${isFullscreen ? "" : "rounded-xl"}`}
        style={containerStyle}
        onMouseEnter={() => { isHoveringRef.current = true; cancelHideTimer(); setShowControls(true); }}
        onMouseMove={() => { setShowControls(true); startHideTimer(); }}
        onMouseLeave={() => { isHoveringRef.current = false; startHideTimer(); }}
        onTouchEnd={(e) => {
          // Hanya toggle jika touch bukan di tombol kontrol
          if ((e.target as HTMLElement).closest("button,input,[role=button]")) return;
          e.stopPropagation();
          setShowControls(prev => {
            if (!prev) {
              // Muncul → mulai timer auto-hide
              startHideTimer();
              return true;
            } else {
              // Sudah muncul → sembunyikan langsung + tutup quality
              cancelHideTimer();
              setShowQuality(false);
              return false;
            }
          });
        }}
        onClick={() => setShowQuality(false)}
      >
        {/* Dekorasi sudut */}
        {["top-0 left-0 border-t-2 border-l-2 rounded-tl-xl", "top-0 right-0 border-t-2 border-r-2 rounded-tr-xl", "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-xl", "bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl"].map((cls, i) => (
          <motion.div key={i} className={`absolute w-5 h-5 ${cls} pointer-events-none`}
            style={{ borderColor: "hsl(0,80%,55%,0.5)", zIndex: 10 }}
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }} />
        ))}

        <video ref={videoRef} className="w-full h-full" style={{ objectFit: "contain", background: "#000" }} autoPlay playsInline />

        {/* Overlay kontrol */}
        <AnimatePresence>
          {showControls && playerState === "playing" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-3 pt-12"
              style={{ background: "linear-gradient(to top,rgba(5,3,12,0.88) 0%,transparent 100%)" }}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => { cancelHideTimer(); setShowControls(true); }}
              onMouseLeave={() => startHideTimer()}
            >
              <div className="flex items-center gap-2">
                {/* LIVE badge */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-600/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span className="text-white text-[10px] font-black tracking-widest">LIVE</span>
                </div>

                {/* Latency */}
                {latency !== null && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400/70" />{latency}s
                  </span>
                )}

                {/* Volume */}
                <div className="relative flex items-center gap-1"
                  onMouseEnter={() => { if (volTimerRef.current) clearTimeout(volTimerRef.current); setShowVolume(true); }}
                  onMouseLeave={() => { volTimerRef.current = setTimeout(() => setShowVolume(false), 500); }}
                >
                  <button onClick={toggleMute} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-red-500/20 transition-all" title={isMuted ? "Unmute (M)" : "Mute (M)"}>
                    {isMuted ? <IconMute /> : <IconVolume />}
                  </button>
                  <AnimatePresence>
                    {showVolume && (
                      <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 72 }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                        <input type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume}
                          onChange={(e) => handleVolume(parseFloat(e.target.value))}
                          className="w-full h-1 rounded-full cursor-pointer appearance-none"
                          style={{ accentColor: "hsl(0,80%,55%)", background: `linear-gradient(to right,hsl(0,80%,55%) ${(isMuted ? 0 : volume) * 100}%,rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%)` }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1" />

                {/* Kualitas */}
                {showQualityBtn && (
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setShowQuality(p => !p); }}
                      className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-white/70 hover:text-white hover:bg-red-500/20 transition-all text-xs font-semibold">
                      <IconQuality /><span className="hidden sm:inline">{currentQualityLabel}</span>
                    </button>
                    <AnimatePresence>
                      {showQuality && (
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 6 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-10 right-0 rounded-xl overflow-hidden shadow-2xl min-w-[130px]"
                          style={{ background: "rgba(10,5,20,0.97)", border: "1px solid rgba(220,38,38,0.2)", backdropFilter: "blur(16px)", zIndex: 50 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-3 py-2 border-b border-red-500/15">
                            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Kualitas</p>
                          </div>
                          {hasUrlQualities && streamQualities.map((q) => (
                            <button key={q.url} onClick={() => switchUrlQuality(q)}
                              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-red-500/10 transition-colors text-left">
                              <span className={cn("text-sm font-medium", activeUrlQuality === q.url ? "text-red-400" : "text-white/80")}>{q.label}</span>
                              {activeUrlQuality === q.url && <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />}
                            </button>
                          ))}
                          {hasHlsQualities && [{ index: -1, label: "Auto", height: 9999 }, ...hlsQualities].map((q) => (
                            <button key={q.index} onClick={() => switchHlsLevel(q.index)}
                              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-red-500/10 transition-colors text-left">
                              <span className={cn("text-sm font-medium", currentHlsLevel === q.index ? "text-red-400" : "text-white/80")}>{q.label}</span>
                              {currentHlsLevel === q.index && <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <button onClick={handleRefreshStream} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-red-500/20 transition-all" title="Refresh stream">
                  <IconRefresh />
                </button>

                {document.pictureInPictureEnabled && (
                  <button onClick={togglePiP}
                    className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-all", isPiPActive ? "text-red-400 bg-red-500/15" : "text-white/70 hover:text-white hover:bg-red-500/20")}
                    title="Picture-in-Picture">
                    <IconPiP />
                  </button>
                )}

                {/* ── Tombol Orientasi ──────────────────────────────────────
                    Hanya muncul di device touch (mobile/tablet) saat fullscreen.
                    onClick dipakai agar gesture context browser tetap terjaga
                    untuk screen.orientation.lock().
                ─────────────────────────────────────────────────────────── */}
                {showOrientationBtn && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleOrientation();
                    }}
                    className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-lg transition-all touch-manipulation select-none active:scale-90",
                      isLandscapeMode
                        ? "text-red-400 bg-red-500/25 ring-1 ring-red-400/50"
                        : "text-white/80 bg-white/10 active:bg-red-500/30"
                    )}
                    style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
                    title={isLandscapeMode ? "Beralih ke Portrait" : "Beralih ke Landscape"}
                    aria-label={isLandscapeMode ? "Beralih ke Portrait" : "Beralih ke Landscape"}
                  >
                    {isLandscapeMode ? <IconPortrait /> : <IconLandscape />}
                  </button>
                )}

                <button
                  onClick={toggleFullscreen}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-red-500/20 transition-all"
                  title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
                >
                  {isFullscreen ? <IconShrink /> : <IconExpand />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status loading */}
        {(playerState === "loading" || playerState === "refreshing") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 gap-5 z-10">
            <div className="relative w-16 h-16">
              <motion.div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "rgba(220,38,38,0.2)" }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 1.8 }} />
              <motion.div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "rgba(220,38,38,0.1)" }}
                animate={{ scale: [1, 1.7, 1], opacity: [0.3, 0, 0.3] }} transition={{ repeat: Infinity, duration: 1.8, delay: 0.3 }} />
              <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "rgba(220,38,38,0.08)" }} />
              <motion.div className="absolute inset-0 rounded-full border-t-2" style={{ borderColor: "hsl(0,80%,55%)" }}
                animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.85, ease: "linear" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-0 h-0 ml-1" style={{ borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: "10px solid hsl(0,80%,55%,0.7)" }} />
              </div>
            </div>
            <motion.p className="text-white/50 text-sm tracking-wide"
              animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
              {playerState === "refreshing" ? "Menyegarkan stream..." : "Menghubungkan ke stream..."}
            </motion.p>
          </div>
        )}

        {/* Status error */}
        {playerState === "error" && (
          <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/92 p-8 text-center gap-4 z-10"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center"><IconWarning /></div>
            <div>
              <p className="text-white font-semibold mb-1">Stream Tidak Dapat Dimuat</p>
              <p className="text-white/40 text-sm">{errorMsg}</p>
              <p className="text-white/30 text-xs mt-1">Token stream mungkin sudah kedaluwarsa. Tekan tombol di bawah untuk memuat ulang.</p>
            </div>
            <motion.button onClick={handleRefreshStream}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,hsl(0,80%,50%),hsl(0,70%,38%))" }}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <IconRefresh />
              Refresh Stream
            </motion.button>
          </motion.div>
        )}

        {/* ── Overlay hint refresh di dalam player ── */}
        <AnimatePresence>
          {showRefreshHint && playerState !== "refreshing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute bottom-14 left-0 right-0 z-20 flex justify-center px-4"
            >
              <motion.div
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs cursor-pointer"
                style={{ background: "rgba(10,5,20,0.92)", border: "1px solid rgba(220,38,38,0.5)", backdropFilter: "blur(12px)", maxWidth: 360 }}
                onClick={handleRefreshStream}
                whileTap={{ scale: 0.97 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="w-4 h-4 flex-shrink-0 text-yellow-400">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="text-white/80 leading-snug flex-1">
                  Layar hitam atau stream tidak muncul?{" "}
                  <span className="text-white font-semibold underline underline-offset-2">Tap di sini untuk refresh stream.</span>
                </span>
                <IconRefresh />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* ── Note refresh DIHAPUS dari sini (sudah ada di MemberLivePage) ── */}
    </div>
  );
};

/* ─── Panel Member Lain yang Live ─────────────────────────────────────────── */
const OtherLiveMembersPanel = ({ currentMemberId }: { currentMemberId: string }) => {
  const navigate = useNavigate();
  const [liveMembers, setLiveMembers] = useState<Array<{ member: Member; platform: Platform; streamUrl: string; streamQualities: UrlQuality[]; liveUrl: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAllMembers = async () => {
      setLoading(true);
      setLiveMembers([]);

      const otherMembers = MEMBERS.filter(m => m.id !== currentMemberId);
      const found: Array<{ member: Member; platform: Platform; streamUrl: string; streamQualities: UrlQuality[]; liveUrl: string }> = [];

      const BATCH = 5;
      for (let i = 0; i < otherMembers.length; i += BATCH) {
        if (cancelled) return;
        const batch = otherMembers.slice(i, i + BATCH);
        await Promise.all(
          batch.map(async (member) => {
            if (member.idnUsername) {
              try {
                const { data, error } = await supabase.functions.invoke("check-idn-live", {
                  body: { username: member.idnUsername },
                });
                if (!cancelled && !error && data?.is_live) {
                  let streamUrl: string | null = data.stream_url ?? null;
                  let liveUrl = data.live_url ?? `https://www.idn.app/${member.idnUsername}`;

                  if (!streamUrl) {
                    const slugMatch = data.live_url?.match(/\/live\/([\w-]+)/);
                    if (slugMatch) {
                      try {
                        const { data: d2, error: e2 } = await supabase.functions.invoke("get-idn-stream", {
                          body: { username: member.idnUsername, slug: slugMatch[1] },
                        });
                        if (!e2 && d2?.stream_url) streamUrl = d2.stream_url;
                      } catch { /* abaikan */ }
                    }
                  }

                  if (streamUrl && !cancelled) {
                    found.push({ member, platform: "idn", streamUrl, streamQualities: [], liveUrl });
                    setLiveMembers([...found]);
                  }
                }
              } catch { /* abaikan */ }
            }

            if (member.showroomKey) {
              try {
                const { data, error } = await supabase.functions.invoke("check-showroom-live", {
                  body: { room_url_key: member.showroomKey },
                });
                if (!cancelled && !error && data?.is_live && data?.stream_url) {
                  const quals: UrlQuality[] = [{ label: "Tinggi", url: data.stream_url }];
                  if (data.stream_url_low && data.stream_url_low !== data.stream_url)
                    quals.push({ label: "Rendah", url: data.stream_url_low });
                  const liveUrl = `https://www.showroom-live.com/r/${member.showroomKey}`;
                  const alreadyAdded = found.some(f => f.member.id === member.id);
                  if (!alreadyAdded) {
                    found.push({ member, platform: "showroom", streamUrl: data.stream_url, streamQualities: quals, liveUrl });
                    setLiveMembers([...found]);
                  }
                }
              } catch { /* abaikan */ }
            }
          })
        );
        if (i + BATCH < otherMembers.length) await new Promise(r => setTimeout(r, 300));
      }

      if (!cancelled) setLoading(false);
    };

    checkAllMembers();
    return () => { cancelled = true; };
  }, [currentMemberId]);

  return (
    <div className="rounded-xl overflow-hidden border border-border/50" style={{ background: "var(--surface-2, hsl(0 0% 10%))" }}>
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <motion.div className="w-2 h-2 rounded-full bg-red-500"
            animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />
          <span className="text-sm font-bold">Member Lain yang Live</span>
        </div>
      </div>

      <div className="p-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-24" />
                  <div className="h-3 bg-muted rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : liveMembers.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm">Tidak ada member lain yang sedang live saat ini.</p>
            <Link to="/member-live" className="mt-2 inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors">
              Cek semua member →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {liveMembers.map(({ member, platform, streamUrl, streamQualities, liveUrl }) => (
              <button
                key={`${member.id}-${platform}`}
                onClick={() => navigate(`/stream?memberId=${member.id}&platform=${platform}&streamUrl=${encodeURIComponent(streamUrl)}&liveUrl=${encodeURIComponent(liveUrl)}`)}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors text-left"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-xl overflow-hidden">
                    <img src={getMemberPhotoUrl(member)} alt={member.name} className="w-full h-full object-cover object-top" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{platform === "idn" ? "IDN Live" : "Showroom"}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <Link to="/member-live"
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-red-400 border border-red-500/25 hover:bg-red-500/10 transition-colors">
          Lihat Semua Member
        </Link>
      </div>
    </div>
  );
};

/* ─── Main StreamingPlayerPage ────────────────────────────────────────────── */
export default function StreamingPlayerPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const memberId = params.get("memberId");
  const platform = params.get("platform") as Platform | null;
  const streamUrlParam = params.get("streamUrl");
  const liveUrlParam = params.get("liveUrl");
  const streamQualitiesParam = params.get("qualities");

  const member = memberId
    ? (memberId === JKT48_OFFICIAL.id ? OFFICIAL_MEMBER : MEMBERS.find(m => m.id === memberId) ?? null)
    : null;
  const streamUrl = streamUrlParam ? decodeURIComponent(streamUrlParam) : "";
  const liveUrl = liveUrlParam ? decodeURIComponent(liveUrlParam) : "";

  const streamQualities: UrlQuality[] = (() => {
    try { return streamQualitiesParam ? JSON.parse(decodeURIComponent(streamQualitiesParam)) : []; }
    catch { return []; }
  })();

  const [shared, setShared] = useState(false);
  const [activeStreamUrl, setActiveStreamUrl] = useState(streamUrl);
  const [activeStreamQualities, setActiveStreamQualities] = useState(streamQualities);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Reset semua state saat berpindah member (stream params berubah) ──
  const prevMemberIdRef = useRef(memberId);
  const prevPlatformRef = useRef(platform);
  const prevStreamUrlRef = useRef(streamUrl);

  // Deteksi layout mobile (lebar layar < 1024px)
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobileLayout(e.matches);
    mql.addEventListener("change", onChange);
    setIsMobileLayout(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Lock body/main scroll saat mobile
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

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: `${member?.name} Live`, url }); return; }
    } catch { }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch { }
  };

  const handleRefreshStream = useCallback(async (): Promise<string | null> => {
    if (!member || !platform) return null;

    if (platform === "idn") {
      try {
        const { data, error } = await supabase.functions.invoke("check-idn-live", {
          body: { username: member.idnUsername },
        });
        if (!error && data?.stream_url) return data.stream_url;
        if (!error && data?.is_live && member.idnUsername) {
          const slugMatch = data.live_url?.match(/\/live\/([\w-]+)/);
          if (slugMatch) {
            const { data: d2, error: e2 } = await supabase.functions.invoke("get-idn-stream", {
              body: { username: member.idnUsername, slug: slugMatch[1] },
            });
            if (!e2 && d2?.stream_url) return d2.stream_url;
          }
        }
      } catch { }
    }

    if (platform === "showroom" && member.showroomKey) {
      try {
        const { data, error } = await supabase.functions.invoke("check-showroom-live", {
          body: { room_url_key: member.showroomKey },
        });
        if (!error && data?.stream_url) return data.stream_url;
      } catch { }
    }

    return null;
  }, [member, platform]);

  useEffect(() => {
    const memberChanged = prevMemberIdRef.current !== memberId;
    const platformChanged = prevPlatformRef.current !== platform;
    const streamChanged = prevStreamUrlRef.current !== streamUrl;

    // Jika berpindah member / platform / stream, reset semua state dulu
    if (memberChanged || platformChanged || streamChanged) {
      prevMemberIdRef.current = memberId;
      prevPlatformRef.current = platform;
      prevStreamUrlRef.current = streamUrl;
      setShared(false);
      setActiveStreamUrl(streamUrl);
      setActiveStreamQualities(streamQualities);
    }

    if (!member || !platform) { setIsAutoRefreshing(false); return; }
    let cancelled = false;
    const autoRefresh = async () => {
      setIsAutoRefreshing(true);
      try {
        const newUrl = await handleRefreshStream();
        if (!cancelled && newUrl) {
          setActiveStreamUrl(newUrl);
          if (platform === "showroom" && member.showroomKey) {
            try {
              const { data, error } = await supabase.functions.invoke("check-showroom-live", {
                body: { room_url_key: member.showroomKey },
              });
              if (!error && data?.stream_url) {
                const quals: UrlQuality[] = [{ label: "Tinggi", url: data.stream_url }];
                if (data.stream_url_low && data.stream_url_low !== data.stream_url)
                  quals.push({ label: "Rendah", url: data.stream_url_low });
                setActiveStreamQualities(quals);
              }
            } catch { }
          }
        } else if (!cancelled && !newUrl) {
          setActiveStreamUrl(streamUrl);
        }
      } catch {
        if (!cancelled) setActiveStreamUrl(streamUrl);
      } finally {
        if (!cancelled) {
          setIsAutoRefreshing(false);
          setRefreshKey(k => k + 1);
        }
      }
    };
    autoRefresh();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, platform, streamUrl]);

  if (!member || !platform || !streamUrl) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      >
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <IconWarning />
        </div>
        <div className="text-center">
          <p className="text-foreground font-semibold mb-1">Stream tidak ditemukan</p>
          <p className="text-muted-foreground text-sm">Parameter stream tidak valid atau telah berakhir.</p>
        </div>
        <button
          onClick={() => navigate("/member-live")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm text-white"
          style={{ background: "linear-gradient(135deg,hsl(0,80%,50%),hsl(0,70%,38%))" }}
        >
          <IconArrowLeft />
          Kembali ke Member Live
        </button>
      </motion.div>
    );
  }

  const autoRefreshOverlay = isAutoRefreshing ? (
    <div className="w-full bg-zinc-950 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center"
      style={{ aspectRatio: "16/9", border: "1px solid rgba(220,38,38,0.15)" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Memuat stream…</p>
      </div>
    </div>
  ) : null;

  const playerNode = isAutoRefreshing ? autoRefreshOverlay : (
    <HlsVideoPlayer
      key={refreshKey}
      streamUrl={activeStreamUrl}
      streamQualities={activeStreamQualities}
      onRefresh={handleRefreshStream}
      isMobile={isMobileLayout}
    />
  );

  const statsNode = (
    <LiveStatsBar
      member={member}
      platform={platform}
      liveUrl={liveUrl}
      onShare={handleShare}
      shared={shared}
    />
  );

  const backButton = (
    <button
      onClick={() => navigate("/member-live")}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-full px-3 py-1.5 hover:bg-surface-hover"
    >
      <IconArrowLeft />
      Member Live
    </button>
  );

  // ── Mobile: sticky player + inner scroll ──────────────────────────────────
  if (isMobileLayout) {
    return (
      <div className="flex flex-col" style={{ height: "calc(100dvh - 56px)" }}>
        {/* Player sticky di atas */}
        <div className="flex-shrink-0 bg-black w-full">
          {playerNode}
        </div>

        {/* Konten scrollable di bawah player */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-3 pb-24">
            <div className="pt-2 pb-1">
              {backButton}
            </div>
            {statsNode}
            <div className="mt-4">
              <OtherLiveMembersPanel currentMemberId={member.id} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop: grid dua kolom ───────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="page-enter"
    >
      <div className="px-3 sm:px-6 pt-3 pb-1">
        {backButton}
      </div>
      <div className="mx-auto px-3 py-4 sm:px-6 max-w-[1600px]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            {playerNode}
            {statsNode}
          </div>
          <aside className="flex flex-col gap-4" style={{ position: "sticky", top: "72px", alignSelf: "start" }}>
            <OtherLiveMembersPanel currentMemberId={member.id} />
          </aside>
        </div>
      </div>
    </motion.div>
  );
}