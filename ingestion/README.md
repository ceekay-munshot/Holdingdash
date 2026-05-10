# HoldingDash · Ingestion

Python scripts that pull free Indian market data from NSE archives and
write normalised JSON to the `data` branch of this repo. The React
dashboard reads from the `data` branch via raw GitHub URLs (or a thin
Worker `/api/*` route for transforms — coming in Phase 3).

## Sources (all free, all archive subdomain)

| Data | Source | Cadence |
|---|---|---|
| Equity master | `nsearchives.nseindia.com/content/equities/EQUITY_L.csv` | Weekly |
| Daily bhavcopy (OHLCV) | `nsearchives.nseindia.com/content/cm/...` | Daily, weekdays |
| Bulk deals | `nsearchives.nseindia.com/content/equities/bulk.csv` | Daily, weekdays |
| Block deals | `nsearchives.nseindia.com/content/equities/block.csv` | Daily, weekdays |
| Insider trades | `nseindia.com/api/corporates-pit` | Daily, 7-day window |

## Workflows

| Workflow | When | Scripts |
|---|---|---|
| `.github/workflows/ingest-daily.yml` | Mon-Fri 14:00 UTC | bhavcopy, deals, insider, aggregator |
| `.github/workflows/ingest-weekly.yml` | Sunday 02:00 UTC | equity master |

Both push to the `data` branch via `peaceiris/checkout`-style dual-checkout pattern.

## Output schema (on `data` branch)

```
data/
  equity_master.json                        # all NSE-listed companies
  prices/
    latest.json                             # last available bhavcopy
    daily/YYYY-MM-DD.json                   # per-day snapshot
  deals/
    latest.json                             # bulk + block combined
    bulk/YYYY-MM-DD.json
    block/YYYY-MM-DD.json
  insider/
    latest.json
    daily/YYYY-MM-DD.json
  by_ticker/{SYMBOL}/
    prices.json                             # rolling 10-yr OHLCV
    insider.json                            # rolling 1000 trades
    deals.json                              # rolling 500 bulk + block
```

The `by_ticker/{SYMBOL}/*.json` rollups are what the frontend reads.
Monolithic daily files are archives — useful for backfills but never
served to clients.

## Run locally

```bash
cd ingestion
pip install -r requirements.txt
export OUT_DIR=../data-out

python -m ingestion.scripts.fetch_equity_master
python -m ingestion.scripts.fetch_bhavcopy
python -m ingestion.scripts.fetch_deals
python -m ingestion.scripts.fetch_insider
python -m ingestion.scripts.aggregate_per_ticker

ls data-out/
```

Note: run from the repo root so the `ingestion.` package paths resolve.

## NSE scraping notes

- NSE main domain (`www.nseindia.com`) has Cloudflare bot protection.
  The script "warms up" by hitting the homepage first to seed cookies,
  then uses real browser headers.
- The archive subdomain (`nsearchives.nseindia.com`) is much more
  permissive — almost all our data comes from there.
- The insider trades JSON endpoint requires cookies + the right
  Referer header. If it starts failing in production, the workflow's
  `continue-on-error: true` means the other ingest steps still run.
- All scripts retry transient 5xx / 429 with exponential backoff.

## What's NOT here yet

- **Shareholding pattern**: BSE XBRL parsing (Phase 2)
- **RPT**: Annual report PDF parsing via Claude API (Phase 4)
- **Worker API layer**: `/api/*` routes for transform on read (Phase 3)
- **Frontend swap**: replacing `mockOverview.ts` etc. with `fetch('/api/...')` (Phase 3)
