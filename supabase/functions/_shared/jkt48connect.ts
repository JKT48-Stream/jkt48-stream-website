/**
 * JKT48Connect API (generasi terbaru) — modul bersama untuk Supabase Edge Functions.
 *
 * Dokumentasi: https://api.jkt48connect.app/docs
 *
 * Ringkasan perubahan dari API lama (`https://jkt48connect.com/api/v1/*`, key `jk48c_...`, header
 * `x-api-key`, envelope `{ ok, data, cached_at, tier }`):
 *
 *   • Base URL       : https://api.jkt48connect.app            (bukan jkt48connect.com)
 *   • Path           : /api/now_live, /api/theater, /api/theater/:id   (tanpa `/v1`)
 *   • Auth           : header `X-API-Key: jkc_<40 hex>`        (key lama `jk48c_...` tidak dipakai lagi)
 *   • Respons        : TANPA envelope `{ ok, data }` — bentuknya mengikuti tiap endpoint
 *                      (now_live = array, theater = `{ theater: [...], page, perpage, total_count }`,
 *                      detail theater = `{ shows: [...] }`)
 *   • Error          : 401 / 429 selalu JSON `{ status, message, limit, used, resets_at, ... }`
 *   • Kuota          : per key per bulan, dibaca dari header `X-RateLimit-*`
 *
 * API key TIDAK BOLEH sampai ke browser (lihat bagian "Frontend dan backend" di dokumentasi), karena itu
 * semua pemanggilan dilakukan dari Edge Function, bukan dari kode frontend.
 *
 * File ini sengaja tidak memakai API khusus Deno (tidak ada `Deno.*`, tidak ada import eksternal) supaya
 * bisa diuji langsung dengan Vitest (lihat `src/test/jkt48connect-shared.test.ts`).
 */

// ─── Konfigurasi ────────────────────────────────────────────────────────────

export const JKT48CONNECT_BASE_URL = "https://api.jkt48connect.app";

/** `jkc_` + 40 karakter heksadesimal huruf kecil (dokumentasi: "Akses & integrasi"). */
export const API_KEY_FORMAT = /^jkc_[a-f0-9]{40}$/;

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ─── Error ──────────────────────────────────────────────────────────────────

/** Kode yang dipahami `ApiStatusBanner` di frontend. */
export type ApiErrorCode =
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "CONFIG_ERROR"
  | "NETWORK"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "UNKNOWN";

export class UpstreamError extends Error {
  constructor(
    /** Status HTTP yang diteruskan ke browser. */
    public status: number,
    message: string,
    public code: ApiErrorCode,
    public extra: { resetAt?: number; retryAfterSec?: number; limit?: number; used?: number } = {},
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

/** Kembalikan pesan error yang jelas kalau secret belum diisi / masih memakai key format lama. */
export function validateApiKey(
  key: string | undefined | null,
): { ok: true; key: string } | { ok: false; message: string } {
  const k = (key ?? "").trim();
  if (!k) {
    return {
      ok: false,
      message:
        "JKT48CONNECT_API_KEY belum diatur sebagai secret di Supabase Edge Functions. " +
        "Buat key di https://api.jkt48connect.app/dashboard/keys lalu jalankan: " +
        "supabase secrets set JKT48CONNECT_API_KEY=jkc_xxxxxxxx",
    };
  }
  if (k.startsWith("jk48c_")) {
    return {
      ok: false,
      message:
        "JKT48CONNECT_API_KEY masih memakai format key LAMA (jk48c_...). API terbaru memakai key berformat " +
        "jkc_ + 40 karakter hex. Buat key baru di https://api.jkt48connect.app/dashboard/keys.",
    };
  }
  if (!API_KEY_FORMAT.test(k)) {
    return {
      ok: false,
      message: "JKT48CONNECT_API_KEY tidak valid: harus berbentuk jkc_ diikuti 40 karakter heksadesimal huruf kecil.",
    };
  }
  return { ok: true, key: k };
}

// ─── Transport ──────────────────────────────────────────────────────────────

export interface QuotaInfo {
  limit: number;
  remaining: number;
  /** Detik epoch (X-RateLimit-Reset). */
  reset: number;
  period: string;
}

export interface UpstreamOptions {
  apiKey: string;
  query?: Record<string, string | number | undefined>;
  /** Batas waktu per percobaan. Dokumentasi memakai 15 detik. */
  timeoutMs?: number;
  /** Jumlah ulang SETELAH percobaan pertama, hanya untuk 5xx / gagal jaringan. */
  retries?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export interface UpstreamResult<T = any> {
  body: T;
  status: number;
  quota: QuotaInfo | null;
}

function readQuota(h: Headers): QuotaInfo | null {
  const limit = h.get("X-RateLimit-Limit");
  if (!limit) return null;
  return {
    limit: Number(limit),
    remaining: Number(h.get("X-RateLimit-Remaining")),
    reset: Number(h.get("X-RateLimit-Reset")),
    period: h.get("X-Quota-Period") ?? "",
  };
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * GET ke JKT48Connect API dengan: header X-API-Key, timeout, retry terbatas (hanya 5xx/jaringan,
 * backoff eksponensial + jitter) dan pemetaan error 401/403/404/429 yang jelas — sesuai
 * "Client TypeScript dengan retry dan kuota" & "Daftar periksa produksi" di dokumentasi.
 */
export async function upstreamGet<T = any>(path: string, opts: UpstreamOptions): Promise<UpstreamResult<T>> {
  const { apiKey, query = {}, timeoutMs = 15_000, retries = 2, fetchImpl = fetch, sleep = defaultSleep } = opts;

  const url = new URL(path, JKT48CONNECT_BASE_URL);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  let lastError: UpstreamError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetchImpl(url.toString(), {
        headers: { "X-API-Key": apiKey, Accept: "application/json" },
        signal: controller.signal,
      });
      const quota = readQuota(res.headers);
      const text = await res.text();
      let body: any = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }

      if (res.ok) return { body: body as T, status: res.status, quota };

      const message: string | undefined =
        body && typeof body === "object" && typeof body.message === "string" ? body.message : undefined;

      if (res.status === 401 || res.status === 403) {
        throw new UpstreamError(
          res.status,
          message ??
            "API key JKT48Connect ditolak (tidak ada, salah, atau sudah dicabut). Periksa secret JKT48CONNECT_API_KEY.",
          "CONFIG_ERROR",
        );
      }

      if (res.status === 429) {
        const retryHeader = Number(res.headers.get("Retry-After"));
        const resetsAt = body && typeof body.resets_at === "string" ? Date.parse(body.resets_at) : NaN;
        const isQuota = !!body && (typeof body.limit === "number" || /kuota/i.test(message ?? ""));
        throw new UpstreamError(
          429,
          message ?? "Batas permintaan JKT48Connect tercapai. Coba lagi sebentar lagi.",
          isQuota ? "QUOTA_EXCEEDED" : "RATE_LIMITED",
          {
            resetAt: Number.isFinite(resetsAt) ? resetsAt : undefined,
            retryAfterSec: Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : undefined,
            limit: typeof body?.limit === "number" ? body.limit : undefined,
            used: typeof body?.used === "number" ? body.used : undefined,
          },
        );
      }

      if (res.status === 404) {
        throw new UpstreamError(404, message ?? "Data tidak ditemukan di JKT48Connect.", "NOT_FOUND");
      }

      if (res.status < 500) {
        throw new UpstreamError(res.status, message ?? `HTTP ${res.status}`, "BAD_REQUEST");
      }

      // 5xx → boleh diulang
      lastError = new UpstreamError(502, message ?? `Server JKT48Connect bermasalah (HTTP ${res.status}).`, "UPSTREAM_ERROR");
    } catch (e) {
      // Error yang tidak akan sembuh dengan retry langsung dilempar.
      if (e instanceof UpstreamError && e.code !== "UPSTREAM_ERROR") throw e;
      if (e instanceof UpstreamError) {
        lastError = e;
      } else {
        const aborted = (e as Error)?.name === "AbortError";
        lastError = new UpstreamError(
          aborted ? 504 : 502,
          aborted
            ? "JKT48Connect tidak merespons tepat waktu."
            : `Tidak dapat menghubungi JKT48Connect: ${(e as Error)?.message ?? String(e)}`,
          aborted ? "UPSTREAM_ERROR" : "NETWORK",
        );
      }
    } finally {
      clearTimeout(timer);
    }

    if (attempt < retries) {
      // 0,4 dtk, 0,8 dtk, ... + jitter
      await sleep(400 * 2 ** attempt + Math.random() * 200);
    }
  }

  throw lastError ?? new UpstreamError(502, "JKT48Connect tidak dapat dihubungi.", "UPSTREAM_ERROR");
}

// ─── Cache (per isolate) + dedup request bersamaan + stale-on-error ────────

interface CacheEntry {
  data: unknown;
  exp: number;
  staleExp: number;
}

/**
 * Cache in-memory sederhana. Penting untuk menghemat kuota API key (Free = 1.000 request/bulan):
 *  - `inflight`: banyak pengunjung yang meminta data yang sama bersamaan hanya memakai SATU request upstream.
 *  - `staleMs`: saat upstream gagal (5xx / jaringan / kuota habis), salinan lama masih disajikan
 *    daripada langsung error ("Saat upstream gagal, sajikan data lama" — contoh proxy di dokumentasi).
 */
export class TtlCache {
  private store = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<unknown>>();

  constructor(private now: () => number = () => Date.now(), private maxEntries = 200) {}

  /**
   * @param opts.swr  stale-while-revalidate: bila cache sudah lewat TTL tetapi masih dalam masa `staleMs`,
   *                  data lama LANGSUNG dikembalikan dan pembaruan berjalan di latar belakang. Pengguna tidak
   *                  menunggu upstream — hanya pengunjung pertama setelah cold start yang menunggu.
   * @param opts.waitUntil  (mis. `EdgeRuntime.waitUntil`) menjaga pembaruan latar tetap hidup setelah respons terkirim.
   */
  async getOrLoad<T>(
    key: string,
    ttlMs: number,
    staleMs: number,
    loader: () => Promise<T>,
    opts: { swr?: boolean; waitUntil?: (p: Promise<unknown>) => void } = {},
  ): Promise<{ data: T; stale: boolean }> {
    const t = this.now();
    const hit = this.store.get(key);
    if (hit && hit.exp > t) return { data: hit.data as T, stale: false };

    // Data lama masih layak pakai → sajikan segera, segarkan di latar belakang.
    if (opts.swr && hit && hit.staleExp > t) {
      if (!this.inflight.has(key)) {
        const bg = this.load(key, ttlMs, staleMs, loader, hit).catch(() => undefined);
        opts.waitUntil?.(bg);
      }
      return { data: hit.data as T, stale: true };
    }

    const pending = this.inflight.get(key);
    if (pending) return { data: (await pending) as T, stale: false };

    return this.load(key, ttlMs, staleMs, loader, hit);
  }

  /** Jalankan loader (digabung per key), simpan hasilnya; saat gagal sementara, pakai `previous` bila masih layak. */
  private async load<T>(
    key: string,
    ttlMs: number,
    staleMs: number,
    loader: () => Promise<T>,
    previous?: CacheEntry,
  ): Promise<{ data: T; stale: boolean }> {
    const promise = loader();
    this.inflight.set(key, promise);
    try {
      const data = await promise;
      this.set(key, data, ttlMs, staleMs);
      return { data, stale: false };
    } catch (e) {
      // Hanya error "sementara" yang boleh ditutup dengan data lama. 401 / 404 / 400 harus tampak.
      const transient =
        e instanceof UpstreamError &&
        (e.code === "UPSTREAM_ERROR" || e.code === "NETWORK" || e.code === "QUOTA_EXCEEDED" || e.code === "RATE_LIMITED");
      if (transient && previous && previous.staleExp > this.now()) return { data: previous.data as T, stale: true };
      throw e;
    } finally {
      this.inflight.delete(key);
    }
  }

  private set(key: string, data: unknown, ttlMs: number, staleMs: number) {
    const t = this.now();
    this.store.set(key, { data, exp: t + ttlMs, staleExp: t + ttlMs + staleMs });
    if (this.store.size > this.maxEntries) {
      for (const [k, v] of this.store) {
        if (v.staleExp <= t) this.store.delete(k);
      }
      // masih penuh → buang yang tertua
      while (this.store.size > this.maxEntries) {
        const first = this.store.keys().next().value;
        if (first === undefined) break;
        this.store.delete(first);
      }
    }
  }
}

// ─── Respons ke browser ─────────────────────────────────────────────────────

export function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

/** Ubah error apa pun menjadi `{ error, code, resetAt?, retryAfterSec? }` — bentuk yang dibaca frontend. */
export function errorResponse(e: unknown): Response {
  if (e instanceof UpstreamError) {
    const headers: Record<string, string> = {};
    if (e.extra.retryAfterSec) headers["Retry-After"] = String(e.extra.retryAfterSec);
    return jsonResponse(
      {
        error: e.message,
        code: e.code,
        ...(e.extra.resetAt ? { resetAt: e.extra.resetAt } : {}),
        ...(e.extra.retryAfterSec ? { retryAfterSec: e.extra.retryAfterSec } : {}),
      },
      e.status,
      headers,
    );
  }
  const msg = e instanceof Error ? e.message : String(e);
  return jsonResponse({ error: msg, code: "UNKNOWN" }, 500);
}

// ─── Helper normalisasi ─────────────────────────────────────────────────────

type Raw = Record<string, any>;

function isObj(v: unknown): v is Raw {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Ambil array dari `data` (atau dari salah satu key `keys` bila `data` berupa objek). */
export function pickList(data: unknown, ...keys: string[]): Raw[] {
  let arr: unknown = null;
  if (Array.isArray(data)) arr = data;
  else if (isObj(data)) {
    for (const k of keys) {
      if (Array.isArray(data[k])) {
        arr = data[k];
        break;
      }
    }
  }
  return Array.isArray(arr) ? (arr as unknown[]).filter(isObj) : [];
}

export function str(...vals: unknown[]): string {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  for (const v of vals) if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

export function num(...vals: unknown[]): number | null {
  for (const v of vals) {
    const n = typeof v === "string" && v.trim() ? Number(v) : v;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return null;
}

/** Hanya URL http(s) absolut yang boleh lolos; `javascript:`, `data:` dan URL rusak jadi "". */
export function httpUrl(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v !== "string" || !v.trim()) continue;
    try {
      const u = new URL(v.trim());
      if (u.protocol === "https:" || u.protocol === "http:") return u.href;
    } catch {
      /* coba nilai berikutnya */
    }
  }
  return "";
}

function httpsUrl(...vals: unknown[]): string {
  const u = httpUrl(...vals);
  return u.startsWith("https://") ? u : "";
}

// ─── Live (GET /api/now_live) ───────────────────────────────────────────────

export interface LiveStreamQuality {
  label: string;
  quality: number;
  url: string;
}

export interface LiveEntry {
  /** `notification_data_id` (mis. "sr-510000-1" / "idn-…") bila ada. */
  id: string;
  name: string;
  img: string;
  img_alt: string;
  url_key: string;
  room_url_key: string;
  room_id: number | null;
  slug: string | null;
  is_graduate: boolean;
  started_at: string;
  /** Tautan halaman live resmi (IDN / Showroom), dari `notification_caption` bila ada. */
  link: string;
  platform: string;
  type: string;
  /** Stream HLS https, kualitas tertinggi lebih dulu. IDN biasanya KOSONG di sini — lihat `shapeWatch`. */
  streaming: LiveStreamQuality[];
  stream_url: string;
}

/**
 * Daftar stream → hanya HLS https, tanpa duplikat, kualitas tertinggi dulu.
 * Showroom mengirim beberapa jenis (hls, lhls, webrtc, ...). hls.js hanya bisa memutar `hls`; entri tanpa
 * field `type` tetap diterima karena sebagian respons tidak menyertakannya.
 */
export function shapeStreams(raw: unknown): LiveStreamQuality[] {
  const seen = new Set<string>();
  return pickList(raw)
    .filter((s) => {
      if (s.type === undefined || s.type === null || s.type === "") return true;
      return String(s.type).toLowerCase() === "hls";
    })
    .map((s) => ({
      label: str(s.label, s.name, "stream"),
      quality: num(s.quality) ?? 0,
      url: httpsUrl(s.url),
    }))
    .filter((s) => s.url && !seen.has(s.url) && seen.add(s.url))
    .sort((a, b) => b.quality - a.quality);
}

/** `notification_caption`: "🔴 Nama — Judul\nhttps://…" → URL pada baris kedua. */
function captionLink(caption: unknown): string {
  if (typeof caption !== "string") return "";
  const m = caption.match(/https?:\/\/\S+/);
  return m ? httpUrl(m[0]) : "";
}

function mapLive(l: Raw): LiveEntry {
  const platform = str(l.type, l.platform).toLowerCase();
  let streaming = shapeStreams(l.streaming_url_list);
  if (streaming.length === 0) streaming = shapeStreams(l.streaming);
  const single = httpsUrl(l.stream_url);
  if (streaming.length === 0 && single) streaming = [{ label: "original", quality: 1, url: single }];

  return {
    id: str(l.notification_data_id, l.data_id, l.slug, l.room_id, l.url_key),
    name: str(l.name),
    img: httpUrl(l.img, l.img_alt),
    img_alt: httpUrl(l.img_alt, l.img),
    url_key: str(l.url_key),
    room_url_key: str(l.room_url_key),
    room_id: num(l.room_id),
    slug: str(l.slug) || null,
    is_graduate: Boolean(l.is_graduate),
    started_at: str(l.started_at),
    link: captionLink(l.notification_caption),
    platform,
    type: platform,
    streaming,
    stream_url: streaming[0]?.url ?? "",
  };
}

/**
 * Normalisasi `GET /api/now_live?group=jkt48`.
 * Bentuk respons: array (atau objek dengan `lives` / `data`). `now_live` bisa memuat sesi yang sama dua kali
 * (versi nama panggilan & nama lengkap) — digabung berdasarkan platform + id sesi.
 */
export function shapeLive(raw: unknown): LiveEntry[] {
  const byId = new Map<string, LiveEntry>();
  for (const item of pickList(raw, "lives", "data", "now_live")) {
    const e = mapLive(item);
    if (!e.name) continue;
    const key = `${e.platform}:${e.id || e.url_key || e.name}`;
    const prev = byId.get(key);
    if (!prev) byId.set(key, e);
    else if (prev.streaming.length === 0 && e.streaming.length > 0) byId.set(key, { ...prev, streaming: e.streaming, stream_url: e.stream_url });
  }
  return [...byId.values()];
}

// ─── Watch (fallback sumber stream) ─────────────────────────────────────────

export interface WatchResult {
  stream_url: string;
  streaming: LiveStreamQuality[];
}

/**
 * Normalisasi respons `GET /api/watch/:key` (Showroom, `streaming_url_list`) dan
 * `GET /api/watch/:key/idn` (IDN, `stream_url` | `playback_url` | `url`).
 *
 * Catatan: route `/api/watch/*` TIDAK tercantum di panduan publik (docs/guide), tetapi dipakai oleh
 * aplikasi resmi JKT48Connect (repo Valzyys/JKT48Connet-REVAMP, stream-backend/server.py) sebagai cadangan
 * ketika `now_live` tidak membawa URL stream (kasus umum untuk IDN). Hanya dipanggil bila perlu.
 */
export function shapeWatch(raw: unknown): WatchResult {
  const r: Raw = isObj(raw) ? raw : {};
  let streaming = shapeStreams(r.streaming_url_list);
  if (streaming.length === 0) streaming = shapeStreams(r.streaming);
  if (streaming.length === 0) {
    const single = httpsUrl(r.stream_url, r.playback_url, r.url);
    if (single) streaming = [{ label: "original", quality: 1, url: single }];
  }
  return { stream_url: streaming[0]?.url ?? "", streaming };
}

// ─── Theater (GET /api/theater, GET /api/theater/:id) ───────────────────────

export interface TheaterLineupMember {
  id: string;
  name: string;
  url_key: string;
  img: string;
}

export interface TheaterApiMember {
  name: string;
  type: string;
  member_id: string;
  img: string;
}

export interface TheaterRecording {
  title: string;
  youtube_url: string;
  thumbnail: string;
}

export interface TheaterListItem {
  /** ID show dari API (field `code`, atau `id`). Dipakai untuk GET /api/theater/:id. */
  reference_code: string;
  /** Tautan halaman resmi show (info tiket/pembelian), kosong bila tidak ada. */
  link: string;
  /** YYYY-MM-DD dalam WIB. */
  date: string;
  /** HH:mm dalam WIB, "" bila API tidak memberi jam. */
  start_time: string;
  /** HH:mm dalam WIB, "" bila API tidak memberi jam selesai. */
  end_time: string;
  title: string;
  /** LOVE / DREAM / PASSION / TRAINEE (huruf besar), "" bila tidak ada. */
  jkt48_member_type: string;
  is_birthday_show: boolean;
  /** Banner siap pakai (status `ready`), "" bila belum selesai dirender. */
  banner: string;
  poster: string;
  short_description: string | null;
  lineup: TheaterLineupMember[];
  birthday_members: TheaterApiMember[];
}

export interface TheaterDetail extends TheaterListItem {
  /** Judul lagu pada setlist. */
  set_list: string[];
  graduation_members: TheaterApiMember[];
  recordings: TheaterRecording[];
}

/**
 * Timestamp → { date, time } dalam WIB.
 * - "2026-11-08"                    → tanggal saja
 * - "2026-11-08T19:00:00" (tanpa zona) → dianggap sudah WIB
 * - "2026-11-08T12:00:00.000Z"      → UTC dikonversi ke WIB (sesuai dokumentasi: akhiran Z = UTC)
 * - angka (epoch detik / milidetik) → dikonversi ke WIB
 */
export function toWib(value: unknown, fallbackTime = ""): { date: string; time: string } | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    const s = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return { date: s, time: /^\d{1,2}:\d{2}/.test(fallbackTime) ? fallbackTime.slice(0, 5).padStart(5, "0") : "" };
    }
    const local = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/);
    if (local) return { date: local[1], time: local[2] };
    // Jam saja ("19:00" / "19:00:00") — dipakai untuk field jam mulai/selesai yang terpisah dari tanggal.
    const clock = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (clock) return { date: "", time: `${clock[1].padStart(2, "0")}:${clock[2]}` };
  }

  let d: Date;
  if (typeof value === "number") d = new Date(value < 1e11 ? value * 1000 : value);
  else d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const time = `${get("hour")}:${get("minute")}`;
  // 00:00 WIB berarti API hanya mengirim tanggal (tengah malam), bukan jam tayang yang sebenarnya.
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: time === "00:00" ? "" : time };
}

/** "Team Love" / "love" / "LOVE" → "LOVE". */
function normalizeTeam(v: unknown): string {
  return str(v).replace(/^team\s+/i, "").trim().toUpperCase();
}

/** Gambar desain (jadwal) yang statusnya `ready`. `jkt48connect` dipakai lebih dulu, lalu photobook, lalu avonera48. */
function readyDesign(designs: unknown, layout: "banner" | "portrait"): string {
  if (!isObj(designs)) return "";
  for (const theme of ["jkt48connect", "photobook", "avonera48"]) {
    const img = (designs as Raw)[theme]?.[layout];
    if (img && img.status === "ready" && img.url) {
      const u = httpUrl(img.url);
      if (u) return u;
    }
  }
  return "";
}

function mapLineupMember(m: Raw): TheaterLineupMember {
  const key = str(m.url_key, m.url, m.slug, m.id);
  return { id: str(m.id, m.member_id, m.url_key, m.url, m.name), name: str(m.name, m.nickname), url_key: key, img: httpUrl(m.img, m.img_alt) };
}

function mapApiMember(m: Raw, type: string): TheaterApiMember {
  return { name: str(m.name, m.nickname), type, member_id: str(m.member_id, m.id, m.url_key, m.name), img: httpUrl(m.img, m.img_alt) };
}

function mapShow(s: Raw): TheaterListItem {
  const when = toWib(s.start_date ?? s.date ?? s.datetime ?? s.start_time, str(s.start_time, s.time));
  const end = toWib(s.end_date ?? s.end_time ?? s.finish_time, "");
  const lineup = pickList(s.members ?? s.lineup).map(mapLineupMember).filter((m) => m.name);
  const birthday = pickList(s.seitansai ?? s.birthday_members).map((m) => mapApiMember(m, "birthday")).filter((m) => m.name);
  const title = str(s.title, s.setlist?.title);
  const category = str(s.category, s.type).toLowerCase();

  return {
    reference_code: str(s.code, s.id, s.reference_code),
    link: httpUrl(s.url, s.link),
    date: when?.date ?? "",
    start_time: when?.time ?? "",
    end_time: end && (end.date === "" || end.date === (when?.date ?? "")) ? end.time : "",
    title,
    jkt48_member_type: normalizeTeam(s.team ?? s.jkt48_member_type),
    is_birthday_show: birthday.length > 0 || /seitansai|birthday/i.test(`${category} ${title}`),
    banner: readyDesign(s.schedule_designs, "banner") || httpUrl(s.banner, s.banner_url, s.image_url),
    poster: readyDesign(s.schedule_designs, "portrait") || httpUrl(s.poster, s.poster_url),
    short_description: str(s.short_description, s.description) || null,
    lineup,
    birthday_members: birthday,
  };
}

export interface TheaterPage {
  items: TheaterListItem[];
  page: number;
  perpage: number;
  total: number;
}

/** `GET /api/theater?page=&perpage=` → `{ theater: [...], page, perpage, total_count }`. */
export function shapeTheaterPage(raw: unknown): TheaterPage {
  const items = pickList(raw, "theater", "shows", "data")
    .map(mapShow)
    .filter((s) => s.reference_code && s.title);
  const r: Raw = isObj(raw) ? raw : {};
  return {
    items,
    page: num(r.page) ?? 1,
    perpage: num(r.perpage) ?? items.length,
    total: num(r.total_count, r.total) ?? items.length,
  };
}

/** `GET /api/theater/:id` → `{ shows: [ { ... } ] }`. */
export function shapeTheaterDetail(raw: unknown, fallbackId: string): TheaterDetail | null {
  const first = pickList(raw, "shows", "theater", "data")[0] ?? (isObj(raw) && (raw.title || raw.setlist) ? raw : null);
  if (!first) return null;

  const base = mapShow(first);
  const songs = Array.isArray(first.setlist?.songs) ? (first.setlist.songs as unknown[]) : [];

  return {
    ...base,
    reference_code: base.reference_code || fallbackId,
    set_list: songs
      .map((x) => (typeof x === "string" ? x.trim() : isObj(x) ? str(x.title, x.name) : ""))
      .filter(Boolean),
    graduation_members: pickList(first.graduation).map((m) => mapApiMember(m, "graduation")).filter((m) => m.name),
    recordings: pickList(first.recordings)
      .map((r) => ({
        title: str(r.title, first.title),
        youtube_url: httpUrl(r.youtube_url),
        thumbnail: httpUrl(pickList(r.screenshots)[0]?.url),
      }))
      .filter((r) => r.youtube_url),
  };
}
