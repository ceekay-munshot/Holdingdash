"""Fetch shareholding patterns from Screener.in via the Cloudflare Worker proxy.

Screener.in has clean per-company pages at /company/{SYMBOL}/consolidated/
containing a "Shareholding Pattern" section with the last ~10 quarters
broken down by Promoter / FII / DII / Public / Government / Others.

This script routes through the Cloudflare Worker proxy (BSE_PROXY_URL
env var — same proxy we use for BSE, now multi-host capable). Direct
GitHub-IP requests to Screener typically 403; via the Worker they pass.

Output:
  by_ticker/{SYMBOL}/shareholding.json  - per-ticker rollup with quarters

Schema:
  {
    "symbol": "RELIANCE",
    "source": "Screener.in",
    "updated": "2026-05-11T...",
    "count": 10,
    "quarters": [
      {
        "period": "Mar 2024",
        "periodIso": "2024-03-31",
        "promoter": 50.34,
        "fii": 22.10,
        "dii": 18.42,
        "public": 9.14,
        "government": 0.0,
        "others": 0.0
      }, ...
    ]
  }
"""
from __future__ import annotations

import argparse
import os
import re
import sys
import time
import traceback
import urllib.parse
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from ingestion.utils.storage import read_json, write_json, log  # noqa: E402
from ingestion.utils.universe import resolve as resolve_universe  # noqa: E402

BSE_PROXY_URL = os.environ.get("BSE_PROXY_URL")  # the same Worker has /screener
BSE_PROXY_SECRET = os.environ.get("BSE_PROXY_SECRET")

# Category labels Screener uses (left column of shareholding table)
PROMOTER_KEYS = ("promoter", "promoters")
FII_KEYS = ("fii", "fiis", "foreign")
DII_KEYS = ("dii", "diis", "domestic institution", "domestic institutions")
PUBLIC_KEYS = ("public",)
GOVT_KEYS = ("government", "govt")
OTHERS_KEYS = ("other", "others")

MONTH_MAP = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}


def _to_iso(period: str) -> str | None:
    """'Mar 2024' or 'Dec2023' → '2024-03-31'."""
    m = re.match(r"([A-Za-z]{3})\s*(\d{4})", period.strip())
    if not m:
        return None
    mon = MONTH_MAP.get(m.group(1)[:3].title())
    if not mon:
        return None
    year = int(m.group(2))
    # Quarter-end day
    last_day = {1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31}[mon]
    return date(year, mon, last_day).isoformat()


def _parse_pct(text: str) -> float | None:
    """'50.34%' → 50.34; '0.00%' → 0.0; '-' → None."""
    if not text:
        return None
    cleaned = text.strip().replace("%", "").replace(",", "").strip()
    if not cleaned or cleaned in ("-", "--", "NA", "N/A"):
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _classify_label(label: str) -> str | None:
    """Map left-column label to one of our buckets."""
    s = label.strip().lower().rstrip("+").strip()
    if any(k in s for k in PROMOTER_KEYS):
        return "promoter"
    if any(k in s for k in FII_KEYS):
        return "fii"
    if any(k in s for k in DII_KEYS):
        return "dii"
    if any(k in s for k in GOVT_KEYS):
        return "government"
    if any(k in s for k in PUBLIC_KEYS):
        return "public"
    if any(k in s for k in OTHERS_KEYS):
        return "others"
    return None


def fetch_screener_html(symbol: str, session: requests.Session) -> str | None:
    """Fetch Screener page HTML through the Worker proxy."""
    if not BSE_PROXY_URL:
        log(f"  no BSE_PROXY_URL set — cannot reach Screener")
        return None
    target_path = f"/company/{symbol}/consolidated/"
    url = f"{BSE_PROXY_URL.rstrip('/')}/screener?path={urllib.parse.quote(target_path)}"
    headers: dict[str, str] = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    if BSE_PROXY_SECRET:
        headers["X-Proxy-Secret"] = BSE_PROXY_SECRET
    try:
        r = session.get(url, headers=headers, timeout=45)
        upstream = r.headers.get("X-Upstream-Status", "?")
        if r.status_code != 200:
            log(f"  {symbol}: HTTP {r.status_code} (upstream {upstream})")
            return None
        if not r.text or len(r.text) < 1000:
            log(f"  {symbol}: empty/short body ({len(r.text)} chars)")
            return None
        # Detect Screener's "company not found" page (returns 200 but content is short)
        if "Shareholding" not in r.text and "shareholding" not in r.text:
            log(f"  {symbol}: page loaded but no shareholding section")
            return None
        return r.text
    except requests.RequestException as e:
        log(f"  {symbol}: {type(e).__name__}: {e}")
        return None


def parse_shareholding(html: str) -> list[dict[str, Any]]:
    """Parse the Shareholding Pattern table from Screener HTML."""
    soup = BeautifulSoup(html, "lxml")

    # Screener wraps the shareholding section in a <section id="shareholding">
    section = soup.find(id="shareholding") or soup.find(id="shareholding-pattern")
    if not section:
        # Fallback: search by heading text
        for h in soup.find_all(["h2", "h3"]):
            if "shareholding" in h.get_text(strip=True).lower():
                section = h.find_parent("section") or h.parent
                break
    if not section:
        return []

    # Inside section, find the quarterly tab table (vs yearly)
    # Screener typically renders multiple tables and we pick the one with quarter headers (Mar 2024 etc)
    tables = section.find_all("table")
    if not tables:
        return []

    # Pick the table whose first th row matches month-year pattern
    target_table = None
    for t in tables:
        thead = t.find("thead")
        if not thead:
            continue
        ths = thead.find_all("th")
        labels = [th.get_text(strip=True) for th in ths if th.get_text(strip=True)]
        # Look for at least 4 month-year columns
        month_year_count = sum(1 for l in labels if re.match(r"[A-Za-z]{3}\s*\d{4}", l))
        if month_year_count >= 4:
            target_table = t
            break

    if not target_table:
        # Fall back to first table in the section
        target_table = tables[0]

    thead = target_table.find("thead")
    if not thead:
        return []
    header_cells = thead.find_all("th")
    # Index 0 is the label column; the rest are quarter columns
    quarter_labels = [
        th.get_text(strip=True)
        for th in header_cells
        if re.match(r"[A-Za-z]{3}\s*\d{4}", th.get_text(strip=True))
    ]
    if not quarter_labels:
        return []

    # Build a per-period dict: {"Mar 2024": {"promoter": 50.34, "fii": 22.1, ...}}
    per_period: dict[str, dict[str, float]] = {q: {} for q in quarter_labels}

    tbody = target_table.find("tbody")
    if not tbody:
        return []

    for row in tbody.find_all("tr"):
        cells = row.find_all(["td", "th"])
        if len(cells) < 2:
            continue
        label = cells[0].get_text(strip=True)
        bucket = _classify_label(label)
        if not bucket:
            continue
        # Match each value cell to the corresponding quarter label
        value_cells = cells[1:]
        for i, q in enumerate(quarter_labels):
            if i >= len(value_cells):
                break
            val = _parse_pct(value_cells[i].get_text(strip=True))
            if val is not None:
                per_period[q][bucket] = val

    out: list[dict[str, Any]] = []
    for q in quarter_labels:
        data = per_period[q]
        if not data:
            continue
        out.append(
            {
                "period": q,
                "periodIso": _to_iso(q),
                "promoter": round(data.get("promoter", 0.0), 2),
                "fii": round(data.get("fii", 0.0), 2),
                "dii": round(data.get("dii", 0.0), 2),
                "public": round(data.get("public", 0.0), 2),
                "government": round(data.get("government", 0.0), 2),
                "others": round(data.get("others", 0.0), 2),
            }
        )
    # Sort chronologically
    out.sort(key=lambda r: r.get("periodIso") or "")
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--symbols",
        help="NIFTY50 | NIFTY100 | NIFTY200 | NIFTY500 | ALL | comma-separated (default NIFTY50)",
    )
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between calls (default 1s)")
    parser.add_argument("--limit", type=int, default=0, help="Hard cap on companies (0 = no limit)")
    args = parser.parse_args()

    if not BSE_PROXY_URL:
        log("fetch_screener_shareholding: BSE_PROXY_URL not set — exiting")
        log("Add BSE_PROXY_URL as a GitHub repo secret (your Cloudflare Worker URL)")
        return 0  # don't fail the workflow

    try:
        universe_spec = args.symbols or os.environ.get("HOLDINGDASH_UNIVERSE") or "NIFTY50"
        equity_master = read_json("equity_master.json", default=None)
        universe = resolve_universe(universe_spec, equity_master)
        if args.limit > 0:
            universe = universe[: args.limit]
        log(f"fetch_screener_shareholding: universe='{universe_spec}' ({len(universe)} symbols)")

        session = requests.Session()
        hits = 0
        misses = 0
        consecutive_misses = 0
        CIRCUIT_BREAKER = 20

        for i, symbol in enumerate(universe, 1):
            log(f"[{i}/{len(universe)}] {symbol} ...")
            html = fetch_screener_html(symbol, session)
            if not html:
                misses += 1
                consecutive_misses += 1
                if consecutive_misses >= CIRCUIT_BREAKER:
                    log(
                        f"  {CIRCUIT_BREAKER} consecutive misses — Screener may be blocking. Aborting early."
                    )
                    break
                time.sleep(args.delay)
                continue

            quarters = parse_shareholding(html)
            if not quarters:
                log(f"  {symbol}: parsed page but no shareholding rows")
                misses += 1
                consecutive_misses += 1
                time.sleep(args.delay)
                continue

            consecutive_misses = 0
            hits += 1
            payload = {
                "symbol": symbol,
                "source": "Screener.in",
                "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "count": len(quarters),
                "quarters": quarters,
            }
            write_json(f"by_ticker/{symbol}/shareholding.json", payload)
            log(f"  ok ({len(quarters)} quarters)")
            time.sleep(args.delay)

        log(f"fetch_screener_shareholding: done — {hits} hits, {misses} misses")
        return 0
    except Exception as e:
        log(f"fetch_screener_shareholding: UNEXPECTED ERROR: {e}")
        log(traceback.format_exc())
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
