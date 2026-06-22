import { Menu, Search, User, Sun, Moon, X, Bell, Clock, TrendingUp, ArrowUpLeft } from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { fetchSuggestions } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import {
  getSearchHistory,
  addToSearchHistory,
  removeFromSearchHistory,
  clearSearchHistory,
  TRENDING_SUGGESTIONS,
} from "@/pages/SearchPage";

type Props = {
  onToggleSidebar: () => void;
};

export function Navbar({ onToggleSidebar }: Props) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const debounceRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const loadHistory = () => setHistory(getSearchHistory());

  // Fetch suggestions saat mengetik
  useEffect(() => {
    if (!q.trim() || !focused || submittedRef.current) {
      setSuggestions([]);
      if (!q.trim() && focused) setShowSug(true);
      else if (!focused) setShowSug(false);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      if (submittedRef.current) return;
      try {
        const s = await fetchSuggestions(q);
        setSuggestions(s.slice(0, 8));
        setShowSug(true);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q, focused]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSug(false);
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!showAccountModal) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node))
        setShowAccountModal(false);
    };
    const t = window.setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => { window.clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [showAccountModal]);

  useEffect(() => {
    if (!showAccountModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowAccountModal(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showAccountModal]);

  const submit = (term?: string) => {
    const t = (term ?? q).trim();
    if (!t) return;
    submittedRef.current = true;
    setQ(t);
    setSuggestions([]);
    setShowSug(false);
    addToSearchHistory(t);
    setHistory(getSearchHistory());
    navigate(`/search?q=${encodeURIComponent(t)}`);
  };

  const fillInput = (term: string) => {
    submittedRef.current = false;
    setQ(term);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleDeleteHistory = (term: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromSearchHistory(term);
    setHistory(getSearchHistory());
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearSearchHistory();
    setHistory([]);
  };

  const hasHistory = history.length > 0;
  const showSuggestionsInDropdown = showSug && suggestions.length > 0 && q.trim().length > 0;
  const showHistoryInDropdown = focused && !q.trim() && hasHistory;
  const showTrendingInDropdown = focused && !q.trim() && !hasHistory;
  const dropdownVisible = showSuggestionsInDropdown || showHistoryInDropdown || showTrendingInDropdown;

  const isDark = theme === "dark";

  const handleThemeToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    toggleTheme(x, y);
  };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 flex h-[var(--header-h)] items-center gap-2 border-b border-border bg-background/95 px-2 backdrop-blur sm:px-4",
          "transition-all duration-300",
          mounted ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0",
        )}
      >
        {/* Logo + Hamburger */}
        <div className="flex items-center gap-1 sm:gap-2 animate-fade-in-left">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            className="rounded-full transition-transform duration-200 hover:scale-110 active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/" className="px-1 group">
            <span className="text-lg font-bold tracking-tight sm:text-xl">
              <span className="inline-block transition-colors duration-200 group-hover:text-foreground/80">JKT</span>
              <span className="text-primary inline-block transition-transform duration-200 group-hover:scale-110 group-hover:drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]">48</span>
              <span className="inline-block transition-colors duration-200 group-hover:text-foreground/80"> Stream</span>
            </span>
          </Link>
        </div>

        {/* Desktop search */}
        <div
          ref={wrapperRef}
          className="relative mx-auto hidden w-full max-w-2xl flex-1 items-center sm:flex animate-fade-in"
          style={{ animationDelay: "80ms" }}
        >
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex w-full">
            <div
              className={cn(
                "flex flex-1 items-center rounded-l-full border border-border bg-surface-2 px-4",
                "transition-all duration-250",
                focused
                  ? "border-ring shadow-[0_0_0_1px_hsl(var(--ring))] bg-background"
                  : "hover:border-border/80",
              )}
            >
              <Search className={cn(
                "mr-3 hidden h-4 w-4 sm:block transition-colors duration-200",
                focused ? "text-primary" : "text-muted-foreground",
              )} />
              <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={(e) => { submittedRef.current = false; setQ(e.target.value); }}
                onFocus={() => {
                  setFocused(true);
                  loadHistory();
                  setShowSug(true);
                }}
                onBlur={() => setFocused(false)}
                placeholder="Cari video JKT48..."
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:transition-colors placeholder:duration-200"
                autoComplete="off"
              />
              {q && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setQ(""); submittedRef.current = false; inputRef.current?.focus(); }}
                  aria-label="Hapus"
                  className="ml-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-all duration-150 hover:scale-110 active:scale-90"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className={cn(
                "flex h-10 items-center justify-center rounded-r-full border border-l-0 border-border bg-surface-hover px-5",
                "transition-all duration-200 hover:bg-muted hover:scale-[1.02] active:scale-95",
              )}
              aria-label="Cari"
            >
              <Search className="h-5 w-5" />
            </button>
          </form>

          {/* ── Dropdown Desktop ── */}
          {dropdownVisible && (
            <div className="absolute left-0 right-12 top-12 z-50 overflow-hidden rounded-2xl border border-border bg-popover py-2 shadow-elevated animate-fade-in-down">

              {/* Suggestions saat mengetik */}
              {showSuggestionsInDropdown && suggestions.map((s, i) => (
                <div
                  key={s}
                  className="group flex items-center gap-3 px-4 py-2 hover:bg-surface-hover transition-colors duration-100"
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => submit(s)}
                    className="flex flex-1 items-center gap-3 text-left text-sm"
                  >
                    <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 line-clamp-1">{s}</span>
                  </button>
                  {/* ArrowUpLeft: isi input tanpa submit */}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => fillInput(s)}
                    aria-label="Isi input"
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-all duration-150"
                  >
                    <ArrowUpLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {/* History saat input kosong */}
              {showHistoryInDropdown && (
                <>
                  <div className="flex items-center justify-between px-4 pb-1 pt-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Riwayat Pencarian
                    </span>
                    <button
                      onMouseDown={handleClearAll}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
                    >
                      Hapus semua
                    </button>
                  </div>
                  {history.map((term, i) => (
                    <div
                      key={term}
                      className="group flex items-center gap-3 px-4 py-2 hover:bg-surface-hover transition-colors duration-100"
                      style={{ animationDelay: `${i * 20}ms` }}
                    >
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => submit(term)}
                        className="flex flex-1 items-center gap-3 text-left text-sm"
                      >
                        <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="flex-1 line-clamp-1">{term}</span>
                      </button>
                      {/* ArrowUpLeft: isi input tanpa submit */}
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => fillInput(term)}
                        aria-label="Isi input"
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-all duration-150"
                      >
                        <ArrowUpLeft className="h-3.5 w-3.5" />
                      </button>
                      {/* X: hapus item */}
                      <button
                        onMouseDown={(e) => handleDeleteHistory(term, e)}
                        aria-label="Hapus riwayat"
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-all duration-150"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </>
              )}

              {/* Trending saat tidak ada history */}
              {showTrendingInDropdown && (
                <>
                  <div className="px-4 pb-1 pt-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Trending
                    </span>
                  </div>
                  {TRENDING_SUGGESTIONS.map((term, i) => (
                    <div
                      key={term}
                      className="group flex items-center gap-3 px-4 py-2 hover:bg-surface-hover transition-colors duration-100"
                      style={{ animationDelay: `${i * 20}ms` }}
                    >
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => submit(term)}
                        className="flex flex-1 items-center gap-3 text-left text-sm"
                      >
                        <TrendingUp className="h-4 w-4 flex-shrink-0 text-primary" />
                        <span className="flex-1 line-clamp-1">{term}</span>
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => fillInput(term)}
                        aria-label="Isi input"
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-all duration-150"
                      >
                        <ArrowUpLeft className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto rounded-full sm:hidden transition-transform duration-200 hover:scale-110 active:scale-90"
          onClick={() => navigate("/search")}
          aria-label="Cari"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Right actions */}
        <div
          className="ml-auto flex items-center gap-1 sm:gap-2 animate-fade-in-right"
          style={{ animationDelay: "120ms" }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={handleThemeToggle}
            className="rounded-full transition-transform duration-200 hover:scale-110 active:scale-90 relative overflow-hidden"
            aria-label={isDark ? "Beralih ke tema terang" : "Beralih ke tema gelap"}
          >
            <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isDark ? "opacity-100 rotate-0" : "opacity-0 rotate-90"}`}>
              <Moon className="h-5 w-5" />
            </span>
            <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isDark ? "opacity-0 -rotate-90" : "opacity-100 rotate-0"}`}>
              <Sun className="h-5 w-5" />
            </span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full transition-transform duration-200 hover:scale-110 active:scale-90"
            aria-label="Akun"
            onClick={() => setShowAccountModal(true)}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-xs font-bold text-primary-foreground transition-shadow duration-200 hover:shadow-[0_0_12px_hsl(var(--primary)/0.4)]">
              <User className="h-4 w-4" />
            </span>
          </Button>
        </div>
      </header>

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAccountModal(false)} />
          <div ref={modalRef} className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-scale-in-bounce">
            <div className="relative flex flex-col items-center bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-6 pb-6 pt-8">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-lg animate-float">
                <User className="h-9 w-9 text-white" />
              </div>
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20 animate-fade-in-up anim-delay-100">
                Segera Hadir
              </span>
              <h2 className="text-center text-xl font-bold tracking-tight animate-fade-in-up anim-delay-150">Sistem Akun</h2>
              <p className="mt-1 text-center text-sm text-muted-foreground animate-fade-in-up anim-delay-200">Account System</p>
            </div>
            <div className="px-6 pb-6 pt-4">
              <p className="text-center text-sm leading-relaxed text-muted-foreground animate-fade-in anim-delay-200">
                Fitur login & sistem akun sedang dalam pengembangan.
              </p>
              <div className="mt-5 flex flex-col gap-2 animate-fade-in-up anim-delay-250">
                <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-3 text-sm transition-colors duration-200 hover:bg-surface-hover">
                  <Bell className="h-4 w-4 flex-shrink-0 text-primary animate-float" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">Coming Soon </span>
                    stay tuned untuk update selanjutnya!
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAccountModal(false)}
                className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground animate-fade-in-up anim-delay-300 transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] active:opacity-80"
              >
                Mengerti
              </button>
            </div>
            <button
              onClick={() => setShowAccountModal(false)}
              aria-label="Tutup"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:bg-surface-hover hover:text-foreground hover:rotate-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}