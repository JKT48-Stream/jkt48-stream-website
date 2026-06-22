import { useEffect, useState } from "react";

const HISTORY_KEY = "jkt48-watch-history";
const SAVED_KEY = "jkt48-saved-videos";
const PROGRESS_KEY = "jkt48-watch-progress";
const PLAYLISTS_KEY = "jkt48-user-playlists";
const CHANNEL_PLAYLISTS_KEY = "jkt48-saved-channel-playlists";
const MAX_HISTORY = 100;

export type HistoryItem = {
  id: string;
  title: string;
  channelTitle: string;
  thumb: string;
  duration: string;
  watchedAt: number;
  progress?: number;
  durationSec?: number;
};

export type ProgressMap = Record<string, { progress: number; durationSec: number; updatedAt: number }>;

// ─── Playlist types ──────────────────────────────────────────────────────────

export type PlaylistVideo = {
  id: string;
  title: string;
  channelTitle: string;
  thumb: string;
  duration: string;
  addedAt: number;
};

export type UserPlaylist = {
  id: string;           // uuid
  title: string;
  description: string;
  visibility: "public" | "private" | "unlisted";
  createdAt: number;
  updatedAt: number;
  videos: PlaylistVideo[];
  /** thumbnail: gunakan thumb video pertama jika tidak ada custom */
  thumb?: string;
};

/**
 * Playlist yang disimpan dari channel (YouTube playlist).
 * Pengguna hanya bisa menonton, tidak bisa mengedit isi videonya.
 */
export type SavedChannelPlaylist = {
  /** ID unik lokal (berbeda dari YouTube playlist ID) */
  id: string;
  /** YouTube playlist ID asli */
  youtubePlaylistId: string;
  title: string;
  description: string;
  channelTitle: string;
  thumb: string;
  savedAt: number;
  /** Snapshot video saat disimpan */
  videos: PlaylistVideo[];
  /** Tandai sebagai playlist dari channel (read-only) */
  isChannelPlaylist: true;
};

// ─── Helper read/write ────────────────────────────────────────────────────────

function read<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(k: string, v: T) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

function dispatch() {
  window.dispatchEvent(new Event("jkt48-storage"));
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export function getProgress(id: string): { progress: number; durationSec: number } | null {
  const map = read<ProgressMap>(PROGRESS_KEY, {});
  const p = map[id];
  if (!p) return null;
  return { progress: p.progress, durationSec: p.durationSec };
}

export function setProgress(id: string, progress: number, durationSec: number) {
  const map = read<ProgressMap>(PROGRESS_KEY, {});
  map[id] = { progress, durationSec, updatedAt: Date.now() };
  write(PROGRESS_KEY, map);
  const list = read<HistoryItem[]>(HISTORY_KEY, []);
  const idx = list.findIndex((x) => x.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], progress, durationSec };
    write(HISTORY_KEY, list);
  }
  dispatch();
}

// ─── History ──────────────────────────────────────────────────────────────────

export function addHistory(item: Omit<HistoryItem, "watchedAt">) {
  const list = read<HistoryItem[]>(HISTORY_KEY, []);
  const filtered = list.filter((x) => x.id !== item.id);
  filtered.unshift({ ...item, watchedAt: Date.now() });
  write(HISTORY_KEY, filtered.slice(0, MAX_HISTORY));
  dispatch();
}

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>(() => read(HISTORY_KEY, []));
  useEffect(() => {
    const handler = () => setItems(read(HISTORY_KEY, []));
    window.addEventListener("jkt48-storage", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("jkt48-storage", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return {
    items,
    clear: () => {
      write(HISTORY_KEY, []);
      dispatch();
    },
    remove: (id: string, watchedAt: number) => {
      const list = read<HistoryItem[]>(HISTORY_KEY, []);
      write(HISTORY_KEY, list.filter((x) => !(x.id === id && x.watchedAt === watchedAt)));
      dispatch();
    },
  };
}

// ─── Saved ────────────────────────────────────────────────────────────────────

export function toggleSaved(id: string) {
  const set = new Set(read<string[]>(SAVED_KEY, []));
  set.has(id) ? set.delete(id) : set.add(id);
  write(SAVED_KEY, Array.from(set));
  dispatch();
}

export function useSaved() {
  const [ids, setIds] = useState<string[]>(() => read(SAVED_KEY, []));
  useEffect(() => {
    const handler = () => setIds(read(SAVED_KEY, []));
    window.addEventListener("jkt48-storage", handler);
    return () => window.removeEventListener("jkt48-storage", handler);
  }, []);
  return ids;
}

// ─── User Playlists ───────────────────────────────────────────────────────────

function genId() {
  return `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getPlaylists(): UserPlaylist[] {
  return read<UserPlaylist[]>(PLAYLISTS_KEY, []);
}

export function createPlaylist(
  title: string,
  description = "",
  visibility: UserPlaylist["visibility"] = "private",
): UserPlaylist {
  const pl: UserPlaylist = {
    id: genId(),
    title,
    description,
    visibility,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    videos: [],
  };
  const list = getPlaylists();
  list.unshift(pl);
  write(PLAYLISTS_KEY, list);
  dispatch();
  return pl;
}

export function updatePlaylist(
  id: string,
  patch: Partial<Pick<UserPlaylist, "title" | "description" | "visibility">>,
) {
  const list = getPlaylists().map((pl) =>
    pl.id === id ? { ...pl, ...patch, updatedAt: Date.now() } : pl,
  );
  write(PLAYLISTS_KEY, list);
  dispatch();
}

export function deletePlaylist(id: string) {
  const list = getPlaylists().filter((pl) => pl.id !== id);
  write(PLAYLISTS_KEY, list);
  dispatch();
}

export function addVideoToPlaylist(playlistId: string, video: Omit<PlaylistVideo, "addedAt">) {
  const list = getPlaylists().map((pl) => {
    if (pl.id !== playlistId) return pl;
    // Hindari duplikat
    if (pl.videos.some((v) => v.id === video.id)) return pl;
    return {
      ...pl,
      videos: [...pl.videos, { ...video, addedAt: Date.now() }],
      updatedAt: Date.now(),
    };
  });
  write(PLAYLISTS_KEY, list);
  dispatch();
}

export function removeVideoFromPlaylist(playlistId: string, videoId: string) {
  const list = getPlaylists().map((pl) =>
    pl.id !== playlistId
      ? pl
      : { ...pl, videos: pl.videos.filter((v) => v.id !== videoId), updatedAt: Date.now() },
  );
  write(PLAYLISTS_KEY, list);
  dispatch();
}

export function reorderPlaylistVideos(playlistId: string, videos: PlaylistVideo[]) {
  const list = getPlaylists().map((pl) =>
    pl.id !== playlistId ? pl : { ...pl, videos, updatedAt: Date.now() },
  );
  write(PLAYLISTS_KEY, list);
  dispatch();
}

/** Salin playlist channel (dari YouTube) ke playlist user */
export function saveChannelPlaylist(
  title: string,
  description: string,
  videos: Omit<PlaylistVideo, "addedAt">[],
): UserPlaylist {
  const pl: UserPlaylist = {
    id: genId(),
    title,
    description,
    visibility: "private",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    videos: videos.map((v) => ({ ...v, addedAt: Date.now() })),
  };
  const list = getPlaylists();
  list.unshift(pl);
  write(PLAYLISTS_KEY, list);
  dispatch();
  return pl;
}

export function isVideoInPlaylist(playlistId: string, videoId: string): boolean {
  const pl = getPlaylists().find((p) => p.id === playlistId);
  return pl ? pl.videos.some((v) => v.id === videoId) : false;
}

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>(() => getPlaylists());
  useEffect(() => {
    const handler = () => setPlaylists(getPlaylists());
    window.addEventListener("jkt48-storage", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("jkt48-storage", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return playlists;
}

export function usePlaylist(id: string) {
  const [playlist, setPlaylist] = useState<UserPlaylist | null>(
    () => getPlaylists().find((p) => p.id === id) ?? null,
  );
  useEffect(() => {
    const handler = () =>
      setPlaylist(getPlaylists().find((p) => p.id === id) ?? null);
    window.addEventListener("jkt48-storage", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("jkt48-storage", handler);
      window.removeEventListener("storage", handler);
    };
  }, [id]);
  return playlist;
}

// ─── Saved Channel Playlists (Read-Only dari Channel) ────────────────────────

function genChannelPlaylistId() {
  return `cpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getSavedChannelPlaylists(): SavedChannelPlaylist[] {
  return read<SavedChannelPlaylist[]>(CHANNEL_PLAYLISTS_KEY, []);
}

export function isChannelPlaylistSaved(youtubePlaylistId: string): boolean {
  return getSavedChannelPlaylists().some((p) => p.youtubePlaylistId === youtubePlaylistId);
}

export function saveChannelPlaylistFromChannel(
  youtubePlaylistId: string,
  title: string,
  description: string,
  channelTitle: string,
  thumb: string,
  videos: Omit<PlaylistVideo, "addedAt">[],
): SavedChannelPlaylist {
  const existing = getSavedChannelPlaylists().find(
    (p) => p.youtubePlaylistId === youtubePlaylistId,
  );
  if (existing) return existing;

  const pl: SavedChannelPlaylist = {
    id: genChannelPlaylistId(),
    youtubePlaylistId,
    title,
    description,
    channelTitle,
    thumb,
    savedAt: Date.now(),
    videos: videos.map((v) => ({ ...v, addedAt: Date.now() })),
    isChannelPlaylist: true,
  };
  const list = getSavedChannelPlaylists();
  list.unshift(pl);
  write(CHANNEL_PLAYLISTS_KEY, list);
  dispatch();
  return pl;
}

export function removeSavedChannelPlaylist(id: string) {
  const list = getSavedChannelPlaylists().filter((p) => p.id !== id);
  write(CHANNEL_PLAYLISTS_KEY, list);
  dispatch();
}

export function updateSavedChannelPlaylistVideos(
  id: string,
  videos: PlaylistVideo[],
  thumb?: string,
) {
  const list = getSavedChannelPlaylists().map((p) =>
    p.id !== id ? p : { ...p, videos, ...(thumb ? { thumb } : {}) },
  );
  write(CHANNEL_PLAYLISTS_KEY, list);
  dispatch();
}

export function removeSavedChannelPlaylistByYoutubeId(youtubePlaylistId: string) {
  const list = getSavedChannelPlaylists().filter(
    (p) => p.youtubePlaylistId !== youtubePlaylistId,
  );
  write(CHANNEL_PLAYLISTS_KEY, list);
  dispatch();
}

export function getSavedChannelPlaylist(id: string): SavedChannelPlaylist | null {
  return getSavedChannelPlaylists().find((p) => p.id === id) ?? null;
}

export function useSavedChannelPlaylists() {
  const [playlists, setPlaylists] = useState<SavedChannelPlaylist[]>(() =>
    getSavedChannelPlaylists(),
  );
  useEffect(() => {
    const handler = () => setPlaylists(getSavedChannelPlaylists());
    window.addEventListener("jkt48-storage", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("jkt48-storage", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return playlists;
}

export function useSavedChannelPlaylist(id: string) {
  const [playlist, setPlaylist] = useState<SavedChannelPlaylist | null>(
    () => getSavedChannelPlaylist(id),
  );
  useEffect(() => {
    const handler = () => setPlaylist(getSavedChannelPlaylist(id));
    window.addEventListener("jkt48-storage", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("jkt48-storage", handler);
      window.removeEventListener("storage", handler);
    };
  }, [id]);
  return playlist;
}