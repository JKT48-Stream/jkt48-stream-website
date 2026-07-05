import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "jkt48-birthday-favorites-v1";
const EVENT_NAME = "jkt48-birthday-favorites:changed";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Simpan daftar id member favorit (khusus tab Member Birthdays Counter) di localStorage.
 * Sinkron antar-komponen dengan custom event agar toggle langsung terlihat di semua kartu.
 */
export function useBirthdayFavorites() {
  const [ids, setIds] = useState<string[]>(() => read());

  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT_NAME));
    setIds(next);
  }, []);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, toggle, isFavorite };
}