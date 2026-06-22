import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, ListPlus, Bookmark, BookmarkCheck } from "lucide-react";
import {
  bestThumb,
  formatDuration,
  formatViews,
  timeAgo,
  fetchChannelInfo,
  channelKeyFromVideo,
  CHANNELS,
  type ChannelKey,
  type YTVideo,
} from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { AddToPlaylistModal } from "@/components/AddToPlaylistModal";
import { toggleSaved, useSaved } from "@/lib/storage";
import { PlaylistSavedToast } from "@/components/PlaylistSavedToast";
import { VideoSavedToast } from "@/components/VideoSavedToast";
import { VideoRemovedToast } from "@/components/VideoRemovedToast";
import { PlaylistRemovedToast } from "@/components/PlaylistRemovedToast";

export function resolveChannelKey(
  channelTitle: string,
  channelId?: string,
): ChannelKey | null {
  return channelKeyFromVideo(channelId, channelTitle);
}

export function ChannelMiniAvatar({
  channelTitle,
  channelId,
  channelKey,
  size = 36,
}: {
  channelTitle: string;
  channelId?: string;
  channelKey?: ChannelKey | null;
  size?: number;
}) {
  const key = channelKey ?? resolveChannelKey(channelTitle, channelId);
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetchChannelInfo(key)
      .then((info) => {
        const u =
          info?.thumbnails?.high?.url ??
          info?.thumbnails?.medium?.url ??
          info?.thumbnails?.default?.url ??
          null;
        if (!cancelled) setUrl(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);

  const style = { width: size, height: size };

  if (url) {
    return (
      <img
        src={url}
        alt={channelTitle}
        style={style}
        onLoad={() => setLoaded(true)}
        className={cn(
          "rounded-full object-cover flex-shrink-0",
          "transition-all duration-300",
          loaded ? "opacity-100 scale-100" : "opacity-0 scale-95",
        )}
        loading="lazy"
      />
    );
  }
  const bg = key ? `hsl(${CHANNELS[key].color})` : undefined;
  return (
    <div
      style={{ ...style, background: bg }}
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-xs font-bold text-primary-foreground transition-transform duration-200 hover:scale-105"
    >
      {(channelTitle || "JK").slice(0, 2).toUpperCase()}
    </div>
  );
}

type Props = {
  video: YTVideo;
  layout?: "grid" | "list" | "compact";
  animationDelay?: number;
  onVideoRemoved?: (title: string, thumb?: string) => void;
};

export function VideoCard({ video, layout = "grid", animationDelay = 0, onVideoRemoved }: Props) {
  const navigate = useNavigate();
  const v = video;
  const title = v.snippet.title;
  const channelId = v.snippet.channelId;
  const channelKey = resolveChannelKey(v.snippet.channelTitle, channelId);
  const channel = channelKey ? CHANNELS[channelKey].name : v.snippet.channelTitle;
  const channelHref = channelKey ? `/channel/${channelKey}` : null;
  const thumb = bestThumb(v);
  const duration = formatDuration(v.contentDetails?.duration ?? "");
  const views = formatViews(v.statistics?.viewCount);
  const ago = timeAgo(v.snippet.publishedAt);
  const liveStatus = v.snippet.liveBroadcastContent;
  const isCompleted = liveStatus === "completed";
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [savedPlaylist, setSavedPlaylist] = useState<string | null>(null);
  const [removedPlaylist, setRemovedPlaylist] = useState<string | null>(null);
  const [videoSaved, setVideoSaved] = useState(false);
  const [videoRemoved, setVideoRemoved] = useState(false);
  const savedIds = useSaved();
  const isVideoSaved = savedIds.includes(v.id);

  const playlistVideo = {
    id: v.id,
    title: v.snippet.title,
    channelTitle: channel,
    thumb,
    duration: v.contentDetails?.duration ?? "",
  };

  const ChannelLabel = ({ className }: { className?: string }) =>
    channelHref ? (
      <Link
        to={channelHref}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "hover:text-foreground transition-colors duration-150 hover:underline underline-offset-2",
          className,
        )}
      >
        {channel}
      </Link>
    ) : (
      <span className={className}>{channel}</span>
    );

  if (layout === "list") {
    const [listMenuOpen, setListMenuOpen] = useState(false);
    const [listMenuPos, setListMenuPos] = useState({ top: 0, right: 0 });
    const listBtnRef = useRef<HTMLButtonElement>(null);
    const [listVideoSaved, setListVideoSaved] = useState(false);
    const [listVideoRemoved, setListVideoRemoved] = useState(false);

    const openListMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (listBtnRef.current) {
        const rect = listBtnRef.current.getBoundingClientRect();
        setListMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
      }
      setListMenuOpen((o) => !o);
    };

    return (
      <>
        <div
          className="yt-card group flex gap-3 rounded-xl p-2 hover:bg-surface-hover transition-all duration-200 animate-fade-in cursor-pointer"
          style={{ animationDelay: `${animationDelay}ms` }}
          onClick={() => {
            navigate(`/watch?v=${v.id}`);
          }}
        >
          <div className="relative flex-shrink-0 w-[168px] sm:w-60 md:w-80">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <img
                src={thumb}
                alt={title}
                loading="lazy"
                onLoad={() => setThumbLoaded(true)}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-all duration-400",
                  thumbLoaded ? "opacity-100" : "opacity-0",
                  "group-hover:scale-105",
                )}
              />
              {!thumbLoaded && <div className="absolute inset-0 yt-skeleton rounded-lg" />}
              {duration ? (
                <span className="yt-duration">{duration}</span>
              ) : null}
            </div>
          </div>
          <div className="min-w-0 flex-1 py-1">
            <h3 className="line-clamp-2 text-sm font-semibold sm:text-base transition-colors duration-150 group-hover:text-primary/90">
              {title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {views}x ditonton • {ago}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <ChannelMiniAvatar channelTitle={channel} channelId={channelId} size={24} />
              <ChannelLabel className="text-xs text-muted-foreground" />
            </div>
          </div>

          {/* Three-dot menu */}
          <div className="flex-shrink-0 self-start pt-1">
            <button
              ref={listBtnRef}
              className={cn(
                "rounded-full p-1 transition-all duration-200 hover:bg-surface-hover hover:scale-110 active:scale-90",
                listMenuOpen ? "bg-surface-hover" : "",
              )}
              onClick={openListMenu}
              aria-label="Opsi"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {listMenuOpen &&
          createPortal(
            <>
              <div
                className="fixed inset-0"
                style={{ zIndex: 9998 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setListMenuOpen(false);
                }}
              />
              <div
                className="fixed min-w-[190px] rounded-xl border border-border bg-background shadow-xl animate-scale-in-bounce"
                style={{ top: listMenuPos.top, right: listMenuPos.right, zIndex: 9999 }}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setListMenuOpen(false);
                    setTimeout(() => setShowAddPlaylist(true), 50);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm hover:bg-surface-hover transition-colors duration-150"
                >
                  <ListPlus className="h-4 w-4 flex-shrink-0" />
                  Simpan ke playlist
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const wasSaved = isVideoSaved;
                    toggleSaved(v.id);
                    setListMenuOpen(false);
                    if (!wasSaved) {
                      setTimeout(() => setListVideoSaved(true), 50);
                    } else {
                      if (onVideoRemoved) {
                        setTimeout(() => onVideoRemoved(playlistVideo.title, playlistVideo.thumb), 50);
                      } else {
                        setTimeout(() => setListVideoRemoved(true), 50);
                      }
                    }
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm hover:bg-surface-hover transition-colors duration-150"
                >
                  {isVideoSaved ? (
                    <BookmarkCheck className="h-4 w-4 flex-shrink-0 text-primary" />
                  ) : (
                    <Bookmark className="h-4 w-4 flex-shrink-0" />
                  )}
                  {isVideoSaved ? "Hapus dari Tersimpan" : "Simpan Video"}
                </button>
              </div>
            </>,
            document.body,
          )}

        {showAddPlaylist && (
          <AddToPlaylistModal
            video={playlistVideo}
            onClose={() => setShowAddPlaylist(false)}
            onSaved={(title) => setSavedPlaylist(title)}
            onRemoved={(title) => setRemovedPlaylist(title)}
          />
        )}
        {savedPlaylist !== null && (
          <PlaylistSavedToast
            playlistTitle={savedPlaylist}
            videoTitle={playlistVideo.title}
            videoThumb={playlistVideo.thumb}
            onClose={() => setSavedPlaylist(null)}
          />
        )}
        {removedPlaylist !== null && (
          <PlaylistRemovedToast
            playlistTitle={removedPlaylist}
            videoTitle={playlistVideo.title}
            videoThumb={playlistVideo.thumb}
            onClose={() => setRemovedPlaylist(null)}
          />
        )}
        {listVideoSaved && (
          <VideoSavedToast
            videoTitle={playlistVideo.title}
            videoThumb={playlistVideo.thumb}
            onClose={() => setListVideoSaved(false)}
          />
        )}
        {listVideoRemoved && (
          <VideoRemovedToast
            videoTitle={playlistVideo.title}
            videoThumb={playlistVideo.thumb}
            onClose={() => setListVideoRemoved(false)}
          />
        )}
      </>
    );
  }

  if (layout === "compact") {
    const [compactMenuOpen, setCompactMenuOpen] = useState(false);
    const [compactMenuPos, setCompactMenuPos] = useState({ top: 0, right: 0 });
    const compactBtnRef = useRef<HTMLButtonElement>(null);
    const [compactVideoSaved, setCompactVideoSaved] = useState(false);
    const [compactVideoRemoved, setCompactVideoRemoved] = useState(false);

    const openCompactMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (compactBtnRef.current) {
        const rect = compactBtnRef.current.getBoundingClientRect();
        setCompactMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
      }
      setCompactMenuOpen((o) => !o);
    };

    return (
      <>
        <div
          className="yt-card group flex gap-2 rounded-xl p-1 hover:bg-surface-hover transition-all duration-200 animate-fade-in cursor-pointer"
          style={{ animationDelay: `${animationDelay}ms` }}
          onClick={() => navigate(`/watch?v=${v.id}`)}
        >
          {/* Thumbnail */}
          <div className="relative yt-thumb w-40 flex-shrink-0 overflow-hidden rounded-xl">
            <img
              src={thumb}
              alt={title}
              loading="lazy"
              onLoad={() => setThumbLoaded(true)}
              className={cn(
                "transition-all duration-400",
                thumbLoaded ? "opacity-100" : "opacity-0",
                "group-hover:scale-105",
              )}
            />
            {!thumbLoaded && <div className="absolute inset-0 yt-skeleton" />}
            {duration ? (
              <span className="yt-duration">{duration}</span>
            ) : null}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h4 className="line-clamp-2 text-sm font-medium leading-tight transition-colors duration-150 group-hover:text-primary/90 pr-1">
              {title}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
              <ChannelLabel />
            </p>
            <p className="text-xs text-muted-foreground">
              {views}x ditonton • {ago}
            </p>
          </div>

          {/* Three-dot button — always visible */}
          <div className="flex-shrink-0 self-start pt-0.5">
            <button
              ref={compactBtnRef}
              className={cn(
                "rounded-full p-1 transition-all duration-200 hover:bg-muted active:scale-90",
                compactMenuOpen ? "bg-muted" : "",
              )}
              onClick={openCompactMenu}
              aria-label="Opsi"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Dropdown portal */}
        {compactMenuOpen &&
          createPortal(
            <>
              <div
                className="fixed inset-0"
                style={{ zIndex: 9998 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCompactMenuOpen(false);
                }}
              />
              <div
                className="fixed min-w-[190px] rounded-xl border border-border bg-background shadow-xl animate-scale-in-bounce"
                style={{ top: compactMenuPos.top, right: compactMenuPos.right, zIndex: 9999 }}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCompactMenuOpen(false);
                    setTimeout(() => setShowAddPlaylist(true), 50);
                  }}
                  className="flex w-full items-center gap-3 rounded-t-xl px-4 py-3 text-sm hover:bg-surface-hover transition-colors duration-150"
                >
                  <ListPlus className="h-4 w-4 flex-shrink-0" />
                  Simpan ke playlist
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const wasSaved = isVideoSaved;
                    toggleSaved(v.id);
                    setCompactMenuOpen(false);
                    if (!wasSaved) {
                      setTimeout(() => setCompactVideoSaved(true), 50);
                    } else {
                      if (onVideoRemoved) {
                        setTimeout(() => onVideoRemoved(playlistVideo.title, playlistVideo.thumb), 50);
                      } else {
                        setTimeout(() => setCompactVideoRemoved(true), 50);
                      }
                    }
                  }}
                  className="flex w-full items-center gap-3 rounded-b-xl px-4 py-3 text-sm hover:bg-surface-hover transition-colors duration-150"
                >
                  {isVideoSaved ? (
                    <BookmarkCheck className="h-4 w-4 flex-shrink-0 text-primary" />
                  ) : (
                    <Bookmark className="h-4 w-4 flex-shrink-0" />
                  )}
                  {isVideoSaved ? "Hapus dari Tersimpan" : "Simpan Video"}
                </button>
              </div>
            </>,
            document.body,
          )}

        {showAddPlaylist && (
          <AddToPlaylistModal
            video={playlistVideo}
            onClose={() => setShowAddPlaylist(false)}
            onSaved={(title) => setSavedPlaylist(title)}
            onRemoved={(title) => setRemovedPlaylist(title)}
          />
        )}
        {savedPlaylist !== null && (
          <PlaylistSavedToast
            playlistTitle={savedPlaylist}
            videoTitle={playlistVideo.title}
            videoThumb={playlistVideo.thumb}
            onClose={() => setSavedPlaylist(null)}
          />
        )}
        {removedPlaylist !== null && (
          <PlaylistRemovedToast
            playlistTitle={removedPlaylist}
            videoTitle={playlistVideo.title}
            videoThumb={playlistVideo.thumb}
            onClose={() => setRemovedPlaylist(null)}
          />
        )}
        {compactVideoSaved && (
          <VideoSavedToast
            videoTitle={playlistVideo.title}
            videoThumb={playlistVideo.thumb}
            onClose={() => setCompactVideoSaved(false)}
          />
        )}
        {compactVideoRemoved && (
          <VideoRemovedToast
            videoTitle={playlistVideo.title}
            videoThumb={playlistVideo.thumb}
            onClose={() => setCompactVideoRemoved(false)}
          />
        )}
      </>
    );
  }

  // ── Grid layout (default) ──────────────────────────────────────────────────
  return (
    <>
      <div
        className="yt-card group block animate-fade-in-up"
        style={{ animationDelay: `${animationDelay}ms` }}
      >
        {/* Thumbnail area */}
        <div
          className="yt-thumb relative overflow-hidden rounded-xl cursor-pointer"
          onClick={() => {
            navigate(`/watch?v=${v.id}`);
          }}
        >
          {!thumbLoaded && <div className="absolute inset-0 yt-skeleton z-10" />}
          <img
            src={thumb}
            alt={title}
            loading="lazy"
            onLoad={() => setThumbLoaded(true)}
            className={cn(
              "h-full w-full object-cover",
              "transition-all duration-400 ease-smooth",
              thumbLoaded ? "opacity-100" : "opacity-0",
              "group-hover:scale-105",
            )}
          />
          {duration ? (
            <span className="yt-duration transition-all duration-200 group-hover:scale-105">
              {duration}
            </span>
          ) : null}
          {/* Play overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-250 scale-75 group-hover:scale-100">
              <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <svg className="w-5 h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Card info row */}
        <div className="mt-3 flex gap-3">
          {/* Avatar */}
          <div
            className="flex-shrink-0 transition-transform duration-200 group-hover:scale-105 cursor-pointer"
            onClick={() => channelHref && navigate(channelHref)}
          >
            <ChannelMiniAvatar channelTitle={channel} channelId={channelId} size={36} />
          </div>

          {/* Title + metadata */}
          <div
            className="min-w-0 flex-1 cursor-pointer"
            onClick={() => {
              navigate(`/watch?v=${v.id}`);
            }}
          >
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors duration-150 group-hover:text-foreground">
              {title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
              <ChannelLabel />
            </p>
            <p className="text-xs text-muted-foreground">
              {isCompleted ? (
                <span>Live replay · {views}x ditonton</span>
              ) : (
                <span>{views}x ditonton • {ago}</span>
              )}
            </p>
          </div>

          {/* Three-dot menu */}
          <div className="flex-shrink-0">
            <button
              ref={menuBtnRef}
              className={cn(
                "rounded-full p-1 transition-all duration-200 hover:bg-surface-hover hover:scale-110 active:scale-90",
                menuOpen ? "bg-surface-hover" : "",
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (menuBtnRef.current) {
                  const rect = menuBtnRef.current.getBoundingClientRect();
                  setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                }
                setMenuOpen((o) => !o);
              }}
              aria-label="Opsi"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {menuOpen && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(false);
            }}
          />
          <div
            className="fixed min-w-[190px] rounded-xl border border-border bg-background shadow-xl animate-scale-in-bounce"
            style={{ top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(false);
                setTimeout(() => setShowAddPlaylist(true), 50);
              }}
              className="flex w-full items-center gap-3 rounded-t-xl px-4 py-3 text-sm hover:bg-surface-hover transition-colors duration-150"
            >
              <ListPlus className="h-4 w-4 flex-shrink-0" />
              Simpan ke playlist
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const wasSaved = isVideoSaved;
                toggleSaved(v.id);
                setMenuOpen(false);
                if (!wasSaved) {
                  setTimeout(() => setVideoSaved(true), 50);
                } else {
                  if (onVideoRemoved) {
                    setTimeout(() => onVideoRemoved(playlistVideo.title, playlistVideo.thumb), 50);
                  } else {
                    setTimeout(() => setVideoRemoved(true), 50);
                  }
                }
              }}
              className="flex w-full items-center gap-3 rounded-b-xl px-4 py-3 text-sm hover:bg-surface-hover transition-colors duration-150"
            >
              {isVideoSaved ? (
                <BookmarkCheck className="h-4 w-4 flex-shrink-0 text-primary" />
              ) : (
                <Bookmark className="h-4 w-4 flex-shrink-0" />
              )}
              {isVideoSaved ? "Hapus dari Tersimpan" : "Simpan Video"}
            </button>
          </div>
        </>,
        document.body,
      )}

      {showAddPlaylist && (
        <AddToPlaylistModal
          video={playlistVideo}
          onClose={() => setShowAddPlaylist(false)}
          onSaved={(title) => setSavedPlaylist(title)}
          onRemoved={(title) => setRemovedPlaylist(title)}
        />
      )}
      {savedPlaylist !== null && (
        <PlaylistSavedToast
          playlistTitle={savedPlaylist}
          videoTitle={playlistVideo.title}
          videoThumb={playlistVideo.thumb}
          onClose={() => setSavedPlaylist(null)}
        />
      )}
      {removedPlaylist !== null && (
        <PlaylistRemovedToast
          playlistTitle={removedPlaylist}
          videoTitle={playlistVideo.title}
          videoThumb={playlistVideo.thumb}
          onClose={() => setRemovedPlaylist(null)}
        />
      )}
      {videoSaved && (
        <VideoSavedToast
          videoTitle={playlistVideo.title}
          videoThumb={playlistVideo.thumb}
          onClose={() => setVideoSaved(false)}
        />
      )}
      {videoRemoved && (
        <VideoRemovedToast
          videoTitle={playlistVideo.title}
          videoThumb={playlistVideo.thumb}
          onClose={() => setVideoRemoved(false)}
        />
      )}
    </>
  );
}

export function VideoCardSkeleton({ layout = "grid" }: { layout?: "grid" | "list" }) {
  if (layout === "list") {
    return (
      <div className="flex gap-3 p-2 animate-fade-in">
        <div className="yt-skeleton aspect-video w-80 flex-shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2 py-1">
          <div className="yt-skeleton h-4 w-3/4 rounded" />
          <div className="yt-skeleton h-3 w-1/2 rounded" />
          <div className="yt-skeleton h-3 w-1/3 rounded" />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="yt-skeleton aspect-video w-full rounded-xl" />
      <div className="flex gap-3">
        <div className="yt-skeleton h-9 w-9 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="yt-skeleton h-4 w-full rounded" />
          <div className="yt-skeleton h-3 w-2/3 rounded" />
          <div className="yt-skeleton h-3 w-1/2 rounded" />
        </div>
      </div>
    </div>
  );
}