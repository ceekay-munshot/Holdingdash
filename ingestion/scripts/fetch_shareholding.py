"""Fetch shareholding patterns from BSE for a list of companies.

For each company in the watchlist, pull the latest N quarterly
shareholding patterns from BSE's public API. The pattern breaks
ownership down by Promoter / FII / DII / Public / etc.

Source: https://api.bseindia.com/BseIndiaAPI/api/ShareHoldingPatternData/w
  Params: ScripCd, qtrid (YYYYMMDD of quarter-end)

Universe scope is configurable. Default is NIFTY 50 for first run
(50 companies × 8 quarters ~ 400 calls, ~5-10 min). Set
HOLDINGDASH_UNIVERSE=NIFTY500 to expand.

Output:
  shareholding/{SYMBOL}/{YYYY-MM-DD}.json    # one file per quarter
  by_ticker/{SYMBOL}/shareholding.json       # rollup
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ingestion.utils.bse import make_bse_session  # noqa: E402
from ingestion.utils.storage import read_json, write_json, log  # noqa: E402

API_URL = "https://api.bseindia.com/BseIndiaAPI/api/ShareHoldingPatternData/w"

# Default starter universe (NIFTY 50 by symbol). Expand via env or arg.
NIFTY_50: list[str] = [
    "RELIANCE", "HDFCBANK", "ICICIBANK", "INFY", "TCS", "BHARTIARTL", "ITC",
    "SBIN", "HINDUNILVR", "LT", "BAJFINANCE", "AXISBANK", "KOTAKBANK", "HCLTECH",
    "MARUTI", "ASIANPAINT", "SUNPHARMA", "TITAN", "NTPC", "POWERGRID", "WIPRO",
    "ULTRACEMCO", "M&M", "TATAMOTORS", "TATASTEEL", "NESTLEIND", "JSWSTEEL",
    "ONGC", "GRASIM", "INDUSINDBK", "ADANIENT", "ADANIPORTS", "COALINDIA",
    "DIVISLAB", "TECHM", "BAJAJFINSV", "BPCL", "HDFCLIFE", "SBILIFE", "HEROMOTOCO",
    "CIPLA", "BRITANNIA", "EICHERMOT", "DRREDDY", "APOLLOHOSP", "TATACONSUM",
    "BAJAJ-AUTO", "LTIM", "HINDALCO", "UPL",
]


def quarter_ends(n: int) -> list[date]:
    """Return the last n quarter-end dates ending in the most recently
    completed quarter. Indian financial year quarters end Mar/Jun/Sep/Dec."""
    today = date.today()
    # Find most recently completed quarter end
    year = today.year
    candidates = [
        date(year, 3, 31),
        date(year, 6, 30),
        date(year, 9, 30),
        date(year, 12, 31),
    ]
    # Most recent quarter end that is at most 45 days before today
    # (companies file ~45 days after quarter end)
    candidates_back = []
    y = year
    while len(candidates_back) < n + 2:
        for q in [date(y, 12, 31), date(y, 9, 30), date(y, 6, 30), date(y, 3, 31)]:
            if (today - q).days >= 45:
                candidates_back.append(q)
        y -= 1
    return candidates_back[:n]


def _safe_float(v: Any, default: float = 0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _extract_categories(payload: dict[str, Any]) -> dict[str, float]:
    """Map BSE shareholding payload to flat Promoter/FII/DII/Public buckets.

    BSE returns 30+ rows by sub-category. We aggregate them into the four
    canonical buckets the dashboard cares about.
    """
    out = {"promoter": 0.0, "fii": 0.0, "dii": 0.0, "public": 0.0}
    table = payload.get("Table") if isinstance(payload, dict) else None
    if not isinstance(table, list):
        return out
    for row in table:
        if not isinstance(row, dict):
            continue
        cat = str(row.get("HOLDER_CATEGORY") or row.get("ShareholderCategory") or "").lower()
        pct = _safe_float(row.get("PER_SHR_HOLD") or row.get("Per_Total_Holding"))
        if "promoter" in cat:
            out["promoter"] += pct
        elif "foreign" in cat or "fpi" in cat or "fii" in cat:
            out["fii"] += pct
        elif (
            "mutual" in cat
            or "insurance" in cat
            or "domestic institution" in cat
            or "banks" in cat
            or "financial" in cat
        ):
            out["dii"] += pct
        elif "public" in cat or "retail" in cat or "non-institution" in cat:
            out["public"] += pct
    # Round to 2 dp
    return {k: round(v, 2) for k, v in out.items()}


def fetch_one(
    session: requests.Session, scrip_code: str, qtr_end: date
) -> dict[str, Any] | None:
    qtrid = qtr_end.strftime("%Y%m%d")
    params = {"scripcd": scrip_code, "qtrid": qtrid}
    try:
        r = session.get(API_URL, params=params, timeout=30)
        r.raise_for_status()
        payload = r.json()
        if not payload:
            return None
        cats = _extract_categories(payload if isinstance(payload, dict) else {"Table": payload})
        if all(v == 0 for v in cats.values()):
            return None
        return {
            "quarter": qtr_end.isoformat(),
            "scripCode": scrip_code,
            **cats,
            "fetched": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
    except requests.RequestException:
        return None


def resolve_universe(arg: str | None) -> list[str]:
    if arg and arg.upper() != "NIFTY50":
        # let user pass a comma-separated list
        return [s.strip().upper() for s in arg.split(",") if s.strip()]
    env = os.environ.get("HOLDINGDASH_UNIVERSE", "").upper()
    if env == "NIFTY500":
        # fall back to NIFTY 50 if NSE NIFTY500 file isn't fetched yet
        log("NIFTY500 universe not yet supported, falling back to NIFTY 50")
    return NIFTY_50


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbols", help="Comma-separated NSE symbols (default NIFTY 50)")
    parser.add_argument("--quarters", type=int, default=8, help="Last N quarter-ends to fetch")
    parser.add_argument("--delay", type=float, default=0.4, help="Delay between calls")
    args = parser.parse_args()

    nse_to_bse_payload = read_json("nse_to_bse.json", default=None)
    if not nse_to_bse_payload or "mapping" not in nse_to_bse_payload:
        log("fetch_shareholding: nse_to_bse.json missing — run fetch_bse_master first")
        return 2
    mapping: dict[str, str] = nse_to_bse_payload["mapping"]

    universe = resolve_universe(args.symbols)
    quarters = quarter_ends(args.quarters)
    log(f"fetch_shareholding: {len(universe)} symbols × {len(quarters)} quarters")

    session = make_bse_session()
    total_hits = 0
    total_misses = 0
    for symbol in universe:
        scrip = mapping.get(symbol)
        if not scrip:
            log(f"fetch_shareholding:   skip {symbol} (no BSE code)")
            continue
        rows: list[dict[str, Any]] = []
        for q in quarters:
            data = fetch_one(session, scrip, q)
            if data:
                rows.append(data)
                total_hits += 1
                write_json(f"shareholding/{symbol}/{q.isoformat()}.json", data)
            else:
                total_misses += 1
            time.sleep(args.delay)
        if rows:
            rows.sort(key=lambda r: r["quarter"])
            write_json(
                f"by_ticker/{symbol}/shareholding.json",
                {
                    "symbol": symbol,
                    "scripCode": scrip,
                    "source": "BSE",
                    "count": len(rows),
                    "quarters": rows,
                },
            )
            log(f"fetch_shareholding:   ok {symbol} ({len(rows)} quarters)")

    log(f"fetch_shareholding: done — {total_hits} hits, {total_misses} misses")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
