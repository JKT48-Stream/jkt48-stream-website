import { useEffect, useMemo, useRef, useState } from "react";
import { members, getMemberPhoto } from "@/data/birthday-members";
import { MEMBERS } from "@/data/members";

const SEEN_KEY = "jkt48-splash-seen";
const COUNT = 9;
const CENTER = Math.floor(COUNT / 2);

const SPREAD_AT = 2550; // tumpukan sudah menyatu -> mulai menyebar
const PICK_AT = SPREAD_AT + 1500; // sebaran rapi selesai -> mulai memilih acak
const SETTLE_MS = 1100; // jeda setelah kartu terpilih sebelum masuk

type Phase = "shuffle" | "spread" | "pick";

function pickCards(count: number) {
  const pool = members.filter((m) => m.photo && m.photo.startsWith("/assets"));
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, count);
}

/** Satu kali "riffle shuffle": tumpukan dibelah dua lalu disisipkan selang-seling. */
function riffle(order: number[]) {
  const mid = Math.ceil(order.length / 2);
  const a = order.slice(0, mid);
  const b = order.slice(mid);
  const out: number[] = [];
  for (let i = 0; i < mid; i++) {
    if (b[i] !== undefined) out.push(b[i]);
    out.push(a[i]);
  }
  return out;
}

const SPACING = 12; // jarak antar kartu (vw)
const clampTilt = (v: number) => Math.max(-52, Math.min(52, v));

/** Posisi akhir tiap kartu saat menyebar (coverflow 3D yang simetris), dipakai keyframe splash-spread. */
function spreadVars(index: number): Record<string, number> {
  const o = index - CENTER;
  return {
    "--fx": o * SPACING,
    "--fz": -Math.abs(o) * 70,
    "--ry": clampTilt(-o * 26),
    "--ao": Math.abs(o),
  };
}

/**
 * Sorotan acak yang berjalan bolak-balik (ping-pong) dari tengah, makin lama makin lambat, lalu berhenti
 * tepat di kartu target. Berjalan 1 kartu per langkah agar kamera bisa mengikuti dengan mulus.
 */
function buildSweep(n: number, target: number) {
  const MIN = 14;
  let dir = Math.random() < 0.5 ? -1 : 1;
  let pos = CENTER;
  const path = [pos];
  while (path.length - 1 < MIN || pos !== target) {
    if (path.length > 40) break;
    if (pos + dir < 0 || pos + dir > n - 1) dir = -dir;
    pos += dir;
    path.push(pos);
  }
  const K = path.length - 1;
  return path.map((index, k) => ({ index, wait: Math.round(55 + 250 * Math.pow(k / K, 2.2)) }));
}

/**
 * Transform wajah kartu relatif terhadap kartu yang sedang disorot (h): kartu yang disorot menghadap lurus
 * ke depan, sisanya miring makin jauh dari tengah. Diawali rotateY(-ry) agar kompensasi miring bawaan
 * kartu, sehingga posisi horizontalnya tidak bergeser.
 */
function faceTransform(index: number, hot: number, picked: boolean) {
  const ry = clampTilt(-(index - CENTER) * 26);
  const d = index - hot;
  const z = -Math.abs(d) * 70 + Math.abs(index - CENTER) * 70 + (d === 0 ? (picked ? 220 : 150) : 0);
  const lift = d === 0 ? (picked ? -3 : -2.5) : 0;
  const scale = d === 0 ? (picked ? 1.22 : 1.12) : 1;
  return `rotateY(${-ry}deg) translate3d(0, ${lift}vh, ${z}px) rotateY(${clampTilt(-d * 26)}deg) scale(${scale})`;
}

/** Tombol dengan efek magnet halus (tanpa state React, langsung ke DOM agar ringan). */
function MagneticButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  const raf = useRef(0);

  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) * 0.3;
    const dy = (e.clientY - (r.top + r.height / 2)) * 0.3;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    });
  };
  const leave = () => {
    cancelAnimationFrame(raf.current);
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <button
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="splash-cta"
    >
      {children}
    </button>
  );
}

/** Intro layar penuh dengan kartu member 3D yang dikocok. Tampil sekali per sesi; bisa dilewati (klik/Enter/Esc). */
export function Splash({ onDone }: { onDone: () => void }) {
  const cards = useMemo(() => pickCards(COUNT), []);
  const n = cards.length;

  // Urutan tumpukan: awal -> kocok 1 -> kocok 2 (menentukan posisi z tiap kartu)
  const layout = useMemo(() => {
    const o0 = Array.from({ length: n }, (_, i) => i);
    const o1 = riffle(o0);
    const o2 = riffle(o1);
    const mid = Math.ceil(n / 2);
    return cards.map((_, c) => {
      const p1 = o1.indexOf(c);
      return { p0: c, p1, p2: o2.indexOf(c), s1: c < mid ? -1 : 1, s2: p1 < mid ? -1 : 1 };
    });
  }, [cards, n]);

  const reduce = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const target = useMemo(() => Math.floor(Math.random() * n), [n]);
  const sweep = useMemo(() => buildSweep(n, target), [n, target]);
  const totalMs = useMemo(() => PICK_AT + sweep.reduce((t, st) => t + st.wait, 0) + SETTLE_MS, [sweep]);

  const [phase, setPhase] = useState<Phase>(reduce ? "pick" : "shuffle");
  const [hot, setHot] = useState<number | null>(reduce ? target : null);
  const [picked, setPicked] = useState(reduce);
  const [camDur, setCamDur] = useState(500);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    window.setTimeout(onDone, 950);
  };

  useEffect(() => {
    const timers: number[] = [];
    const t = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

    if (reduce) {
      t(finish, 1400);
    } else {
      t(() => setPhase("spread"), SPREAD_AT);
      t(() => setPhase("pick"), PICK_AT);
      // sorotan acak yang makin melambat sampai berhenti di kartu target
      let at = PICK_AT;
      sweep.forEach((st, i) => {
        t(() => {
          setHot(st.index);
          setCamDur(Math.max(260, Math.min(560, Math.round(st.wait * 1.8))));
        }, at);
        at += st.wait;
        if (i === sweep.length - 1) t(() => setPicked(true), at);
      });
      t(finish, totalMs);
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") finish();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      cancelAnimationFrame(raf.current);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paralaks 3D mengikuti kursor (langsung ke DOM, 1x per frame)
  const onPointerMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType === "touch") return;
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      if (stageRef.current) stageRef.current.style.transform = `rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`;
    });
  };

  const word = "JKT48 STREAM · NONTON · LIVE · ";
  const rows = [
    { top: "6%", rev: false, dur: 38 },
    { top: "70%", rev: true, dur: 46 },
  ];

  const byPos = useMemo(() => {
    const arr: (typeof cards)[number][] = [];
    cards.forEach((m, c) => (arr[layout[c].p2] = m));
    return arr;
  }, [cards, layout]);
  const current = hot !== null ? byPos[hot] : undefined;

  return (
    <div
      className="splash"
      data-phase={phase}
      data-picked={picked}
      data-leaving={leaving}
      role="dialog"
      aria-label="Selamat datang di JKT48 Stream"
      onClick={finish}
      onPointerMove={onPointerMove}
    >
      {rows.map((r, i) => (
        <div
          key={i}
          className="splash-row"
          style={{ top: r.top, animation: `${r.rev ? "marquee-x-rev" : "marquee-x"} ${r.dur}s linear infinite` }}
          aria-hidden="true"
        >
          <span>{word.repeat(3)}</span>
          <span>{word.repeat(3)}</span>
        </div>
      ))}

      {/* Panggung 3D */}
      <div className="splash-scene" aria-hidden="true">
        <div className="splash-stage" ref={stageRef}>
          {/* Kamera: menggeser seluruh deretan kartu sehingga kartu yang disorot selalu di tengah layar */}
          <div
            className="splash-camera"
            style={{
              transform: `translate3d(${hot !== null ? -(hot - CENTER) * SPACING : 0}vw, 0, 0)`,
              ["--cam-dur" as string]: `${camDur}ms`,
            }}
          >
            {cards.map((m, c) => {
              const l = layout[c];
              return (
                <div
                  key={m.id}
                  className="splash-card"
                  style={{
                    ["--p0" as string]: l.p0,
                    ["--p1" as string]: l.p1,
                    ["--p2" as string]: l.p2,
                    ["--s1" as string]: l.s1,
                    ["--s2" as string]: l.s2,
                    ...spreadVars(l.p2),
                  }}
                >
                  <div
                    className="splash-face"
                    data-hot={hot === l.p2}
                    style={{ transform: hot !== null ? faceTransform(l.p2, hot, picked) : undefined }}
                  >
                    <img src={getMemberPhoto(m)} alt="" draggable={false} decoding="async" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Atas */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 sm:p-8">
        <span className="tech-label uppercase">JKT48 Stream</span>
        <span className="tech-label uppercase">{MEMBERS.length} member</span>
      </div>

      {/* Bawah */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 pb-7 sm:p-8 sm:pb-9">
        <div className="splash-title" data-show={phase !== "shuffle"}>
          <p className="tech-label uppercase opacity-80">
            {phase === "shuffle" ? "Mengocok kartu…" : picked ? "Oshi hari ini" : phase === "spread" ? "Menyebar kartu…" : "Memilih oshi…"}
          </p>
          <p className="font-display text-4xl font-extrabold leading-none sm:text-6xl" key={current?.id ?? "wait"}>
            {current?.nickname ?? "\u00A0"}
          </p>
        </div>
        <MagneticButton onClick={finish}>Masuk</MagneticButton>
      </div>

      {/* Progress otomatis masuk */}
      {!reduce && <div className="splash-progress" style={{ animationDuration: `${totalMs}ms` }} aria-hidden="true" />}
    </div>
  );
}

export function shouldShowSplash(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) !== "1";
  } catch {
    return false;
  }
}