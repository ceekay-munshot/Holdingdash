# HoldingDash · BSE proxy

A tiny Cloudflare Worker that forwards requests to `api.bseindia.com`.

## Why

BSE blocks GitHub-hosted runner IPs (HTTP 403) on `api.bseindia.com`. Cloudflare Worker egress IPs are generally not blocked. Routing through the Worker unblocks the shareholding ingestion pipeline at zero recurring cost (Cloudflare Workers free tier covers 100,000 requests/day, our weekly run uses ~10K).

## One-time setup

You need a free Cloudflare account.

```bash
cd proxy
npm install
npx wrangler login          # opens browser, takes 30 seconds
npx wrangler deploy
```

Output ends with:

```
Deployed holdingdash-bse-proxy triggers (4.13s)
  https://holdingdash-bse-proxy.<your-account>.workers.dev
```

That URL is your proxy. Test it:

```bash
curl 'https://holdingdash-bse-proxy.<your-account>.workers.dev/health'
# → {"ok":true,"service":"holdingdash-bse-proxy"}

curl 'https://holdingdash-bse-proxy.<your-account>.workers.dev/bse?path=/BseIndiaAPI/api/ShareHoldingPatternData/w&scripcd=500325&qtrid=20240331'
# → JSON shareholding data (if BSE accepts Cloudflare IPs — that's the bet)
```

## Wire it into the ingestion workflow

1. In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**.
2. Name: `BSE_PROXY_URL`. Value: `https://holdingdash-bse-proxy.<your-account>.workers.dev`.
3. The `ingest-shareholding.yml` workflow reads this secret and passes it as `BSE_PROXY_URL` env var to the Python scripts. `fetch_shareholding.py` tries the proxy first when the env var is set.

## Optional: lock down the proxy

By default the proxy is public (anyone with the URL can use it). To restrict access:

```bash
cd proxy
npx wrangler secret put SHARED_SECRET
# enter a long random string
```

Then in GitHub: also add `BSE_PROXY_SECRET` as a repo secret with the same value. The ingest script reads it and sends `X-Proxy-Secret` header.

## Files

- `src/index.ts` — Worker code (~120 lines)
- `wrangler.jsonc` — Worker config (name, compatibility date)
- `package.json` — deps (wrangler + types)
- `tsconfig.json` — TypeScript config

## What the Worker does

- `GET /health` → returns `{ ok: true }` (health check)
- `GET /bse?path=/BseIndiaAPI/api/...&...` → forwards to `https://api.bseindia.com<path>?...` with browser-like headers, returns the raw response.
- Allowlist: path must start with `/BseIndiaAPI/api/` (so the proxy can only hit BSE, not arbitrary URLs).
- CORS: allows requests from anywhere (the dashboard could call it directly from the browser if we ever want).
- Cache: disabled (every request is fresh).

## What if BSE blocks Cloudflare IPs too?

Then we know `cf` egress is also on their blocklist. Next options:
- Trendlyne paid API (~₹1500/mo, clean data)
- Tijori paid API (~₹3000/mo, fuller dataset)
- Build a residential proxy (more complex, costs money)

But based on what we know, Cloudflare IPs are usually OK with BSE. This Worker is the right first try.
