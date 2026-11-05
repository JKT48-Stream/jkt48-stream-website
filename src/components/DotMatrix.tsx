import { useEffect, useMemo, useRef, useState } from "react";

type Item = { el: HTMLElement; cx: number; cy: number; x: number; y: number; vx: number; vy: number };

const RADIUS = 3.8; // jangkauan dorongan (dalam satuan lebar kotak)
const PUSH = 1.25; // dorongan maksimum (dalam satuan lebar kotak)
const STIFFNESS = 0.16; // kekencangan pegas
const DAMPING = 0.74; // redaman (makin kecil = makin membal)

// Font 5x7 untuk huruf yang dipakai wordmark.
const GLYPHS: Record<string, string[]> = {
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

type Props = {
  text: string;
  /** Jumlah huruf pertama yang berwarna putih/foreground; sisanya merah. */
  plainCount?: number;
  gap?: number;
  animate?: boolean;
  className?: string;
};

/**
 * Wordmark kotak-kotak ala grafik kontribusi GitHub (sudut sedikit melengkung, bukan bulat).
 * Dibangun dari grid 5x7 per huruf.
 *  - Hover: kotak yang menyala di dekat kursor TERDORONG menjauh (tolakan radial) lalu kembali dengan pegas
 *    yang sedikit membal, sehingga huruf melengkung mengikuti kursor. Fisika berjalan di satu loop rAF
 *    dan hanya mengubah transform, jadi ringan; loop berhenti sendiri saat semua kotak sudah diam.
 *  - Klik: gelombang riak menyebar dari kotak yang diklik.
 *  - Animasi masuk baru berjalan saat wordmark terlihat di layar (IntersectionObserver).
 */
export function DotMatrix({ text, plainCount = 0, gap = 5, animate = false, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!animate);
  const chars = text.toUpperCase().split("");
  const cols = chars.length * 6 - 1;

  const cells = useMemo(() => {
    const out: { on: 0 | 1 | 2; d: number }[] = [];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < cols; c++) {
        const ci = Math.floor(c / 6);
        const within = c % 6;
        const ch = chars[ci];
        const g = GLYPHS[ch] ?? GLYPHS[" "];
        const lit = within < 5 && g[r][within] === "1";
        out.push({ on: lit ? (ci < plainCount ? 1 : 2) : 0, d: c * 16 + r * 12 });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, plainCount]);

  useEffect(() => {
    if (!animate) return;
    const el = rootRef.current;
    if (!el || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animate]);

  // ── Fisika tolakan kursor (hanya kotak yang menyala) ──
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const items = useRef<Item[]>([]);
  const raf = useRef(0);
  const pitch = useRef(10);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reduce) return;

    const measure = () => {
      const lit = root.querySelectorAll<HTMLElement>("span[data-on]");
      items.current = Array.from(lit, (el) => ({
        el,
        cx: el.offsetLeft + el.offsetWidth / 2,
        cy: el.offsetTop + el.offsetHeight / 2,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
      }));
      pitch.current = root.clientWidth / cols;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);

    const tick = () => {
      const p = pointer.current;
      const unit = pitch.current;
      const R = RADIUS * unit;
      const maxPush = PUSH * unit;
      let moving = false;

      for (const it of items.current) {
        let tx = 0;
        let ty = 0;
        if (p) {
          const dx = it.cx - p.x;
          const dy = it.cy - p.y;
          const d = Math.hypot(dx, dy);
          if (d < R) {
            const f = (1 - d / R) ** 2 * maxPush;
            const soft = d / (d + 0.6 * unit); // hindari lonjakan saat kursor tepat di atas kotak
            const inv = d > 0.001 ? 1 / d : 0;
            tx = dx * inv * f * soft * 1.6;
            ty = dy * inv * f * soft * 1.6;
          }
        }
        it.vx = (it.vx + (tx - it.x) * STIFFNESS) * DAMPING;
        it.vy = (it.vy + (ty - it.y) * STIFFNESS) * DAMPING;
        it.x += it.vx;
        it.y += it.vy;

        if (Math.abs(it.x) < 0.02 && Math.abs(it.y) < 0.02 && Math.abs(it.vx) < 0.02 && Math.abs(it.vy) < 0.02 && !p) {
          if (it.x !== 0 || it.y !== 0) {
            it.x = it.y = it.vx = it.vy = 0;
            it.el.style.transform = "";
          }
        } else {
          moving = true;
          it.el.style.transform = `translate3d(${it.x.toFixed(2)}px, ${it.y.toFixed(2)}px, 0)`;
        }
      }
      raf.current = moving || pointer.current ? requestAnimationFrame(tick) : 0;
    };

    const wake = () => {
      if (!raf.current) raf.current = requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = root.getBoundingClientRect();
      pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      wake();
    };
    const leave = () => {
      pointer.current = null;
      wake();
    };
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerleave", leave);
    return () => {
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
      ro.disconnect();
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [cols, text, plainCount]);

  const ripple = (e: React.PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    const idx = Number((e.target as HTMLElement).dataset.i);
    if (!root || Number.isNaN(idx)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r0 = Math.floor(idx / cols);
    const c0 = idx % cols;
    const kids = root.children;
    for (let i = 0; i < kids.length; i++) {
      const dist = Math.hypot(Math.floor(i / cols) - r0, (i % cols) - c0);
      if (dist > 16) continue;
      (kids[i] as HTMLElement).animate(
        [
          { scale: 1 },
          { scale: 1.7, offset: 0.35 },
          { scale: 1 },
        ],
        { duration: 560, delay: dist * 32, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }
  };

  return (
    <div
      ref={rootRef}
      className={["dotmatrix", className].filter(Boolean).join(" ")}
      data-animate={animate}
      data-visible={visible}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, ["--dm-gap" as string]: `${gap}px` }}
      role="img"
      aria-label={text}
      onPointerDown={ripple}
    >
      {cells.map((c, i) => (
        <span key={i} data-i={i} data-on={c.on || undefined} style={{ ["--d" as string]: `${c.d}ms` }} />
      ))}
    </div>
  );
}