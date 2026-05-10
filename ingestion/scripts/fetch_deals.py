"""Fetch NSE bulk + block deals.

Sources (archive subdomain, no Cloudflare wall):
  Bulk  : https://nsearchives.nseindia.com/content/equities/bulk.csv   (last 7 days)
  Block : https://nsearchives.nseindia.com/content/equities/block.csv  (last 7 days)

Both files contain rolling 7-day windows. We persist each fetch as a
dated snapshot (so we can recover history) and update a 'latest' pointer
with the most recent rows.

Output:
  data/deals/bulk/{YYYY-MM-DD}.json     (snapshot)
  data/deals/block/{YYYY-MM-DD}.json    (snapshot)
  data/deals/latest.json                (combined latest view)
"""
from __future__ import annotations

import csv
import io
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.http import make_session, warmup_nse  # noqa: E402
from utils.storage import write_json, log  # noqa: E402

BULK_URL = "https://nsearchives.nseindia.com/content/equities/bulk.csv"
BLOCK_URL = "https://nsearchives.nseindia.com/content/equities/block.csv"


def _parse_date(v: str) -> str | None:
    """NSE deal date format: '01-Apr-2024'."""
    v = (v or "").strip()
    if not v:
        return None
    try:
        return datetime.strptime(v, "%d-%b-%Y").date().isoformat()
    except ValueError:
        return None


def _parse_csv(text: str) -> list[dict]:
    reader = csv.DictReader(io.StringIO(text))
    out: list[dict] = []
    for row in reader:
        clean = {k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in row.items()}
        symbol = clean.get("Symbol") or clean.get("SYMBOL") or ""
        if not symbol:
            continue
        try:
            qty = int((clean.get("Quantity Traded") or clean.get("QUANTITY") or "0").replace(",", ""))
        except ValueError:
            qty = 0
        try:
            price = float((clean.get("Trade Price / Wght. Avg. Price") or clean.get("TRADE PRICE / WGHT. AVG. PRICE") or "0").replace(",", ""))
        except ValueError:
            price = 0.0
        out.append(
            {
                "date": _parse_date(clean.get("Date") or clean.get("DATE") or ""),
                "symbol": symbol,
                "securityName": clean.get("Security Name") or clean.get("SECURITY NAME") or "",
                "clientName": clean.get("Client Name") or clean.get("CLIENT NAME") or "",
                "buySell": (clean.get("Buy / Sell") or clean.get("BUY / SELL") or "").upper(),
                "quantity": qty,
                "price": price,
                "value": +(price * qty / 1e7) if price and qty else 0.0,  # INR Cr
            }
        )
    return out


def _download(session: requests.Session, url: str) -> str | None:
    try:
        r = session.get(url, headers={"Referer": "https://www.nseindia.com/"}, timeout=30)
        if r.status_code == 200 and r.content:
            return r.content.decode("utf-8-sig", errors="replace")
    except requests.RequestException:
        return None
    return None


def main() -> int:
    session = make_session()
    warmup_nse(session)
    today_iso = datetime.now(timezone.utc).date().isoformat()
    fetched_ts = datetime.now(timezone.utc).isoformat(timespec="seconds")

    bulk_text = _download(session, BULK_URL)
    block_text = _download(session, BLOCK_URL)

    bulk_rows = _parse_csv(bulk_text) if bulk_text else []
    block_rows = _parse_csv(block_text) if block_text else []

    if bulk_text:
        write_json(
            f"deals/bulk/{today_iso}.json",
            {"fetched": fetched_ts, "source": BULK_URL, "count": len(bulk_rows), "rows": bulk_rows},
        )
    if block_text:
        write_json(
            f"deals/block/{today_iso}.json",
            {"fetched": fetched_ts, "source": BLOCK_URL, "count": len(block_rows), "rows": block_rows},
        )

    write_json(
        "deals/latest.json",
        {
            "fetched": fetched_ts,
            "bulk": {"count": len(bulk_rows), "rows": bulk_rows},
            "block": {"count": len(block_rows), "rows": block_rows},
        },
    )

    log(f"fetch_deals: bulk={len(bulk_rows)} block={len(block_rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
