import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  MEMBERS,
  JKT48_OFFICIAL,
  getMemberPhotoUrl,
  TEAM_BADGE_COLORS,
  type Member,
  type Team,
} from "@/data/members";

type LiveStatus = "checking" | "live" | "offline";
type Platform = "idn" | "showroom";
interface MemberStatus {
  memberId: string;
  idn: LiveStatus; showroom: LiveStatus;
  idnUrl: string | null; showroomUrl: string | null;
  idnStreamUrl: string | null; showroomStreamUrl: string | null; showroomStreamUrlLow: string | null;
  idnSlug: string | null;
}
type UrlQuality = { label: string; url: string };
const IconRefresh = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
const IconSearch = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const IconClose = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IconSearchEmpty = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 text-muted-foreground/30"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>;
const IconPlay = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>;
const IconExternalLink = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>;
const SignalWave = ({ active }: { active: boolean }) => (
  <div className="flex items-end gap-[3px] h-5">
    {[0.4, 0.65, 1, 0.65, 0.4].map((h, i) => (
      <div key={i} className="w-[3px] rounded-full transition-all duration-500" style={{ height: `${h * 20}px`, background: active ? "hsl(0,80%,60%)" : "hsl(0,20%,28%)", animation: active ? `signalPulse 1.2s ease-in-out ${i * 0.12}s infinite` : "none" }} />
    ))}
    <style>{`@keyframes signalPulse{0%,100%{transform:scaleY(1);opacity:1}50%{transform:scaleY(0.4);opacity:0.5}}`}</style>
  </div>
);

// ─── Loading Section: Memeriksa semua member (inline, always visible) ─────────
const MemberCheckingSection = () => {
  const totalMembers = MEMBERS.length;
  const bars = [0.5, 0.75, 1, 0.6, 0.85, 0.45, 0.9, 0.7, 1, 0.55, 0.8, 0.65, 0.95, 0.5, 0.75];

  return (
    <div className="w-full">
      <style>{`
        @keyframes eq-bar {
          0%, 100% { transform: scaleY(0.3); opacity: 0.45; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes live-ping {
          0% { transform: scale(1); opacity: 0.8; }
          70%, 100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes checking-shimmer {
          0% { background-position: -300% center; }
          100% { background-position: 300% center; }
        }
        @keyframes skeleton-wave {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes float-up {
          0%, 100% { transform: translateY(0px); opacity: 0.6; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
        }
        @keyframes radar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes radar-pulse {
          0%, 100% { opacity: 0.15; transform: scale(0.95); }
          50% { opacity: 0.35; transform: scale(1.05); }
        }
        .skeleton-card {
          background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted)/0.7) 50%, hsl(var(--muted)) 75%);
          background-size: 400px 100%;
          animation: skeleton-wave 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* ── Hero loading panel ── */}
      <div
        className="relative w-full rounded-2xl mb-6 overflow-hidden flex flex-col items-center justify-center py-12 px-6 text-center"
        style={{
          background: "var(--color-card, hsl(var(--card)))",
          border: "1px solid hsl(var(--border))",
          minHeight: "260px",
        }}
      >
        {/* Background radar rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[1, 1.6, 2.2, 2.8].map((scale, i) => (
            <div
              key={i}
              className="absolute rounded-full border"
              style={{
                width: `${scale * 80}px`,
                height: `${scale * 80}px`,
                borderColor: `hsl(0,70%,50%,${0.18 - i * 0.04})`,
                animation: `radar-pulse ${2 + i * 0.4}s ease-in-out ${i * 0.3}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Glow blobs */}
        <div className="absolute -top-10 -left-10 w-56 h-56 rounded-full blur-[80px] pointer-events-none"
          style={{ background: "hsl(0,80%,40%)", opacity: 0.12 }} />
        <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full blur-[70px] pointer-events-none"
          style={{ background: "hsl(350,70%,38%)", opacity: 0.1 }} />

        {/* Top shimmer border */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent 0%, hsl(0,85%,55%) 30%, hsl(20,90%,65%) 50%, hsl(0,85%,55%) 70%, transparent 100%)",
            backgroundSize: "300% auto",
            animation: "checking-shimmer 2.5s linear infinite",
          }} />

        {/* Center: radar icon */}
        <div className="relative mb-5 flex items-center justify-center" style={{ width: 72, height: 72 }}>
          {/* Ping ring */}
          <div className="absolute w-full h-full rounded-full border-2"
            style={{ borderColor: "hsl(0,75%,55%,0.5)", animation: "live-ping 1.8s ease-out infinite" }} />
          {/* Inner circle */}
          <div className="relative w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: "radial-gradient(circle at 35% 35%, hsl(0,85%,58%), hsl(0,70%,35%) 60%, hsl(0,50%,18%))",
              boxShadow: "0 0 28px hsl(0,80%,50%,0.5), 0 0 60px hsl(0,70%,40%,0.2)",
            }}>
            {/* Spinning radar sweep */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute inset-0 rounded-full"
                style={{
                  background: "conic-gradient(from 0deg, transparent 60%, hsl(0,90%,75%,0.6) 100%)",
                  animation: "radar-spin 1.5s linear infinite",
                }} />
            </div>
            {/* Icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="relative z-10" style={{ width: 26, height: 26 }}>
              <circle cx="12" cy="12" r="2" fill="white" stroke="none" />
              <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
              <path d="M7.76 7.76a6 6 0 0 0 0 8.49" />
              <path d="M20.66 3.34a12 12 0 0 1 0 16.97" />
              <path d="M3.34 3.34a12 12 0 0 0 0 16.97" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="mb-1 text-base font-black tracking-wide"
          style={{
            background: "linear-gradient(90deg, hsl(0,80%,72%), hsl(20,90%,68%), hsl(0,80%,72%))",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "checking-shimmer 3s linear infinite",
          }}>
          Memeriksa Status Member
        </div>

        {/* Subtitle */}
        <p className="text-xs mb-6" style={{ color: "hsl(var(--muted-foreground))" }}>
          Memuat data IDN Live & Showroom untuk {totalMembers} member…
        </p>

        {/* Equalizer bars */}
        <div className="flex items-end gap-[3px] mb-5" style={{ height: 36 }}>
          {bars.map((h, i) => (
            <div key={i} className="w-[4px] rounded-full origin-bottom"
              style={{
                height: `${h * 36}px`,
                background: `linear-gradient(to top, hsl(0,80%,40%), hsl(0,85%,62%))`,
                animation: `eq-bar ${0.9 + (i % 4) * 0.15}s ease-in-out ${(i * 0.07).toFixed(2)}s infinite`,
              }} />
          ))}
        </div>

        {/* Dot wave */}
        <div className="flex items-center gap-2">
          {[0, 0.18, 0.36, 0.54, 0.72].map((delay, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full"
              style={{
                background: `hsl(0,${65 + i * 5}%,${52 + i * 4}%)`,
                animation: `dot-bounce 1.3s ease-in-out ${delay}s infinite`,
              }} />
          ))}
        </div>

        {/* Bottom shimmer strip */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent 0%, hsl(350,75%,45%) 50%, transparent 100%)",
            backgroundSize: "300% auto",
            animation: "checking-shimmer 2.5s linear 1.25s infinite",
          }} />
      </div>

      {/* ── Skeleton member grid ── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1" style={{ background: "linear-gradient(90deg,hsl(var(--border)),transparent)" }} />
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: "hsl(0,40%,40%)" }}>Member</span>
        <div className="h-px flex-1" style={{ background: "linear-gradient(90deg,transparent,hsl(var(--border)))" }} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden border"
            style={{
              background: "hsl(var(--muted))",
              borderColor: "hsl(var(--border))",
              animationDelay: `${i * 0.05}s`,
            }}>
            {/* Photo area skeleton */}
            <div className="skeleton-card" style={{ aspectRatio: "3/4", animationDelay: `${i * 0.08}s` }} />
            {/* Text skeleton */}
            <div className="p-3 flex flex-col gap-2">
              <div className="skeleton-card h-3.5 w-3/4 rounded-full" style={{ animationDelay: `${i * 0.08 + 0.1}s` }} />
              <div className="skeleton-card h-7 w-full rounded-xl" style={{ animationDelay: `${i * 0.08 + 0.2}s` }} />
              <div className="skeleton-card h-7 w-full rounded-xl" style={{ animationDelay: `${i * 0.08 + 0.3}s` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const OfficialCard = ({
  status,
  onWatchIdn,
  onWatchShowroom,
  onOpenIdn,
  onOpenShowroom,
  loadingIdn,
  loadingShowroom,
}: {
  status: MemberStatus;
  onWatchIdn: () => void;
  onWatchShowroom: () => void;
  onOpenIdn: () => void;
  onOpenShowroom: () => void;
  loadingIdn: boolean;
  loadingShowroom: boolean;
}) => {
  const isIdnLive = status.idn === "live";
  const isShowroomLive = status.showroom === "live";
  const isAnyLive = isIdnLive || isShowroomLive;
  const isChecking = status.idn === "checking" || status.showroom === "checking";

  return (
    <div
      className="relative w-full rounded-2xl mb-8 transition-all duration-700"
      style={{
        background: "hsl(var(--card))",
        border: `1px solid ${isAnyLive ? "hsl(0,65%,45%,0.55)" : "hsl(var(--border))"}`,
        boxShadow: isAnyLive
          ? "0 0 0 1px hsl(0,60%,40%,0.15), 0 0 60px hsl(0,70%,30%,0.25), 0 16px 48px rgba(0,0,0,0.5)"
          : "0 8px 32px hsl(var(--border)/0.3)",
      }}
    >
      {/* Animated shimmer top border */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: isAnyLive
            ? "linear-gradient(90deg,transparent 0%,hsl(0,85%,55%) 35%,hsl(20,95%,68%) 50%,hsl(0,85%,55%) 65%,transparent 100%)"
            : "linear-gradient(90deg,transparent 0%,hsl(var(--border)) 50%,transparent 100%)",
        }}
      />

      {/* Subtle background glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-12 -left-8 w-64 h-64 rounded-full opacity-10 blur-[80px] transition-opacity duration-700"
          style={{ background: "hsl(0,80%,50%)", opacity: isAnyLive ? 0.15 : 0.04 }}
        />
        <div
          className="absolute -bottom-8 -right-8 w-48 h-48 rounded-full blur-[70px] transition-opacity duration-700"
          style={{ background: "hsl(350,70%,45%)", opacity: isAnyLive ? 0.12 : 0.03 }}
        />
      </div>

      <div className="relative flex flex-col sm:flex-row items-center sm:items-stretch gap-0">
        {/* Left: Logo band */}
        <div
          className="relative flex-shrink-0 flex items-center justify-center sm:w-40 w-full py-6 sm:py-0"
          style={{
            background: "hsl(var(--muted))",
            borderRight: "1px solid hsl(var(--border))",
          }}
        >
          <div
            className="relative w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center"
            style={{
              background: "hsl(var(--muted))",
              border: `2px solid ${isAnyLive ? "hsl(0,60%,45%,0.5)" : "hsl(var(--border))"}`,
              boxShadow: isAnyLive ? "0 0 24px hsl(0,70%,40%,0.35)" : "none",
            }}
          >
            <img
              src="/logo.jpg"
              alt="JKT48"
              className="w-full h-full object-cover"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = "none";
                t.parentElement!.innerHTML = '<span style="font-size:28px;font-weight:900;color:hsl(0,70%,65%)">48</span>';
              }}
            />
          </div>
          {isAnyLive && (
            <div
              className="absolute top-3 right-3 sm:top-auto sm:bottom-4 sm:right-4 flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: "hsl(0,75%,44%)", boxShadow: "0 0 10px hsl(0,75%,44%,0.7)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" style={{ animation: "ping 0.9s cubic-bezier(0,0,0.2,1) infinite" }} />
              <span className="text-white text-[9px] font-black tracking-[0.15em]">LIVE</span>
            </div>
          )}
          {isChecking && !isAnyLive && (
            <div className="absolute top-3 right-3 sm:top-auto sm:bottom-4 sm:right-4 flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
              <span className="text-muted-foreground text-[9px]">Cek…</span>
            </div>
          )}
        </div>

        {/* Center: Info */}
        <div className="flex-1 flex flex-col justify-center gap-1.5 px-5 py-4 sm:py-5 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span
              className="text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded"
              style={{
                background: "hsl(0,55%,40%,0.2)",
                color: "hsl(0,65%,60%)",
                border: "1px solid hsl(0,55%,40%,0.3)",
              }}
            >
              Akun Resmi
            </span>
            {isAnyLive && <SignalWave active />}
          </div>
          <h2
            className="text-2xl sm:text-3xl font-black tracking-tight leading-none"
            style={{
              color: isAnyLive ? "#fff" : "hsl(var(--foreground))",
            }}
          >
            JKT48
          </h2>
          <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
            {isAnyLive
              ? "Akun resmi JKT48 sedang live. klik untuk menonton!"
              : "Pantau live stream resmi JKT48 di IDN Live & Showroom"}
          </p>
        </div>

        {/* Right: Platform buttons */}
        <div
          className="flex-shrink-0 flex flex-row sm:flex-col justify-center gap-2 px-4 sm:px-5 py-4 sm:py-5 sm:border-l w-full sm:w-auto"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          {/* IDN button */}
          {isIdnLive ? (
            <button
              onClick={onWatchIdn}
              disabled={loadingIdn || loadingShowroom}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 font-bold text-xs transition-all duration-200 active:scale-95 disabled:opacity-60 sm:min-w-[160px]"
              style={{
                background: "linear-gradient(135deg,hsl(0,80%,50%),hsl(0,70%,37%))",
                color: "#fff",
                boxShadow: "0 4px 18px hsl(0,70%,40%,0.45)",
              }}
            >
              {loadingIdn
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Memuat…</>
                : <><IconPlay />Tonton IDN Live</>}
            </button>
          ) : (
            <button
              onClick={onOpenIdn}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs transition-all duration-200 active:scale-95 hover:opacity-80 sm:min-w-[160px]"
              style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
              IDN {isChecking ? "Cek…" : "Offline"}
              <IconExternalLink />
            </button>
          )}

          {/* Showroom button */}
          {isShowroomLive ? (
            <button
              onClick={onWatchShowroom}
              disabled={loadingIdn || loadingShowroom}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 font-bold text-xs transition-all duration-200 active:scale-95 disabled:opacity-60 sm:min-w-[160px]"
              style={{
                background: "linear-gradient(135deg,hsl(0,65%,48%),hsl(0,55%,34%))",
                color: "#fff",
                boxShadow: "0 4px 18px hsl(0,60%,38%,0.4)",
              }}
            >
              {loadingShowroom
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Memuat…</>
                : <><IconPlay />Tonton Showroom</>}
            </button>
          ) : (
            <button
              onClick={onOpenShowroom}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs transition-all duration-200 active:scale-95 hover:opacity-80 sm:min-w-[160px]"
              style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
              Showroom {isChecking ? "Cek…" : "Offline"}
              <IconExternalLink />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const MemberCard = ({ member, status, onWatch, onOpenProfile, isLoadingStream }: { member: Member; status: MemberStatus; onWatch: (p: Platform) => void; onOpenProfile: (p: Platform) => void; isLoadingStream: Platform | null }) => {
  const isIdnLive = status.idn === "live"; const isShowroomLive = status.showroom === "live"; const isAnyLive = isIdnLive || isShowroomLive; const isChecking = status.idn === "checking" || status.showroom === "checking"; const badgeClass = TEAM_BADGE_COLORS[member.team];
  return (
    <div className="relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-500" style={{ background: "hsl(var(--card))", borderColor: isAnyLive ? "hsl(0,70%,50%,0.45)" : "hsl(var(--border))", boxShadow: isAnyLive ? "0 0 32px hsl(0,70%,40%,0.14)" : "none" }}>
      {isAnyLive && <div className="absolute top-0 left-0 right-0 h-[2px] z-10" style={{ background: "linear-gradient(90deg,transparent 0%,hsl(0,80%,55%) 50%,transparent 100%)" }} />}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/4" }}>
        <img src={getMemberPhotoUrl(member)} alt={member.name} className="w-full h-full object-cover object-top" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = "/logo.jpg"; }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,transparent 50%,hsl(var(--card)) 100%)" }} />
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeClass}`}>{member.team}</div>
        {isAnyLive && <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-red-600 shadow-lg"><span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /><span className="text-white text-[9px] font-black tracking-widest">LIVE</span></div>}
        {isChecking && !isAnyLive && <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/50"><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" /><span className="text-muted-foreground text-[9px]">Cek…</span></div>}
        {isAnyLive && <div className="absolute bottom-2 left-2"><SignalWave active /></div>}
      </div>
      <div className="p-3 flex flex-col gap-2">
        <p className="text-sm font-semibold text-foreground leading-tight truncate">{member.name}</p>
        <div className="flex flex-col gap-1.5">
          {member.idnUsername && (isIdnLive ? <button onClick={() => onWatch("idn")} disabled={isLoadingStream !== null} className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-2 px-3 font-bold text-xs transition-all duration-200 active:scale-95 disabled:opacity-70" style={{ background: "linear-gradient(135deg,hsl(0,80%,50%),hsl(0,70%,38%))", color: "#fff", boxShadow: "0 4px 16px hsl(0,70%,40%,0.4)" }}>{isLoadingStream === "idn" ? <><span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />Memuat…</> : <><IconPlay />Tonton IDN Live</>}</button> : <button onClick={() => onOpenProfile("idn")} className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs transition-all duration-200 active:scale-95 hover:opacity-80" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />IDN Live Offline <IconExternalLink /></button>)}
          {member.showroomKey && (isShowroomLive ? <button onClick={() => onWatch("showroom")} disabled={isLoadingStream !== null} className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-2 px-3 font-bold text-xs transition-all duration-200 active:scale-95 disabled:opacity-70" style={{ background: "linear-gradient(135deg,hsl(0,65%,50%),hsl(0,55%,35%))", color: "#fff", boxShadow: "0 4px 16px hsl(0,60%,40%,0.35)" }}>{isLoadingStream === "showroom" ? <><span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />Memuat…</> : <><IconPlay />Tonton Showroom</>}</button> : <button onClick={() => onOpenProfile("showroom")} className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs transition-all duration-200 active:scale-95 hover:opacity-80" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />Showroom Offline <IconExternalLink /></button>)}
        </div>
      </div>
    </div>
  );
};

const TEAMS: (Team | "Semua")[] = ["Semua", "Team Love", "Team Dream", "Team Passion", "Trainee"];
const LIVE_FILTERS = ["Semua", "Sedang Live", "Offline"] as const;
type LiveFilter = typeof LIVE_FILTERS[number];

// ─── Helper: build default status map ────────────────────────────────────────
function buildDefaultStatuses(liveStatus: LiveStatus = "checking"): Map<string, MemberStatus> {
  return new Map(
    MEMBERS.map(m => [m.id, {
      memberId: m.id,
      idn: liveStatus as LiveStatus,
      showroom: liveStatus as LiveStatus,
      idnUrl: null, showroomUrl: null,
      idnStreamUrl: null, showroomStreamUrl: null, showroomStreamUrlLow: null,
      idnSlug: null,
    }])
  );
}

const MemberLivePage = () => {
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<Map<string, MemberStatus>>(() => buildDefaultStatuses("checking"));
  const [loadingPlayer, setLoadingPlayer] = useState<{ memberId: string; platform: Platform } | null>(null);
  const [officialStatus, setOfficialStatus] = useState<MemberStatus>({
    memberId: JKT48_OFFICIAL.id,
    idn: "checking", showroom: "checking",
    idnUrl: null, showroomUrl: null,
    idnStreamUrl: null, showroomStreamUrl: null, showroomStreamUrlLow: null,
    idnSlug: null,
  });
  const [officialLoading, setOfficialLoading] = useState<Platform | null>(null);
  const [teamFilter, setTeamFilter] = useState<Team | "Semua">("Semua");
  const [liveFilter, setLiveFilter] = useState<LiveFilter>("Semua");
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ─── BULK CHECK: IDN + Showroom sekaligus untuk semua member ──────────────
  const checkAll = useCallback(async () => {
    setIsRefreshing(true);

    // Reset semua ke "checking"
    setStatuses(buildDefaultStatuses("checking"));
    setOfficialStatus(prev => ({
      ...prev,
      idn: "checking", showroom: "checking",
      idnUrl: null, showroomUrl: null,
      idnStreamUrl: null, showroomStreamUrl: null, showroomStreamUrlLow: null,
      idnSlug: null,
    }));

    // Kumpulkan semua username IDN & showroom key (member + official)
    const allMembers = MEMBERS;
    const idnUsernames = [
      ...(JKT48_OFFICIAL.idnUsername ? [JKT48_OFFICIAL.idnUsername] : []),
      ...allMembers.filter(m => m.idnUsername).map(m => m.idnUsername as string),
    ];
    const showroomKeys = [
      ...(JKT48_OFFICIAL.showroomKey ? [JKT48_OFFICIAL.showroomKey] : []),
      ...allMembers.filter(m => m.showroomKey).map(m => m.showroomKey as string),
    ];

    // ── Fire IDN bulk + Showroom bulk SECARA PARALEL ──────────────────────
    const [idnBulkResult, showroomBulkResult] = await Promise.allSettled([
      supabase.functions.invoke("check-idn-live-bulk", { body: { usernames: idnUsernames } }),
      supabase.functions.invoke("check-showroom-live-bulk", { body: { room_url_keys: showroomKeys } }),
    ]);

    // ── Proses hasil IDN ──────────────────────────────────────────────────
    const idnMap = new Map<string, any>(); // username -> result
    if (idnBulkResult.status === "fulfilled" && !idnBulkResult.value.error) {
      const results: any[] = idnBulkResult.value.data?.results ?? [];
      for (const r of results) {
        if (r?.username) idnMap.set(r.username.toLowerCase(), r);
      }
    }

    // ── Proses hasil Showroom ─────────────────────────────────────────────
    const showroomMap = new Map<string, any>(); // room_url_key -> result
    if (showroomBulkResult.status === "fulfilled" && !showroomBulkResult.value.error) {
      const results: any[] = showroomBulkResult.value.data?.results ?? [];
      for (const r of results) {
        if (r?.room_url_key) showroomMap.set(r.room_url_key.toLowerCase(), r);
      }
    }

    // ── Update status OFFICIAL ────────────────────────────────────────────
    const officialIdnData = JKT48_OFFICIAL.idnUsername
      ? idnMap.get(JKT48_OFFICIAL.idnUsername.toLowerCase())
      : null;
    const officialShowroomData = JKT48_OFFICIAL.showroomKey
      ? showroomMap.get(JKT48_OFFICIAL.showroomKey.toLowerCase())
      : null;

    const officialUpdates: Partial<MemberStatus> = {};
    if (officialIdnData) {
      officialUpdates.idn = officialIdnData.is_live ? "live" : "offline";
      officialUpdates.idnUrl = officialIdnData.live_url ?? `https://www.idn.app/${JKT48_OFFICIAL.idnUsername}`;
      officialUpdates.idnStreamUrl = officialIdnData.stream_url ?? null;
      const slugMatch = officialIdnData.live_url?.match(/\/live\/([\w-]+)/);
      officialUpdates.idnSlug = slugMatch ? slugMatch[1] : null;
    } else {
      officialUpdates.idn = "offline";
    }
    if (officialShowroomData) {
      officialUpdates.showroom = officialShowroomData.is_live ? "live" : "offline";
      officialUpdates.showroomUrl = officialShowroomData.is_live
        ? `https://www.showroom-live.com/r/${JKT48_OFFICIAL.showroomKey}`
        : `https://www.showroom-live.com/room/profile?room_id=${JKT48_OFFICIAL.showroomRoomId}`;
      officialUpdates.showroomStreamUrl = officialShowroomData.stream_url ?? null;
      officialUpdates.showroomStreamUrlLow = officialShowroomData.stream_url_low ?? null;
    } else {
      officialUpdates.showroom = "offline";
    }
    setOfficialStatus(prev => ({ ...prev, ...officialUpdates }));

    // ── Update status SEMUA MEMBER sekaligus ──────────────────────────────
    setStatuses(() => {
      const next = new Map<string, MemberStatus>();
      for (const member of allMembers) {
        const idnData = member.idnUsername
          ? idnMap.get(member.idnUsername.toLowerCase())
          : null;
        const showroomData = member.showroomKey
          ? showroomMap.get(member.showroomKey.toLowerCase())
          : null;

        const idnStatus: LiveStatus = !member.idnUsername
          ? "offline"
          : idnData
            ? (idnData.is_live ? "live" : "offline")
            : "offline";

        const showroomStatus: LiveStatus = !member.showroomKey
          ? "offline"
          : showroomData
            ? (showroomData.is_live ? "live" : "offline")
            : "offline";

        const idnSlug = idnData?.live_url?.match(/\/live\/([\w-]+)/)?.[1] ?? null;

        next.set(member.id, {
          memberId: member.id,
          idn: idnStatus,
          showroom: showroomStatus,
          idnUrl: idnData?.live_url ?? (member.idnUsername ? `https://www.idn.app/${member.idnUsername}` : null),
          showroomUrl: showroomData?.is_live
            ? `https://www.showroom-live.com/r/${member.showroomKey}`
            : (member.showroomRoomId ? `https://www.showroom-live.com/room/profile?room_id=${member.showroomRoomId}` : null),
          idnStreamUrl: idnData?.stream_url ?? null,
          showroomStreamUrl: showroomData?.stream_url ?? null,
          showroomStreamUrlLow: showroomData?.stream_url_low ?? null,
          idnSlug,
        });
      }
      return next;
    });

    setIsRefreshing(false);
  }, []);

  useEffect(() => { checkAll(); }, [checkAll]);

  const goToStream = (member: Member, platform: Platform, streamUrl: string, liveUrl: string, qualities: UrlQuality[] = []) => {
    const p = new URLSearchParams({ memberId: member.id, platform, streamUrl: encodeURIComponent(streamUrl), liveUrl: encodeURIComponent(liveUrl) });
    if (qualities.length > 0) p.set("qualities", encodeURIComponent(JSON.stringify(qualities)));
    navigate(`/stream?${p.toString()}`);
  };

  const handleWatchIDN = useCallback(async (member: Member) => {
    const status = statuses.get(member.id)!; const profileUrl = `https://www.idn.app/${member.idnUsername}`;
    if (status.idnStreamUrl) { goToStream(member, "idn", status.idnStreamUrl, status.idnUrl ?? profileUrl); return; }
    if (status.idnSlug) { setLoadingPlayer({ memberId: member.id, platform: "idn" }); try { const { data, error } = await supabase.functions.invoke("get-idn-stream", { body: { username: member.idnUsername, slug: status.idnSlug } }); if (!error && data?.stream_url) { goToStream(member, "idn", data.stream_url, status.idnUrl ?? profileUrl); } else { window.open(status.idnUrl ?? profileUrl, "_blank"); } } catch { window.open(status.idnUrl ?? profileUrl, "_blank"); } finally { setLoadingPlayer(null); } return; }
    window.open(status.idnUrl ?? profileUrl, "_blank");
  }, [statuses, navigate]);

  const handleWatchShowroom = useCallback(async (member: Member) => {
    const status = statuses.get(member.id)!; const profileUrl = `https://www.showroom-live.com/room/profile?room_id=${member.showroomRoomId}`;
    if (status.showroomStreamUrl) { const quals: UrlQuality[] = [{ label: "Tinggi", url: status.showroomStreamUrl }]; if (status.showroomStreamUrlLow && status.showroomStreamUrlLow !== status.showroomStreamUrl) quals.push({ label: "Rendah", url: status.showroomStreamUrlLow }); goToStream(member, "showroom", status.showroomStreamUrl, status.showroomUrl ?? profileUrl, quals); return; }
    setLoadingPlayer({ memberId: member.id, platform: "showroom" }); try { const { data, error } = await supabase.functions.invoke("check-showroom-live", { body: { room_url_key: member.showroomKey } }); if (!error && data?.stream_url) { setStatuses(prev => { const next = new Map(prev); const cur = next.get(member.id)!; next.set(member.id, { ...cur, showroomStreamUrl: data.stream_url, showroomStreamUrlLow: data.stream_url_low ?? null }); return next; }); const quals: UrlQuality[] = [{ label: "Tinggi", url: data.stream_url }]; if (data.stream_url_low && data.stream_url_low !== data.stream_url) quals.push({ label: "Rendah", url: data.stream_url_low }); goToStream(member, "showroom", data.stream_url, status.showroomUrl ?? profileUrl, quals); } else { window.open(profileUrl, "_blank"); } } catch { window.open(profileUrl, "_blank"); } finally { setLoadingPlayer(null); }
  }, [statuses, navigate]);

  const handleOpenProfile = useCallback((member: Member, platform: Platform) => { if (platform === "idn") { window.open(`https://www.idn.app/${member.idnUsername}`, "_blank"); } else { const url = member.showroomRoomId ? `https://www.showroom-live.com/room/profile?room_id=${member.showroomRoomId}` : `https://www.showroom-live.com/r/${member.showroomKey}`; window.open(url, "_blank"); } }, []);
  const handleWatch = (member: Member, platform: Platform) => { if (platform === "idn") handleWatchIDN(member); else handleWatchShowroom(member); };

  const handleOfficialWatchIDN = useCallback(async () => {
    const profileUrl = `https://www.idn.app/${JKT48_OFFICIAL.idnUsername}`;
    if (officialStatus.idnStreamUrl) { const p = new URLSearchParams({ memberId: JKT48_OFFICIAL.id, platform: "idn", streamUrl: encodeURIComponent(officialStatus.idnStreamUrl), liveUrl: encodeURIComponent(officialStatus.idnUrl ?? profileUrl) }); navigate(`/stream?${p.toString()}`); return; }
    if (officialStatus.idnSlug) { setOfficialLoading("idn"); try { const { data, error } = await supabase.functions.invoke("get-idn-stream", { body: { username: JKT48_OFFICIAL.idnUsername, slug: officialStatus.idnSlug } }); if (!error && data?.stream_url) { const p = new URLSearchParams({ memberId: JKT48_OFFICIAL.id, platform: "idn", streamUrl: encodeURIComponent(data.stream_url), liveUrl: encodeURIComponent(officialStatus.idnUrl ?? profileUrl) }); navigate(`/stream?${p.toString()}`); } else { window.open(officialStatus.idnUrl ?? profileUrl, "_blank"); } } catch { window.open(officialStatus.idnUrl ?? profileUrl, "_blank"); } finally { setOfficialLoading(null); } return; }
    window.open(officialStatus.idnUrl ?? profileUrl, "_blank");
  }, [officialStatus, navigate]);

  const handleOfficialWatchShowroom = useCallback(async () => {
    const profileUrl = `https://www.showroom-live.com/room/profile?room_id=${JKT48_OFFICIAL.showroomRoomId}`;
    if (officialStatus.showroomStreamUrl) { const quals = [{ label: "Tinggi", url: officialStatus.showroomStreamUrl }]; if (officialStatus.showroomStreamUrlLow && officialStatus.showroomStreamUrlLow !== officialStatus.showroomStreamUrl) quals.push({ label: "Rendah", url: officialStatus.showroomStreamUrlLow }); const p = new URLSearchParams({ memberId: JKT48_OFFICIAL.id, platform: "showroom", streamUrl: encodeURIComponent(officialStatus.showroomStreamUrl), liveUrl: encodeURIComponent(officialStatus.showroomUrl ?? profileUrl), qualities: encodeURIComponent(JSON.stringify(quals)) }); navigate(`/stream?${p.toString()}`); return; }
    setOfficialLoading("showroom"); try { const { data, error } = await supabase.functions.invoke("check-showroom-live", { body: { room_url_key: JKT48_OFFICIAL.showroomKey } }); if (!error && data?.stream_url) { const quals = [{ label: "Tinggi", url: data.stream_url }]; if (data.stream_url_low && data.stream_url_low !== data.stream_url) quals.push({ label: "Rendah", url: data.stream_url_low }); const p = new URLSearchParams({ memberId: JKT48_OFFICIAL.id, platform: "showroom", streamUrl: encodeURIComponent(data.stream_url), liveUrl: encodeURIComponent(officialStatus.showroomUrl ?? profileUrl), qualities: encodeURIComponent(JSON.stringify(quals)) }); navigate(`/stream?${p.toString()}`); } else { window.open(profileUrl, "_blank"); } } catch { window.open(profileUrl, "_blank"); } finally { setOfficialLoading(null); }
  }, [officialStatus, navigate]);

  const filtered = MEMBERS.filter(m => {
    if (m.id === JKT48_OFFICIAL.id) return false;
    if (teamFilter !== "Semua" && m.team !== teamFilter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    const s = statuses.get(m.id);
    if (liveFilter === "Sedang Live") return s?.idn === "live" || s?.showroom === "live";
    if (liveFilter === "Offline") return s?.idn === "offline" && s?.showroom === "offline";
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    const sa = statuses.get(a.id)!; const sb = statuses.get(b.id)!;
    const isLiveA = sa.idn === "live" || sa.showroom === "live";
    const isLiveB = sb.idn === "live" || sb.showroom === "live";
    if (isLiveA && !isLiveB) return -1; if (!isLiveA && isLiveB) return 1;
    return MEMBERS.findIndex(m => m.id === a.id) - MEMBERS.findIndex(m => m.id === b.id);
  });
  const liveCount = [...statuses.values()].filter(s => s.idn === "live" || s.showroom === "live").length;

  return (
    <div className="min-h-screen">
      <div className="relative h-44 md:h-56 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,hsl(var(--card)) 0%,hsl(var(--muted)) 100%)" }} />
        <div className="absolute inset-0 opacity-25"><div className="absolute top-8 left-12 w-64 h-64 rounded-full blur-[100px]" style={{ background: "hsl(350,70%,40%)" }} /><div className="absolute bottom-4 right-16 w-80 h-80 rounded-full blur-[120px]" style={{ background: "hsl(0,65%,38%)" }} /></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px,hsl(0,80%,80%) 1px,transparent 0)", backgroundSize: "28px 28px" }} />
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 flex flex-col items-center justify-center h-full gap-2">
          <motion.div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border mb-1 transition-all duration-500" style={{ background: liveCount > 0 ? "hsl(0,70%,45%,0.15)" : "hsl(var(--muted))", borderColor: liveCount > 0 ? "hsl(0,70%,55%,0.4)" : "hsl(var(--border))" }}>
            {liveCount > 0 ? <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: "0 0 8px #ef4444" }} /><span className="text-xs font-bold text-red-400 uppercase tracking-widest">{liveCount} Member Sedang Live!</span></> : <><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs font-bold text-red-400 uppercase tracking-widest">Live Member JKT48</span></>}
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ background: "linear-gradient(135deg,hsl(0,90%,75%),hsl(350,85%,65%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Member Live</h1>
          <p className="text-sm text-muted-foreground">{MEMBERS.length} member JKT48</p>
        </motion.div>
      </div>

      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3">
          <div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"><IconSearch /></div><input type="text" placeholder="Cari nama member…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-surface-hover border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground" />{search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><IconClose /></button>}</div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">{TEAMS.map(t => <button key={t} onClick={() => setTeamFilter(t)} className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200" style={{ background: teamFilter === t ? "hsl(0,75%,50%)" : "hsl(var(--muted))", color: teamFilter === t ? "#fff" : "hsl(var(--muted-foreground))", border: `1px solid ${teamFilter === t ? "transparent" : "hsl(var(--border))"}` }}>{t}</button>)}</div>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">{LIVE_FILTERS.map(f => <button key={f} onClick={() => setLiveFilter(f)} className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200" style={{ background: liveFilter === f ? f === "Sedang Live" ? "hsl(0,70%,45%)" : "hsl(0,75%,50%)" : "hsl(var(--muted))", color: liveFilter === f ? "#fff" : "hsl(var(--muted-foreground))", border: `1px solid ${liveFilter === f ? "transparent" : "hsl(var(--border))"}` }}>{f === "Sedang Live" && liveCount > 0 ? <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />{f} ({liveCount})</span> : f}</button>)}</div>
            <button onClick={checkAll} disabled={isRefreshing} className="flex-shrink-0 flex items-center gap-1.5 rounded-full font-semibold transition-all duration-200 border disabled:opacity-50" style={{ padding: "6px 10px", fontSize: "11px", background: "hsl(var(--muted))", color: isRefreshing ? "hsl(0,70%,60%)" : "hsl(var(--muted-foreground))", borderColor: isRefreshing ? "hsl(0,60%,40%,0.5)" : "hsl(var(--border))" }} title={isRefreshing ? "Sedang memeriksa…" : "Refresh status"}><motion.span animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }} transition={{ repeat: isRefreshing ? Infinity : 0, duration: 0.85, ease: "linear" }} className="flex-shrink-0"><IconRefresh /></motion.span><span className="hidden sm:inline whitespace-nowrap">{isRefreshing ? "Memeriksa…" : "Refresh"}</span></button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {/* ── Note: info refresh stream saat layar blank ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mb-5 flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.18)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="w-4 h-4 flex-shrink-0 text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-red-400">Layar player blank setelah refresh halaman?</span>
            {" "}Tekan tombol <span className="font-semibold text-foreground/80">Refresh</span> di pojok kanan bawah stream player untuk memuat ulang stream.
          </p>
        </motion.div>

        {isRefreshing ? (
          <MemberCheckingSection />
        ) : (
          <>
            {/* ── JKT48 Official Banner Card ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
              <OfficialCard
                status={officialStatus}
                onWatchIdn={handleOfficialWatchIDN}
                onWatchShowroom={handleOfficialWatchShowroom}
                onOpenIdn={() => window.open(`https://www.idn.app/${JKT48_OFFICIAL.idnUsername}`, "_blank")}
                onOpenShowroom={() => window.open(`https://www.showroom-live.com/room/profile?room_id=${JKT48_OFFICIAL.showroomRoomId}`, "_blank")}
                loadingIdn={officialLoading === "idn"}
                loadingShowroom={officialLoading === "showroom"}
              />
            </motion.div>

            {/* ── Member divider ── */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg,hsl(var(--border)),transparent)" }} />
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: "hsl(var(--primary))" }}>Member</span>
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg,transparent,hsl(var(--border)))" }} />
            </div>

            {sorted.length === 0 && <div className="text-center py-20"><div className="flex justify-center mb-4"><IconSearchEmpty /></div><p className="text-muted-foreground">Tidak ada.</p></div>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {sorted.map((member) => {
                const status = statuses.get(member.id)!;
                const isMe = loadingPlayer?.memberId === member.id;
                const loadPlat = isMe ? (loadingPlayer?.platform ?? null) : null;
                return (
                  <MemberCard
                    key={member.id}
                    member={member}
                    status={status}
                    onWatch={(platform) => handleWatch(member, platform)}
                    onOpenProfile={(platform) => handleOpenProfile(member, platform)}
                    isLoadingStream={loadPlat}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MemberLivePage;