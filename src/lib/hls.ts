import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY as SUPABASE_ANON_KEY } from "@/lib/env";

export function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function toProxiedStreamUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  const params = new URLSearchParams({ u: toBase64Url(rawUrl), apikey: SUPABASE_ANON_KEY });
  return `${SUPABASE_URL}/functions/v1/hls-proxy?${params.toString()}`;
}
