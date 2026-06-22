import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { searchVideos, fetchSuggestions, type YTVideo } from "@/lib/youtube";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { Search, Clock, X, TrendingUp, ArrowUpLeft } from "lucide-react";

const HISTORY_KEY = "jkt48_search_history";
const MAX_HISTORY = 20;

// Export agar bisa dipakai Navbar.tsx
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

// ─────────────────────────────────────────────────────────────
// Shared sub-components (dipakai mobile & desktop di halaman ini)
// ─────────────────────────────────────────────────────────────

interface HistoryListProps {
  history: string[];
  onSubmit: (term: string) => void;
  onFillInput: (term: string) => void;
  onDelete: (term: string, e: React.MouseEvent) => void;
  onClearAll: (e: React.MouseEvent) => void;
  /** Desktop: X hanya muncul saat hover. Mobile: X selalu terlihat */
  alwaysShowX?: boolean;
}

function HistoryList({ history, onSubmit, onFillInput, onDelete, onClearAll, alwaysShowX }: HistoryListProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock className="h-4 w-4 text-primary" />
          Riwayat Pencarian
        </h2>
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          Hapus semua
        </button>
      </div>

      <div className="flex flex-col">
        {history.map((term, i) => (
          <div
            key={term}
            className="group flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2.5 hover:bg-surface-hover transition-colors duration-150"
            style={{ animationDelay: `${i * 20}ms` }}
          >
            {/* Icon + label → klik untuk search */}
            <div
              onClick={() => onSubmit(term)}
              className="flex flex-1 items-center gap-3 min-w-0"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 group-hover:bg-muted transition-colors">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="flex-1 text-sm font-medium text-foreground line-clamp-1">
                {term}
              </span>
            </div>

            {/* ArrowUpLeft: isi input */}
            <button
              onClick={() => onFillInput(term)}
              aria-label="Isi pencarian"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-all duration-150 active:scale-90"
            >
              <ArrowUpLeft className="h-3.5 w-3.5" />
            </button>

            {/* X: hapus item */}
            <button
              onClick={(e) => onDelete(term, e)}
              aria-label="Hapus riwayat"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-all duration-150 active:scale-90"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TrendingListProps {
  onSubmit: (term: string) => void;
  onFillInput: (term: string) => void;
}

function TrendingList({ onSubmit, onFillInput }: TrendingListProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-2 flex items-center gap-2 px-1">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Trending</h2>
      </div>
      <div className="flex flex-col">
        {TRENDING_SUGGESTIONS.map((term, i) => (
          <div
            key={term}
            className="group flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2.5 hover:bg-surface-hover transition-colors duration-150"
            style={{ animationDelay: `${i * 20}ms` }}
          >
            <div onClick={() => onSubmit(term)} className="flex flex-1 items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <span className="flex-1 text-sm font-medium text-foreground line-clamp-1">{term}</span>
            </div>
            <button
              onClick={() => onFillInput(term)}
              aria-label="Isi pencarian"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-all duration-150 active:scale-90"
            >
              <ArrowUpLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main SearchPage
// ─────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [input, setInput] = useState(q);
  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  // Suggestions state (untuk mobile input di halaman ini)
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  // Fetch suggestions saat mobile input berubah
  useEffect(() => {
    if (!input.trim() || !inputFocused || submittedRef.current) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      if (submittedRef.current) return;
      try {
        const s = await fetchSuggestions(input);
        setSuggestions(s.slice(0, 8));
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [input, inputFocused]);

  // Delay close dropdown agar klik item sempat terproses
  useEffect(() => {
    if (inputFocused) {
      setShowDropdown(true);
    } else {
      const t = window.setTimeout(() => setShowDropdown(false), 150);
      return () => window.clearTimeout(t);
    }
  }, [inputFocused]);

  useEffect(() => {
    setInput(q);
    submittedRef.current = false;
    if (!q) {
      setVideos([]);
      setToken(null);
      return;
    }

    // Scroll ke atas
    topRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    addToSearchHistory(q);
    setHistory(getSearchHistory());

    let cancelled = false;
    setLoading(true);
    setVideos([]);
    setToken(null);
    searchVideos(q)
      .then((r) => {
        if (cancelled) return;
        setVideos(r.videos);
        setToken(r.nextPageToken);
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [q]);

  const loadMore = async () => {
    if (!token || loadingMore || !q) return;
    setLoadingMore(true);
    try {
      const r = await searchVideos(q, token);
      setVideos((prev) => [...prev, ...r.videos]);
      setToken(r.nextPageToken);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = useCallback((term?: string) => {
    const t = (term ?? input).trim();
    if (!t) return;
    submittedRef.current = true;
    setInput(t);
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.blur();
    setParams({ q: t });
  }, [input, setParams]);

  const handleFillInput = useCallback((term: string) => {
    submittedRef.current = false;
    setInput(term);
    setSuggestions([]);
    inputRef.current?.focus();
  }, []);

  const handleDeleteHistory = useCallback((term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    removeFromSearchHistory(term);
    setHistory(getSearchHistory());
  }, []);

  const handleClearAll = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    clearSearchHistory();
    setHistory([]);
  }, []);

  const hasHistory = history.length > 0;
  const showMobileSuggestions = showDropdown && inputFocused && input.trim().length > 0 && suggestions.length > 0;
  const showMobileHistoryOrTrending = showDropdown && inputFocused && !input.trim();

  return (
    <div className="px-3 py-4 sm:px-6">
      <div ref={topRef} />

      {/* ══════════════════════════════════════
          MOBILE: Input + Dropdown
      ══════════════════════════════════════ */}
      <div className="relative mb-4 sm:hidden">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <div className="flex items-center rounded-full border border-border bg-surface-2 px-4 focus-within:border-ring focus-within:bg-background focus-within:shadow-[0_0_0_1px_hsl(var(--ring))] transition-all duration-200">
            <Search className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => { submittedRef.current = false; setInput(e.target.value); }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Cari video JKT48..."
              className="h-10 w-full bg-transparent text-sm outline-none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {input && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setInput(""); setSuggestions([]); submittedRef.current = false; inputRef.current?.focus(); }}
                aria-label="Hapus"
                className="ml-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>

        {/* Dropdown suggestions saat mengetik */}
        {showMobileSuggestions && (
          <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-border bg-popover py-2 shadow-elevated animate-fade-in-down">
            {suggestions.map((s, i) => (
              <div
                key={s}
                className="group flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors duration-100"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSubmit(s)}
                  className="flex flex-1 items-center gap-3 text-left text-sm"
                >
                  <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1 line-clamp-1">{s}</span>
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFillInput(s)}
                  aria-label="Isi input"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-all"
                >
                  <ArrowUpLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dropdown history + trending saat input kosong */}
        {showMobileHistoryOrTrending && (
          <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-border bg-popover py-2 shadow-elevated animate-fade-in-down">
            {hasHistory ? (
              <>
                <div className="flex items-center justify-between px-4 pb-1 pt-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Riwayat Pencarian</span>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={handleClearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Hapus semua
                  </button>
                </div>
                {history.slice(0, 8).map((term, i) => (
                  <div key={term} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors duration-100" style={{ animationDelay: `${i * 20}ms` }}>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleSubmit(term)} className="flex flex-1 items-center gap-3 text-left text-sm">
                      <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="flex-1 line-clamp-1">{term}</span>
                    </button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFillInput(term)} aria-label="Isi input"
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-all">
                      <ArrowUpLeft className="h-3.5 w-3.5" />
                    </button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleDeleteHistory(term, e)} aria-label="Hapus riwayat"
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-all">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="px-4 pb-1 pt-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trending</span>
                </div>
                {TRENDING_SUGGESTIONS.map((term, i) => (
                  <div key={term} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors duration-100" style={{ animationDelay: `${i * 20}ms` }}>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleSubmit(term)} className="flex flex-1 items-center gap-3 text-left text-sm">
                      <TrendingUp className="h-4 w-4 flex-shrink-0 text-primary" />
                      <span className="flex-1 line-clamp-1">{term}</span>
                    </button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFillInput(term)} aria-label="Isi input"
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-all">
                      <ArrowUpLeft className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          EMPTY STATE: Belum pernah search
          (mobile & desktop)
      ══════════════════════════════════════ */}
      {!q && !hasHistory && !inputFocused && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-2">
            <Search className="h-9 w-9 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold">Cari video JKT48</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ketik judul, member, atau kata kunci
          </p>
          {/* Trending di bawah empty state */}
          <div className="mt-8 w-full max-w-md text-left">
            <TrendingList onSubmit={handleSubmit} onFillInput={handleFillInput} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          HISTORY PAGE: Ada riwayat, tidak fokus
          (mobile & desktop)
      ══════════════════════════════════════ */}
      {!q && hasHistory && !inputFocused && (
        <HistoryList
          history={history}
          onSubmit={handleSubmit}
          onFillInput={handleFillInput}
          onDelete={handleDeleteHistory}
          onClearAll={handleClearAll}
          alwaysShowX={true}
        />
      )}

      {/* ══════════════════════════════════════
          HASIL PENCARIAN
          (mobile & desktop)
      ══════════════════════════════════════ */}
      {q && (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Hasil untuk{" "}
            <span className="font-semibold text-foreground">"{q}"</span>
          </p>

          {/* Mobile: grid */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {loading && Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={i} />)}
            {!loading && videos.map((v, i) => (
              <VideoCard key={`${v.id}-${i}`} video={v} animationDelay={Math.min(i * 40, 400)} />
            ))}
            {loadingMore && Array.from({ length: 3 }).map((_, i) => <VideoCardSkeleton key={`m-${i}`} />)}
          </div>

          {/* Desktop: list */}
          <div className="hidden sm:block space-y-3">
            {loading && Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={i} layout="list" />)}
            {!loading && videos.map((v, i) => (
              <VideoCard key={`${v.id}-${i}`} video={v} layout="list" />
            ))}
            {loadingMore && Array.from({ length: 3 }).map((_, i) => <VideoCardSkeleton key={`m-${i}`} layout="list" />)}
          </div>

          <div ref={sentinelRef} className="h-10" />
        </>
      )}
    </div>
  );
}