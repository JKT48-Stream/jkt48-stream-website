import { NavLink } from "react-router-dom";
import { Home, Cake, ListMusic, Theater, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", icon: Home, label: "Beranda", end: true },
  { to: "/member-live", icon: Radio, label: "Live" },
  { to: "/theater", icon: Theater, label: "Theater" },
  { to: "/member-birthdays", icon: Cake, label: "Ultah" },
  { to: "/playlists", icon: ListMusic, label: "Playlist" },
];

export function MobileBottomNav() {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-3 bottom-3 z-30 md:hidden animate-bottom-nav-in"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="glass flex items-center justify-around gap-1 rounded-full p-1.5 shadow-elevated shadow-[0_0_0_1px_hsl(var(--primary)/0.08),0_24px_50px_-18px_hsl(0_0%_0%/0.7)]">
        {items.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-smooth",
                isActive
                  ? "flex-[1.7] bg-neon text-primary-foreground shadow-neon"
                  : "text-muted-foreground active:scale-90",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5 flex-shrink-0" />
                {isActive && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}