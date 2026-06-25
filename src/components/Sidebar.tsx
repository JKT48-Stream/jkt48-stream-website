import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  History,
  Bookmark,
  Flame,
  ListVideo,
  Download,
  Smartphone,
  Monitor,
  ListMusic,
  Radio,
  ExternalLink,
} from "lucide-react";
import { CHANNELS } from "@/lib/youtube";
import { ChannelMiniAvatar } from "@/components/VideoCard";
import { cn } from "@/lib/utils";
import { usePWA } from "@/contexts/PWAContext";

const BADUTZY_WEBSITE  = "https://badutzy.vercel.app";
const BADUTZY_GITHUB   = "https://github.com/badutzy";
const BADUTZY_YOUTUBE  = "https://www.youtube.com/@badutzy";
const BADUTZY_INSTAGRAM = "https://www.instagram.com/rzky.mp_36";
const BADUTZY_X        = "https://twitter.com/badutzyy_";

const JKT_WEBSITE  = "https://www.jkt48.com";
const JKT_INSTAGRAM = "https://www.instagram.com/jkt48";
const JKT_YOUTUBE  = "https://www.youtube.com/user/JKT48";
const JKT_FACEBOOK = "https://www.facebook.com/official.JKT48";
const JKT_TIKTOK   = "https://www.tiktok.com/@jkt48.official";
const JKT_X        = "https://x.com/officialjkt48";
const JKT_SPOTIFY  = "https://open.spotify.com/intl-id/artist/2l8I5pWUnfF7bMK1z6EJRk";
const JKT_STREAM_GITHUB = "https://github.com/jkt48-stream";

// ─── SVG Icon Paths ──────────────────────────────────────────────────────────

const ICON_GITHUB = "M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z";
const ICON_INSTAGRAM = "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z";
const ICON_YOUTUBE = "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z";
const ICON_X = "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.858L1.254 2.25H8.08l4.213 5.567zm-1.161 17.52h1.833L7.084 4.126H5.117z";
const ICON_TIKTOK = "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z";
const ICON_FACEBOOK = "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z";
const ICON_SPOTIFY = "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z";

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  collapsed: boolean;
  onNavigate?: () => void;
};

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Divider with optional centered label */
function SectionDivider({ label }: { label?: string }) {
  if (!label) return <hr className="my-2 border-border" />;
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Social pill chip (small labeled button) */
function SocialPill({
  href,
  title,
  icon,
  label,
  hoverColor = "hover:bg-surface-hover hover:text-foreground",
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  label: string;
  hoverColor?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "bg-surface-hover text-[10px] font-medium text-muted-foreground",
        "transition-all duration-200 hover:scale-105",
        hoverColor,
      )}
    >
      {icon}
      {label}
    </a>
  );
}

/** Small icon-only social button (for developer row) */
function SocialIcon({
  href,
  title,
  icon,
  hoverColor = "hover:text-foreground",
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  hoverColor?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg",
        "text-muted-foreground transition-all duration-200",
        "hover:bg-surface-hover hover:scale-110",
        hoverColor,
      )}
    >
      {icon}
    </a>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Sidebar({ collapsed, onNavigate }: Props) {
  const { pathname } = useLocation();
  const { canInstall, isInstalled, installing, triggerInstall } = usePWA();

  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // ── Nav Item ──────────────────────────────────────────────────────────────

  const Item = ({
    to,
    icon: Icon,
    label,
    end = false,
    delay = 0,
    badge,
  }: {
    to: string;
    icon: typeof Home;
    label: string;
    end?: boolean;
    delay?: number;
    badge?: React.ReactNode;
  }) => (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      style={{ animationDelay: `${delay}ms` }}
      className={({ isActive }) =>
        cn(
          "animate-sidebar-item-in flex items-center rounded-xl text-sm",
          "transition-all duration-200 ease-smooth",
          collapsed
            ? "flex-col gap-1 px-1 py-3.5 text-[10px]"
            : "gap-3 px-3 py-2.5",
          isActive
            ? "bg-surface-hover font-semibold text-foreground"
            : "text-foreground/60 hover:bg-surface-hover hover:text-foreground",
          !collapsed && isActive &&
            "border-l-[3px] border-primary pl-[calc(0.75rem-3px)]",
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className="relative flex-shrink-0">
            <Icon
              className={cn(
                "transition-all duration-200",
                collapsed ? "h-[22px] w-[22px]" : "h-[18px] w-[18px]",
                isActive ? "text-primary scale-110" : "",
              )}
            />
            {badge && (
              <span className="absolute -top-1 -right-1">{badge}</span>
            )}
          </div>
          <span className={cn(collapsed ? "text-center leading-tight" : "flex-1 truncate")}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );

  // ── Section label ─────────────────────────────────────────────────────────

  const SectionLabel = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
    <div
      className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );

  // ── Install button (collapsed mode) ───────────────────────────────────────

  const InstallButtonCollapsed = () => {
    if (isInstalled || !canInstall) return null;
    return (
    <button
      onClick={triggerInstall}
      disabled={installing}
      title="Install Aplikasi"
      className={cn(
        "flex w-full flex-col items-center gap-1 rounded-xl px-1 py-3.5 text-[10px]",
        "bg-primary/10 text-primary border border-primary/20",
        "transition-all duration-200 hover:bg-primary/20 hover:scale-105 active:scale-95",
        installing && "cursor-wait opacity-60",
      )}
    >
      {installing ? (
        <span className="h-[22px] w-[22px] animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ) : (
        <Download className="h-[22px] w-[22px]" />
      )}
      <span className="text-center leading-tight">Install</span>
    </button>
    );
  };

  // ── Install banner (expanded mode) ────────────────────────────────────────

  const InstallBanner = () => {
    if (isInstalled || !canInstall) return null;
    return (
      <div className="mx-3 mb-1 rounded-xl border border-primary/25 bg-primary/5 p-3.5 transition-all duration-200 hover:border-primary/40 hover:bg-primary/8">
        <div className="mb-2 flex items-center gap-2">
          {isMobile ? (
            <Smartphone className="h-4 w-4 flex-shrink-0 text-primary" />
          ) : (
            <Monitor className="h-4 w-4 flex-shrink-0 text-primary" />
          )}
          <span className="text-xs font-semibold text-foreground">Install Aplikasi</span>
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
          {isMobile
            ? "Pasang di beranda HP kamu untuk akses lebih cepat."
            : "Pasang di desktop kamu untuk akses lebih mudah."}
        </p>
        <button
          onClick={triggerInstall}
          disabled={installing}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg py-2",
            "bg-primary text-xs font-semibold text-primary-foreground",
            "transition-all duration-200 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]",
            installing && "cursor-wait opacity-60",
          )}
        >
          {installing ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Menginstall...
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" />
              Install
            </>
          )}
        </button>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <nav
      className={cn(
        "flex h-full flex-col overflow-y-auto py-3",
        "transition-[width,padding] duration-300 ease-smooth",
        collapsed ? "gap-0.5 px-1" : "gap-0 px-2",
      )}
    >
      {/* ── Main nav ─────────────────────────────────────────────────────── */}
      <div className="space-y-0.5">
        <Item to="/"             icon={Home}      label="Beranda"       end  delay={0} />
        <Item to="/trending"     icon={Flame}      label="Trending"          delay={40} />
        <Item to="/subscriptions" icon={ListVideo} label="Subscriptions"     delay={80} />
        <Item to="/member-live"  icon={Radio}      label="Member Live"       delay={100} />
      </div>

      {collapsed ? (
        /* ── Collapsed sidebar ───────────────────────────────────────── */
        <>
          <div className="my-2 border-t border-border" />
          <div className="space-y-0.5">
            <Item to="/history"   icon={History}   label="Riwayat"  delay={40} />
            <Item to="/saved"     icon={Bookmark}  label="Tersimpan" delay={60} />
            <Item to="/playlists" icon={ListMusic} label="Playlist"  delay={80} />
          </div>
          <div className="my-2 border-t border-border" />
          <InstallButtonCollapsed />
        </>
      ) : (
        /* ── Expanded sidebar ────────────────────────────────────────── */
        <>
          {/* Kamu section */}
          <hr className="my-2 border-border" />
          <SectionLabel delay={100}>Kamu</SectionLabel>
          <div className="space-y-0.5">
            <Item to="/history"   icon={History}   label="Riwayat"   delay={120} />
            <Item to="/saved"     icon={Bookmark}  label="Tersimpan" delay={150} />
            <Item to="/playlists" icon={ListMusic} label="Playlist"  delay={180} />
          </div>

          {/* Channel JKT48 section */}
          <hr className="my-2 border-border" />
          <SectionLabel delay={200}>Channel JKT48</SectionLabel>
          <div className="space-y-0.5">
            {(Object.keys(CHANNELS) as Array<keyof typeof CHANNELS>).map((k, i) => {
              const c = CHANNELS[k];
              const active = pathname === `/channel/${k}`;
              return (
                <NavLink
                  key={k}
                  to={`/channel/${k}`}
                  onClick={onNavigate}
                  style={{ animationDelay: `${220 + i * 40}ms` }}
                  className={cn(
                    "animate-sidebar-item-in flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                    "transition-all duration-200",
                    active
                      ? "bg-surface-hover font-semibold border-l-[3px] border-primary pl-[calc(0.75rem-3px)]"
                      : "text-foreground/60 hover:bg-surface-hover hover:text-foreground",
                  )}
                >
                  <div className={cn("flex-shrink-0 transition-transform duration-200", active && "scale-110")}>
                    <ChannelMiniAvatar channelTitle={c.name} channelKey={k} size={26} />
                  </div>
                  <span className="flex-1 truncate">{c.name}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Install banner */}
          <hr className="my-2 border-border" />
          <InstallBanner />

          {/* ── Footer info ─────────────────────────────────────────────── */}
          <div className="mt-1 space-y-4 px-3 pb-4 text-xs text-muted-foreground">

            {/* App blurb */}
            <div>
              <p className="font-bold text-foreground">JKT48 Stream</p>
              <p className="mt-0.5 leading-relaxed">Platform untuk menonton video dari JKT48</p>
            </div>

            {/* JKT48 Official */}
            <div className="space-y-2">
              <SectionDivider label="JKT48 Official" />
              <div className="flex flex-wrap justify-center gap-1.5">
                <SocialPill href={JKT_WEBSITE}   title="Website"   label="Website"
                  hoverColor="hover:bg-primary/10 hover:text-primary"
                  icon={<svg viewBox="0 0 24 24" className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>}
                />
                <SocialPill href={JKT_YOUTUBE}   title="YouTube"   label="YouTube"
                  hoverColor="hover:bg-red-500/10 hover:text-red-500"
                  icon={<svg viewBox="0 0 24 24" className="h-3 w-3 flex-shrink-0" fill="currentColor"><path d={ICON_YOUTUBE}/></svg>}
                />
                <SocialPill href={JKT_INSTAGRAM} title="Instagram" label="Instagram"
                  hoverColor="hover:bg-pink-500/10 hover:text-pink-500"
                  icon={<svg viewBox="0 0 24 24" className="h-3 w-3 flex-shrink-0" fill="currentColor"><path d={ICON_INSTAGRAM}/></svg>}
                />
                <SocialPill href={JKT_X}         title="X"         label="X"
                  hoverColor="hover:bg-foreground/10 hover:text-foreground"
                  icon={<svg viewBox="0 0 24 24" className="h-3 w-3 flex-shrink-0" fill="currentColor"><path d={ICON_X}/></svg>}
                />
                <SocialPill href={JKT_TIKTOK}    title="TikTok"    label="TikTok"
                  hoverColor="hover:bg-foreground/10 hover:text-foreground"
                  icon={<svg viewBox="0 0 24 24" className="h-3 w-3 flex-shrink-0" fill="currentColor"><path d={ICON_TIKTOK}/></svg>}
                />
                <SocialPill href={JKT_FACEBOOK}  title="Facebook"  label="Facebook"
                  hoverColor="hover:bg-blue-500/10 hover:text-blue-500"
                  icon={<svg viewBox="0 0 24 24" className="h-3 w-3 flex-shrink-0" fill="currentColor"><path d={ICON_FACEBOOK}/></svg>}
                />
                <SocialPill href={JKT_SPOTIFY}   title="Spotify"   label="Spotify"
                  hoverColor="hover:bg-green-500/10 hover:text-green-500"
                  icon={<svg viewBox="0 0 24 24" className="h-3 w-3 flex-shrink-0" fill="currentColor"><path d={ICON_SPOTIFY}/></svg>}
                />
              </div>
            </div>

            {/* JKT48 Stream GitHub */}
            <div className="space-y-2">
              <SectionDivider label="JKT48 Stream" />
              <div className="flex justify-center">
                <a
                  href={JKT_STREAM_GITHUB}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="JKT48 Stream GitHub"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5",
                    "bg-surface-hover text-xs font-medium text-muted-foreground",
                    "transition-all duration-200 hover:scale-105 hover:bg-foreground/10 hover:text-foreground",
                  )}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" fill="currentColor">
                    <path d={ICON_GITHUB} />
                  </svg>
                  GitHub
                </a>
              </div>
            </div>

            {/* Developer – BadutZY */}
            <div className="space-y-2">
              <SectionDivider label="BadutZY (Developer)" />
              <div className="flex justify-center gap-1">
                <SocialIcon href={BADUTZY_GITHUB}    title="GitHub"      hoverColor="hover:text-foreground"
                  icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d={ICON_GITHUB}/></svg>}
                />
                <SocialIcon href={BADUTZY_INSTAGRAM} title="Instagram"   hoverColor="hover:text-pink-500"
                  icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d={ICON_INSTAGRAM}/></svg>}
                />
                <SocialIcon href={BADUTZY_X}         title="X (Twitter)" hoverColor="hover:text-foreground"
                  icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d={ICON_X}/></svg>}
                />
                <SocialIcon href={BADUTZY_YOUTUBE}   title="YouTube"     hoverColor="hover:text-red-500"
                  icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d={ICON_YOUTUBE}/></svg>}
                />
                <SocialIcon href={BADUTZY_WEBSITE}   title="Website"     hoverColor="hover:text-primary"
                  icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>}
                />
              </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                © {new Date().getFullYear()} JKT48 Stream
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                Dibuat oleh{" "}
                <a
                  href={BADUTZY_WEBSITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-foreground/80 transition-colors hover:text-foreground"
                >
                  BadutZY
                </a>
              </p>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}