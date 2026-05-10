"""Fetch insider trades from BSE (alternative to NSE's blocked endpoint).

BSE publishes SEBI PIT insider trade disclosures via their public API:
  https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w

The category for insider trades is "Insider Trading / SAST" and the
filings come back as JSON. We pull the last `LOOKBACK_DAYS` days, parse
the structured fields, and write the same shape as `fetch_insider.py`
so the frontend doesn't have to care which source produced the data.

Note: BSE returns less rich per-trade detail than NSE (no per-insider
breakdown of quantity in many cases). We populate what's available and
mark missing fields as empty strings. Good enough for a "did something
happen?" signal until NSE flow returns.
"""
from __future__ import annotations

import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ingestion.utils.bse import make_bse_session  # noqa: E402
from ingestion.utils.storage import write_json, log  # noqa: E402

API_URL = "https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w"

LOOKBACK_DAYS = 7
PAGE_LIMIT = 6  # safety cap


def _fmt_bse(d: date) -> str:
    return d.strftime("%Y%m%d")


def _normalise(raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for r in raw:
        scrip = r.get("SCRIP_CD") or r.get("SLONGNAME") or ""
        sym = r.get("symbol") or r.get("SLONGNAME") or ""
        out.append(
            {
                "symbol": str(sym).split(" ")[0].strip().upper() if sym else "",
                "scripCode": str(scrip),
                "company": r.get("SLONGNAME") or r.get("CompanyName") or "",
                "insider": "",  # BSE feed gives only filing headline
                "category": "",
                "type": "",
                "txnType": "",
                "headline": r.get("HEADLINE") or r.get("NEWSSUB") or "",
                "quantity": 0,
                "value": 0,
                "fromDate": "",
                "toDate": "",
                "intimationDate": r.get("NEWS_DT") or r.get("DT_TM") or "",
                "broadcastDate": r.get("DissemDT") or r.get("ANNOUNCEMENT_DATE") or "",
                "attachment": r.get("ATTACHMENTNAME") or "",
            }
        )
    return out


def fetch_page(session: requests.Session, start: date, end: date, page: int) -> list[dict[str, Any]]:
    params = {
        "pageno": str(page),
        "strCat": "Insider Trading / SAST",
        "strPrevDate": _fmt_bse(start),
        "strToDate": _fmt_bse(end),
        "strScrip": "",
        "strSearch": "P",
        "strType": "C",
        "subcategory": "-1",
    }
    r = session.get(API_URL, params=params, timeout=45)
    r.raise_for_status()
    payload = r.json()
    if isinstance(payload, dict):
        return payload.get("Table", []) or []
    if isinstance(payload, list):
        return payload
    return []


def main() -> int:
    session = make_bse_session()
    end = date.today()
    start = end - timedelta(days=LOOKBACK_DAYS)
    all_rows: list[dict[str, Any]] = []
    for page in range(1, PAGE_LIMIT + 1):
        try:
            rows = fetch_page(session, start, end, page)
        except requests.RequestException as e:
            log(f"fetch_insider_bse: page {page} failed: {e}")
            break
        if not rows:
            break
        all_rows.extend(rows)
        log(f"fetch_insider_bse: page {page} -> {len(rows)} rows")
        if len(rows) < 100:
            break

    normalised = _normalise(all_rows)
    fetched_ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    payload = {
        "fetched": fetched_ts,
        "source": API_URL,
        "provider": "BSE",
        "rangeFrom": start.isoformat(),
        "rangeTo": end.isoformat(),
        "count": len(normalised),
        "rows": normalised,
    }

    today_iso = end.isoformat()
    write_json(f"insider/daily/{today_iso}.json", payload)
    write_json("insider/latest.json", payload)
    log(f"fetch_insider_bse: wrote {len(normalised)} rows for {start} -> {end}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
