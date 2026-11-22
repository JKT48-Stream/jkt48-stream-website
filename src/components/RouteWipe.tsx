import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const LABELS: { test: (p: string) => boolean; label: string }[] = [
  { test: (p) => p === "/", label: "Beranda" },
  { test: (p) => p.startsWith("/trending"), label: "Trending" },
  { test: (p) => p.startsWith("/subscriptions"), label: "Channel" },
  { test: (p) => p.startsWith("/member-live"), label: "Member Live" },
  { test: (p) => p.startsWith("/member-birthdays"), label: "Ulang Tahun" },
  { test: (p) => p.startsWith("/theater"), label: "Theater" },
  { test: (p) => p.startsWith("/history"), label: "Riwayat" },
  { test: (p) => p.startsWith("/saved"), label: "Tersimpan" },
  { test: (p) => p.startsWith("/playlist"), label: "Playlist" },
  { test: (p) => p.startsWith("/channel"), label: "Channel" },
  { test: (p) => p.startsWith("/search"), label: "Pencarian" },
];

const SKIP = ["/watch", "/stream"];

const STRIPS = 6;
const COVER_MS = 520;
const HOLD_MS = 240;
const REVEAL_MS = 600;

type Phase = "idle" | "in" | "hold" | "out";

const groupOf = (p: string) => "/" + (p.split("/")[1] ?? "");
const labelOf = (p: string) => LABELS.find((l) => l.test(p))?.label ?? "JKT48 Stream";
const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function shouldAnimate(from: string, to: string) {
  if (SKIP.some((s) => to.startsWith(s) || from.startsWith(s))) return false;
  return groupOf(from) !== groupOf(to);
}

function flag(on: boolean) {
  if (on) document.documentElement.dataset.rw = "1";
  else delete document.documentElement.dataset.rw;
}

export function RouteWipe() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const [label, setLabel] = useState("JKT48 Stream");

  const phaseRef = useRef<Phase>("idle");
  const pathRef = useRef(pathname);
  const pendingRef = useRef<string | null>(null);
  const timers = useRef<number[]>([]);

  const setP = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);
  const clear = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const reveal = useCallback(
    (delay: number) => {
      later(() => {
        setP("out");
        later(() => {
          setP("idle");
          flag(false);
        }, REVEAL_MS);
      }, delay);
    },
    [later, setP],
  );

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;

      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const cur = window.location.pathname;
      if (url.pathname === cur) return;
      if (prefersReduced() || !shouldAnimate(cur, url.pathname)) return;

      e.preventDefault();
      if (phaseRef.current !== "idle") return;

      clear();
      flag(true);
      pendingRef.current = url.pathname;
      setLabel(labelOf(url.pathname));
      setP("in");
      const to = url.pathname + url.search + url.hash;
      later(() => navigate(to), COVER_MS);
      later(() => {
        if (pendingRef.current) {
          pendingRef.current = null;
          reveal(0);
        }
      }, COVER_MS + 2500);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [clear, later, navigate, reveal, setP]);

  useLayoutEffect(() => {
    if (pathRef.current === pathname) return;
    const from = pathRef.current;
    pathRef.current = pathname;

    if (pendingRef.current !== null) {
      pendingRef.current = null;
      clear();
      setLabel(labelOf(pathname));
      setP("hold");
      reveal(HOLD_MS);
      return;
    }

    if (prefersReduced() || !shouldAnimate(from, pathname)) return;
    clear();
    flag(true);
    setLabel(labelOf(pathname));
    setP("hold");
    reveal(HOLD_MS);
  }, [pathname, clear, reveal, setP]);

  useEffect(
    () => () => {
      clear();
      flag(false);
    },
    [clear],
  );

  if (phase === "idle") return null;
  return (
    <div className="rw" data-phase={phase} aria-hidden="true">
      <div className="rw-strips">
        {Array.from({ length: STRIPS }, (_, i) => (
          <span key={i} className="rw-strip" style={{ ["--i" as string]: i }} />
        ))}
      </div>
      <div className="rw-content">
        <p className="tech-label uppercase opacity-80">JKT48 Stream</p>
        <p className="font-display rw-label">{label}</p>
        <span className="rw-bar">
          <i />
        </span>
      </div>
    </div>
  );
}