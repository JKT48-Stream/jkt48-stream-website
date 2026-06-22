import { useEffect, useRef, useState } from "react";
import { Check, Plus, Lock, Globe, Link2, X, ListVideo } from "lucide-react";
import {
  usePlaylists,
  createPlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  isVideoInPlaylist,
  type UserPlaylist,
  type PlaylistVideo,
} from "@/lib/storage";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

type Props = {
  video: Omit<PlaylistVideo, "addedAt">;
  onClose: () => void;
  /** Dipanggil setelah video berhasil ditambahkan ke playlist */
  onSaved?: (playlistTitle: string) => void;
  /** Dipanggil setelah video berhasil dihapus dari playlist */
  onRemoved?: (playlistTitle: string) => void;
};

function VisIcon({ v }: { v: UserPlaylist["visibility"] }) {
  if (v === "public") return <Globe className="h-3.5 w-3.5 flex-shrink-0" />;
  if (v === "unlisted") return <Link2 className="h-3.5 w-3.5 flex-shrink-0" />;
  return <Lock className="h-3.5 w-3.5 flex-shrink-0" />;
}

export function AddToPlaylistModal({ video, onClose, onSaved, onRemoved }: Props) {
  const playlists = usePlaylists();
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newVisibility, setNewVisibility] = useState<UserPlaylist["visibility"]>("private");
  const [visible, setVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const toggle = (plId: string) => {
    const pl = playlists.find((p) => p.id === plId);
    if (isVideoInPlaylist(plId, video.id)) {
      removeVideoFromPlaylist(plId, video.id);
      if (pl) {
        handleClose();
        onRemoved?.(pl.title);
      }
    } else {
      addVideoToPlaylist(plId, video);
      if (pl) {
        handleClose();
        onSaved?.(pl.title);
      }
    }
  };

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const pl = createPlaylist(newTitle.trim(), "", newVisibility);
    addVideoToPlaylist(pl.id, video);
    setCreating(false);
    setNewTitle("");
    handleClose();
    onSaved?.(pl.title);
  };

  const modal = (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={handleClose}
        style={{ zIndex: 9999 }}
        className={cn(
          "fixed inset-0 bg-black/70 backdrop-blur-sm",
          "transition-opacity duration-280 ease-out",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Modal */}
      <div
        style={{ zIndex: 10000 }}
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className={cn(
            "pointer-events-auto w-full max-w-sm rounded-2xl bg-background shadow-2xl overflow-hidden",
            "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            visible
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-90 translate-y-6",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold text-base">Simpan ke playlist</h2>
            <button
              onClick={handleClose}
              className="rounded-full p-1.5 text-muted-foreground transition-all duration-200 hover:bg-surface-hover hover:text-foreground hover:rotate-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Video thumbnail */}
          <div className="flex items-center gap-3 border-b border-border px-5 py-3">
            <img
              src={video.thumb}
              alt={video.title}
              className="h-12 w-20 flex-shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-medium leading-snug">{video.title}</p>
              <p className="text-xs text-muted-foreground">{video.channelTitle}</p>
            </div>
          </div>

          {/* Playlist list */}
          <div className="max-h-64 overflow-y-auto">
            {playlists.length === 0 && !creating && (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <ListVideo className="mb-2 h-8 w-8" />
                <p className="text-sm">Belum ada playlist</p>
              </div>
            )}

            {playlists.map((pl, i) => {
              const inList = isVideoInPlaylist(pl.id, video.id);
              return (
                <button
                  key={pl.id}
                  onClick={() => toggle(pl.id)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="flex w-full items-center gap-3 px-5 py-3 text-sm transition-all duration-150 hover:bg-surface-hover animate-fade-in"
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2",
                      "transition-all duration-200",
                      inList
                        ? "border-primary bg-primary text-primary-foreground scale-110"
                        : "border-muted-foreground bg-transparent",
                    )}
                  >
                    {inList && <Check className="h-3 w-3 stroke-[3]" />}
                  </span>

                  {pl.videos[0]?.thumb ? (
                    <img
                      src={pl.videos[0].thumb}
                      alt=""
                      className="h-9 w-16 flex-shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-surface-hover">
                      <ListVideo className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate font-medium">{pl.title}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <VisIcon v={pl.visibility} />
                      <span>{pl.videos.length} video</span>
                      {inList && (
                        <span className="ml-1 text-primary font-medium animate-fade-in">
                          · Tersimpan
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Create new playlist form */}
          {creating ? (
            <div className="border-t border-border px-5 py-4 space-y-3 animate-fade-in-up">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Nama playlist baru"
                maxLength={150}
                className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
              />
              <div className="flex gap-2">
                {(["private", "unlisted", "public"] as UserPlaylist["visibility"][]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setNewVisibility(v)}
                    className={cn(
                      "flex-1 rounded-full border py-1.5 text-xs font-medium transition-all duration-200",
                      newVisibility === v
                        ? "border-primary bg-primary/10 text-primary scale-105"
                        : "border-border hover:bg-surface-hover",
                    )}
                  >
                    {v === "private" ? "Pribadi" : v === "unlisted" ? "Tdk Terdaftar" : "Publik"}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCreating(false);
                    setNewTitle("");
                  }}
                  className="flex-1 rounded-full border border-border py-2 text-sm font-semibold transition-all duration-200 hover:bg-surface-hover active:scale-95"
                >
                  Batal
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim()}
                  className="flex-1 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-40"
                >
                  Buat & Simpan
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-border px-5 py-3">
              <button
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-3 rounded-xl py-2 px-2 text-sm font-medium transition-all duration-200 hover:bg-surface-hover active:scale-95"
              >
                <Plus className="h-5 w-5 text-primary" />
                <span className="text-primary">Buat playlist baru</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}