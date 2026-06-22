import { Link } from "react-router-dom";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useHistory, toggleSaved, useSaved } from "@/lib/storage";
import { formatDuration } from "@/lib/youtube";
import { History, Trash2, X, MoreVertical, Bookmark, BookmarkCheck } from "lucide-react";
import { AddToPlaylistModal } from "@/components/AddToPlaylistModal";
import { PlaylistSavedToast } from "@/components/PlaylistSavedToast";
import { VideoSavedToast } from "@/components/VideoSavedToast";
import { VideoRemovedToast } from "@/components/VideoRemovedToast";
import { PlaylistRemovedToast } from "@/components/PlaylistRemovedToast";

export default function HistoryPage() {
  const { items, clear, remove } = useHistory();
  const savedIds = useSaved();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [addPlaylistVideo, setAddPlaylistVideo] = useState<{
    id: string; title: string; channelTitle: string; thumb: string; duration: string;
  } | null>(null);
  const [savedPlaylist, setSavedPlaylist] = useState<string | null>(null);
  const [removedPlaylist, setRemovedPlaylist] = useState<string | null>(null);
  const [videoSaved, setVideoSaved] = useState<{ title: string; thumb: string } | null>(null);
  const [videoRemoved, setVideoRemoved] = useState<{ title: string; thumb: string } | null>(null);
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const openMenu = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = menuBtnRefs.current[key];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setActiveMenu((prev) => (prev === key ? null : key));
  };

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Riwayat tontonan</h1>
        {items.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Hapus semua riwayat tontonan?")) clear();
            }}
            className="flex items-center gap-1.5 rounded-full bg-surface-hover px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <Trash2 className="h-4 w-4" /> Hapus semua
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="py-20 text-center">
          <History className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-semibold">Belum ada riwayat</p>
          <p className="text-sm text-muted-foreground">
            Video yang kamu tonton akan muncul di sini
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const pct =
              it.progress && it.durationSec
                ? Math.min(100, Math.max(0, (it.progress / it.durationSec) * 100))
                : 0;
            const menuKey = `${it.id}-${it.watchedAt}`;
            const isMenuOpen = activeMenu === menuKey;
            const isVideoSaved = savedIds.includes(it.id);

            return (
              <div
                key={menuKey}
                className="group relative flex gap-3 rounded-xl p-2 transition-colors hover:bg-surface-hover"
              >
                <Link
                  to={`/watch?v=${it.id}`}
                  className="flex flex-1 gap-3 min-w-0"
                >
                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0 w-40 sm:w-60">
                    <div className="yt-thumb w-full">
                      <img src={it.thumb} alt={it.title} loading="lazy" />
                      {it.duration && (
                        <span className="yt-duration">
                          {formatDuration(it.duration)}
                        </span>
                      )}
                      {pct > 0 && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                          <div
                            className="h-full bg-red-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 py-1 pr-16">
                    <h3 className="line-clamp-2 text-sm font-semibold sm:text-base">
                      {it.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {it.channelTitle}
                    </p>
                  </div>
                </Link>

                {/* Three-dot menu */}
                <div className="absolute right-10 top-2">
                  <button
                    ref={(el) => { menuBtnRefs.current[menuKey] = el; }}
                    onClick={(e) => openMenu(menuKey, e)}
                    aria-label="Opsi"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground transition-all hover:bg-surface-hover hover:text-foreground"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    remove(it.id, it.watchedAt);
                  }}
                  aria-label="Hapus dari riwayat"
                  title="Hapus dari riwayat"
                  className="
                    absolute right-2 top-2
                    flex h-8 w-8 items-center justify-center rounded-full
                    bg-background/80 text-muted-foreground
                    transition-all hover:bg-surface-hover hover:text-foreground
                  "
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Dropdown menu portal */}
                {isMenuOpen &&
                  createPortal(
                    <>
                      <div
                        className="fixed inset-0"
                        style={{ zIndex: 9998 }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveMenu(null);
                        }}
                      />
                      <div
                        className="fixed min-w-[200px] rounded-xl border border-border bg-background shadow-xl animate-scale-in-bounce"
                        style={{ top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveMenu(null);
                            setTimeout(() => setAddPlaylistVideo({
                              id: it.id,
                              title: it.title,
                              channelTitle: it.channelTitle,
                              thumb: it.thumb,
                              duration: it.duration,
                            }), 50);
                          }}
                          className="flex w-full items-center gap-3 rounded-t-xl px-4 py-3 text-sm hover:bg-surface-hover transition-colors duration-150"
                        >
                          <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 12H3m18 0h-7M12 3v18" />
                          </svg>
                          Simpan ke playlist
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const wasSaved = isVideoSaved;
                            toggleSaved(it.id);
                            setActiveMenu(null);
                            if (!wasSaved) {
                              setTimeout(() => setVideoSaved({ title: it.title, thumb: it.thumb }), 50);
                            } else {
                              setTimeout(() => setVideoRemoved({ title: it.title, thumb: it.thumb }), 50);
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
              </div>
            );
          })}
        </div>
      )}

      {addPlaylistVideo && (
        <AddToPlaylistModal
          video={addPlaylistVideo}
          onClose={() => setAddPlaylistVideo(null)}
          onSaved={(title) => setSavedPlaylist(title)}
          onRemoved={(title) => setRemovedPlaylist(title)}
        />
      )}
      {savedPlaylist !== null && (
        <PlaylistSavedToast
          playlistTitle={savedPlaylist}
          videoTitle={addPlaylistVideo?.title ?? ""}
          videoThumb={addPlaylistVideo?.thumb ?? ""}
          onClose={() => setSavedPlaylist(null)}
        />
      )}
      {removedPlaylist !== null && (
        <PlaylistRemovedToast
          playlistTitle={removedPlaylist}
          videoTitle={addPlaylistVideo?.title ?? ""}
          videoThumb={addPlaylistVideo?.thumb ?? ""}
          onClose={() => setRemovedPlaylist(null)}
        />
      )}
      {videoSaved !== null && videoSaved && (
        <VideoSavedToast
          videoTitle={videoSaved.title}
          videoThumb={videoSaved.thumb}
          onClose={() => setVideoSaved(null)}
        />
      )}
      {videoRemoved !== null && videoRemoved && (
        <VideoRemovedToast
          videoTitle={videoRemoved.title}
          videoThumb={videoRemoved.thumb}
          onClose={() => setVideoRemoved(null)}
        />
      )}
    </div>
  );
}