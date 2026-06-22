import { useEffect, useState } from "react";
import { fetchChannel, type YTVideo } from "@/lib/youtube";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { Flame } from "lucide-react";

export default function TrendingPage() {
  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchChannel("JKT48", "viewCount"),
      fetchChannel("JKT48TV", "viewCount"),
      fetchChannel("48DailyLive", "viewCount"),
      fetchChannel("IDNApp", "viewCount"),
    ])
      .then((rs) => {
        if (cancelled) return;
        const merged = rs.flatMap((r) => r.videos).sort((a, b) => {
          const av = parseInt(a.statistics?.viewCount ?? "0", 10);
          const bv = parseInt(b.statistics?.viewCount ?? "0", 10);
          return bv - av;
        });
        setVideos(merged);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-4 flex items-center gap-2">
        <Flame className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Trending JKT48</h1>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <VideoCardSkeleton key={i} />)
          : videos.map((v, i) => <VideoCard key={`${v.id}-${i}`} video={v} />)}
      </div>
    </div>
  );
}