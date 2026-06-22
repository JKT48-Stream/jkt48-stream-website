import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  fetchPlaylistItems,
  fetchPlaylistInfo,
  bestThumb,
  formatDuration,
  formatViews,
  timeAgo,
  type YTPlaylist,
  type YTVideo,
} from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { toggleSaved, useSaved } from "@/lib/storage";
import { AddToPlaylistModal } from "@/components/AddToPlaylistModal";
import { PlaylistSavedToast } from "@/components/PlaylistSavedToast";
import { VideoSavedToast } from "@/components/VideoSavedToast";
import { VideoRemovedToast } from "@/components/VideoRemovedToast";
import { PlaylistRemovedToast } from "@/components/PlaylistRemovedToast";
import { Play, Shuffle, ListVideo, ArrowLeft, MoreVertical, ListPlus, Bookmark, BookmarkCheck } from "lucide-react";

function VideoRowSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
      {/* Nomor placeholder */}
      <div className="w-6 flex-shrink-0" />
      <div className="h-16 w-28 flex-shrink-0 animate-pulse rounded-lg bg-surface-hover sm:h-20 sm:w-36" />
      <div className="min-w-0 flex-1 space-y-2 py-1">
        <div className="h-3 w-full animate-pulse rounded bg-surface-hover" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-surface-hover" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
      </div>
    </div>
  );
}

function VideoRow({
  video,
  index,
  playlistId,
}: {
  video: YTVideo;
  index: number;
  playlistId: string;
}) {
  const thumb = bestThumb(video);
  const duration = formatDuration(video.contentDetails?.duration ?? "");
  const views = formatViews(video.statistics?.viewCount);
  const ago = timeAgo(video.snippet.publishedAt);
  const savedIds = useSaved();
  const isVideoSaved = savedIds.includes(video.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [savedPlaylist, setSavedPlaylist] = useState<string | null>(null);
  const [removedPlaylist, setRemovedPlaylist] = useState<string | null>(null);
  const [videoSaved, setVideoSaved] = useState(false);
  const [videoRemoved, setVideoRemoved] = useState(false);

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setMenuOpen((o) => !o);
  };

  const playlistVideo = {
    id: video.id,
    title: video.snippet.title,
    channelTitle: video.snippet.channelTitle,
    thumb,
    duration: video.contentDetails?.duration ?? "",
  };

  return (
    <>
      {/* ── Row container: items-center agar semua child sejajar tengah vertikal */}
      <div className="group relative flex items-center gap-2 rounded-xl px-3 py-2 transition-colors hover:bg-surface-hover sm:gap-3 sm:px-4">

        {/* ── Nomor: di luar Link, paling kiri, self-center — persis seperti YouTube */}
        <span className="w-6 flex-shrink-0 text-center text-xs text-muted-foreground self-center select-none">
          {index + 1}
        </span>

        {/* ── Thumbnail + Info: dibungkus Link */}
        <Link
          to={`/watch?v=${video.id}&list=${playlistId}&index=${index + 1}`}
          className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0"
        >
          {/* Thumbnail */}
          <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-36">
            <img
              src={thumb}
              alt={video.snippet.title}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
            <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] font-semibold text-white">
              {duration}
            </span>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Play className="h-6 w-6 fill-white text-white" />
            </div>
          </div>

          {/* Info teks */}
          <div className="min-w-0 flex-1 pr-2">
            <p className="line-clamp-2 text-sm font-medium leading-snug">
              {video.snippet.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {video.snippet.channelTitle}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {views} penonton • {ago}
            </p>
          </div>
        </Link>

        {/* ── Three-dot menu button */}
        <button
          ref={btnRef}
          onClick={openMenu}
          aria-label="Opsi"
          className={cn(
            "flex-shrink-0 rounded-full p-1.5 transition-all duration-200 hover:bg-surface-hover hover:scale-110 active:scale-90 self-center",
            menuOpen && "bg-surface-hover",
          )}
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Dropdown portal */}
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
                toggleSaved(video.id);
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

export default function PlaylistDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const playlistId = params.get("list") ?? "";

  const [playlist, setPlaylist] = useState<YTPlaylist | null>(null);
  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playlistId) return;
    setLoading(true);
    setVideos([]);
    setNextToken(null);
    Promise.all([
      fetchPlaylistInfo(playlistId),
      fetchPlaylistItems(playlistId),
    ])
      .then(([info, result]) => {
        setPlaylist(info);
        setVideos(result.videos);
        setNextToken(result.nextPageToken);
        setTotalResults(result.totalResults);
      })
      .finally(() => setLoading(false));
  }, [playlistId]);

  const loadMore = useCallback(async () => {
    if (!nextToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchPlaylistItems(playlistId, nextToken);
      setVideos((prev) => [...prev, ...result.videos]);
      setNextToken(result.nextPageToken);
    } finally {
      setLoadingMore(false);
    }
  }, [playlistId, nextToken, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const firstVideo = videos[0];

  const thumbUrl =
    playlist?.thumbnails?.maxres?.url ??
    playlist?.thumbnails?.standard?.url ??
    playlist?.thumbnails?.high?.url ??
    playlist?.thumbnails?.medium?.url ??
    playlist?.thumbnails?.default?.url ??
    (firstVideo ? bestThumb(firstVideo) : "");

  const playFirst = () => {
    if (!firstVideo) return;
    navigate(`/watch?v=${firstVideo.id}&list=${playlistId}&index=1`);
  };

  const shufflePlay = () => {
    if (!videos.length) return;
    const random = videos[Math.floor(Math.random() * videos.length)];
    const idx = videos.indexOf(random);
    navigate(`/watch?v=${random.id}&list=${playlistId}&index=${idx + 1}`);
  };

  if (!playlistId) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Playlist tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ── KIRI: Header playlist (sticky di desktop) ── */}
      <div className="lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-[360px] lg:flex-shrink-0 lg:overflow-y-auto">
        {/* Tombol kembali */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 pt-4 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali</span>
        </button>

        {/* Thumbnail */}
        <div className="relative mx-4 mt-3 overflow-hidden rounded-xl">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={playlist?.title ?? "Playlist"}
              className="aspect-video w-full object-cover"
            />
          ) : (
            <div className="aspect-video w-full animate-pulse bg-surface-hover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {firstVideo && (
            <button
              onClick={playFirst}
              className="absolute inset-0 flex items-end p-3"
            >
              <span className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/30">
                <Play className="h-4 w-4 fill-white" />
                Putar Semua
              </span>
            </button>
          )}
        </div>

        {/* Info playlist */}
        <div className="px-4 py-3">
          {loading && !playlist ? (
            <div className="space-y-2">
              <div className="h-5 w-3/4 animate-pulse rounded bg-surface-hover" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-surface-hover" />
            </div>
          ) : (
            <>
              <h1 className="text-lg font-bold leading-snug lg:text-xl">
                {playlist?.title ?? "Playlist"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {playlist?.channelTitle}
              </p>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ListVideo className="h-3.5 w-3.5" />
                  {totalResults || playlist?.itemCount || videos.length} video
                </span>
              </div>
              {playlist?.description && (
                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                  {playlist.description}
                </p>
              )}
            </>
          )}

          {/* Tombol aksi */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={playFirst}
              disabled={!firstVideo}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Play className="h-4 w-4 fill-background" />
              Putar Semua
            </button>
            <button
              onClick={shufflePlay}
              disabled={videos.length < 2}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-surface-hover px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-hover/80 disabled:opacity-40"
            >
              <Shuffle className="h-4 w-4" />
              Acak
            </button>
          </div>
        </div>
      </div>

      {/* ── KANAN: Daftar video ── */}
      <div className="flex-1 pb-20 lg:pb-8">
        <div className="px-0 pt-2">
          {loading &&
            Array.from({ length: 8 }).map((_, i) => (
              <VideoRowSkeleton key={i} />
            ))}
          {!loading &&
            videos.map((v, i) => (
              <VideoRow
                key={`${v.id}-${i}`}
                video={v}
                index={i}
                playlistId={playlistId}
              />
            ))}
          {loadingMore &&
            Array.from({ length: 4 }).map((_, i) => (
              <VideoRowSkeleton key={`m-${i}`} />
            ))}
        </div>
        <div ref={sentinelRef} className="h-10" />
      </div>
    </div>
  );
}