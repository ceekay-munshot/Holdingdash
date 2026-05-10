"""Fetch NSE insider trade disclosures (SEBI PIT Regulations).

NSE publishes a JSON feed of insider trades behind the corporate
filings page. The endpoint requires browser cookies (warmed up via
nseindia.com homepage) and a proper Referer.

Endpoint:
  https://www.nseindia.com/api/corporates-pit?index=equities&from_date=...&to_date=...

We fetch the last 7 days and persist a dated snapshot. The frontend
aggregator (see aggregate_per_ticker.py) merges these into a
per-ticker rolling history.

Output:
  data/insider/daily/{YYYY-MM-DD}.json
  data/insider/latest.json
"""
from __future__ import annotations

import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.http import make_session, warmup_nse  # noqa: E402
from utils.storage import write_json, log  # noqa: E402

API_URL = "https://www.nseindia.com/api/corporates-pit"

LOOKBACK_DAYS = 7


def _fmt(d: date) -> str:
    return d.strftime("%d-%m-%Y")


def _normalise(raw: list[dict]) -> list[dict]:
    out: list[dict] = []
    for r in raw:
        symbol = r.get("symbol") or ""
        if not symbol:
            continue
        try:
            value = float(r.get("secVal") or 0)
        except (TypeError, ValueError):
            value = 0.0
        try:
            qty = int(float(r.get("secAcq") or 0))
        except (TypeError, ValueError):
            qty = 0
        out.append(
            {
                "symbol": symbol,
                "company": r.get("anex") or r.get("company") or "",
                "insider": r.get("acqName") or "",
                "category": r.get("personCategory") or "",
                "type": (r.get("acqMode") or "").strip(),
                "txnType": r.get("tdpTransactionType") or "",
                "quantity": qty,
                "value": value,  # INR (we'll convert to Cr in aggregator)
                "fromDate": r.get("acqfromDt") or r.get("acquisitionFromDate") or "",
                "toDate": r.get("acqtoDt") or r.get("acquisitionToDate") or "",
                "intimationDate": r.get("date") or r.get("intimDt") or "",
                "broadcastDate": r.get("broadcastdate") or "",
            }
        )
    return out


def fetch_range(session: requests.Session, start: date, end: date) -> list[dict]:
    params = {
        "index": "equities",
        "from_date": _fmt(start),
        "to_date": _fmt(end),
    }
    headers = {
        "Referer": "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json, text/plain, */*",
    }
    r = session.get(API_URL, params=params, headers=headers, timeout=45)
    r.raise_for_status()
    payload = r.json()
    return payload.get("data", []) if isinstance(payload, dict) else []


def main() -> int:
    session = make_session()
    warmup_nse(session)
    end = date.today()
    start = end - timedelta(days=LOOKBACK_DAYS)
    try:
        raw = fetch_range(session, start, end)
    except requests.RequestException as e:
        log(f"fetch_insider: request failed: {e}")
        return 2

    rows = _normalise(raw)
    fetched_ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    payload = {
        "fetched": fetched_ts,
        "source": API_URL,
        "rangeFrom": start.isoformat(),
        "rangeTo": end.isoformat(),
        "count": len(rows),
        "rows": rows,
    }

    today_iso = end.isoformat()
    write_json(f"insider/daily/{today_iso}.json", payload)
    write_json("insider/latest.json", payload)
    log(f"fetch_insider: wrote {len(rows)} rows for {start} -> {end}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
