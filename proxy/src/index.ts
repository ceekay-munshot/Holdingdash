/**
 * HoldingDash · BSE proxy
 *
 * A tiny Cloudflare Worker that forwards requests to api.bseindia.com.
 * GitHub Actions runner IPs are blocked by BSE; Cloudflare Worker IPs
 * generally are not, so this proxy unblocks the data flow.
 *
 * Usage:
 *   GET https://bse-proxy.<account>.workers.dev/bse?path=/BseIndiaAPI/api/ShareHoldingPatternData/w&scripcd=500325&qtrid=20240331
 *
 *   Returns the raw JSON from api.bseindia.com.
 *
 * Hardening:
 *   - Only GET is allowed.
 *   - Path must start with /BseIndiaAPI/api/ (so the proxy can only hit BSE).
 *   - Optional SHARED_SECRET header check (set via wrangler secret) — when
 *     present, requests without it are rejected. Stops random people on
 *     the internet from using your free tier.
 *   - Cache disabled — shareholding data is fetched fresh.
 */

export interface Env {
  // Optional. Set via `wrangler secret put SHARED_SECRET`. If set, callers
  // must include X-Proxy-Secret: <value>.
  SHARED_SECRET?: string;
}

const ALLOWED_PATH_PREFIX = "/BseIndiaAPI/api/";

const BSE_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://www.bseindia.com",
  Referer: "https://www.bseindia.com/",
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== "GET") {
      return badRequest("method not allowed", 405);
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify({ ok: true, service: "holdingdash-bse-proxy" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders() } },
      );
    }

    // The /bse endpoint is the actual proxy
    if (url.pathname !== "/bse") {
      return badRequest("not found — use /bse?path=...", 404);
    }

    // Shared secret check (only if configured)
    if (env.SHARED_SECRET) {
      const provided = request.headers.get("X-Proxy-Secret");
      if (provided !== env.SHARED_SECRET) {
        return badRequest("forbidden", 403);
      }
    }

    // Pull the target BSE path from the query string
    const targetPath = url.searchParams.get("path");
    if (!targetPath || !targetPath.startsWith(ALLOWED_PATH_PREFIX)) {
      return badRequest(
        `bad path — must start with ${ALLOWED_PATH_PREFIX}`,
        400,
      );
    }

    // Build the upstream URL (BSE), forwarding all other query params
    const target = new URL(`https://api.bseindia.com${targetPath}`);
    for (const [k, v] of url.searchParams.entries()) {
      if (k === "path") continue;
      target.searchParams.set(k, v);
    }

    try {
      const upstream = await fetch(target.toString(), {
        method: "GET",
        headers: BSE_HEADERS,
        // Disable Cloudflare's edge cache for this fetch
        cf: { cacheTtl: 0, cacheEverything: false },
      });

      // Pass through status + body, but normalise headers (CORS-friendly)
      const body = await upstream.arrayBuffer();
      return new Response(body, {
        status: upstream.status,
        headers: {
          "Content-Type":
            upstream.headers.get("Content-Type") || "application/json",
          "X-Upstream-Status": String(upstream.status),
          ...corsHeaders(),
        },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return badRequest(`upstream fetch failed: ${msg}`, 502);
    }
  },
};
