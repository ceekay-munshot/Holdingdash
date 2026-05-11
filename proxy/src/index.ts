/**
 * HoldingDash · BSE + Screener proxy
 *
 * Cloudflare Worker that forwards requests to api.bseindia.com and
 * www.screener.in. GitHub Actions runner IPs are blocked by both
 * upstreams in various ways; Cloudflare Worker egress IPs generally are
 * not, so this proxy unblocks the data flow.
 *
 * Routes:
 *   GET /health                  health check
 *   GET /bse?path=...&...        forwards to https://api.bseindia.com<path>?...
 *   GET /screener?path=...       forwards to https://www.screener.in<path>?...
 *
 * Hardening:
 *   - Only GET allowed.
 *   - /bse paths must start with /BseIndiaAPI/api/
 *   - /screener paths must start with /company/
 *   - Optional SHARED_SECRET header (wrangler secret) — when set,
 *     callers must include X-Proxy-Secret to use the proxy.
 *   - Caching disabled — data is always fetched fresh.
 *   - CORS open — Worker is read-only.
 */

export interface Env {
  SHARED_SECRET?: string;
}

const BSE_PATH_PREFIX = "/BseIndiaAPI/api/";
const SCREENER_PATH_PREFIX = "/company/";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const BSE_HEADERS: Record<string, string> = {
  "User-Agent": BROWSER_UA,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://www.bseindia.com",
  Referer: "https://www.bseindia.com/",
};

const SCREENER_HEADERS: Record<string, string> = {
  "User-Agent": BROWSER_UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.screener.in/",
};

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Proxy-Secret",
    "Access-Control-Max-Age": "86400",
  };
}

function badRequest(msg: string, status = 400): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

async function proxyTo(
  request: Request,
  baseUrl: string,
  targetPath: string,
  headers: Record<string, string>,
): Promise<Response> {
  const target = new URL(`${baseUrl}${targetPath}`);
  const url = new URL(request.url);
  for (const [k, v] of url.searchParams.entries()) {
    if (k === "path") continue;
    target.searchParams.set(k, v);
  }
  try {
    const upstream = await fetch(target.toString(), {
      method: "GET",
      headers,
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") || "application/octet-stream",
        "X-Upstream-Status": String(upstream.status),
        ...corsHeaders(),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return badRequest(`upstream fetch failed: ${msg}`, 502);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== "GET") {
      return badRequest("method not allowed", 405);
    }

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify({ ok: true, service: "holdingdash-proxy" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders() } },
      );
    }

    if (env.SHARED_SECRET) {
      const provided = request.headers.get("X-Proxy-Secret");
      if (provided !== env.SHARED_SECRET) {
        return badRequest("forbidden", 403);
      }
    }

    // BSE
    if (url.pathname === "/bse") {
      const targetPath = url.searchParams.get("path");
      if (!targetPath || !targetPath.startsWith(BSE_PATH_PREFIX)) {
        return badRequest(
          `bad path — must start with ${BSE_PATH_PREFIX}`,
          400,
        );
      }
      return proxyTo(
        request,
        "https://api.bseindia.com",
        targetPath,
        BSE_HEADERS,
      );
    }

    // Screener.in
    if (url.pathname === "/screener") {
      const targetPath = url.searchParams.get("path");
      if (!targetPath || !targetPath.startsWith(SCREENER_PATH_PREFIX)) {
        return badRequest(
          `bad path — must start with ${SCREENER_PATH_PREFIX}`,
          400,
        );
      }
      return proxyTo(
        request,
        "https://www.screener.in",
        targetPath,
        SCREENER_HEADERS,
      );
    }

    return badRequest(
      "not found — use /bse?path=... or /screener?path=/company/...",
      404,
    );
  },
};
