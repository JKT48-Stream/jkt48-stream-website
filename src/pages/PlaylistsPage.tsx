import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ListVideo,
  Plus,
  Lock,
  Globe,
  Link2,
  MoreVertical,
  Trash2,
  Pencil,
  Play,
  ChevronRight,
  Tv2,
  X,
} from "lucide-react";
import {
  usePlaylists,
  createPlaylist,
  deletePlaylist,
  updatePlaylist,
  useSavedChannelPlaylists,
  removeSavedChannelPlaylist,
  type UserPlaylist,
  type SavedChannelPlaylist,
} from "@/lib/storage";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { PlaylistRemovedToast } from "@/components/PlaylistRemovedToast";

// ─── Animated Modal Backdrop + Container ─────────────────────────────────────

function AnimatedModal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
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
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{ zIndex: 9998 }}
        className={cn(
          "fixed inset-0 bg-black/70 backdrop-blur-sm",
          "transition-opacity duration-[280ms] ease-out",
          visible ? "opacity-100" : "opacity-0",
        )}
      />
      {/* Centered container — covers FULL viewport including sidebar */}
      <div
        style={{ zIndex: 9999 }}
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className={cn(
            "pointer-events-auto",
            "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            visible
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-90 translate-y-6",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

function DeleteConfirmDialog({
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
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleCancel = () => {
    setVisible(false);
    setTimeout(onCancel, 280);
  };

  const handleConfirm = () => {
    setVisible(false);
    setTimeout(onConfirm, 280);
  };

  return createPortal(
    <>
      <div
        onClick={handleCancel}
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
            visible
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-90 translate-y-6",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center pt-8 pb-4 px-6">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 mb-4",
                "transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
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
              Hapus Playlist?
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
              akan dihapus secara permanen.
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
              onClick={handleCancel}
              className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-surface-hover active:scale-95"
            >
              Batal
            </button>
            <button
              onClick={handleConfirm}
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

// ─── Dialog Hapus Channel Playlist dari Library ───────────────────────────────

function DeleteChannelConfirmDialog({
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
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleCancel = () => {
    setVisible(false);
    setTimeout(onCancel, 280);
  };

  const handleConfirm = () => {
    setVisible(false);
    setTimeout(onConfirm, 280);
  };

  return createPortal(
    <>
      <div
        onClick={handleCancel}
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
            visible
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-90 translate-y-6",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center pt-8 pb-4 px-6">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 mb-4",
                "transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
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
              onClick={handleCancel}
              className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-surface-hover active:scale-95"
            >
              Batal
            </button>
            <button
              onClick={handleConfirm}
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

// ─── Dialog Buat / Edit Playlist ─────────────────────────────────────────────

function PlaylistDialog({
  initial,
  onClose,
  onSave,
}: {
  initial?: Partial<UserPlaylist>;
  onClose: () => void;
  onSave: (title: string, desc: string, visibility: UserPlaylist["visibility"]) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [visibility, setVisibility] = useState<UserPlaylist["visibility"]>(
    initial?.visibility ?? "private",
  );
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
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  const visibilityOptions: { value: UserPlaylist["visibility"]; label: string; icon: typeof Lock }[] = [
    { value: "private", label: "Pribadi", icon: Lock },
    { value: "unlisted", label: "Tidak Terdaftar", icon: Link2 },
    { value: "public", label: "Publik", icon: Globe },
  ];

  return createPortal(
    <>
      <div
        onClick={handleClose}
        style={{ zIndex: 9998 }}
        className={cn(
          "fixed inset-0 bg-black/70 backdrop-blur-sm",
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
            "pointer-events-auto w-full max-w-md rounded-2xl bg-background shadow-2xl overflow-hidden",
            "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            visible
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-90 translate-y-6",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-bold">
              {initial?.id ? "Edit Playlist" : "Playlist Baru"}
            </h2>
            <button
              onClick={handleClose}
              className="rounded-full p-1.5 text-muted-foreground transition-all duration-200 hover:bg-surface-hover hover:text-foreground hover:rotate-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div
              className={cn("transition-all duration-300", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")}
              style={{ transitionDelay: "60ms" }}
            >
              <label className="mb-1.5 block text-sm font-medium">Judul</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && title.trim()) onSave(title.trim(), desc.trim(), visibility);
                }}
                maxLength={150}
                placeholder="Nama playlist kamu"
                className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{title.length}/150</p>
            </div>

            <div
              className={cn("transition-all duration-300", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")}
              style={{ transitionDelay: "100ms" }}
            >
              <label className="mb-1.5 block text-sm font-medium">Deskripsi (opsional)</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Ceritakan tentang playlist ini"
                className="w-full resize-none rounded-xl border border-border bg-surface-hover px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div
              className={cn("transition-all duration-300", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")}
              style={{ transitionDelay: "140ms" }}
            >
              <label className="mb-2 block text-sm font-medium">Visibilitas</label>
              <div className="space-y-2">
                {visibilityOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setVisibility(value)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200",
                      visibility === value
                        ? "border-primary bg-primary/10 font-semibold text-primary scale-[1.01]"
                        : "border-border hover:bg-surface-hover",
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{label}</span>
                    {visibility === value && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={cn("flex gap-3 pt-1 transition-all duration-300", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")}
              style={{ transitionDelay: "200ms" }}
            >
              <button
                onClick={handleClose}
                className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-surface-hover active:scale-95"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (!title.trim()) return;
                  onSave(title.trim(), desc.trim(), visibility);
                }}
                disabled={!title.trim()}
                className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-40"
              >
                {initial?.id ? "Simpan" : "Buat"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Kartu Playlist User ──────────────────────────────────────────────────────

function VisibilityBadge({ v }: { v: UserPlaylist["visibility"] }) {
  if (v === "public") return <Globe className="h-3.5 w-3.5" />;
  if (v === "unlisted") return <Link2 className="h-3.5 w-3.5" />;
  return <Lock className="h-3.5 w-3.5" />;
}

function PlaylistCard({
  pl,
  onEdit,
  onDelete,
}: {
  pl: UserPlaylist;
  onEdit: (pl: UserPlaylist) => void;
  onDelete: (pl: UserPlaylist) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const thumb = pl.thumb ?? pl.videos[0]?.thumb ?? null;
  const count = pl.videos.length;

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setMenuOpen((o) => !o);
  };

  return (
    <div className="group relative flex flex-col rounded-2xl bg-surface-hover/40 hover:bg-surface-hover transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated">
      <Link to={`/playlists/${pl.id}`} className="relative block aspect-video w-full bg-muted rounded-t-2xl overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={pl.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ListVideo className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-y-0 right-0 flex w-16 flex-col items-center justify-center gap-1 bg-black/60 text-white">
          <ListVideo className="h-5 w-5" />
          <span className="text-xs font-bold">{count}</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <Play className="h-10 w-10 fill-white text-white drop-shadow" />
        </div>
      </Link>

      {/* Info */}
      <div className="flex items-start justify-between gap-2 p-3 rounded-b-2xl">
        <Link to={`/playlists/${pl.id}`} className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-snug">{pl.title}</p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <VisibilityBadge v={pl.visibility} />
            <span>{pl.visibility === "public" ? "Publik" : pl.visibility === "unlisted" ? "Tidak Terdaftar" : "Pribadi"}</span>
            <span>·</span>
            <span>{count} video</span>
          </div>
        </Link>

        <button
          ref={btnRef}
          onClick={openMenu}
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-90",
            menuOpen ? "bg-surface-hover" : "hover:bg-surface-hover",
          )}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {menuOpen && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); }}
          />
          <div
            className="fixed min-w-[190px] rounded-xl border border-border bg-background shadow-xl overflow-hidden animate-scale-in-bounce"
            style={{ top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          >
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onEdit(pl); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-hover"
            >
              <Pencil className="h-4 w-4 text-foreground flex-shrink-0" />
              <span>Edit playlist</span>
            </button>
            <div className="h-px bg-border mx-2" />
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onDelete(pl); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4 flex-shrink-0" />
              <span>Hapus playlist</span>
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ─── Kartu Channel Playlist (Read-Only) ──────────────────────────────────────

function ChannelPlaylistCard({
  pl,
  onDelete,
}: {
  pl: SavedChannelPlaylist;
  onDelete: (pl: SavedChannelPlaylist) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const thumb = pl.thumb || pl.videos[0]?.thumb || null;
  const count = pl.videos.length;

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setMenuOpen((o) => !o);
  };

  return (
    <div className="group relative flex flex-col rounded-2xl bg-surface-hover/40 hover:bg-surface-hover transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated">
      <Link
        to={`/playlists/channel/${pl.id}`}
        className="relative block aspect-video w-full bg-muted rounded-t-2xl overflow-hidden"
      >
        {thumb ? (
          <img src={thumb} alt={pl.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ListVideo className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-y-0 right-0 flex w-16 flex-col items-center justify-center gap-1 bg-black/60 text-white">
          <ListVideo className="h-5 w-5" />
          <span className="text-xs font-bold">{count}</span>
        </div>
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
          <Tv2 className="h-2.5 w-2.5" />
          Dari Channel JKT48
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <Play className="h-10 w-10 fill-white text-white drop-shadow" />
        </div>
      </Link>

      <div className="flex items-start justify-between gap-2 p-3 rounded-b-2xl">
        <Link to={`/playlists/channel/${pl.id}`} className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-snug">{pl.title}</p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tv2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{pl.channelTitle}</span>
            <span>·</span>
            <span>{count} video</span>
          </div>
        </Link>

        <button
          ref={btnRef}
          onClick={openMenu}
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-90",
            menuOpen ? "bg-surface-hover" : "hover:bg-surface-hover",
          )}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {menuOpen && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); }}
          />
          <div
            className="fixed min-w-[190px] rounded-xl border border-border bg-background shadow-xl overflow-hidden animate-scale-in-bounce"
            style={{ top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          >
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onDelete(pl); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4 flex-shrink-0" />
              <span>Hapus dari library</span>
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ─── Halaman Utama ────────────────────────────────────────────────────────────

export default function PlaylistsPage() {
  const playlists = usePlaylists();
  const channelPlaylists = useSavedChannelPlaylists();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<UserPlaylist | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserPlaylist | null>(null);
  const [deleteChannelTarget, setDeleteChannelTarget] = useState<SavedChannelPlaylist | null>(null);

  // Toast state untuk kedua jenis penghapusan
  const [removedUserPlaylist, setRemovedUserPlaylist] = useState<{ title: string; thumb: string } | null>(null);
  const [removedChannelPlaylist, setRemovedChannelPlaylist] = useState<{ title: string; thumb: string } | null>(null);

  const handleCreate = (title: string, desc: string, visibility: UserPlaylist["visibility"]) => {
    const pl = createPlaylist(title, desc, visibility);
    setShowCreate(false);
    navigate(`/playlists/${pl.id}`);
  };

  const handleEdit = (title: string, desc: string, visibility: UserPlaylist["visibility"]) => {
    if (!editTarget) return;
    updatePlaylist(editTarget.id, { title, desc, visibility } as Parameters<typeof updatePlaylist>[1]);
    setEditTarget(null);
  };

  // Hapus playlist user — tampilkan PlaylistRemovedToast
  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const removed = deleteTarget;
    deletePlaylist(removed.id);
    setDeleteTarget(null);
    setTimeout(() => {
      setRemovedUserPlaylist({
        title: removed.title,
        thumb: removed.thumb ?? removed.videos[0]?.thumb ?? "",
      });
    }, 350);
  };

  // Hapus channel playlist dari library — tampilkan PlaylistRemovedToast
  const handleDeleteChannelConfirm = () => {
    if (!deleteChannelTarget) return;
    const removed = deleteChannelTarget;
    removeSavedChannelPlaylist(removed.id);
    setDeleteChannelTarget(null);
    setTimeout(() => {
      setRemovedChannelPlaylist({
        title: removed.title,
        thumb: removed.thumb || removed.videos[0]?.thumb || "",
      });
    }, 350);
  };

  const hasAnyPlaylist = playlists.length > 0 || channelPlaylists.length > 0;

  return (
    <div className="px-3 py-4 sm:px-6 page-enter">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between animate-fade-in">
        <h1 className="text-2xl font-bold">Playlist</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Playlist baru
        </button>
      </div>

      {/* Shortcut: Riwayat & Tersimpan */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
        <Link
          to="/history"
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface-hover/40 px-4 py-3 transition-all duration-200 hover:bg-surface-hover hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
            <ListVideo className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Riwayat Tontonan</p>
            <p className="text-xs text-muted-foreground">Video yang pernah kamu tonton</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/saved"
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface-hover/40 px-4 py-3 transition-all duration-200 hover:bg-surface-hover hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/15 text-yellow-500">
            <ListVideo className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Video Tersimpan</p>
            <p className="text-xs text-muted-foreground">Video yang kamu simpan</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Empty state */}
      {!hasAnyPlaylist ? (
        <div className="py-16 text-center animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <ListVideo className="mx-auto mb-4 h-14 w-14 text-muted-foreground animate-float" />
          <p className="text-lg font-semibold">Belum ada playlist</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Buat playlist baru atau simpan playlist dari channel JKT48
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-surface-hover hover:scale-105 active:scale-95 mx-auto"
          >
            <Plus className="h-4 w-4" />
            Buat playlist pertamamu
          </button>
        </div>
      ) : (
        <>
          {playlists.length > 0 && (
            <section className="mb-8 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Playlist Saya
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {playlists.map((pl, i) => (
                  <div key={pl.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <PlaylistCard
                      pl={pl}
                      onEdit={setEditTarget}
                      onDelete={setDeleteTarget}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {channelPlaylists.length > 0 && (
            <section className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Disimpan dari Channel JKT48
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {channelPlaylists.map((pl, i) => (
                  <div key={pl.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <ChannelPlaylistCard
                      pl={pl}
                      onDelete={setDeleteChannelTarget}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modals via portal */}
      {showCreate && (
        <PlaylistDialog onClose={() => setShowCreate(false)} onSave={handleCreate} />
      )}
      {editTarget && (
        <PlaylistDialog
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}
      {/* Hapus playlist user */}
      {deleteTarget && (
        <DeleteConfirmDialog
          playlistTitle={deleteTarget.title}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {/* Hapus channel playlist dari library */}
      {deleteChannelTarget && (
        <DeleteChannelConfirmDialog
          playlistTitle={deleteChannelTarget.title}
          onConfirm={handleDeleteChannelConfirm}
          onCancel={() => setDeleteChannelTarget(null)}
        />
      )}

      {/* Toast: playlist user dihapus */}
      {removedUserPlaylist && (
        <PlaylistRemovedToast
          playlistTitle={removedUserPlaylist.title}
          videoTitle="Playlist dihapus secara permanen"
          videoThumb={removedUserPlaylist.thumb}
          onClose={() => setRemovedUserPlaylist(null)}
        />
      )}

      {/* Toast: channel playlist dihapus dari library */}
      {removedChannelPlaylist && (
        <PlaylistRemovedToast
          playlistTitle={removedChannelPlaylist.title}
          videoTitle="Dihapus dari library kamu"
          videoThumb={removedChannelPlaylist.thumb}
          onClose={() => setRemovedChannelPlaylist(null)}
        />
      )}
    </div>
  );
}