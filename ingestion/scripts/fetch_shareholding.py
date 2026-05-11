"""Fetch shareholding patterns from BSE for a list of companies.

For each company in the watch universe, pull the latest N quarterly
shareholding patterns from BSE's public API. The pattern breaks
ownership down by Promoter / FII / DII / Public / etc.

Source: https://api.bseindia.com/BseIndiaAPI/api/ShareHoldingPatternData/w
  Params: scripcd, qtrid (YYYYMMDD of quarter-end)

Universe is configurable via:
  --symbols NIFTY50 | NIFTY100 | NIFTY200 | NIFTY500 | ALL | "SYM1,SYM2,..."
  HOLDINGDASH_UNIVERSE env var (same values)

Default: NIFTY500 (matches the weekly cron's intended tier).

Default quarters: 20 (= 5 years, matches the Overview chart depth).

Output:
  shareholding/{SYMBOL}/{YYYY-MM-DD}.json    # one file per quarter
  by_ticker/{SYMBOL}/shareholding.json       # quarterly rollup
  by_ticker/{SYMBOL}/shareholding_yearly.json (via aggregator)
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
from ingestion.utils.universe import resolve as resolve_universe  # noqa: E402

API_URL = "https://api.bseindia.com/BseIndiaAPI/api/ShareHoldingPatternData/w"


def quarter_ends(n: int) -> list[date]:
    """Return the last n quarter-end dates ending in the most recently
    completed quarter. Indian financial year quarters end Mar/Jun/Sep/Dec.
    Companies file shareholding pattern ~21-45 days after quarter end.
    """
    today = date.today()
    candidates_back: list[date] = []
    y = today.year + 1  # start above today and walk back
    while len(candidates_back) < n + 4:
        for q in [date(y, 12, 31), date(y, 9, 30), date(y, 6, 30), date(y, 3, 31)]:
            # Allow ~30 days slack for prompt filings
            if (today - q).days >= 30:
                candidates_back.append(q)
        y -= 1
        if y < 1990:
            break
    return candidates_back[:n]


def _safe_float(v: Any, default: float = 0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _extract_categories(payload: dict[str, Any]) -> dict[str, float]:
    """Aggregate BSE's 30+ sub-categories into Promoter / FII / DII / Public."""
    out = {"promoter": 0.0, "fii": 0.0, "dii": 0.0, "public": 0.0}
    table = payload.get("Table") if isinstance(payload, dict) else None
    if not isinstance(table, list):
        return out
    for row in table:
        if not isinstance(row, dict):
            continue
        cat = str(
            row.get("HOLDER_CATEGORY")
            or row.get("ShareholderCategory")
            or row.get("CATEGORY")
            or ""
        ).lower()
        pct = _safe_float(
            row.get("PER_SHR_HOLD")
            or row.get("Per_Total_Holding")
            or row.get("PercentageOfShareholding")
            or row.get("PERCENT_OF_HOLDING")
        )
        if "promoter" in cat:
            out["promoter"] += pct
        elif "foreign" in cat or "fpi" in cat or "fii" in cat or "non-resident" in cat:
            out["fii"] += pct
        elif (
            "mutual" in cat
            or "insurance" in cat
            or "domestic institution" in cat
            or "banks" in cat
            or "financial institutions" in cat
            or "venture capital" in cat
            or "alternative investment" in cat
        ):
            out["dii"] += pct
        elif "public" in cat or "retail" in cat or "non-institution" in cat or "individual" in cat:
            out["public"] += pct
    return {k: round(v, 2) for k, v in out.items()}


def fetch_one(session: requests.Session, scrip_code: str, qtr_end: date) -> dict[str, Any] | None:
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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--symbols",
        help="NIFTY50 | NIFTY100 | NIFTY200 | NIFTY500 | ALL | comma-separated (default NIFTY500)",
    )
    parser.add_argument(
        "--quarters",
        type=int,
        default=20,
        help="Last N quarter-ends to fetch (default 20 = 5 years)",
    )
    parser.add_argument("--delay", type=float, default=0.4, help="Delay between calls")
    args = parser.parse_args()

    try:
        return _run(args)
    except Exception as e:
        import traceback
        log(f"fetch_shareholding: UNEXPECTED ERROR: {e}")
        log(traceback.format_exc())
        return 0  # always succeed at the workflow level


def _run(args: argparse.Namespace) -> int:
    nse_to_bse_payload = read_json("nse_to_bse.json", default=None)
    mapping: dict[str, str] = {}
    if nse_to_bse_payload and isinstance(nse_to_bse_payload.get("mapping"), dict):
        mapping = nse_to_bse_payload["mapping"]
    if not mapping:
        log("fetch_shareholding: nse_to_bse.json empty — fetch_bse_master must run first")
        log("fetch_shareholding: writing empty result and exiting cleanly")
        return 0

    universe_spec = args.symbols or os.environ.get("HOLDINGDASH_UNIVERSE") or "NIFTY500"
    equity_master = read_json("equity_master.json", default=None)
    universe = resolve_universe(universe_spec, equity_master)
    if not universe:
        log(f"fetch_shareholding: empty universe for spec '{universe_spec}' — exiting cleanly")
        return 0
    quarters = quarter_ends(args.quarters)
    log(
        f"fetch_shareholding: universe='{universe_spec}' ({len(universe)} symbols) "
        f"× {len(quarters)} quarters · mapping has {len(mapping)} entries"
    )

    session = make_bse_session()
    total_hits = 0
    total_misses = 0
    matched = 0
    for symbol in universe:
        scrip = mapping.get(symbol)
        if not scrip:
            continue
        matched += 1
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

    log(
        f"fetch_shareholding: done — {matched}/{len(universe)} symbols had BSE codes, "
        f"{total_hits} quarter hits, {total_misses} misses"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
