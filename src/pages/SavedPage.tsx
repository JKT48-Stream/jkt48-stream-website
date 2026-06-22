import { useEffect, useState } from "react";
import { useSaved } from "@/lib/storage";
import { type YTVideo } from "@/lib/youtube";
import { supabase } from "@/integrations/supabase/client";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { VideoRemovedToast } from "@/components/VideoRemovedToast";
import { Bookmark } from "lucide-react";

export default function SavedPage() {
  const ids = useSaved();
  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [removedVideo, setRemovedVideo] = useState<{ title: string; thumb?: string } | null>(null);

  useEffect(() => {
    if (!ids.length) {
      setVideos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase.functions
      .invoke(`youtube?action=videos&ids=${ids.join(",")}`, { method: "GET" })
      .then(({ data }) => {
        setVideos((data?.videos ?? []) as YTVideo[]);
      })
      .finally(() => setLoading(false));
  }, [ids.join(",")]);

  return (
    <div className="px-3 py-4 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold">Video tersimpan</h1>
      {!ids.length ? (
        <div className="py-20 text-center">
          <Bookmark className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-semibold">Belum ada video tersimpan</p>
          <p className="text-sm text-muted-foreground">
            Klik tombol Simpan saat menonton video
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
              ))
            : videos.map((v) => (
                <VideoCard
                  key={v.id}
                  video={v}
                  onVideoRemoved={(title, thumb) =>
                    setRemovedVideo({ title, thumb })
                  }
                />
              ))}
        </div>
      )}

      {removedVideo !== null && (
        <VideoRemovedToast
          videoTitle={removedVideo.title}
          videoThumb={removedVideo.thumb}
          onClose={() => setRemovedVideo(null)}
        />
      )}
    </div>
  );
}