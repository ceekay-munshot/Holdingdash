"""Roll daily snapshots into per-ticker history files.

The daily fetchers write big monolithic files. The frontend needs
per-ticker rollups so a request for /api/insider/RELIANCE doesn't have
to scan a 5MB monolith. This script reads all daily snapshots in
data/{prices,insider,deals}/daily/ and emits per-ticker files at
data/by_ticker/{SYMBOL}/{prices,insider,deals}.json.

Designed to be idempotent: re-running with the same input produces
the same output. Safe to run every day after the fetchers.
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.storage import out_root, write_json, log  # noqa: E402

# Cap the per-ticker history to keep files small (5 years of daily ~= 1250 entries)
MAX_PRICE_DAYS = 2500
MAX_INSIDER_ROWS = 1000
MAX_DEAL_ROWS = 500


def _load_daily(dirpath: Path) -> list[dict]:
    """Load every daily JSON in chronological order."""
    if not dirpath.exists():
        return []
    files = sorted(dirpath.glob("*.json"))
    out: list[dict] = []
    for f in files:
        try:
            with f.open("r", encoding="utf-8") as fh:
                out.append(json.load(fh))
        except (OSError, json.JSONDecodeError) as e:
            log(f"aggregate: skip {f.name}: {e}")
    return out


def aggregate_prices() -> int:
    root = out_root()
    daily = _load_daily(root / "prices" / "daily")
    if not daily:
        log("aggregate: no price files")
        return 0

    per_ticker: dict[str, list[dict]] = defaultdict(list)
    for snap in daily:
        d = snap.get("date")
        for row in snap.get("rows", []):
            symbol = row.get("symbol")
            if not symbol:
                continue
            per_ticker[symbol].append(
                {
                    "date": d,
                    "open": row.get("open"),
                    "high": row.get("high"),
                    "low": row.get("low"),
                    "close": row.get("close"),
                    "volume": row.get("volume"),
                }
            )

    for symbol, rows in per_ticker.items():
        rows.sort(key=lambda r: r["date"])
        rows = rows[-MAX_PRICE_DAYS:]
        write_json(f"by_ticker/{symbol}/prices.json", {"symbol": symbol, "count": len(rows), "rows": rows})

    log(f"aggregate: wrote price history for {len(per_ticker)} tickers")
    return len(per_ticker)


def aggregate_insider() -> int:
    root = out_root()
    daily = _load_daily(root / "insider" / "daily")
    if not daily:
        log("aggregate: no insider files")
        return 0

    per_ticker: dict[str, dict[str, dict]] = defaultdict(dict)
    # Deduplicate by (symbol, intimationDate, insider, value)
    for snap in daily:
        for row in snap.get("rows", []):
            symbol = row.get("symbol")
            if not symbol:
                continue
            key = (
                row.get("intimationDate", ""),
                row.get("insider", ""),
                str(row.get("value", "")),
                str(row.get("quantity", "")),
            )
            per_ticker[symbol][repr(key)] = row

    for symbol, rows_map in per_ticker.items():
        rows = list(rows_map.values())
        rows.sort(key=lambda r: r.get("intimationDate") or "", reverse=True)
        rows = rows[:MAX_INSIDER_ROWS]
        write_json(f"by_ticker/{symbol}/insider.json", {"symbol": symbol, "count": len(rows), "rows": rows})

    log(f"aggregate: wrote insider history for {len(per_ticker)} tickers")
    return len(per_ticker)


def aggregate_deals() -> int:
    root = out_root()
    bulk_daily = _load_daily(root / "deals" / "bulk")
    block_daily = _load_daily(root / "deals" / "block")

    per_ticker_bulk: dict[str, dict[str, dict]] = defaultdict(dict)
    per_ticker_block: dict[str, dict[str, dict]] = defaultdict(dict)

    for snap in bulk_daily:
        for row in snap.get("rows", []):
            symbol = row.get("symbol")
            if not symbol:
                continue
            key = repr((row.get("date"), row.get("clientName"), row.get("buySell"), row.get("quantity"), row.get("price")))
            per_ticker_bulk[symbol][key] = row

    for snap in block_daily:
        for row in snap.get("rows", []):
            symbol = row.get("symbol")
            if not symbol:
                continue
            key = repr((row.get("date"), row.get("clientName"), row.get("buySell"), row.get("quantity"), row.get("price")))
            per_ticker_block[symbol][key] = row

    all_symbols = set(per_ticker_bulk.keys()) | set(per_ticker_block.keys())
    for symbol in all_symbols:
        bulk_rows = list(per_ticker_bulk.get(symbol, {}).values())
        block_rows = list(per_ticker_block.get(symbol, {}).values())
        bulk_rows.sort(key=lambda r: r.get("date") or "", reverse=True)
        block_rows.sort(key=lambda r: r.get("date") or "", reverse=True)
        write_json(
            f"by_ticker/{symbol}/deals.json",
            {
                "symbol": symbol,
                "bulk": {"count": len(bulk_rows), "rows": bulk_rows[:MAX_DEAL_ROWS]},
                "block": {"count": len(block_rows), "rows": block_rows[:MAX_DEAL_ROWS]},
            },
        )
    log(f"aggregate: wrote deals history for {len(all_symbols)} tickers")
    return len(all_symbols)


def aggregate_shareholding() -> int:
    """Roll up shareholding/{SYMBOL}/{date}.json into by_ticker/{SYMBOL}/shareholding.json.

    Idempotent and safe to re-run after each quarterly fetch.
    """
    root = out_root()
    shp_root = root / "shareholding"
    if not shp_root.exists():
        return 0
    symbols = [d for d in shp_root.iterdir() if d.is_dir()]
    for sym_dir in symbols:
        symbol = sym_dir.name
        files = sorted(sym_dir.glob("*.json"))
        quarters: list[dict] = []
        for f in files:
            try:
                with f.open("r", encoding="utf-8") as fh:
                    quarters.append(json.load(fh))
            except (OSError, json.JSONDecodeError):
                continue
        if not quarters:
            continue
        quarters.sort(key=lambda r: r.get("quarter") or "")
        write_json(
            f"by_ticker/{symbol}/shareholding.json",
            {
                "symbol": symbol,
                "scripCode": quarters[-1].get("scripCode") or "",
                "source": "BSE",
                "count": len(quarters),
                "quarters": quarters,
            },
        )
    log(f"aggregate: wrote shareholding for {len(symbols)} symbols")
    return len(symbols)


def aggregate_shareholding_yearly() -> int:
    """Derive yearly snapshots from quarterly data.

    For each symbol, pick the Q4 (Mar 31) of each Indian FY as the yearly
    snapshot. FY25 ends Mar 31, 2025. Result is a smaller, cleaner series
    suitable for the 5-7 year yearly trend view.

    Writes by_ticker/{SYMBOL}/shareholding_yearly.json
    """
    root = out_root()
    shp_root = root / "shareholding"
    if not shp_root.exists():
        return 0
    symbols = [d for d in shp_root.iterdir() if d.is_dir()]
    written = 0
    for sym_dir in symbols:
        symbol = sym_dir.name
        files = sorted(sym_dir.glob("*.json"))
        if not files:
            continue
        # Group by FY using the quarter date. A quarter date YYYY-03-31 is FY{YY}.
        by_fy: dict[str, dict] = {}
        for f in files:
            try:
                with f.open("r", encoding="utf-8") as fh:
                    q = json.load(fh)
            except (OSError, json.JSONDecodeError):
                continue
            quarter = q.get("quarter") or ""
            if not quarter.endswith("-03-31"):
                continue
            yyyy = quarter[:4]
            fy = f"FY{int(yyyy) % 100:02d}"
            by_fy[fy] = {
                "fy": fy,
                "quarterEnd": quarter,
                "scripCode": q.get("scripCode") or "",
                "promoter": q.get("promoter", 0.0),
                "fii": q.get("fii", 0.0),
                "dii": q.get("dii", 0.0),
                "public": q.get("public", 0.0),
            }
        if not by_fy:
            continue
        years = sorted(by_fy.values(), key=lambda r: r["quarterEnd"])
        write_json(
            f"by_ticker/{symbol}/shareholding_yearly.json",
            {
                "symbol": symbol,
                "source": "BSE (derived from quarterly Q4 of each FY)",
                "count": len(years),
                "years": years,
            },
        )
        written += 1
    log(f"aggregate: wrote yearly shareholding for {written} symbols")
    return written


def main() -> int:
    log("aggregate: starting per-ticker rollup")
    aggregate_prices()
    aggregate_insider()
    aggregate_deals()
    aggregate_shareholding()
    aggregate_shareholding_yearly()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
