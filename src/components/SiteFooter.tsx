import { Link } from "react-router-dom";
import { DotMatrix } from "@/components/DotMatrix";

const LINKS = [
  { to: "/", label: "Beranda" },
  { to: "/member-live", label: "Member Live" },
  { to: "/theater", label: "Theater" },
  { to: "/member-birthdays", label: "Ulang Tahun" },
  { to: "/playlists", label: "Playlist" },
];

export function SiteFooter() {
  return (
    <footer className="px-3 pb-6 pt-10 sm:px-6">
      <div className="panel hud spotlight overflow-hidden p-6 sm:p-8">
        <span className="hud-c tl" /><span className="hud-c tr" /><span className="hud-c bl" /><span className="hud-c br" />
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <p className="font-display text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl">
              Nonton JKT48,
              <br />
              <span className="text-neon">tanpa ribet.</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Video resmi, siaran langsung member, dan jadwal theater di satu tempat. Dibuat oleh penggemar, untuk penggemar.
            </p>
          </div>
          <nav aria-label="Tautan footer" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="text-muted-foreground transition-all duration-200 hover:translate-x-1 hover:text-primary">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 overflow-hidden">
          <DotMatrix text="JKT48STREAM" plainCount={5} gap={4} animate className="w-full" />
        </div>

        <div className="tech-label mt-6 flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
          <span>© {new Date().getFullYear()} JKT48 Stream · situs penggemar tidak resmi</span>
          <span>
            Dibuat oleh{" "}
            <a href="https://badutzy.vercel.app" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary">
              BadutZY
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}