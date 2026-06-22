import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { PlaylistSavedToast } from "@/components/PlaylistSavedToast";
import { VideoSavedToast } from "@/components/VideoSavedToast";
import { VideoRemovedToast } from "@/components/VideoRemovedToast";
import { AddToPlaylistModal } from "@/components/AddToPlaylistModal";
import { PlaylistRemovedToast } from "@/components/PlaylistRemovedToast";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import {
  fetchChannel,
  fetchChannelInfo,
  fetchPlaylists,
  fetchPlaylistItems,
  fetchLiveReplays,
  bestPlaylistThumb,
  formatCount,
  timeAgo,
  CHANNELS,
  type ChannelKey,
  type YTVideo,
  type YTChannelInfo,
  type YTPlaylist,
  type YTLiveBroadcast,
  bestThumb,
  formatDuration,
  formatViews,
} from "@/lib/youtube";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { cn } from "@/lib/utils";
import {
  Play,
  ListVideo,
  BookmarkPlus,
  BookmarkCheck,
  Loader2,
  X,
  MoreVertical,
  Bookmark,
  ListPlus,
} from "lucide-react";

import {
  isChannelPlaylistSaved,
  saveChannelPlaylistFromChannel,
  removeSavedChannelPlaylistByYoutubeId,
  toggleSaved,
  useSaved,
} from "@/lib/storage";

type Order = "date" | "oldest";
type Tab = "videos" | "playlists" | "live";

const ORDERS: { key: Order; label: string }[] = [
  { key: "date", label: "Terbaru" },
  { key: "oldest", label: "Terlama" },
];

// ── Modal Konfirmasi Simpan Playlist dari Channel ─────────────────────────────
function SaveChannelPlaylistModal({
  playlist,
  channelName,
  onClose,
  onConfirm,
  onRemoved,
}: {
  playlist: YTPlaylist;
  channelName: string;
  onClose: () => void;
  onConfirm: () => void;
  onRemoved: () => void;
}) {
  const thumb = bestPlaylistThumb(playlist);
  const alreadySaved = isChannelPlaylistSaved(playlist.id);

  const handleRemove = () => {
    removeSavedChannelPlaylistByYoutubeId(playlist.id);
    onClose();
    onRemoved();
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold text-base">
            {alreadySaved ? "Hapus dari Playlist Saya?" : "Simpan Playlist ke Library"}
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-surface-hover">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info playlist */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border">
          <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-surface-hover">
            {thumb ? (
              <img src={thumb} alt={playlist.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ListVideo className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-y-0 right-0 flex w-10 flex-col items-center justify-center gap-0.5 bg-black/60">
              <ListVideo className="h-3 w-3 text-white" />
              <span className="text-[9px] font-bold text-white">{playlist.itemCount}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-snug">{playlist.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{channelName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{playlist.itemCount} video</p>
          </div>
        </div>

        {/* Info */}
        {!alreadySaved && (
          <div className="px-5 py-3 bg-primary/5 border-b border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Playlist ini akan muncul di tab{" "}
              <span className="font-semibold text-foreground">Playlist</span> kamu.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold transition-colors hover:bg-surface-hover"
          >
            Batal
          </button>
          {alreadySaved ? (
            <button
              onClick={handleRemove}
              className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-semibold text-white transition-opacity hover:bg-red-600 active:scale-95"
            >
              Hapus
            </button>
          ) : (
            <button
              onClick={onConfirm}
              className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:scale-95"
            >
              Simpan
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Playlist card ─────────────────────────────────────────────────────────────
function PlaylistCard({
  playlist,
  channelName,
}: {
  playlist: YTPlaylist;
  channelName: string;
}) {
  const thumb = bestPlaylistThumb(playlist);
  const count = playlist.itemCount;
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(() => isChannelPlaylistSaved(playlist.id));
  const [toast, setToast] = useState<string | null>(null);
  const [removedToast, setRemovedToast] = useState(false);

  useEffect(() => {
    const handler = () => setSaved(isChannelPlaylistSaved(playlist.id));
    window.addEventListener("jkt48-storage", handler);
    return () => window.removeEventListener("jkt48-storage", handler);
  }, [playlist.id]);

  const handleConfirmSave = useCallback(async () => {
    if (saving) return;
    setShowModal(false);
    setSaving(true);
    try {
      // Ambil SEMUA video dari playlist dengan loop pagination
      const allVideos: YTVideo[] = [];
      let pageToken: string | undefined;
      do {
        const result = await fetchPlaylistItems(playlist.id, pageToken);
        allVideos.push(...result.videos);
        pageToken = result.nextPageToken ?? undefined;
      } while (pageToken);

      const videos = allVideos.map((v) => ({
        id: v.id,
        title: v.snippet.title,
        channelTitle: v.snippet.channelTitle,
        thumb: bestThumb(v),
        duration: v.contentDetails?.duration ?? "",
      }));

      saveChannelPlaylistFromChannel(
        playlist.id,
        playlist.title,
        playlist.description ?? "",
        channelName,
        thumb ?? "",
        videos,
      );
      setSaved(true);
      setToast("Playlist disimpan ke library kamu");
    } finally {
      setSaving(false);
    }
  }, [playlist, channelName, thumb, saving]);

  const handleRemoved = useCallback(() => {
    setSaved(false);
    setRemovedToast(true);
  }, []);

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-xl transition-transform hover:scale-[1.02]">
        {/* Thumbnail */}
        <Link
          to={`/playlist?list=${playlist.id}`}
          className="relative block aspect-video w-full overflow-hidden rounded-xl bg-surface-hover"
        >
          {thumb ? (
            <img
              src={thumb}
              alt={playlist.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-hover">
              <ListVideo className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          {/* Video count strip */}
          <div className="absolute inset-y-0 right-0 flex w-12 flex-col items-center justify-center gap-0.5 bg-black/60 backdrop-blur-sm">
            <ListVideo className="h-4 w-4 text-white" />
            <span className="text-center text-[10px] font-bold leading-none text-white">
              {count}
            </span>
            <span className="text-[8px] leading-none text-white/80">video</span>
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
              <Play className="h-3.5 w-3.5 fill-white" />
              Putar semua
            </div>
          </div>
        </Link>

        {/* Info */}
        <div className="mt-2 space-y-0.5 px-0.5">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{playlist.title}</p>
          <p className="text-xs text-muted-foreground">{count} video</p>
          {playlist.publishedAt && (
            <p className="text-xs text-muted-foreground">{timeAgo(playlist.publishedAt)}</p>
          )}
          <div className="flex items-center justify-between pt-1">
            <Link
              to={`/playlist?list=${playlist.id}`}
              className="text-xs font-medium text-primary hover:underline"
            >
              Lihat playlist lengkap
            </Link>
            {/* Tombol Simpan ke Library */}
            <button
              onClick={() => !saving && setShowModal(true)}
              disabled={saving}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed",
                saving
                  ? "bg-primary/10 text-primary"
                  : saved
                    ? "bg-primary/10 text-primary"
                    : "bg-surface-hover text-muted-foreground hover:bg-primary/10 hover:text-primary",
              )}
              title={saving ? "Menyimpan…" : saved ? "Sudah disimpan – klik untuk hapus" : "Simpan ke playlist saya"}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saved ? (
                <BookmarkCheck className="h-3.5 w-3.5" />
              ) : (
                <BookmarkPlus className="h-3.5 w-3.5" />
              )}
              {saving ? "Menyimpan…" : saved ? "Disimpan" : "Simpan"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <SaveChannelPlaylistModal
          playlist={playlist}
          channelName={channelName}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirmSave}
          onRemoved={handleRemoved}
        />
      )}

      {/* Toast saat simpan */}
      {toast && (
        <PlaylistSavedToast
          playlistTitle={playlist.title}
          videoTitle={toast}
          videoThumb={thumb ?? undefined}
          onClose={() => setToast(null)}
        />
      )}

      {/* Toast saat hapus */}
      {removedToast && (
        <PlaylistRemovedToast
          playlistTitle={playlist.title}
          videoTitle="Playlist dihapus dari library kamu"
          videoThumb={thumb ?? undefined}
          onClose={() => setRemovedToast(false)}
        />
      )}
    </>
  );
}

function PlaylistCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-video w-full animate-pulse rounded-xl bg-surface-hover" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-surface-hover" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
    </div>
  );
}

// ── Live Replay card (past live stream) ──────────────────────────────────────
function LiveReplayCard({
  replay,
  channelName,
}: {
  replay: YTLiveBroadcast;
  channelName: string;
}) {
  const navigate = useNavigate();
  const savedIds = useSaved();
  const isVideoSaved = savedIds.includes(replay.videoId);

  const thumb =
    replay.thumbnails?.maxres?.url ??
    replay.thumbnails?.standard?.url ??
    replay.thumbnails?.high?.url ??
    replay.thumbnails?.medium?.url ??
    replay.thumbnails?.default?.url ??
    "";
  const duration = replay.duration ? formatDuration(replay.duration) : "";
  const views = replay.viewCount ? formatViews(replay.viewCount) : "";
  const ago = replay.publishedAt ? timeAgo(replay.publishedAt) : "";

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [savedPlaylist, setSavedPlaylist] = useState<string | null>(null);
  const [removedPlaylist, setRemovedPlaylist] = useState<string | null>(null);
  const [videoSaved, setVideoSaved] = useState(false);
  const [videoRemoved, setVideoRemoved] = useState(false);

  const playlistVideo = {
    id: replay.videoId,
    title: replay.title,
    channelTitle: channelName,
    thumb,
    duration: replay.duration ?? "",
  };

  const handleWatch = (e: React.MouseEvent) => {
    // Jangan navigate jika klik di area tombol titik 3
    if ((e.target as HTMLElement).closest("[data-menu-btn]")) return;
    navigate(`/watch?v=${replay.videoId}`);
  };

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setMenuOpen((o) => !o);
  };

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-xl transition-transform hover:scale-[1.02]">
        {/* Thumbnail — klik untuk tonton */}
        <div
          className="relative block aspect-video w-full overflow-hidden rounded-xl bg-surface-hover cursor-pointer"
          onClick={() => navigate(`/watch?v=${replay.videoId}`)}
        >
          {thumb ? (
            <img
              src={thumb}
              alt={replay.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-hover text-muted-foreground text-sm">
              Replay
            </div>
          )}

          {/* Duration badge */}
          <div className="absolute bottom-2 right-2">
            {duration ? (
              <span className="rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                {duration}
              </span>
            ) : (
              <span className="rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
                Live Replay
              </span>
            )}
          </div>

          {/* Live Replay chip top-left */}
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-red-400">
              <circle cx="12" cy="12" r="8" />
            </svg>
            <span className="text-[9px] font-bold text-white uppercase tracking-wide">Live Replay</span>
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
            <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
              <Play className="h-3.5 w-3.5 fill-white" />
              Tonton Replay
            </div>
          </div>
        </div>

        {/* Info row — mirip VideoCard grid */}
        <div className="mt-2 flex gap-2">
          {/* Title + metadata — klik untuk tonton */}
          <div
            className="min-w-0 flex-1 cursor-pointer"
            onClick={() => navigate(`/watch?v=${replay.videoId}`)}
          >
            <p className="line-clamp-2 text-sm font-semibold leading-snug">{replay.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{channelName}</p>
            <p className="text-xs text-muted-foreground">
              {views ? `${views}x ditonton` : ""}
              {views && ago ? " • " : ""}
              {ago}
            </p>
          </div>

          {/* Three-dot menu button — selalu muncul, di kanan setelah judul */}
          <div className="flex-shrink-0 pt-0.5">
            <button
              ref={menuBtnRef}
              data-menu-btn
              onClick={openMenu}
              aria-label="Opsi"
              className={cn(
                "rounded-full p-1 transition-all duration-200 hover:bg-surface-hover hover:scale-110 active:scale-90",
                menuOpen ? "bg-surface-hover" : "",
              )}
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown menu portal */}
      {menuOpen && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); }}
          />
          <div
            className="fixed min-w-[200px] rounded-xl border border-border bg-background shadow-xl animate-scale-in-bounce"
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
                toggleSaved(replay.videoId);
                setMenuOpen(false);
                if (!wasSaved) {
                  setTimeout(() => setVideoSaved(true), 50);
                } else {
                  setTimeout(() => setVideoRemoved(true), 50);
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

function LiveCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-video w-full animate-pulse rounded-xl bg-surface-hover" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-surface-hover" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
    </div>
  );
}

// ── Main ChannelPage ──────────────────────────────────────────────────────────
export default function ChannelPage() {
  const { handle } = useParams<{ handle: ChannelKey }>();
  if (!handle || !(handle in CHANNELS)) return <Navigate to="/" replace />;
  const channel = CHANNELS[handle];
  const navigate = useNavigate();

  const [info, setInfo] = useState<YTChannelInfo | null>(null);
  const [tab, setTab] = useState<Tab>("videos");
  const [order, setOrder] = useState<Order>("date");

  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [videoToken, setVideoToken] = useState<string | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [loadingMoreVideos, setLoadingMoreVideos] = useState(false);

  const [playlists, setPlaylists] = useState<YTPlaylist[]>([]);
  const [playlistToken, setPlaylistToken] = useState<string | null>(null);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [loadingMorePlaylists, setLoadingMorePlaylists] = useState(false);
  const [playlistsFetched, setPlaylistsFetched] = useState(false);

  // Live tab state — replays only, no live checking
  const [replays, setReplays] = useState<YTLiveBroadcast[]>([]);
  const [loadingLives, setLoadingLives] = useState(false);
  const [livesFetched, setLivesFetched] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChannelInfo(handle).then(setInfo).catch(() => { });
  }, [handle]);

  useEffect(() => {
    let cancelled = false;
    setLoadingVideos(true);
    setVideos([]);
    setVideoToken(null);

    if (order === "oldest") {
      (async () => {
        const all: YTVideo[] = [];
        let pageToken: string | undefined;
        try {
          do {
            const r = await fetchChannel(handle, "date", pageToken);
            if (cancelled) return;
            all.push(...r.videos);
            pageToken = r.nextPageToken ?? undefined;
          } while (pageToken);
          if (cancelled) return;
          setVideos(all.reverse());
          setVideoToken(null);
        } finally {
          if (!cancelled) setLoadingVideos(false);
        }
      })();
    } else {
      fetchChannel(handle, order)
        .then((r) => {
          if (cancelled) return;
          setVideos(r.videos);
          setVideoToken(r.nextPageToken);
        })
        .finally(() => !cancelled && setLoadingVideos(false));
    }
    return () => {
      cancelled = true;
    };
  }, [handle, order]);

  const loadPlaylists = useCallback(async () => {
    if (playlistsFetched) return;
    setLoadingPlaylists(true);
    try {
      const r = await fetchPlaylists(handle as ChannelKey);
      setPlaylists(r.playlists);
      setPlaylistToken(r.nextPageToken);
      setPlaylistsFetched(true);
    } finally {
      setLoadingPlaylists(false);
    }
  }, [handle, playlistsFetched]);

  useEffect(() => {
    if (tab === "playlists") loadPlaylists();
  }, [tab, loadPlaylists]);

  // Load replays only (no live checking)
  const loadReplays = useCallback(async () => {
    if (livesFetched) return;
    setLoadingLives(true);
    try {
      const r = await fetchLiveReplays(handle as ChannelKey);
      setReplays(r.replays ?? []);
      setLivesFetched(true);
    } catch {
      setReplays([]);
      setLivesFetched(true);
    } finally {
      setLoadingLives(false);
    }
  }, [handle, livesFetched]);

  useEffect(() => {
    if (tab === "live") loadReplays();
  }, [tab, loadReplays]);

  const loadMoreVideos = useCallback(async () => {
    if (!videoToken || loadingMoreVideos || order === "oldest") return;
    setLoadingMoreVideos(true);
    try {
      const r = await fetchChannel(handle, order, videoToken);
      setVideos((prev) => [...prev, ...r.videos]);
      setVideoToken(r.nextPageToken);
    } finally {
      setLoadingMoreVideos(false);
    }
  }, [handle, order, videoToken, loadingMoreVideos]);

  const loadMorePlaylists = useCallback(async () => {
    if (!playlistToken || loadingMorePlaylists) return;
    setLoadingMorePlaylists(true);
    try {
      const r = await fetchPlaylists(handle as ChannelKey, playlistToken);
      setPlaylists((prev) => [...prev, ...r.playlists]);
      setPlaylistToken(r.nextPageToken);
    } finally {
      setLoadingMorePlaylists(false);
    }
  }, [handle, playlistToken, loadingMorePlaylists]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (tab === "videos") loadMoreVideos();
        else loadMorePlaylists();
      },
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [tab, loadMoreVideos, loadMorePlaylists]);

  const avatar =
    info?.thumbnails?.high?.url ??
    info?.thumbnails?.medium?.url ??
    info?.thumbnails?.default?.url;

  return (
    <div>
      {/* Channel banner */}
      <div className="relative h-32 overflow-hidden sm:h-44 lg:h-56">
        {info?.banner ? (
          <img
            src={`${info.banner}=w1920-h320-c`}
            alt={`${channel.name} banner`}
            className="h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, hsl(${channel.color}), hsl(${channel.color} / 0.6))`,
            }}
          />
        )}
      </div>

      <div className="relative -mt-10 px-3 sm:px-6 lg:px-8">
        <div className="flex items-end gap-4">
          {/* Avatar + Info — wrapped in frosted pill so text is readable over banner */}
          <div
            className="flex items-center gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl px-2 py-2 sm:px-3 sm:py-2.5 flex-shrink-0"
            style={{
              background: "hsl(var(--background) / 0.82)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 2px 16px hsl(0 0% 0% / 0.18)",
              border: "1px solid hsl(var(--border) / 0.5)",
            }}
          >
            {/* Avatar */}
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border-2 border-background shadow-elevated sm:h-20 sm:w-20">
              {avatar ? (
                <img src={avatar} alt={channel.name} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-2xl font-black text-white sm:text-3xl"
                  style={{ background: `hsl(${channel.color})` }}
                >
                  48
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 py-1">
              <h1 className="truncate text-lg font-bold sm:text-2xl">
                {info?.title ?? channel.name}
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">{channel.handle}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {info ? (
                  <>
                    {formatCount(info.subscriberCount)} subscriber •{" "}
                    {formatCount(info.videoCount)} video
                  </>
                ) : (
                  channel.tagline
                )}
              </p>
            </div>
          </div>

          <div
            className="ml-auto mb-2 hidden cursor-default rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background sm:block"
            title="Hanya tampilan"
          >
            {info ? `${formatCount(info.subscriberCount)} Subscriber` : "Subscribe"}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="mt-6 flex items-center gap-1 border-b border-border">
          {(["videos", "playlists", "live"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors",
                tab === t
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-1.5">
                {t === "videos" ? "Video" : t === "playlists" ? "Playlist" : "Live"}
              </span>
              {tab === t && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-foreground" />
              )}
            </button>
          ))}
        </div>

        {/* ── SORT ── */}
        {tab === "videos" && (
          <div className="mt-3 flex items-center gap-2 pb-3">
            <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Urutkan:
            </span>
            {ORDERS.map((o) => (
              <button
                key={o.key}
                onClick={() => setOrder(o.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                  order === o.key ? "bg-foreground text-background" : "hover:bg-surface-hover",
                )}
              >
                {o.label}
              </button>
            ))}
            {order === "oldest" && loadingVideos && (
              <span className="ml-2 text-xs text-muted-foreground">
                Memuat seluruh arsip…
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── VIDEO GRID — VideoCard sudah built-in punya semua toast ── */}
      {tab === "videos" && (
        <div className="grid grid-cols-1 gap-4 px-3 pb-8 pt-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4">
          {loadingVideos &&
            Array.from({ length: 12 }).map((_, i) => <VideoCardSkeleton key={i} />)}
          {!loadingVideos &&
            videos.map((v, i) => <VideoCard key={`${v.id}-${i}`} video={v} />)}
          {loadingMoreVideos &&
            Array.from({ length: 4 }).map((_, i) => <VideoCardSkeleton key={`m-${i}`} />)}
        </div>
      )}

      {/* ── PLAYLIST GRID — PlaylistCard punya PlaylistSavedToast & PlaylistRemovedToast ── */}
      {tab === "playlists" && (
        <>
          <div className="grid grid-cols-1 gap-4 px-3 pb-8 pt-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4">
            {loadingPlaylists &&
              Array.from({ length: 8 }).map((_, i) => <PlaylistCardSkeleton key={i} />)}
            {!loadingPlaylists && playlists.length === 0 && (
              <div className="col-span-full flex h-32 items-center justify-center text-muted-foreground">
                Tidak ada playlist ditemukan.
              </div>
            )}
            {!loadingPlaylists &&
              playlists.map((pl) => (
                <PlaylistCard
                  key={pl.id}
                  playlist={pl}
                  channelName={info?.title ?? channel.name}
                />
              ))}
            {loadingMorePlaylists &&
              Array.from({ length: 4 }).map((_, i) => (
                <PlaylistCardSkeleton key={`mp-${i}`} />
              ))}
          </div>
        </>
      )}

      {/* ── LIVE GRID — LiveReplayCard punya semua toast ── */}
      {tab === "live" && (
        <div className="px-3 pb-8 pt-4 sm:px-6">
          {loadingLives && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <LiveCardSkeleton key={i} />)}
            </div>
          )}

          {!loadingLives && replays.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-muted-foreground">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-foreground">Belum ada live replay</p>
                <p className="text-sm text-muted-foreground mt-1">Tidak ada arsip live stream saat ini.</p>
              </div>
              <a
                href={`https://www.youtube.com/${channel.handle}/streams`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface-hover transition-colors"
              >
                Lihat semua stream di YouTube →
              </a>
            </div>
          )}

          {!loadingLives && replays.length > 0 && (
            <>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-base font-bold">Live Sebelumnya</h2>
                <span className="text-xs text-muted-foreground">{replays.length} video</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {replays.map((replay) => (
                  <LiveReplayCard
                    key={replay.videoId}
                    replay={replay}
                    channelName={info?.title ?? channel.name}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div ref={sentinelRef} className="h-10" />
    </div>
  );
}