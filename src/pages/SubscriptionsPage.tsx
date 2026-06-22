import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CHANNELS,
  fetchChannelInfo,
  formatCount,
  type ChannelKey,
  type YTChannelInfo,
} from "@/lib/youtube";

export default function SubscriptionsPage() {
  const [infos, setInfos] = useState<Record<string, YTChannelInfo>>({});

  useEffect(() => {
    (Object.keys(CHANNELS) as ChannelKey[]).forEach((k) => {
      fetchChannelInfo(k)
        .then((info) => setInfos((prev) => ({ ...prev, [k]: info })))
        .catch(() => {});
    });
  }, []);

  return (
    <div className="px-3 py-4 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold">Channel JKT48</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(Object.keys(CHANNELS) as ChannelKey[]).map((k) => {
          const c = CHANNELS[k];
          const info = infos[k];
          const avatar =
            info?.thumbnails?.high?.url ??
            info?.thumbnails?.medium?.url ??
            info?.thumbnails?.default?.url;
          return (
            <Link
              key={k}
              to={`/channel/${k}`}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-elevated"
            >
              <div className="h-32 overflow-hidden">
                {info?.banner ? (
                  <img
                    src={`${info.banner}=w1280-h320-c`}
                    alt={`${c.name} banner`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="h-full w-full transition-transform group-hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, hsl(${c.color}), hsl(${c.color} / 0.6))`,
                    }}
                  />
                )}
              </div>
              <div className="p-4">
                <div className="relative z-10 -mt-12 mb-3 h-16 w-16 overflow-hidden rounded-full border-4 border-card bg-card shadow-elevated">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={c.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-white"
                      style={{ background: `hsl(${c.color})` }}
                    >
                      <span className="text-lg font-black">48</span>
                    </div>
                  )}
                </div>
                <h2 className="text-lg font-bold">{info?.title ?? c.name}</h2>
                <p className="text-sm text-muted-foreground">{c.handle}</p>
                <p className="mt-1 text-sm">{c.tagline}</p>
                {info && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatCount(info.subscriberCount)} subscriber •{" "}
                    {formatCount(info.videoCount)} video
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
