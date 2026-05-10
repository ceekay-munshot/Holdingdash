"""One-shot backfill of NSE bhavcopy for the last N trading days.

Without this, the per-ticker price file `by_ticker/{SYMBOL}/prices.json`
has a single data point (today). The dashboard's price chart looks
flat. Running this script once seeds 60-90 days of history so the chart
actually shows a curve.

Usage:
  python -m ingestion.scripts.backfill_bhavcopy --days 90

Run via the manual `backfill.yml` GitHub Actions workflow on first
setup. After that, the daily cron keeps history rolling forward.
"""
from __future__ import annotations

import argparse
import sys
import time
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ingestion.scripts.fetch_bhavcopy import fetch_for  # noqa: E402
from ingestion.utils.storage import write_json, log  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=90, help="Calendar days to walk back (default 90)")
    parser.add_argument("--delay", type=float, default=0.6, help="Delay between fetches in seconds")
    args = parser.parse_args()

    end = date.today()
    start = end - timedelta(days=args.days)
    log(f"backfill: walking {start} -> {end} ({args.days} days)")

    hits = 0
    misses = 0
    cursor = end
    while cursor >= start:
        # Skip weekends
        if cursor.weekday() >= 5:
            cursor -= timedelta(days=1)
            continue
        data = fetch_for(cursor)
        if data:
            iso = data["date"]
            write_json(f"prices/daily/{iso}.json", data)
            hits += 1
            log(f"backfill:   ok {iso} ({data['count']} rows)")
        else:
            misses += 1
            log(f"backfill:   no data for {cursor} (likely holiday)")
        time.sleep(args.delay)
        cursor -= timedelta(days=1)

    log(f"backfill: done — {hits} days fetched, {misses} skipped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
