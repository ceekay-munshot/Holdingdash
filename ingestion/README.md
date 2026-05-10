# HoldingDash · Ingestion

Python scripts that pull free Indian market data from NSE and BSE and
write normalised JSON to the `data` branch of this repo. The React
dashboard reads directly from the `data` branch via jsDelivr CDN.

## Sources (all free)

| Data | Source | Cadence |
|---|---|---|
| Equity master (NSE) | `nsearchives.nseindia.com/content/equities/EQUITY_L.csv` | Weekly |
| Daily bhavcopy (OHLCV) | `nsearchives.nseindia.com/content/cm/...` | Daily, weekdays |
| Bulk deals | `nsearchives.nseindia.com/content/equities/bulk.csv` | Daily |
| Block deals | `nsearchives.nseindia.com/content/equities/block.csv` | Daily |
| Insider trades (primary) | NSE `corporates-pit` API | Daily |
| Insider trades (fallback) | BSE `AnnSubCategoryGetData` | Daily |
| BSE scrip master | BSE daily equity bhavcopy CSV | Weekly |
| Shareholding pattern | BSE `ShareHoldingPatternData` API | Weekly |

## Workflows

| Workflow | When | Scripts |
|---|---|---|
| `ingest-daily.yml` | Mon-Fri 14:00 UTC | bhavcopy + deals + insider (NSE then BSE) + aggregator |
| `ingest-weekly.yml` | Sun 02:00 UTC | NSE equity master |
| `ingest-shareholding.yml` | Sat 04:00 UTC | BSE master + shareholding (NIFTY 500 × 20 quarters) + aggregator |
| `backfill.yml` | Manual | Walk back N days of bhavcopy |

All push to the `data` branch with `[skip ci]` in the commit message so
Cloudflare Workers Builds skips them.

## Universe tiers

The shareholding fetcher works on a configurable universe. Pick the
right tier for your runtime budget:

| Tier | Companies | Runtime (20q × 0.4s) | Use |
|---|---|---|---|
| `NIFTY50` | 50 | ~7 min | Smoke tests, fast iteration |
| `NIFTY100` | 100 | ~15 min | Demo / mid-cap focus |
| `NIFTY200` | 200 | ~27 min | Broad-market |
| `NIFTY500` | 500 | ~67 min | **Default** — fits in 90 min budget |
| `ALL` | ~2000 | ~4.5 hr | Full-universe (split via matrix later) |
| Custom | N | ~N×8s | Comma-separated `SYM1,SYM2,...` |

Constituent lists come from
`nsearchives.nseindia.com/content/indices/ind_{nifty50,nifty100,nifty200,nifty500}list.csv`.
With env var: `HOLDINGDASH_UNIVERSE=NIFTY200`. With workflow input:
**Actions → Ingest shareholding → Run workflow → universe = NIFTY200**.

## Output schema (on `data` branch)

```
data/
  equity_master.json                        # all NSE-listed companies
  bse_master.json                           # BSE scrip master
  nse_to_bse.json                           # NSE-symbol → BSE-code map (joined on ISIN)
  prices/
    latest.json                             # last available bhavcopy
    daily/YYYY-MM-DD.json                   # per-day snapshot
  deals/
    latest.json                             # bulk + block combined
    bulk/YYYY-MM-DD.json
    block/YYYY-MM-DD.json
  insider/
    latest.json                             # NSE or BSE depending on which succeeded
    daily/YYYY-MM-DD.json
  shareholding/
    {SYMBOL}/{YYYY-MM-DD}.json              # one file per ticker per quarter
  by_ticker/{SYMBOL}/
    prices.json                             # rolling OHLCV (capped 2500 rows)
    insider.json                            # rolling insider trades (capped 1000)
    deals.json                              # rolling bulk + block (capped 500 each)
    shareholding.json                       # quarterly history (last N quarters)
    shareholding_yearly.json                # derived: Q4 of each FY only
```

The `by_ticker/{SYMBOL}/*.json` rollups are what the frontend reads.
Monolithic daily/quarterly files are archives — useful for backfills
but never served to clients.

## Run locally

```bash
cd <repo root>
pip install -r ingestion/requirements.txt
export OUT_DIR=./data-out

# Master data
python -m ingestion.scripts.fetch_equity_master

# Daily flows
python -m ingestion.scripts.fetch_bhavcopy
python -m ingestion.scripts.fetch_deals
python -m ingestion.scripts.fetch_insider           # NSE (may fail behind Cloudflare)
python -m ingestion.scripts.fetch_insider_bse       # BSE fallback

# Backfill price history
python -m ingestion.scripts.backfill_bhavcopy --days 90

# Shareholding (requires equity_master.json + bse_master.json first)
python -m ingestion.scripts.fetch_bse_master
python -m ingestion.scripts.fetch_shareholding --symbols NIFTY50 --quarters 20

# Roll everything into per-ticker
python -m ingestion.scripts.aggregate_per_ticker

ls data-out/by_ticker/RELIANCE/
```

## Scraping notes

- NSE main domain has Cloudflare bot protection. We "warm up" by
  hitting the homepage first, then use real browser headers.
- NSE archive subdomain (`nsearchives.nseindia.com`) is permissive.
- BSE bhavcopy and BSE APIs are also generally permissive.
- The insider trades NSE endpoint blocks GitHub-hosted runner IPs
  consistently. The BSE fallback fills this gap.
- All scripts retry transient 5xx / 429 with exponential backoff.

## What's NOT here yet

- **RPT extraction**: Annual report PDF parsing via Claude API (Phase 4).
- **Worker `/api/*` routes**: optional transform layer (not currently
  needed — frontend reads `data` branch directly).
- **Frontend swap of shareholding**: ingestion now writes shareholding
  files; the React app's Overview tab still uses mock until a follow-up
  PR wires the live data through.
