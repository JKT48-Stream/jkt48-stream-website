import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Play,
  Shuffle,
  ListVideo,
  ArrowLeft,
  Trash2,
  Tv2,
  Lock,
  MoreVertical,
  ListPlus,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import {
  useSavedChannelPlaylist,
  removeSavedChannelPlaylist,
  updateSavedChannelPlaylistVideos,
  toggleSaved,
  useSaved,
  type PlaylistVideo,
} from "@/lib/storage";
import { AddToPlaylistModal } from "@/components/AddToPlaylistModal";
import { PlaylistSavedToast } from "@/components/PlaylistSavedToast";
import { VideoSavedToast } from "@/components/VideoSavedToast";
import { VideoRemovedToast } from "@/components/VideoRemovedToast";
import { PlaylistRemovedToast } from "@/components/PlaylistRemovedToast";
import { formatDuration, fetchPlaylistItems, fetchPlaylistInfo, bestThumb, bestPlaylistThumb, type YTVideo } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

// ─── Dialog Konfirmasi Hapus dari Library ────────────────────────────────────

function DeleteDialog({
  playlistTitle,
  onConfirm,
  onCancel,
}: {
  playlistTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") exit(onCancel); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const exit = (cb: () => void) => {
    setVisible(false);
    setTimeout(cb, 280);
  };

  return createPortal(
    <>
      <div
        onClick={() => exit(onCancel)}
        style={{ zIndex: 9998 }}
        className={cn(
          "fixed inset-0 bg-black/75 backdrop-blur-sm",
          "transition-opacity duration-[280ms] ease-out",
          visible ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        style={{ zIndex: 9999 }}
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className={cn(
            "pointer-events-auto w-full max-w-sm rounded-2xl bg-background shadow-2xl overflow-hidden",
            "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-6",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center pt-8 pb-4 px-6">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 mb-4",
                "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                visible ? "scale-100 opacity-100" : "scale-50 opacity-0",
              )}
              style={{ transitionDelay: "80ms" }}
            >
              <Trash2 className="h-7 w-7 text-red-500" />
            </div>
            <h2
              className={cn(
                "text-lg font-bold text-center transition-all duration-300",
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
              )}
              style={{ transitionDelay: "120ms" }}
            >
              Hapus dari Library?
            </h2>
            <p
              className={cn(
                "mt-2 text-center text-sm text-muted-foreground leading-relaxed transition-all duration-300",
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
              )}
              style={{ transitionDelay: "160ms" }}
            >
              Playlist{" "}
              <span className="font-semibold text-foreground">"{playlistTitle}"</span>{" "}
              akan dihapus dari library kamu.
            </p>
          </div>

          <div
            className={cn(
              "flex gap-3 border-t border-border px-6 py-4 transition-all duration-300",
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
            )}
            style={{ transitionDelay: "200ms" }}
          >
            <button
              onClick={() => exit(onCancel)}
              className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-surface-hover active:scale-95"
            >
              Batal
            </button>
            <button
              onClick={() => exit(onConfirm)}
              className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-600 active:scale-95"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Baris Video (Read-Only) ──────────────────────────────────────────────────

function VideoRow({
  video,
  index,
  playlistId,
}: {
  video: PlaylistVideo;
  index: number;
  playlistId: string;
}) {
  const duration = formatDuration(video.duration ?? "");
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
    title: video.title,
    channelTitle: video.channelTitle,
    thumb: video.thumb,
    duration: video.duration ?? "",
  };

  return (
    <>
      {/* ── Row container: flex items-center agar semua child sejajar tengah */}
      <div
        className="group relative flex items-center gap-2 rounded-xl px-2 py-2 transition-all duration-200 hover:bg-surface-hover sm:gap-3 sm:px-3 animate-fade-in"
        style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
      >
        {/* ── Nomor: di luar Link, sebelah kiri thumbnail, self-center agar
            benar-benar di tengah vertikal — persis seperti YouTube */}
        <span className="w-6 flex-shrink-0 text-center text-xs text-muted-foreground self-center select-none">
          {index + 1}
        </span>

        {/* ── Thumbnail + Info: dibungkus Link */}
        <Link
          to={`/watch?v=${video.id}&channellist=${playlistId}&index=${index + 1}`}
          className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0"
        >
          {/* Thumbnail */}
          <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-36">
            <img
              src={video.thumb}
              alt={video.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {duration && (
              <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] font-semibold text-white">
                {duration}
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <Play className="h-6 w-6 fill-white text-white" />
            </div>
          </div>

          {/* Info teks */}
          <div className="min-w-0 flex-1 pr-2">
            <p className="line-clamp-2 text-sm font-medium leading-snug">{video.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{video.channelTitle}</p>
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

export default function ChannelPlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playlist = useSavedChannelPlaylist(id ?? "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!playlist) return;
    // Selalu refresh semua video dari YouTube agar selalu up-to-date
    (async () => {
      try {
        const allVideos: YTVideo[] = [];
        let pageToken: string | undefined;
        do {
          const result = await fetchPlaylistItems(playlist.youtubePlaylistId, pageToken);
          allVideos.push(...result.videos);
          pageToken = result.nextPageToken ?? undefined;
        } while (pageToken);

        const refreshed = allVideos.map((v) => ({
          id: v.id,
          title: v.snippet.title,
          channelTitle: v.snippet.channelTitle,
          thumb: bestThumb(v),
          duration: v.contentDetails?.duration ?? "",
          addedAt: Date.now(),
        }));

        // Ambil ulang info playlist resmi dari YouTube (termasuk thumbnail
        // terbarunya) — sumber yang sama dipakai pada tampilan playlist
        // channel yang tidak bug, supaya thumbnail playlist yang disimpan
        // ikut ter-update saat ada video baru ditambahkan oleh channel.
        let freshThumb: string | undefined;
        try {
          const info = await fetchPlaylistInfo(playlist.youtubePlaylistId);
          if (info) freshThumb = bestPlaylistThumb(info);
        } catch {
          // Jika gagal ambil info playlist, fallback ke thumbnail video pertama di bawah
        }
        if (!freshThumb) freshThumb = refreshed[0]?.thumb;

        updateSavedChannelPlaylistVideos(playlist.id, refreshed, freshThumb);
      } catch {
        // Jika gagal (misal: offline), tampilkan data cache yang ada
      }
    })();
  }, [playlist?.id]);

  if (!id || !playlist) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground animate-fade-in">
        <ListVideo className="h-12 w-12" />
        <p>Playlist tidak ditemukan.</p>
        <button
          onClick={() => navigate("/playlists")}
          className="text-sm text-primary underline transition-opacity hover:opacity-70"
        >
          Kembali ke Playlist
        </button>
      </div>
    );
  }

  const videos = playlist.videos;
  const firstVideo = videos[0];
  const thumb = playlist.thumb || firstVideo?.thumb || null;

  const playFirst = () => {
    if (!firstVideo) return;
    navigate(`/watch?v=${firstVideo.id}&channellist=${id}&index=1`);
  };

  const shufflePlay = () => {
    if (!videos.length) return;
    const random = videos[Math.floor(Math.random() * videos.length)];
    const idx = videos.indexOf(random);
    navigate(`/watch?v=${random.id}&channellist=${id}&index=${idx + 1}`);
  };

  const handleDeleteConfirm = () => {
    removeSavedChannelPlaylist(id);
    navigate("/playlists");
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row page-enter">
      {/* ── Kiri: Info Playlist ───────────────────────────────────────────── */}
      <div className="lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-[360px] lg:flex-shrink-0 lg:overflow-y-auto">
        <button
          onClick={() => navigate("/playlists")}
          className="flex items-center gap-2 px-4 pt-4 text-sm text-muted-foreground transition-all duration-200 hover:text-foreground hover:gap-3"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Playlist saya</span>
        </button>

        <div className="relative mx-4 mt-3 overflow-hidden rounded-xl animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          {thumb ? (
            <img src={thumb} alt={playlist.title} className="aspect-video w-full object-cover" />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-surface-hover">
              <ListVideo className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {firstVideo && (
            <button onClick={playFirst} className="absolute inset-0 flex items-end p-3">
              <span className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/30 transition-all duration-200">
                <Play className="h-4 w-4 fill-white" />
                Putar Semua
              </span>
            </button>
          )}
        </div>

        <div className="px-4 py-3 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="mb-2 flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <Tv2 className="h-3 w-3" />
              Dari Channel
            </div>
            <div className="flex items-center gap-1 rounded-full bg-surface-hover px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              <Lock className="h-3 w-3" />
              Hanya Tonton
            </div>
          </div>

          <h1 className="text-lg font-bold leading-snug lg:text-xl">{playlist.title}</h1>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tv2 className="h-3.5 w-3.5" />
            <span>{playlist.channelTitle}</span>
            <span>·</span>
            <ListVideo className="h-3.5 w-3.5" />
            <span>{videos.length} video</span>
          </div>
          {playlist.description && (
            <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{playlist.description}</p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={playFirst}
              disabled={!firstVideo}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-95 disabled:opacity-40"
            >
              <Play className="h-4 w-4 fill-background" />
              Putar Semua
            </button>
            <button
              onClick={shufflePlay}
              disabled={videos.length < 2}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-surface-hover px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-surface-hover/80 hover:scale-[1.02] active:scale-95 disabled:opacity-40"
            >
              <Shuffle className="h-4 w-4" />
              Acak
            </button>
          </div>

          <div className="mt-2">
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-red-500/30 px-3 py-2.5 text-sm font-semibold text-red-500 transition-all duration-200 hover:bg-red-500/10 hover:border-red-500/60 hover:scale-[1.02] active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
              Hapus dari Library
            </button>
          </div>
        </div>
      </div>

      {/* ── Kanan: Daftar Video ───────────────────────────────────────────── */}
      <div className="flex-1 pb-20 lg:pb-8">
        <div className="px-1 pt-2">
          {videos.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center text-muted-foreground animate-fade-in-up">
              <ListVideo className="mb-3 h-10 w-10 animate-float" />
              <p className="font-semibold">Tidak ada video</p>
              <p className="mt-1 text-sm">Playlist ini tidak memiliki video</p>
            </div>
          ) : (
            videos.map((v, i) => (
              <VideoRow key={v.id} video={v} index={i} playlistId={id} />
            ))
          )}
        </div>
      </div>

      {showDeleteDialog && (
        <DeleteDialog
          playlistTitle={playlist.title}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
}