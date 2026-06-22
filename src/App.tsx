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
import ChannelPage from "./pages/ChannelPage";
import SearchPage from "./pages/SearchPage";
import WatchPage from "./pages/WatchPage";
import HistoryPage from "./pages/HistoryPage";
import SavedPage from "./pages/SavedPage";
import TrendingPage from "./pages/TrendingPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import PlaylistDetailPage from "./pages/PlaylistDetailPage";
import PlaylistsPage from "./pages/PlaylistsPage";
import UserPlaylistDetailPage from "./pages/UserPlaylistDetailPage";
import ChannelPlaylistDetailPage from "./pages/ChannelPlaylistDetailPage";
import MemberLivePage from "./pages/MemberLivePage";
import StreamingPlayerPage from "./pages/StreamingPlayerPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false } },
});

const App = () => (
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
                {/* ── Tab baru: Member Live ── */}
                <Route path="/member-live" element={<MemberLivePage />} />
                {/* ── Streaming Player Page ── */}
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

export default App;