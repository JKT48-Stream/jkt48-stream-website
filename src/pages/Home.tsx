import { useEffect, useRef, useState, useCallback } from "react";
import { fetchChannel, type ChannelKey, type YTVideo, CHANNELS } from "@/lib/youtube";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";

const CHIPS: { key: ChannelKey | "ALL"; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "JKT48", label: "JKT48 Official" },
  { key: "JKT48TV", label: "JKT48 TV" },
  { key: "48DailyLive", label: "JKT48 LIVE" },
  { key: "IDNApp", label: "IDN App" },
];

export default function Home() {
  const [active, setActive] = useState<ChannelKey | "ALL">("ALL");
  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [pageTokens, setPageTokens] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevActive, setPrevActive] = useState<ChannelKey | "ALL">("ALL");
  const [chipChanging, setChipChanging] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const channelKeys: ChannelKey[] =
    active === "ALL" ? ["JKT48", "JKT48TV", "48DailyLive", "IDNApp"] : [active];

  const handleChipChange = (key: ChannelKey | "ALL") => {
    if (key === active) return;
    setChipChanging(true);
    setTimeout(() => {
      setPrevActive(active);
      setActive(key);
      setChipChanging(false);
    }, 150);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setVideos([]);
    setError(null);
    setPageTokens({});
    Promise.all(
      channelKeys.map((k) =>
        fetchChannel(k, "date").then((r) => ({ k, ...r })),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const merged: YTVideo[] = results.flatMap((r) => r.videos);
        merged.sort(
          (a, b) =>
            new Date(b.snippet.publishedAt).getTime() -
            new Date(a.snippet.publishedAt).getTime(),
        );
        setVideos(merged);
        const tokens: Record<string, string | null> = {};
        results.forEach((r) => (tokens[r.k] = r.nextPageToken));
        setPageTokens(tokens);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const loadMore = async () => {
    if (loadingMore || loading) return;
    const nextChannels = channelKeys.filter((k) => pageTokens[k]);
    if (!nextChannels.length) return;
    setLoadingMore(true);
    try {
      const results = await Promise.all(
        nextChannels.map((k) =>
          fetchChannel(k, "date", pageTokens[k] ?? undefined).then((r) => ({
            k,
            ...r,
          })),
        ),
      );
      setVideos((prev) => {
        const merged = [...prev, ...results.flatMap((r) => r.videos)];
        if (active === "ALL") {
          merged.sort(
            (a, b) =>
              new Date(b.snippet.publishedAt).getTime() -
              new Date(a.snippet.publishedAt).getTime(),
          );
        }
        return merged;
      });
      setPageTokens((prev) => {
        const next = { ...prev };
        results.forEach((r) => (next[r.k] = r.nextPageToken));
        return next;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageTokens, loading]);

  return (
    <div className="page-enter">
      {/* Sticky chip bar */}
      <div className="sticky top-[var(--header-h)] z-20 -mx-1 flex gap-2 overflow-x-auto scrollbar-hide bg-background/95 px-3 py-3 backdrop-blur sm:px-6 animate-fade-in-down">
        {CHIPS.map((c, i) => (
          <button
            key={c.key}
            data-active={active === c.key}
            onClick={() => handleChipChange(c.key)}
            className="yt-chip"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Channel banner (when specific channel selected) */}
      {active !== "ALL" && (
        <div
          className="mx-3 mb-4 mt-1 rounded-2xl bg-gradient-to-r from-primary/10 to-primary-glow/5 p-4 sm:mx-6 sm:p-6 animate-fade-in-up channel-header-banner"
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-black text-white shadow-lg animate-scale-in-bounce"
              style={{ background: `hsl(${CHANNELS[active].color})` }}
            >
              48
            </div>
            <div className="animate-fade-in-left" style={{ animationDelay: "100ms" }}>
              <h1 className="text-lg font-bold sm:text-xl">{CHANNELS[active].name}</h1>
              <p className="text-sm text-muted-foreground">{CHANNELS[active].tagline}</p>
            </div>
          </div>
        </div>
      )}

      {/* Video grid */}
      <div
        className={`grid grid-cols-1 gap-4 px-3 pb-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4 transition-opacity duration-200 ${chipChanging ? "opacity-0" : "opacity-100"}`}
      >
        {loading &&
          Array.from({ length: 12 }).map((_, i) => (
            <VideoCardSkeleton
              key={i}
              // @ts-ignore
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}

        {!loading && error && (
          <div className="col-span-full rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm animate-scale-in">
            <p className="font-semibold text-destructive">Gagal memuat video</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading &&
          !error &&
          videos.map((v, i) => (
            <VideoCard
              key={`${v.id}-${i}`}
              video={v}
              animationDelay={Math.min(i * 40, 400)}
            />
          ))}

        {loadingMore &&
          Array.from({ length: 4 }).map((_, i) => (
            <VideoCardSkeleton key={`m-${i}`} />
          ))}
      </div>

      {/* Load more sentinel */}
      <div ref={sentinelRef} className="h-10" />
    </div>
  );
}