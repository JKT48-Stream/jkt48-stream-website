import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  fetchVideoById,
  fetchRelated,
  fetchChannelInfo,
  fetchPlaylistItems,
  formatViews,
  formatCount,
  timeAgo,
  CHANNELS,
  channelKeyFromVideo,
  bestThumb,
  formatDuration,
  isPortraitVideo,
  type ChannelKey,
  type YTVideo,
  type YTChannelInfo,
} from "@/lib/youtube";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  Maximize,
  Minimize,
  PictureInPicture2,
  ChevronDown,
  Check,
  Eye,
  Calendar,
  ListPlus,
  ListVideo,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { addHistory, toggleSaved, useSaved, getProgress, setProgress, getPlaylists, getSavedChannelPlaylist, type PlaylistVideo } from "@/lib/storage";
import { useMiniPlayer } from "@/lib/miniPlayer";
import { AddToPlaylistModal } from "@/components/AddToPlaylistModal";
import { PlaylistSavedToast } from "@/components/PlaylistSavedToast";
import { PlaylistRemovedToast } from "@/components/PlaylistRemovedToast";
import { VideoSavedToast } from "@/components/VideoSavedToast";
import { VideoRemovedToast } from "@/components/VideoRemovedToast";

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

export default function WatchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const v = params.get("v");
  const listId = params.get("list");
  const userListId = params.get("userlist");
  const channelListId = params.get("channellist");
  const indexParam = parseInt(params.get("index") ?? "1", 10);

  const [video, setVideo] = useState<YTVideo | null>(null);
  const [related, setRelated] = useState<YTVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [theater, setTheater] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const [shared, setShared] = useState(false);
  const [channelInfo, setChannelInfo] = useState<YTChannelInfo | null>(null);
  const [currentSec, setCurrentSec] = useState<number>(0);

  // Playlist panel state
  const [playlistVideos, setPlaylistVideos] = useState<YTVideo[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistCollapsed, setPlaylistCollapsed] = useState(false);
  const playlistPanelRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  // User playlist / channel playlist panel state (local playlists)
  const [localPlaylistVideos, setLocalPlaylistVideos] = useState<PlaylistVideo[]>([]);
  const localListId = userListId ?? channelListId ?? null;

  // Determine which "active panel" is in use
  const hasYTPlaylist = !!listId;
  const hasLocalPlaylist = !!localListId;

  // Load local playlist (userlist or channellist) from storage
  useEffect(() => {
    if (!localListId) {
      setLocalPlaylistVideos([]);
      return;
    }
    if (userListId) {
      const playlists = getPlaylists();
      const pl = playlists.find((p) => p.id === userListId);
      setLocalPlaylistVideos(pl?.videos ?? []);
    } else if (channelListId) {
      const pl = getSavedChannelPlaylist(channelListId);
      setLocalPlaylistVideos(pl?.videos ?? []);
    }
  }, [localListId, userListId, channelListId]);

  // Track whether we are in mobile layout (< 1024px) for YouTube-style sticky player
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );
  const saved = useSaved();
  const isSaved = v ? saved.includes(v) : false;
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [savedPlaylistTitle, setSavedPlaylistTitle] = useState<string | null>(null);
  const [removedPlaylistTitle, setRemovedPlaylistTitle] = useState<string | null>(null);
  const [showVideoSavedToast, setShowVideoSavedToast] = useState(false);
  const [showVideoRemovedToast, setShowVideoRemovedToast] = useState(false);
  const mini = useMiniPlayer();
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  // Lacak apakah video yang sedang diputar berorientasi potret (mis. YouTube
  // Shorts) lewat ref — supaya effect fullscreen di bawah selalu membaca nilai
  // terbaru tanpa perlu re-attach event listener tiap kali video berganti.
  const isPortraitRef = useRef(false);
  useEffect(() => {
    isPortraitRef.current = isPortraitVideo(video);
  }, [video]);

  // Fetch playlist items when list param is present
  useEffect(() => {
    if (!listId) {
      setPlaylistVideos([]);
      return;
    }
    setPlaylistLoading(true);
    fetchPlaylistItems(listId)
      .then((r) => setPlaylistVideos(r.videos))
      .catch(() => {})
      .finally(() => setPlaylistLoading(false));
  }, [listId]);

  // Scroll active item into view inside playlist panel
  useEffect(() => {
    if (!activeItemRef.current || !playlistPanelRef.current) return;
    const panel = playlistPanelRef.current;
    const item = activeItemRef.current;
    const panelTop = panel.scrollTop;
    const panelBottom = panelTop + panel.clientHeight;
    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.clientHeight;
    if (itemTop < panelTop || itemBottom > panelBottom) {
      item.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [v, playlistVideos]);

  // Navigate to next video in playlist when current ends
  const goToNextPlaylistVideo = useCallback(() => {
    if (!listId || !playlistVideos.length) return;
    const nextIndex = indexParam;
    if (nextIndex < playlistVideos.length) {
      const nextVideo = playlistVideos[nextIndex];
      if (nextVideo) {
        navigate(`/watch?v=${nextVideo.id}&list=${listId}&index=${nextIndex + 1}`);
      }
    }
  }, [listId, playlistVideos, indexParam, navigate]);

  // Navigate to next video in local (user/channel) playlist when current ends
  const goToNextLocalPlaylistVideo = useCallback(() => {
    if (!localListId || !localPlaylistVideos.length) return;
    const nextIndex = indexParam;
    if (nextIndex < localPlaylistVideos.length) {
      const nextVideo = localPlaylistVideos[nextIndex];
      if (nextVideo) {
        const param = userListId ? "userlist" : "channellist";
        navigate(`/watch?v=${nextVideo.id}&${param}=${localListId}&index=${nextIndex + 1}`);
      }
    }
  }, [localListId, localPlaylistVideos, indexParam, navigate, userListId]);

  // Detect mobile/desktop layout breakpoint (lg = 1024px)
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobileLayout(e.matches);
    mql.addEventListener("change", onChange);
    setIsMobileLayout(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Prevent body/main from scrolling on mobile — WatchPage manages its own scroll
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

  useEffect(() => {
    const container = playerContainerRef.current;
    if (!container) return;

    const isMobile = () => window.innerWidth < 1024 || "ontouchstart" in window;

    const lockLandscape = async () => {
      try {
        if (screen.orientation?.lock) {
          await screen.orientation.lock("landscape");
        }
      } catch {}
    };

    const lockPortrait = async () => {
      try {
        if (screen.orientation?.lock) {
          await screen.orientation.lock("portrait");
        }
      } catch {
        try {
          if (screen.orientation?.unlock) {
            screen.orientation.unlock();
          }
        } catch {}
      }
    };

    const onFullscreenChange = () => {
      const fsEl =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement;

      if (fsEl) {
        if (isMobile()) {
          // Video potret (mis. YouTube Shorts) tetap dikunci potret saat
          // fullscreen — persis seperti perilaku aplikasi YouTube asli.
          // Video landscape tetap dikunci landscape seperti sebelumnya.
          if (isPortraitRef.current) {
            lockPortrait();
          } else {
            lockLandscape();
          }
        }
      } else {
        if (isMobile()) lockPortrait();
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("mozfullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("mozfullscreenchange", onFullscreenChange);
      if (isMobile()) lockPortrait();
    };
  }, []);

  const seekTo = (sec: number) => {
    try {
      const p = playerRef.current;
      if (p?.seekTo) {
        p.seekTo(sec, true);
        p.playVideo?.();
        setCurrentSec(sec);
        playerHostRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch {}
  };

  const channelHandle = useMemo<ChannelKey | null>(() => {
    if (!video) return null;
    return channelKeyFromVideo(video.snippet.channelId, video.snippet.channelTitle);
  }, [video]);

  const canonicalChannelName = channelHandle
    ? CHANNELS[channelHandle].name
    : video?.snippet.channelTitle ?? "";

  useEffect(() => {
    if (!channelHandle) return;
    fetchChannelInfo(channelHandle).then(setChannelInfo).catch(() => {});
  }, [channelHandle]);

  useEffect(() => {
    if (!related.length) return;
    const seen = new Set<ChannelKey>();
    for (const r of related) {
      const k = channelKeyFromVideo(r.snippet.channelId, r.snippet.channelTitle);
      if (k && !seen.has(k)) {
        seen.add(k);
        fetchChannelInfo(k).catch(() => {});
      }
    }
  }, [related]);

  useEffect(() => {
    if (!v) return;
    let cancelled = false;
    setLoading(true);
    setLoadingRelated(true);
    setVideo(null);
    setRelated([]);

    fetchVideoById(v)
      .then((video) => {
        if (cancelled) return;
        setVideo(video);
        if (video) {
          addHistory({
            id: v,
            title: video.snippet.title,
            channelTitle: video.snippet.channelTitle,
            thumb: bestThumb(video),
            duration: video.contentDetails?.duration ?? "",
          });
        }
      })
      .finally(() => !cancelled && setLoading(false));

    fetchRelated(v)
      .then((rel) => {
        if (cancelled) return;
        setRelated(rel);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingRelated(false));

    return () => {
      cancelled = true;
    };
  }, [v]);

  useEffect(() => {
    if (!v) return;
    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = 0;
    }
    if (mobileScrollRef.current) {
      mobileScrollRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0 });
  }, [v]);

  useEffect(() => {
    if (!v || !playerHostRef.current) return;
    let destroyed = false;
    let interval: number | undefined;
    const resume = getProgress(v);
    const startSeconds = resume && resume.progress > 5 && resume.progress < (resume.durationSec - 10)
      ? Math.floor(resume.progress)
      : 0;

    loadYouTubeAPI().then(() => {
      if (destroyed || !playerHostRef.current) return;
      playerHostRef.current.innerHTML = "";
      const div = document.createElement("div");
      div.id = `yt-player-${v}`;
      div.className = "absolute inset-0 h-full w-full";
      playerHostRef.current.appendChild(div);

      playerRef.current = new window.YT.Player(div.id, {
        videoId: v,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          start: startSeconds,
        },
        events: {
          onReady: (e: any) => {
            if (startSeconds > 0) {
              try {
                e.target.seekTo(startSeconds, true);
              } catch {}
            }
          },
          onStateChange: (e: any) => {
            if (e.data === 0 && listId) {
              goToNextPlaylistVideo();
            }
            if (e.data === 0 && !listId && localListId) {
              goToNextLocalPlaylistVideo();
            }
            if (interval) return;
            interval = window.setInterval(() => {
              try {
                const p = playerRef.current;
                if (!p || !p.getCurrentTime) return;
                const cur = p.getCurrentTime();
                const dur = p.getDuration();
                if (typeof cur === "number") setCurrentSec(cur);
                if (dur > 0 && cur >= 0) {
                  setProgress(v, cur, dur);
                }
              } catch {}
            }, 1000);
          },
        },
      });
    });

    return () => {
      destroyed = true;
      if (interval) window.clearInterval(interval);
      try {
        const p = playerRef.current;
        if (p?.getCurrentTime && p?.getDuration) {
          const cur = p.getCurrentTime();
          const dur = p.getDuration();
          if (dur > 0) setProgress(v, cur, dur);
        }
        playerRef.current?.destroy?.();
      } catch {}
      playerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, isMobileLayout, listId, goToNextPlaylistVideo, localListId, goToNextLocalPlaylistVideo]);

  const openMini = () => {
    if (!video || !v) return;
    mini.open(v, video.snippet.title, video.snippet.channelTitle);
    mini.setMini(true);
    navigate("/");
  };

  if (!v) {
    return (
      <div className="p-8 text-center text-muted-foreground">Video tidak ditemukan.</div>
    );
  }

  // ── Shared video info content (title, channel, actions, description) ──────
  const videoInfoContent = loading || !video ? (
    <WatchHeaderSkeleton />
  ) : (
    <>
      {video.snippet.liveBroadcastContent === "completed" && (
        <div className="mt-4 mb-1 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-surface-hover border border-border px-2 py-1 text-xs font-bold uppercase tracking-wide text-foreground">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-red-500"><circle cx="12" cy="12" r="8"/></svg>
            Live Replay
          </span>
        </div>
      )}
      <h1 className={video.snippet.liveBroadcastContent === "completed" ? "text-lg font-bold leading-snug sm:text-xl" : "mt-4 text-lg font-bold leading-snug sm:text-xl"}>
        {video.snippet.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {channelHandle ? (
            <Link
              to={`/channel/${channelHandle}`}
              className="flex items-center gap-3 rounded-full pr-2 transition-colors hover:bg-surface-hover"
            >
              <ChannelAvatar
                info={channelInfo}
                fallbackText={canonicalChannelName}
                size={40}
              />
              <div>
                <p className="font-semibold leading-tight">
                  {canonicalChannelName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {channelInfo
                    ? `${formatCount(channelInfo.subscriberCount)} subscriber`
                    : "JKT48"}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <ChannelAvatar
                info={null}
                fallbackText={canonicalChannelName}
                size={40}
              />
              <div>
                <p className="font-semibold">{canonicalChannelName}</p>
                <p className="text-xs text-muted-foreground">JKT48</p>
              </div>
            </div>
          )}
          <div
            className="ml-2 cursor-default rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
            title="Hanya tampilan"
            aria-disabled="true"
          >
            Subscribe
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center overflow-hidden rounded-full bg-surface-hover"
            title="Hanya tampilan"
          >
            <div className="flex cursor-default items-center gap-1.5 px-3 py-2 text-sm font-medium">
              <ThumbsUp className="h-4 w-4" />
              {formatViews(video.statistics?.likeCount)}
            </div>
            <span className="h-5 w-px bg-border" />
            <div className="cursor-default px-3 py-2">
              <ThumbsDown className="h-4 w-4" />
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              const url = `${window.location.origin}/watch?v=${v}`;
              const title = video.snippet.title;
              try {
                if (navigator.share) {
                  await navigator.share({ title, url });
                  return;
                }
              } catch {
                // user cancelled or share failed — fall through to clipboard
              }
              try {
                await navigator.clipboard.writeText(url);
                setShared(true);
                toast({ title: "Tautan disalin", description: "Link video sudah ada di clipboard." });
                window.setTimeout(() => setShared(false), 1800);
              } catch {
                toast({ title: "Gagal menyalin tautan", variant: "destructive" });
              }
            }}
            className="flex items-center gap-1.5 rounded-full bg-surface-hover px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            {shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{shared ? "Tersalin" : "Bagikan"}</span>
          </button>
          <button
            onClick={() => {
              if (!v) return;
              const wasSaved = isSaved;
              toggleSaved(v);
              if (!wasSaved) {
                setShowVideoSavedToast(true);
              } else {
                setShowVideoRemovedToast(true);
              }
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
              isSaved
                ? "bg-primary text-primary-foreground"
                : "bg-surface-hover hover:bg-muted",
            )}
          >
            <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
            <span className="hidden sm:inline">
              {isSaved ? "Tersimpan" : "Simpan"}
            </span>
          </button>
          <button
            onClick={() => setShowAddPlaylist(true)}
            className="flex items-center gap-1.5 rounded-full bg-surface-hover px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ListPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Playlist</span>
          </button>
        </div>
      </div>

      <DescriptionPanel
        description={video.snippet.description || "Tidak ada deskripsi."}
        viewCount={video.statistics?.viewCount}
        publishedAt={video.snippet.publishedAt}
        expanded={showDesc}
        onToggle={() => setShowDesc((s) => !s)}
        onSeek={seekTo}
        currentSec={currentSec}
      />

      {/* Modal Tambah ke Playlist */}
      {showAddPlaylist && video && v && (
        <AddToPlaylistModal
          video={{
            id: v,
            title: video.snippet.title,
            channelTitle: canonicalChannelName,
            thumb: bestThumb(video),
            duration: video.contentDetails?.duration ?? "",
          }}
          onClose={() => setShowAddPlaylist(false)}
          onSaved={(title) => setSavedPlaylistTitle(title)}
          onRemoved={(title) => setRemovedPlaylistTitle(title)}
        />
      )}
      {savedPlaylistTitle !== null && video && v && (
        <PlaylistSavedToast
          playlistTitle={savedPlaylistTitle}
          videoTitle={video.snippet.title}
          videoThumb={bestThumb(video)}
          onClose={() => setSavedPlaylistTitle(null)}
        />
      )}
      {removedPlaylistTitle !== null && video && v && (
        <PlaylistRemovedToast
          playlistTitle={removedPlaylistTitle}
          videoTitle={video.snippet.title}
          videoThumb={bestThumb(video)}
          onClose={() => setRemovedPlaylistTitle(null)}
        />
      )}
      {showVideoSavedToast && video && v && (
        <VideoSavedToast
          videoTitle={video.snippet.title}
          videoThumb={bestThumb(video)}
          onClose={() => setShowVideoSavedToast(false)}
        />
      )}
      {showVideoRemovedToast && video && v && (
        <VideoRemovedToast
          videoTitle={video.snippet.title}
          videoThumb={bestThumb(video)}
          onClose={() => setShowVideoRemovedToast(false)}
        />
      )}
    </>
  );

  // ── MOBILE LAYOUT (< lg): sticky player at top, scrollable content below ──
  const mobileLayout = (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 56px)" }}>
      {/* Sticky video player — never scrolls */}
      <div className="flex-shrink-0 bg-black w-full">
        <div
          ref={playerContainerRef}
          className="relative overflow-hidden bg-black w-full"
          style={{ aspectRatio: "16/9" }}
        >
          <div ref={playerHostRef} className="absolute inset-0 h-full w-full" />
        </div>
        {/* Mini-player button */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background border-b border-border/40">
          <button
            onClick={openMini}
            className="flex items-center gap-1.5 rounded-full bg-surface-hover px-3 py-1 text-xs font-medium hover:bg-muted"
          >
            <PictureInPicture2 className="h-3.5 w-3.5" />
            Mini player
          </button>
        </div>
      </div>

      {/* Scrollable content below player */}
      <div ref={mobileScrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-3 pb-24">
          {videoInfoContent}

          {/* Playlist panel (mobile) */}
          {listId && (
            <PlaylistPanel
              listId={listId}
              videos={playlistVideos}
              loading={playlistLoading}
              currentVideoId={v ?? ""}
              indexParam={indexParam}
              collapsed={playlistCollapsed}
              onToggleCollapse={() => setPlaylistCollapsed((c) => !c)}
              panelRef={playlistPanelRef}
              activeItemRef={activeItemRef}
              maxHeight={256}
              className="mt-4"
            />
          )}

          {/* Local playlist panel (mobile) — userlist / channellist */}
          {!listId && hasLocalPlaylist && localPlaylistVideos.length > 0 && (
            <LocalPlaylistPanel
              listId={localListId!}
              isUserList={!!userListId}
              videos={localPlaylistVideos}
              currentVideoId={v ?? ""}
              indexParam={indexParam}
              collapsed={playlistCollapsed}
              onToggleCollapse={() => setPlaylistCollapsed((c) => !c)}
              maxHeight={256}
              className="mt-4"
            />
          )}

          {/* Related videos */}
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Rekomendasi
            </h2>
            <div className="space-y-3">
              {loadingRelated && related.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                    <VideoCardSkeleton key={`mr-${i}`} layout="list" />
                  ))
                : related
                    .slice(0, 10)
                    .map((r) => (
                      <VideoCard key={r.id} video={r} layout="compact" />
                    ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── DESKTOP LAYOUT (≥ lg): YouTube-style full-width layout ────────────────
  // Sidebar sudah di-hide oleh AppLayout, jadi kita bisa pakai lebar penuh
  // mirip YouTube: video besar di kiri, sidebar rekomendasi 380px di kanan
  const desktopLayout = (
    <div
      className={cn(
        "mx-auto px-4 py-4 sm:px-6",
        // Theater mode: full width tanpa batas
        // Normal mode: max-width lebih lebar dari sebelumnya (YouTube style)
        theater ? "max-w-full" : "max-w-[1850px]",
      )}
    >
      <div
        className={cn(
          "grid gap-6",
          // Layout grid: video mengambil ruang sebanyak mungkin, sidebar fixed 380px
          // Mirip YouTube: video di kiri (flex-grow), rekomendasi di kanan (tetap)
          theater
            ? "grid-cols-1"
            : "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]",
        )}
      >
        {/* Kolom Kiri: Video Player + Info */}
        <div className="min-w-0">
          {/* Video Player Container */}
          <div
            ref={playerContainerRef}
            className={cn(
              "relative overflow-hidden rounded-xl bg-black shadow-player",
              // Theater: penuh layar, normal: 16/9
              theater ? "aspect-video w-full" : "aspect-video w-full",
            )}
          >
            <div ref={playerHostRef} className="absolute inset-0 h-full w-full" />
          </div>

          {/* Kontrol bawah player: theater mode + mini player */}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setTheater((t) => !t)}
              className="flex items-center gap-1.5 rounded-full bg-surface-hover px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              {theater ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              {theater ? "Mode normal" : "Mode teater"}
            </button>
            <button
              onClick={openMini}
              className="flex items-center gap-1.5 rounded-full bg-surface-hover px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              <PictureInPicture2 className="h-3.5 w-3.5" />
              Mini player
            </button>
          </div>

          {/* Info video: title, channel, actions, description */}
          {videoInfoContent}

          {/* Rekomendasi di bawah video — hanya tampil di mode teater (karena sidebar disembunyikan) */}
          {theater && related.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Rekomendasi
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {related.map((r) => (
                  <VideoCard key={r.id} video={r} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Sidebar Rekomendasi — hanya di mode normal */}
        {!theater && (
          <aside
            ref={sidebarRef}
            className="hidden space-y-3 lg:block"
            style={{
              // Sticky sidebar ala YouTube: menempel di bawah header saat scroll
              position: "sticky",
              top: "calc(var(--header-h) + 16px)",
              alignSelf: "flex-start",
              // Tinggi maksimal dengan scroll di dalam sidebar
              maxHeight: "calc(100vh - var(--header-h) - 32px)",
              overflowY: "auto",
              // Sembunyikan scrollbar (tetap bisa scroll) ala YouTube
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {/* Playlist panel di sidebar desktop */}
            {listId && (
              <PlaylistPanel
                listId={listId}
                videos={playlistVideos}
                loading={playlistLoading}
                currentVideoId={v ?? ""}
                indexParam={indexParam}
                collapsed={playlistCollapsed}
                onToggleCollapse={() => setPlaylistCollapsed((c) => !c)}
                panelRef={playlistPanelRef}
                activeItemRef={activeItemRef}
                maxHeight={400}
                className="mb-1"
              />
            )}
            {/* Local playlist panel (desktop) */}
            {!listId && hasLocalPlaylist && localPlaylistVideos.length > 0 && (
              <LocalPlaylistPanel
                listId={localListId!}
                isUserList={!!userListId}
                videos={localPlaylistVideos}
                currentVideoId={v ?? ""}
                indexParam={indexParam}
                collapsed={playlistCollapsed}
                onToggleCollapse={() => setPlaylistCollapsed((c) => !c)}
                maxHeight={400}
                className="mb-1"
              />
            )}
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground px-1">
              Rekomendasi
            </h2>
            {loadingRelated && related.length === 0
              ? Array.from({ length: 8 }).map((_, i) => (
                  <VideoCardSkeleton key={i} layout="list" />
                ))
              : related.map((r) => (
                  <VideoCard key={r.id} video={r} layout="compact" />
                ))}
          </aside>
        )}
      </div>
    </div>
  );

  // Render hanya satu layout sesuai breakpoint
  return isMobileLayout ? mobileLayout : desktopLayout;
}

// ---------------------------------------------------------------------------
// PlaylistPanel — shared component for mobile & desktop.
// ---------------------------------------------------------------------------
function PlaylistPanel({
  listId,
  videos,
  loading,
  currentVideoId,
  indexParam,
  collapsed,
  onToggleCollapse,
  panelRef,
  activeItemRef,
  maxHeight,
  className,
}: {
  listId: string;
  videos: YTVideo[];
  loading: boolean;
  currentVideoId: string;
  indexParam: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  panelRef: React.RefObject<HTMLDivElement>;
  activeItemRef: React.RefObject<HTMLDivElement>;
  maxHeight: number;
  className?: string;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      const h = Math.min(el.scrollHeight, maxHeight);
      setMeasuredHeight(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [videos, loading, maxHeight]);

  const targetHeight = collapsed ? 0 : measuredHeight;

  return (
    <div className={cn("rounded-xl border border-border bg-surface-2 overflow-hidden", className)}>
      <button
        className="flex w-full items-center justify-between px-4 py-3 font-semibold text-sm hover:bg-surface-hover transition-colors"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
      >
        <span className="flex items-center gap-2">
          <ListVideo className="h-4 w-4" />
          Playlist · {indexParam}/{videos.length || "..."}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            collapsed ? "rotate-0" : "rotate-180",
          )}
        />
      </button>

      <div
        style={{
          height: measuredHeight ? `${targetHeight}px` : collapsed ? "0px" : undefined,
          transition: "height 360ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "height",
          overflow: "hidden",
        }}
      >
        <div ref={innerRef}>
          <div
            ref={panelRef}
            style={{ maxHeight: `${maxHeight}px` }}
            className="overflow-y-auto border-t border-border/40"
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <PlaylistItemSkeleton key={i} />
                ))
              : videos.map((pv, i) => (
                  <div
                    key={`${pv.id}-${i}`}
                    ref={pv.id === currentVideoId ? activeItemRef : undefined}
                  >
                    <PlaylistItem
                      video={pv}
                      index={i}
                      listId={listId}
                      isActive={pv.id === currentVideoId}
                    />
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaylistItemSkeleton() {
  return (
    <div className="flex gap-2 px-3 py-2">
      <div className="h-12 w-20 flex-shrink-0 animate-pulse rounded bg-surface-hover" />
      <div className="flex-1 space-y-1.5 py-1">
        <div className="h-3 w-full animate-pulse rounded bg-surface-hover" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-surface-hover" />
      </div>
    </div>
  );
}

function PlaylistItem({
  video,
  index,
  listId,
  isActive,
}: {
  video: YTVideo;
  index: number;
  listId: string;
  isActive: boolean;
}) {
  const thumb = bestThumb(video);
  const duration = formatDuration(video.contentDetails?.duration ?? "");
  return (
    <Link
      to={`/watch?v=${video.id}&list=${listId}&index=${index + 1}`}
      className={cn(
        "flex items-center gap-2 px-3 py-2 transition-colors",
        isActive
          ? "bg-primary/10 border-l-2 border-primary"
          : "hover:bg-surface-hover",
      )}
    >
      <span className="flex-shrink-0 w-5 text-center text-xs text-muted-foreground">
        {isActive ? (
          <Play className="h-3 w-3 fill-primary text-primary mx-auto" />
        ) : (
          index + 1
        )}
      </span>
      <div className="relative flex-shrink-0 w-20 h-12 overflow-hidden rounded">
        <img
          src={thumb}
          alt={video.snippet.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {duration ? (
          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-0.5 text-[9px] font-semibold text-white">
            {duration}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "line-clamp-2 text-xs font-medium leading-tight",
            isActive && "text-primary",
          )}
        >
          {video.snippet.title}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">
          {video.snippet.channelTitle}
        </p>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// LocalPlaylistPanel
// ---------------------------------------------------------------------------
function LocalPlaylistPanel({
  listId,
  isUserList,
  videos,
  currentVideoId,
  indexParam,
  collapsed,
  onToggleCollapse,
  maxHeight,
  className,
}: {
  listId: string;
  isUserList: boolean;
  videos: PlaylistVideo[];
  currentVideoId: string;
  indexParam: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  maxHeight: number;
  className?: string;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      const h = Math.min(el.scrollHeight, maxHeight);
      setMeasuredHeight(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [videos, maxHeight]);

  useEffect(() => {
    if (!activeItemRef.current || !panelRef.current) return;
    const panel = panelRef.current;
    const item = activeItemRef.current;
    const panelTop = panel.scrollTop;
    const panelBottom = panelTop + panel.clientHeight;
    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.clientHeight;
    if (itemTop < panelTop || itemBottom > panelBottom) {
      item.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentVideoId, videos]);

  const targetHeight = collapsed ? 0 : measuredHeight;
  const param = isUserList ? "userlist" : "channellist";

  return (
    <div className={cn("rounded-xl border border-border bg-surface-2 overflow-hidden", className)}>
      <button
        className="flex w-full items-center justify-between px-4 py-3 font-semibold text-sm hover:bg-surface-hover transition-colors"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
      >
        <span className="flex items-center gap-2">
          <ListVideo className="h-4 w-4" />
          Playlist · {indexParam}/{videos.length}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            collapsed ? "rotate-0" : "rotate-180",
          )}
        />
      </button>

      <div
        style={{
          height: measuredHeight ? `${targetHeight}px` : collapsed ? "0px" : undefined,
          transition: "height 360ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "height",
          overflow: "hidden",
        }}
      >
        <div ref={innerRef}>
          <div
            ref={panelRef}
            style={{ maxHeight: `${maxHeight}px` }}
            className="overflow-y-auto border-t border-border/40"
          >
            {videos.map((pv, i) => {
              const isActive = pv.id === currentVideoId;
              const duration = formatDuration(pv.duration ?? "");
              return (
                <div key={`${pv.id}-${i}`} ref={isActive ? activeItemRef : undefined}>
                  <Link
                    to={`/watch?v=${pv.id}&${param}=${listId}&index=${i + 1}`}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 transition-colors",
                      isActive
                        ? "bg-primary/10 border-l-2 border-primary"
                        : "hover:bg-surface-hover",
                    )}
                  >
                    <span className="flex-shrink-0 w-5 text-center text-xs text-muted-foreground">
                      {isActive ? (
                        <Play className="h-3 w-3 fill-primary text-primary mx-auto" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <div className="relative flex-shrink-0 w-20 h-12 overflow-hidden rounded">
                      <img
                        src={pv.thumb}
                        alt={pv.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {duration && (
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-0.5 text-[9px] font-semibold text-white">
                          {duration}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "line-clamp-2 text-xs font-medium leading-tight",
                          isActive && "text-primary",
                        )}
                      >
                        {pv.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">
                        {pv.channelTitle}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelAvatar({
  info,
  fallbackText,
  size = 40,
}: {
  info: YTChannelInfo | null;
  fallbackText: string;
  size?: number;
}) {
  const url =
    info?.thumbnails?.high?.url ??
    info?.thumbnails?.medium?.url ??
    info?.thumbnails?.default?.url;
  const style = { width: size, height: size };
  if (url) {
    return (
      <img
        src={url}
        alt={info?.title ?? fallbackText}
        style={style}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={style}
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-xs font-bold text-primary-foreground"
    >
      {fallbackText.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WatchHeaderSkeleton
// ---------------------------------------------------------------------------
function WatchHeaderSkeleton() {
  return (
    <div className="mt-4 animate-fade-in">
      <div className="yt-skeleton h-6 w-11/12 rounded-md" />
      <div className="yt-skeleton mt-2 h-6 w-2/3 rounded-md" />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="yt-skeleton h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <div className="yt-skeleton h-4 w-32 rounded" />
            <div className="yt-skeleton h-3 w-20 rounded" />
          </div>
          <div className="yt-skeleton ml-2 h-9 w-24 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <div className="yt-skeleton h-9 w-28 rounded-full" />
          <div className="yt-skeleton h-9 w-20 rounded-full" />
          <div className="yt-skeleton h-9 w-20 rounded-full" />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-surface-2 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="yt-skeleton h-4 w-32 rounded" />
          <div className="yt-skeleton h-4 w-24 rounded" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="yt-skeleton h-3 w-full rounded" />
          <div className="yt-skeleton h-3 w-[92%] rounded" />
          <div className="yt-skeleton h-3 w-[78%] rounded" />
        </div>
        <div className="yt-skeleton mt-3 h-6 w-28 rounded-full" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DescriptionPanel
// ---------------------------------------------------------------------------

type DescToken =
  | { kind: "text"; value: string }
  | { kind: "url"; value: string; href: string }
  | { kind: "hashtag"; value: string }
  | { kind: "mention"; value: string; href: string }
  | { kind: "timestamp"; value: string; seconds: number };

function parseTimestamp(s: string): number {
  const parts = s.split(":").map((n) => parseInt(n, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

function tokenizeDescription(text: string): DescToken[] {
  const re =
    /(https?:\/\/[^\s<>"']+)|(\b\d{1,2}:\d{2}(?::\d{2})?\b)|(?<![\p{L}\p{M}\p{N}_])#[\p{L}\p{M}\p{N}_]*[\p{L}\p{N}][\p{L}\p{M}\p{N}_]*|(?<![\p{L}\p{M}\p{N}_.-])@[\p{L}\p{M}\p{N}](?:[\p{L}\p{M}\p{N}_.-]*[\p{L}\p{M}\p{N}])?/gu;

  const out: DescToken[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      out.push({ kind: "text", value: text.slice(lastIndex, m.index) });
    }
    if (m[1]) {
      let url = m[1];
      let trailing = "";
      while (/[.,;:!?)]$/.test(url)) {
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
      }
      out.push({ kind: "url", value: url, href: url });
      if (trailing) out.push({ kind: "text", value: trailing });
    } else if (m[2]) {
      out.push({ kind: "timestamp", value: m[2], seconds: parseTimestamp(m[2]) });
    } else if (m[0].startsWith("#")) {
      out.push({ kind: "hashtag", value: m[0] });
    } else if (m[0].startsWith("@")) {
      const handle = m[0].slice(1);
      out.push({
        kind: "mention",
        value: m[0],
        href: `https://www.youtube.com/@${encodeURIComponent(handle)}`,
      });
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    out.push({ kind: "text", value: text.slice(lastIndex) });
  }
  return out;
}

function RenderedDescription({
  text,
  onSeek,
  activeTimestamp,
  onTimestampClick,
  currentSec,
}: {
  text: string;
  onSeek: (sec: number) => void;
  activeTimestamp: number | null;
  onTimestampClick: (sec: number) => void;
  currentSec: number;
}) {
  const tokens = useMemo(() => tokenizeDescription(text), [text]);
  const playingSeconds = useMemo(() => {
    const stamps = tokens
      .filter((t): t is Extract<DescToken, { kind: "timestamp" }> => t.kind === "timestamp")
      .map((t) => t.seconds)
      .sort((a, b) => a - b);
    let best: number | null = null;
    for (const s of stamps) {
      if (s <= currentSec + 0.25) best = s;
      else break;
    }
    if (best !== null && currentSec - best < 60) return best;
    return null;
  }, [tokens, currentSec]);

  return (
    <>
      {tokens.map((t, i) => {
        switch (t.kind) {
          case "text":
            return <span key={i}>{t.value}</span>;
          case "url":
            return (
              <a
                key={i}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-sm text-primary underline-offset-2 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-primary/50 break-all"
              >
                {t.value}
              </a>
            );
          case "hashtag":
            return (
              <Link
                key={i}
                to={`/search?q=${encodeURIComponent(t.value.slice(1))}`}
                onClick={(e) => e.stopPropagation()}
                className="rounded px-0.5 font-medium text-primary outline-none transition-colors hover:bg-primary/10 hover:underline focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {t.value}
              </Link>
            );
          case "mention":
            return (
              <a
                key={i}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded px-0.5 font-medium text-primary outline-none transition-colors hover:bg-primary/10 hover:underline focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {t.value}
              </a>
            );
          case "timestamp": {
            const isClicked = activeTimestamp === t.seconds;
            const isPlaying = playingSeconds === t.seconds;
            return (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTimestampClick(t.seconds);
                  onSeek(t.seconds);
                }}
                title={`Lompat ke ${t.value}`}
                aria-label={`Lompat ke ${t.value}`}
                className={cn(
                  "rounded px-1 font-mono text-primary underline-offset-2 outline-none transition-all duration-300",
                  "hover:bg-primary/10 hover:underline focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40",
                  isPlaying && "bg-primary/15 ring-1 ring-primary/30",
                  isClicked && "bg-primary/25 ring-2 ring-primary/50 animate-scale-in",
                )}
              >
                {t.value}
              </button>
            );
          }
        }
      })}
    </>
  );
}

function DescriptionPanel({
  description,
  viewCount,
  publishedAt,
  expanded,
  onToggle,
  onSeek,
  currentSec,
}: {
  description: string;
  viewCount?: string;
  publishedAt: string;
  expanded: boolean;
  onToggle: () => void;
  onSeek: (sec: number) => void;
  currentSec: number;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [collapsedHeight, setCollapsedHeight] = useState(0);
  const [fullHeight, setFullHeight] = useState(0);
  const [activeTimestamp, setActiveTimestamp] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      const full = el.scrollHeight;
      const styles = window.getComputedStyle(el);
      const fontSize = parseFloat(styles.fontSize) || 14;
      const lineHeight = parseFloat(styles.lineHeight) || fontSize * 1.55;
      const collapsed = Math.min(full, Math.ceil(lineHeight * 3));
      setFullHeight(full);
      setCollapsedHeight(collapsed);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [description]);

  useEffect(() => {
    if (activeTimestamp === null) return;
    const t = window.setTimeout(() => setActiveTimestamp(null), 1200);
    return () => window.clearTimeout(t);
  }, [activeTimestamp]);

  const canExpand = fullHeight > collapsedHeight + 1;
  const targetHeight = expanded ? fullHeight : collapsedHeight;

  return (
    <div
      className={cn(
        "group mt-4 rounded-xl bg-surface-2 p-4 text-sm transition-all duration-300",
        "hover:bg-surface-hover",
        !expanded && canExpand && "cursor-pointer",
      )}
      onClick={() => {
        if (!expanded && canExpand) onToggle();
      }}
      role={!expanded && canExpand ? "button" : undefined}
      tabIndex={!expanded && canExpand ? 0 : -1}
      aria-expanded={expanded}
      onKeyDown={(e) => {
        if (!expanded && canExpand && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold sm:text-sm">
        <span className="inline-flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 opacity-70" />
          {formatViews(viewCount)}x ditonton
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 opacity-70" />
          {timeAgo(publishedAt)}
        </span>
      </div>

      <div
        style={{
          height: targetHeight ? `${targetHeight}px` : undefined,
          transition: "height 360ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "height",
        }}
        className="mt-3 overflow-hidden"
      >
        <div
          ref={innerRef}
          className="whitespace-pre-wrap break-words leading-relaxed text-foreground/90"
        >
          <RenderedDescription
            text={description}
            onSeek={onSeek}
            activeTimestamp={activeTimestamp}
            onTimestampClick={setActiveTimestamp}
            currentSec={currentSec}
          />
        </div>
      </div>

      {canExpand && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            "mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
            "bg-primary/10 text-primary hover:bg-primary/20",
          )}
          aria-expanded={expanded}
        >
          {expanded ? "Tampilkan lebih sedikit" : "...selengkapnya"}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-300",
              expanded && "rotate-180",
            )}
          />
        </button>
      )}
    </div>
  );
}