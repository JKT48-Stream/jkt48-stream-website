import { useState, useEffect, useRef, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { MiniPlayer } from "@/components/MiniPlayer";
import { Splash, shouldShowSplash } from "@/components/Splash";
import { RouteWipe } from "@/components/RouteWipe";
import { Ticker } from "@/components/Ticker";
import { SiteFooter } from "@/components/SiteFooter";
import { CHANNELS, fetchChannelInfo, type ChannelKey } from "@/lib/youtube";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(() => shouldShowSplash());

  const isWatchPage = location.pathname === "/watch";
  const isStreamingPage = location.pathname === "/stream";
  const isVideoPage = isWatchPage || isStreamingPage;

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const handler = () => setIsDesktop(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Efek futuristik: progres scroll + spotlight yang mengikuti kursor (--mx/--my pada elemen .spotlight).
  // PENTING: --sp hanya ditulis ke elemen .scroll-progress, bukan ke <html>. Menulis custom property di root
  // memaksa browser menghitung ulang style SELURUH halaman di setiap frame scroll (berat di HP).
  useEffect(() => {
    let raf = 0;
    let moveRaf = 0;
    let bar: HTMLElement | null = null;
    let last = -1;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!bar || !bar.isConnected) bar = document.querySelector<HTMLElement>(".scroll-progress");
        if (!bar) return;
        const root = document.documentElement;
        const max = root.scrollHeight - window.innerHeight;
        const v = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        if (Math.abs(v - last) < 0.002) return; // perubahan <0.2% tidak terlihat
        last = v;
        bar.style.setProperty("--sp", v.toFixed(3));
      });
    };
    let pending: PointerEvent | null = null;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pending = e;
      if (moveRaf) return;
      moveRaf = requestAnimationFrame(() => {
        moveRaf = 0;
        const ev = pending;
        if (!ev) return;
        const el = (ev.target as HTMLElement | null)?.closest?.(".spotlight") as HTMLElement | null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${ev.clientX - r.left}px`);
        el.style.setProperty("--my", `${ev.clientY - r.top}px`);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(moveRaf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);

  useEffect(() => {
    (Object.keys(CHANNELS) as ChannelKey[]).forEach((k) => {
      fetchChannelInfo(k).catch(() => {});
    });
  }, []);

  useEffect(() => {
    // "instant" supaya tidak ikut scroll-behavior: smooth di CSS (kalau tidak, halaman baru terlihat menggulir dari bawah)
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (sidebarOpen) {
      setDrawerMounted(true);
      setClosing(false);
    }
  }, [sidebarOpen]);

  const closeDrawer = () => {
    setClosing(true);
    setSidebarOpen(false);
    window.setTimeout(() => {
      setDrawerMounted(false);
      setClosing(false);
    }, 260);
  };

  const toggle = () => {
    if (isDesktop) setCollapsed((c) => !c);
    else {
      if (sidebarOpen || drawerMounted) closeDrawer();
      else setSidebarOpen(true);
    }
  };

  const [watchPageCollapsedOverride, setWatchPageCollapsedOverride] = useState(true);

  useEffect(() => {
    if (isVideoPage) {
      setWatchPageCollapsedOverride(true);
    } else {
      setWatchPageCollapsedOverride(false);
    }
  }, [isVideoPage]);

  const effectiveCollapsed = isVideoPage ? watchPageCollapsedOverride : collapsed;
  const desktopSidebar = isDesktop && !effectiveCollapsed;

  const handleToggle = () => {
    if (isDesktop) {
      if (isVideoPage) {
        setWatchPageCollapsedOverride((c) => !c);
      } else {
        setCollapsed((c) => !c);
      }
    } else {
      if (sidebarOpen || drawerMounted) closeDrawer();
      else setSidebarOpen(true);
    }
  };

  return (
    <>
    {/* Latar futuristik: aurora + grid */}
    <div className="fx-backdrop" aria-hidden="true">
      <div className="fx-aurora" />
      <div className="fx-grid" />
    </div>
    <div className="relative z-[1] flex min-h-screen flex-col">
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}
      <RouteWipe />
      {!isVideoPage && <Ticker />}
      <Navbar onToggleSidebar={handleToggle} />

      <div className="flex flex-1">
        {/* Desktop sidebar — panel mengambang */}
        <aside
          className={cn(
            "sticky top-[var(--header-h)] hidden h-[calc(100vh-var(--header-h))] flex-shrink-0 lg:block",
            "transition-[width] duration-300 ease-smooth",
            desktopSidebar ? "w-[var(--sidebar-w)]" : "w-[var(--sidebar-mini-w)]",
          )}
        >
          <div className="h-full py-3 pl-3">
            <div className="glass h-full overflow-hidden rounded-[1.75rem] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.06)]">
              <Sidebar collapsed={!desktopSidebar} />
            </div>
          </div>
        </aside>

        {/* Mobile/tablet drawer */}
        {!isDesktop && drawerMounted && (
          <>
            <div
              className={cn(
                "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden",
                closing ? "animate-fade-out" : "animate-fade-in",
              )}
              onClick={closeDrawer}
            />
            <aside
              className={cn(
                "glass fixed inset-y-3 left-3 z-50 w-72 overflow-hidden rounded-[1.75rem] !bg-popover/90 shadow-elevated lg:hidden",
                closing ? "animate-slide-out-left" : "animate-slide-in-left",
              )}
            >
              <div className="flex h-[var(--header-h)] items-center justify-between border-b border-border px-4">
                <span className="font-display text-xl font-extrabold tracking-tight">
                  JKT<span className="text-neon">48</span> Stream
                </span>
                <button
                  onClick={closeDrawer}
                  aria-label="Tutup menu"
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-hover transition-all duration-200 hover:rotate-90"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="h-[calc(100%-var(--header-h))] overflow-y-auto">
                <Sidebar collapsed={false} onNavigate={closeDrawer} />
              </div>
            </aside>
          </>
        )}

        {/* Konten utama */}
        <main key={location.pathname} className="page-enter min-w-0 flex-1 pb-24 md:pb-6">
          <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
            <Outlet />
          </Suspense>
          {!isVideoPage && <SiteFooter />}
        </main>
      </div>

      <MobileBottomNav />
      <MiniPlayer />
    </div>
    </>
  );
}