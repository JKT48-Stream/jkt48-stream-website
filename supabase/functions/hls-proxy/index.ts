const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Expose-Headers": "content-length, content-range, accept-ranges",
};

function jsonError(message: string, code: string, status: number): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h === "0.0.0.0" || h === "127.0.0.1" || h === "::1") return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

function isPlaylist(targetUrl: URL, contentType: string): boolean {
  if (targetUrl.pathname.toLowerCase().endsWith(".m3u8")) return true;
  const ct = contentType.toLowerCase();
  return ct.includes("mpegurl") || ct.includes("x-mpegurl");
}

function buildProxyUrl(proxyBase: string, absoluteTargetUrl: string, apikey: string | null): string {
  let url = `${proxyBase}?u=${toBase64Url(absoluteTargetUrl)}`;
  if (apikey) url += `&apikey=${encodeURIComponent(apikey)}`;
  return url;
}

function rewritePlaylist(text: string, targetUrl: URL, proxyBase: string, apikey: string | null): string {
  const lines = text.split(/\r?\n/);
  const out = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    if (trimmed.startsWith("#")) {
      const uriMatch = trimmed.match(/URI="([^"]+)"/);
      if (!uriMatch) return line;
      try {
        const abs = new URL(uriMatch[1], targetUrl).toString();
        return line.replace(uriMatch[1], buildProxyUrl(proxyBase, abs, apikey));
      } catch {
        return line;
      }
    }

    try {
      const abs = new URL(trimmed, targetUrl).toString();
      return buildProxyUrl(proxyBase, abs, apikey);
    } catch {
      return line;
    }
  });
  return out.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const reqUrl = new URL(req.url);
  const apikeyParam = reqUrl.searchParams.get("apikey");
  const uParam = reqUrl.searchParams.get("u");
  const legacyUrlParam = reqUrl.searchParams.get("url");

  let target: string | null = null;
  if (uParam) {
    try {
      target = fromBase64Url(uParam);
    } catch {
      return jsonError("Parameter 'u' bukan base64url yang valid.", "BAD_REQUEST", 400);
    }
  } else if (legacyUrlParam) {
    target = legacyUrlParam;
  }

  if (!target) {
    return jsonError("Parameter 'u' (atau 'url') wajib diisi.", "BAD_REQUEST", 400);
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return jsonError(`URL tidak valid: ${target}`, "BAD_REQUEST", 400);
  }

  if (targetUrl.protocol !== "https:") {
    return jsonError("Hanya URL https:// yang diizinkan.", "BAD_REQUEST", 400);
  }

  if (isBlockedHost(targetUrl.hostname)) {
    return jsonError("Host tidak diizinkan.", "FORBIDDEN", 403);
  }

  try {
    const upstreamHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    };
    const range = req.headers.get("range");
    if (range) upstreamHeaders["range"] = range;

    const upstream = await fetch(targetUrl.toString(), { headers: upstreamHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      return jsonError(`Upstream HTTP ${upstream.status} untuk ${targetUrl.toString()}`, "UPSTREAM_ERROR", upstream.status);
    }

    const contentType = upstream.headers.get("content-type") ?? "";

    if (isPlaylist(targetUrl, contentType)) {
      const text = await upstream.text();
      const publicBase = Deno.env.get("SUPABASE_URL") ?? `${reqUrl.protocol}//${reqUrl.host}`;
      const proxyBase = `${publicBase}/functions/v1/hls-proxy`;
      const rewritten = rewritePlaylist(text, targetUrl, proxyBase, apikeyParam);
      const debug = reqUrl.searchParams.get("debug") === "1";
      return new Response(rewritten, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": debug ? "text/plain; charset=utf-8" : "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store",
        },
      });
    }

    const passHeaders: Record<string, string> = { ...corsHeaders };
    if (contentType) passHeaders["Content-Type"] = contentType;
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) passHeaders["Content-Length"] = contentLength;
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) passHeaders["Content-Range"] = contentRange;
    const acceptRanges = upstream.headers.get("accept-ranges");
    if (acceptRanges) passHeaders["Accept-Ranges"] = acceptRanges;
    passHeaders["Cache-Control"] = "public, max-age=31536000, immutable";

    return new Response(upstream.body, { status: upstream.status, headers: passHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("hls-proxy error:", e);
    return jsonError(msg, "UNKNOWN", 500);
  }
});