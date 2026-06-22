import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { MiniPlayer } from "@/components/MiniPlayer";
import { CHANNELS, fetchChannelInfo, type ChannelKey } from "@/lib/youtube";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const location = useLocation();
  const [pageKey, setPageKey] = useState(location.pathname);
  const [pageVisible, setPageVisible] = useState(true);

  // Detect jika user sedang di halaman Watch atau Streaming Player
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

  // Prefetch channel info
  useEffect(() => {
    (Object.keys(CHANNELS) as ChannelKey[]).forEach((k) => {
      fetchChannelInfo(k).catch(() => {});
    });
  }, []);

  // Scroll ke atas setiap kali lokasi berubah (termasuk query params seperti ?q=...)
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search]);

  // Page transition on route change (pathname only)
  useEffect(() => {
    if (location.pathname !== pageKey) {
      setPageVisible(false);
      const t = setTimeout(() => {
        setPageKey(location.pathname);
        setPageVisible(true);
      }, 120);
      return () => clearTimeout(t);
    }
  }, [location.pathname]);

  // Mount/unmount drawer with exit animation
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

  // Di WatchPage, sidebar desktop otomatis disembunyikan (mirip YouTube)
  // User tetap bisa toggle manual jika mau
  const [watchPageCollapsedOverride, setWatchPageCollapsedOverride] = useState(true);

  useEffect(() => {
    if (isVideoPage) {
      // Saat masuk WatchPage atau StreamingPlayerPage: collapse sidebar
      setWatchPageCollapsedOverride(true);
    } else {
      // Saat keluar: kembalikan ke state semula
      setWatchPageCollapsedOverride(false);
    }
  }, [isVideoPage]);

  // Effective collapsed state: di WatchPage/StreamingPage override ke collapsed kecuali user sudah toggle manual
  const effectiveCollapsed = isVideoPage ? watchPageCollapsedOverride : collapsed;
  const desktopSidebar = isDesktop && !effectiveCollapsed;

  // Override toggle di WatchPage/StreamingPage agar toggle watchPageCollapsedOverride bukan collapsed global
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
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar onToggleSidebar={handleToggle} />

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "sticky top-[var(--header-h)] hidden h-[calc(100vh-var(--header-h))] flex-shrink-0 lg:block",
            "transition-[width] duration-300 ease-smooth",
            desktopSidebar ? "w-[var(--sidebar-w)]" : "w-[var(--sidebar-mini-w)]",
          )}
        >
          <Sidebar collapsed={!desktopSidebar} />
        </aside>

        {/* Mobile/tablet drawer */}
        {!isDesktop && drawerMounted && (
          <>
            <div
              className={cn(
                "fixed inset-0 z-40 bg-black/50 lg:hidden",
                closing ? "animate-fade-out" : "animate-fade-in",
              )}
              onClick={closeDrawer}
            />
            <aside
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-background lg:hidden",
                closing ? "animate-slide-out-left" : "animate-slide-in-left",
              )}
            >
              <div className="flex h-[var(--header-h)] items-center justify-between border-b border-border px-3">
                <span className="text-lg font-bold tracking-tight">
                  JKT<span className="text-primary">48</span> Stream
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

        {/* Main content with page transition */}
        <main
          key={pageKey}
          className={cn(
            "min-w-0 flex-1 pb-16 md:pb-4",
            "transition-all duration-150",
            pageVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2",
          )}
        >
          <Outlet />
        </main>
      </div>

      <MobileBottomNav />
      <MiniPlayer />
    </div>
  );
}