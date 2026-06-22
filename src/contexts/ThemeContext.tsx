import { createContext, useContext, useEffect, useCallback, useState } from "react";

type Theme = "light" | "dark";

type DocWithVT = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: (x: number, y: number) => void;
  resolved: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem("jkt48-theme") as Theme | null;
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* ignore */ }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", t === "dark");
  root.style.colorScheme = t;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  /**
   * Fallback untuk browser tanpa View Transitions API (Safari, Firefox).
   * Menggunakan clip-path animation pada overlay — tapi TIDAK menutupi konten.
   * Overlay dihapus sebelum tema benar-benar diterapkan sehingga konten asli tetap terlihat.
   */
  const runFallbackReveal = useCallback((x: number, y: number, next: Theme) => {
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const overlay = document.createElement("div");
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 2147483646;
      pointer-events: none; will-change: clip-path;
      background: ${next === "dark" ? "hsl(0 0% 6%)" : "hsl(0 0% 100%)"};
    `;
    document.body.appendChild(overlay);

    const anim = overlay.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );

    const commitTimer = window.setTimeout(() => {
      localStorage.setItem("jkt48-theme", next);
      setThemeState(next);
    }, 540);

    anim.onfinish = () => {
      window.clearTimeout(commitTimer);
      localStorage.setItem("jkt48-theme", next);
      setThemeState(next);
      requestAnimationFrame(() => overlay.remove());
    };
    anim.oncancel = () => {
      window.clearTimeout(commitTimer);
      overlay.remove();
    };
  }, []);

  const toggleTheme = useCallback((x: number, y: number) => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const doc = document as DocWithVT;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      localStorage.setItem("jkt48-theme", next);
      setThemeState(next);
      return;
    }

    // Modern path — View Transitions API (Chrome/Edge)
    // Lingkaran tumbuh dari tombol, konten tetap terlihat (bukan overlay)
    if (doc.startViewTransition) {
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      const transition = doc.startViewTransition(() => {
        localStorage.setItem("jkt48-theme", next);
        setThemeState(next);
      });

      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 650,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            },
          );
        })
        .catch(() => { /* no-op */ });
      return;
    }

    // Fallback — overlay reveal untuk Safari/Firefox
    runFallbackReveal(x, y, next);
  }, [theme, runFallbackReveal]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, resolved: theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}