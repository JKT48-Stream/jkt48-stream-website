import { lazy, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PWAProvider } from "@/contexts/PWAContext";
import { AppLayout } from "@/components/AppLayout";
import ScrollToTop from "@/components/ScrollToTop";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import Home from "./pages/Home";
















import NotFound from "./pages/NotFound";
import { EdgeError } from "./lib/edge";


// Code splitting: tiap halaman jadi chunk sendiri, hanya diunduh saat dibuka (Home tetap eager karena halaman pertama).
const loaders = {
  ChannelPage: () => import("./pages/ChannelPage"),
  SearchPage: () => import("./pages/SearchPage"),
  WatchPage: () => import("./pages/WatchPage"),
  HistoryPage: () => import("./pages/HistoryPage"),
  SavedPage: () => import("./pages/SavedPage"),
  TrendingPage: () => import("./pages/TrendingPage"),
  SubscriptionsPage: () => import("./pages/SubscriptionsPage"),
  PlaylistDetailPage: () => import("./pages/PlaylistDetailPage"),
  PlaylistsPage: () => import("./pages/PlaylistsPage"),
  UserPlaylistDetailPage: () => import("./pages/UserPlaylistDetailPage"),
  ChannelPlaylistDetailPage: () => import("./pages/ChannelPlaylistDetailPage"),
  MemberLivePage: () => import("./pages/MemberLivePage"),
  StreamingPlayerPage: () => import("./pages/StreamingPlayerPage"),
  MemberBirthdaysPage: () => import("./pages/MemberBirthdaysPage"),
  TheaterSchedulePage: () => import("./pages/TheaterSchedulePage"),
  TheaterShowDetailPage: () => import("./pages/TheaterShowDetailPage"),
};
const ChannelPage = lazy(loaders.ChannelPage);
const SearchPage = lazy(loaders.SearchPage);
const WatchPage = lazy(loaders.WatchPage);
const HistoryPage = lazy(loaders.HistoryPage);
const SavedPage = lazy(loaders.SavedPage);
const TrendingPage = lazy(loaders.TrendingPage);
const SubscriptionsPage = lazy(loaders.SubscriptionsPage);
const PlaylistDetailPage = lazy(loaders.PlaylistDetailPage);
const PlaylistsPage = lazy(loaders.PlaylistsPage);
const UserPlaylistDetailPage = lazy(loaders.UserPlaylistDetailPage);
const ChannelPlaylistDetailPage = lazy(loaders.ChannelPlaylistDetailPage);
const MemberLivePage = lazy(loaders.MemberLivePage);
const StreamingPlayerPage = lazy(loaders.StreamingPlayerPage);
const MemberBirthdaysPage = lazy(loaders.MemberBirthdaysPage);
const TheaterSchedulePage = lazy(loaders.TheaterSchedulePage);
const TheaterShowDetailPage = lazy(loaders.TheaterShowDetailPage);

// Setelah halaman pertama selesai & browser idle, unduh chunk halaman lain di belakang layar
// supaya perpindahan halaman terasa instan. Dilewati bila pengguna menghemat data / koneksi sangat lambat.
function usePrefetchRoutes() {
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? "")) return;
    const order = [
      loaders.WatchPage, loaders.SearchPage, loaders.ChannelPage, loaders.TrendingPage, loaders.MemberLivePage,
      loaders.TheaterSchedulePage, loaders.MemberBirthdaysPage, loaders.SubscriptionsPage, loaders.PlaylistsPage,
      loaders.HistoryPage, loaders.SavedPage,
    ];
    const idle = (cb: () => void) =>
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(cb, { timeout: 4000 })
        : window.setTimeout(cb, 1500); // Safari < 18 belum punya requestIdleCallback
    let i = 0;
    let cancelled = false;
    const next = () => {
      if (cancelled || i >= order.length) return;
      order[i++]().catch(() => {}).finally(() => idle(next));
    };
    const start = window.setTimeout(() => idle(next), 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, []);
}

// Error yang tidak akan sembuh dengan mengulang (kuota/rate limit, key salah, data tidak ada) tidak di-retry,
// supaya tidak menghabiskan kuota API key JKT48Connect.
const NO_RETRY_CODES = ["QUOTA_EXCEEDED", "RATE_LIMITED", "CONFIG_ERROR", "NOT_FOUND", "BAD_REQUEST"];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        failureCount < 2 && !(error instanceof EdgeError && NO_RETRY_CODES.includes(error.code)),
    },
  },
});

const App = () => {
  usePrefetchRoutes();
  return (
  <ThemeProvider>
    <PWAProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ApiStatusBanner />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/channel/:handle" element={<ChannelPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/watch" element={<WatchPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/saved" element={<SavedPage />} />
                <Route path="/trending" element={<TrendingPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/playlist" element={<PlaylistDetailPage />} />
                <Route path="/playlists" element={<PlaylistsPage />} />
                <Route path="/playlists/:id" element={<UserPlaylistDetailPage />} />
                <Route path="/playlists/channel/:id" element={<ChannelPlaylistDetailPage />} />
                <Route path="/member-live" element={<MemberLivePage />} />
                <Route path="/member-birthdays" element={<MemberBirthdaysPage />} />
                <Route path="/theater" element={<TheaterSchedulePage />} />
                <Route path="/theater/:referenceCode" element={<TheaterShowDetailPage />} />
                <Route path="/stream" element={<StreamingPlayerPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </PWAProvider>
  </ThemeProvider>
  );
};

export default App;