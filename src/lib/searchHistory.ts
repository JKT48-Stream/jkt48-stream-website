// Riwayat pencarian (localStorage). Dipisah dari SearchPage supaya Navbar (yang selalu dimuat)
// tidak menarik seluruh halaman SearchPage ke bundle awal.

const HISTORY_KEY = "jkt48_search_history";
const MAX_HISTORY = 20;

// Export agar bisa dipakai Navbar
export const TRENDING_SUGGESTIONS = [
  "JKT48 live showroom",
  "JKT48 theater",
  "JKT48 terbaru",
  "Fritzy JKT48",
  "Kimmy JKT48",
  "JKT48 fancam",
  "JKT48 mini live",
];

export function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToSearchHistory(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const current = getSearchHistory();
  const filtered = current.filter((h) => h.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function removeFromSearchHistory(term: string) {
  const current = getSearchHistory();
  const updated = current.filter((h) => h !== term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function clearSearchHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
