import { NavLink } from "react-router-dom";
import { Home, Flame, ListMusic, Bookmark, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", icon: Home, label: "Beranda", end: true },
  { to: "/trending", icon: Flame, label: "Trending" },
  { to: "/member-live", icon: Radio, label: "Member Live" },
  { to: "/playlists", icon: ListMusic, label: "Playlist" },
  { to: "/saved", icon: Bookmark, label: "Tersimpan" },
];

export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t border-border bg-background/95 backdrop-blur md:hidden animate-bottom-nav-in">
      {items.map(({ to, icon: Icon, label, end }, i) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          style={{ animationDelay: `${i * 60}ms` }}
          className={({ isActive }) =>
            cn(
              "bottom-nav-item flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium animate-fade-in-up",
              isActive ? "text-primary active" : "text-muted-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <Icon
                  className={cn(
                    "bottom-nav-icon h-5 w-5",
                    "transition-transform duration-250 ease-spring",
                    isActive ? "scale-115" : "",
                  )}
                  style={{ transform: isActive ? "scale(1.15)" : "scale(1)" }}
                />
              </div>
              <span
                className={cn(
                  "transition-all duration-200",
                  isActive ? "font-semibold" : "",
                )}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}