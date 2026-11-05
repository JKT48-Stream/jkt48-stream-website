import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchChannel,
  bestThumb,
  formatDuration,
  formatViews,
  timeAgo,
  channelKeyFromVideo,
  type ChannelKey,
  type YTVideo,
  CHANNELS,
} from "@/lib/youtube";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { members as bdayMembers, sortByUpcoming, daysUntilBirthday, isBirthdayToday } from "@/data/birthday-members";
import { AlertTriangle, Play, Radio, ArrowUpRight, Flame, Theater, ListMusic, History } from "lucide-react";

const CHIPS: { key: ChannelKey | "ALL"; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "JKT48", label: "JKT48 Official" },
  { key: "JKT48TV", label: "JKT48 TV" },
  { key: "48DailyLive", label: "JKT48 LIVE" },
  { key: "IDNApp", label: "IDN App" },
];

function HeroVideo({ video }: { video: YTVideo }) {
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);
  const key = channelKeyFromVideo(video.snippet.channelId, video.snippet.channelTitle);
  const channel = key ? CHANNELS[key].name : video.snippet.channelTitle;
  const duration = formatDuration(video.contentDetails?.duration ?? "");
  const open = () => navigate(`/watch?v=${video.id}`);

  // Kartu 3D: miring halus mengikuti kursor (hanya mouse, bukan sentuh)
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.dataset.tilting = "true";
    el.style.transform = `perspective(1400px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg)`;
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.dataset.tilting = "false";
    el.style.transform = "";
  };

  return (
    <article
      ref={ref}
      onClick={open}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="tilt hud spotlight scanlines group relative isolate flex min-h-[340px] cursor-pointer flex-col justify-end overflow-hidden rounded-[2rem] border border-white/10 bg-muted shadow-player lg:min-h-[440px]"
    >
      <img
        src={bestThumb(video)}
        alt=""
        decoding="async"
        className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-[1200ms] ease-smooth group-hover:scale-[1.06]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/95 via-black/40 to-black/10" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_85%_0%,hsl(var(--primary)/0.35),transparent_70%)] mix-blend-screen" />
      <span className="hud-c tl" /><span className="hud-c tr" /><span className="hud-c bl" /><span className="hud-c br" />

      <div className="hero-in p-5 text-white sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="tech-label inline-flex items-center gap-2 rounded-full bg-neon px-3 py-1 font-semibold uppercase shadow-neon">
            <span className="radar text-white" /> Terbaru
          </span>
          <span className="glass rounded-full !bg-white/10 px-3 py-1 text-xs font-medium text-white">{channel}</span>
        </div>
        <h1 className="line-clamp-3 max-w-3xl font-display text-3xl font-extrabold leading-[1.05] drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)] sm:text-5xl">
          {video.snippet.title}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            onClick={(e) => { e.stopPropagation(); open(); }}
            className="btn-neon"
          >
            <Play className="h-4 w-4 fill-current" /> Tonton sekarang
          </button>
          <span className="tech-label text-white/80">
            {formatViews(video.statistics?.viewCount)}x ditonton · {timeAgo(video.snippet.publishedAt)}
            {duration ? ` · ${duration}` : ""}
          </span>
        </div>
      </div>
    </article>
  );
}

function BirthdayPanel() {
  const now = new Date();
  const list = sortByUpcoming(bdayMembers, now).slice(0, 4);
  return (
    <section className="panel spotlight flex flex-col p-5" aria-label="Ulang tahun terdekat">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-rule font-display text-xl font-extrabold">Ulang tahun terdekat</h2>
        <Link to="/member-birthdays" className="text-xs font-medium text-muted-foreground hover:text-primary">
          Semua
        </Link>
      </div>
      <ul className="flex flex-1 flex-col gap-1.5">
        {list.map((m) => {
          const today = isBirthdayToday(m.birthday, now);
          const d = daysUntilBirthday(m.birthday, now);
          return (
            <li key={m.id}>
              <Link
                to="/member-birthdays"
                className="group/row flex items-center gap-3 rounded-2xl p-2 transition-all duration-300 hover:translate-x-1 hover:bg-surface-hover"
              >
                <img
                  src={m.photo}
                  alt=""
                  loading="lazy"
                  className="h-12 w-12 flex-shrink-0 rounded-xl object-cover object-top ring-1 ring-border transition-all duration-300 group-hover/row:ring-primary/70 group-hover/row:shadow-[0_0_20px_-4px_hsl(var(--primary))]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.nickname}</p>
                  <p className="truncate text-xs text-muted-foreground">Team {m.team}</p>
                </div>
                <span
                  className={
                    "tech-label flex-shrink-0 rounded-full px-2.5 py-1 " +
                    (today ? "bg-neon text-primary-foreground shadow-neon" : "bg-surface-2 text-muted-foreground")
                  }
                >
                  {today ? "Hari ini" : d === 1 ? "Besok" : `${d} hari`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LiveCard() {
  return (
    <Link
      to="/member-live"
      className="group relative isolate flex items-center justify-between gap-3 overflow-hidden rounded-[1.75rem] bg-neon p-5 text-primary-foreground shadow-neon transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_24px_60px_-16px_hsl(var(--primary)/0.95)] active:scale-[0.99]"
    >
      <span className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_20%,hsl(0_0%_100%/0.28),transparent_55%)]" />
      <div>
        <p className="tech-label mb-1 flex items-center gap-2"><span className="radar text-white" /> Member Live</p>
        <p className="font-display text-xl font-extrabold leading-tight">Siapa yang sedang live?</p>
      </div>
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-transform duration-300 group-hover:rotate-45">
        <ArrowUpRight className="h-5 w-5" />
      </span>
      <Radio className="pointer-events-none absolute -bottom-6 -right-4 h-28 w-28 opacity-15" />
    </Link>
  );
}

/** Akses cepat ke halaman utama lain (semua rute sudah ada). */
const QUICK: { to: string; label: string; hint: string; icon: typeof Flame; tile: string }[] = [
  { to: "/trending", label: "Trending", hint: "Yang lagi ramai", icon: Flame, tile: "355 100% 62%" },
  { to: "/theater", label: "Theater", hint: "Jadwal pertunjukan", icon: Theater, tile: "8 100% 66%" },
  { to: "/playlists", label: "Playlist", hint: "Koleksi kamu", icon: ListMusic, tile: "340 85% 68%" },
  { to: "/history", label: "Riwayat", hint: "Lanjut nonton", icon: History, tile: "14 80% 62%" },
];

function QuickTiles() {
  return (
    <nav aria-label="Akses cepat" className="grid grid-cols-2 gap-3 px-3 pt-4 sm:px-6 lg:grid-cols-4">
      {QUICK.map(({ to, label, hint, icon: Icon, tile }) => (
        <Link
          key={to}
          to={to}
          className="quick-tile spotlight group"
          style={{ ["--tile" as string]: tile } as React.CSSProperties}
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5"
            style={{ color: `hsl(${tile})` }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-extrabold leading-none">{label}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
          </div>
        </Link>
      ))}
    </nav>
  );
}

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

  const hero = videos[0];
  const gridVideos = hero ? videos.slice(1) : videos;

  return (
    <div>
      {/* Hero + panel samping */}
      <section className="grid gap-4 px-3 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {loading ? (
          <div className="yt-skeleton min-h-[340px] rounded-[2rem] lg:min-h-[440px]" />
        ) : hero && !error ? (
          <HeroVideo video={hero} />
        ) : (
          <div className="panel flex min-h-[340px] items-end p-8 lg:min-h-[440px]">
            <h1 className="font-display text-4xl font-extrabold">JKT48 Stream</h1>
          </div>
        )}
        <div className="flex flex-col gap-4">
          <BirthdayPanel />
          <LiveCard />
        </div>
      </section>

      <QuickTiles />

      {/* Filter channel */}
      <div className="sticky top-[var(--header-h)] z-20 mt-4 flex items-center gap-3 overflow-x-auto scrollbar-hide bg-background/70 px-3 py-3 backdrop-blur-xl sm:px-6">
        <h2 className="section-rule mr-3 hidden flex-shrink-0 font-display text-2xl font-extrabold sm:block">Video terbaru</h2>
        <div className="flex gap-2">
          {CHIPS.map((c) => (
            <button key={c.key} data-active={active === c.key} onClick={() => handleChipChange(c.key)} className="yt-chip">
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notice: video dari channel JKT48 LIVE tidak bisa diputar di website ini */}
      {(active === "ALL" || active === "48DailyLive") && (
        <div className="mx-3 mb-4 mt-1 sm:mx-6">
          <div className="flex items-start gap-3 rounded-3xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Video dari channel JKT48 LIVE tidak bisa diputar langsung di website ini
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Pemilik channel <span className="font-medium text-foreground">JKT48 LIVE (@48DailyLive)</span>{" "}
                menonaktifkan opsi "izinkan pemutaran embed di situs lain" untuk video-video di
                channel ini lewat pengaturan YouTube mereka sendiri. Ini adalah pengaturan resmi
                dari pihak channel, bukan pembatasan dari website ini — video tetap bisa dibuka
                seperti biasa, tetapi kamu akan diarahkan langsung ke YouTube untuk menontonnya.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner channel (saat channel tertentu dipilih) */}
      {active !== "ALL" && (
        <div className="channel-header-banner panel spotlight mx-3 mb-4 mt-1 flex items-center gap-4 !rounded-3xl p-4 sm:mx-6 sm:p-5">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl font-display text-xl font-extrabold text-white"
            style={{ background: `hsl(${CHANNELS[active].color})`, boxShadow: `0 0 28px -6px hsl(${CHANNELS[active].color})` }}
          >
            48
          </div>
          <div>
            <h2 className="font-display text-xl font-extrabold">{CHANNELS[active].name}</h2>
            <p className="text-sm text-muted-foreground">{CHANNELS[active].tagline}</p>
          </div>
        </div>
      )}

      {/* Grid video */}
      <div
        className={`grid grid-cols-1 gap-x-4 gap-y-8 px-3 pb-8 pt-2 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4 transition-opacity duration-200 ${chipChanging ? "opacity-0" : "opacity-100"}`}
      >
        {loading &&
          Array.from({ length: 12 }).map((_, i) => <VideoCardSkeleton key={i} />)}

        {!loading && error && (
          <div className="col-span-full rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm animate-scale-in">
            <p className="font-semibold text-destructive">Gagal memuat video</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading &&
          !error &&
          gridVideos.map((v, i) => (
            <VideoCard key={`${v.id}-${i}`} video={v} animationDelay={Math.min(i * 30, 300)} />
          ))}

        {loadingMore && Array.from({ length: 4 }).map((_, i) => <VideoCardSkeleton key={`m-${i}`} />)}
      </div>

      {/* Load more sentinel */}
      <div ref={sentinelRef} className="h-10" />
    </div>
  );
}