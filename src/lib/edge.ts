/**
 * Pemanggil Supabase Edge Function untuk data JKT48Connect (`live`, `theater`).
 *
 * Semua request ke api.jkt48connect.app dilakukan oleh Edge Function (server-to-server) supaya API key
 * `jkc_...` tidak pernah masuk ke browser. File ini hanya:
 *   1. memanggil function,
 *   2. membaca payload error `{ error, code, resetAt?, retryAfterSec? }` dari function,
 *   3. memberi tahu `ApiStatusBanner` (kuota habis / rate limit / key salah / jaringan) lewat event `api-status`.
 */

import { supabase } from "@/integrations/supabase/client";
import { emitApiStatus, type ApiStatusEvent } from "@/lib/youtube";

type ErrorCode = Extract<ApiStatusEvent, { type: "error" }>["code"];

/** Error dari Edge Function, membawa `code` & `status` supaya pemanggil bisa membedakan penyebabnya. */
export class EdgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
  ) {
    super(message);
    this.name = "EdgeError";
  }
}

const BANNER_CODES: ReadonlySet<string> = new Set([
  "QUOTA_EXCEEDED",
  "RATE_LIMITED",
  "UPSTREAM_ERROR",
  "CONFIG_ERROR",
  "NETWORK",
]);

async function readErrorPayload(error: unknown): Promise<{ error?: string; code?: string; resetAt?: number; retryAfterSec?: number } | null> {
  try {
    const ctx: any = (error as any)?.context;
    if (ctx && typeof ctx.json === "function") return await ctx.json();
    if (ctx && typeof ctx.text === "function") {
      const t = await ctx.text();
      try {
        return JSON.parse(t);
      } catch {
        return { error: t };
      }
    }
  } catch {
    /* abaikan */
  }
  return null;
}

/**
 * @param fn     nama function, mis. "live" / "theater"
 * @param params query string yang diteruskan ke function
 * @param fallbackMessage pesan bila function tidak memberi alasan yang jelas
 */
export async function callEdge<T>(
  fn: "live" | "theater",
  params: Record<string, string> = {},
  fallbackMessage = "Gagal menghubungi layanan JKT48Connect.",
): Promise<T> {
  const qs = new URLSearchParams(params).toString();

  let data: unknown;
  let error: unknown;
  try {
    ({ data, error } = await supabase.functions.invoke(qs ? `${fn}?${qs}` : fn, { method: "GET" }));
  } catch (e) {
    emitApiStatus({
      type: "error",
      source: "jkt48connect",
      code: "NETWORK",
      message: "Tidak dapat terhubung ke server. Periksa koneksi internet kamu.",
    });
    throw new EdgeError(e instanceof Error ? e.message : fallbackMessage, "NETWORK");
  }

  if (error) {
    const payload = await readErrorPayload(error);
    const code = payload?.code ?? "NETWORK";
    const message = payload?.error ?? fallbackMessage;
    if (BANNER_CODES.has(code)) {
      emitApiStatus({
        type: "error",
        source: "jkt48connect",
        code: code as ErrorCode,
        message,
        resetAt: payload?.resetAt,
        retryAfterSec: payload?.retryAfterSec,
      });
    }
    throw new EdgeError(message, code, (error as any)?.context?.status);
  }

  if (data && typeof data === "object" && !Array.isArray(data) && "error" in (data as object)) {
    const d = data as { error: string; code?: string };
    throw new EdgeError(d.error, d.code ?? "UNKNOWN");
  }

  emitApiStatus({ type: "ok", source: "jkt48connect" });
  return data as T;
}
