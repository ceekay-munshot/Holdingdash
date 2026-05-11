"""Fetch insider trades / SAST filings from BSE via the Cloudflare Worker proxy.

GitHub Actions IPs are blocked by api.bseindia.com when called directly. We
route through BSE_PROXY_URL (the same Worker that handles Screener — see
proxy/src/index.ts). The proxy forwards /BseIndiaAPI/api/* paths transparently
with the right Referer/UA headers.

The BSE "Insider Trading / SAST" feed returns filing intimations (Closure of
Trading Window notices, SAST Reg 29(1)/29(2) disclosures, PIT Reg 7(2)
acquisition/disposal forms). It does NOT return structured per-trade rows —
per-trade detail lives in the PDF attachments. We persist the filing list
with PDF URLs so the frontend can show real BSE activity, and parsing the
PDFs is a follow-up phase.

Output schema:
  Matches what aggregate_per_ticker.aggregate_insider() expects (symbol,
  intimationDate). Legacy fields (insider, quantity, value, type, txnType)
  are kept as empty/0 for backwards-compat with the InsiderTrade frontend
  type — the new filing-level fields (subcategory, headline, attachmentUrl,
  newsId, pdfFlag) are added alongside.

Files written:
  insider/daily/{YYYY-MM-DD}.json
  insider/latest.json
"""
from __future__ import annotations

import os
import sys
import urllib.parse
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from ingestion.utils.storage import read_json, write_json, log  # noqa: E402

PROXY = os.environ.get("BSE_PROXY_URL")
SECRET = os.environ.get("BSE_PROXY_SECRET")

LOOKBACK_DAYS = 90
# BSE's AnnSubCategoryGetData/w caps the result set at ~2000 rows per query,
# regardless of date range. At ~50 filings/day in the "Insider Trading / SAST"
# category that's only ~40 days of history per call — short of our 90-day
# lookback. Fix: split the lookback into 30-day chunks and stitch them back
# together. Each chunk returns ≲ 1500 rows, well under the cap.
CHUNK_DAYS = 30
# Per-chunk page cap. 50 pages × 50 rows/page = 2500 row capacity. At observed
# volume (~50 filings/day × 30 days ≈ 1500), this is ~65% headroom.
PAGE_LIMIT = 50
ATTACH_URL = "https://www.bseindia.com/xml-data/corpfiling/AttachHis/{}"


def call_bse(path: str, params: dict[str, str]) -> dict[str, Any] | None:
    """GET via proxy. Returns parsed JSON or None on any failure."""
    if not PROXY:
        log("fetch_insider_bse: BSE_PROXY_URL not set — cannot reach BSE")
        return None
    qs = [("path", path)] + list(params.items())
    url = f"{PROXY.rstrip('/')}/bse?" + urllib.parse.urlencode(
        qs, quote_via=urllib.parse.quote
    )
    headers = {"Accept": "application/json, */*"}
    if SECRET:
        headers["X-Proxy-Secret"] = SECRET
    try:
        r = requests.get(url, headers=headers, timeout=45)
    except requests.RequestException as e:
        log(f"fetch_insider_bse: {type(e).__name__}: {e}")
        return None
    if r.status_code != 200:
        upstream = r.headers.get("X-Upstream-Status", "?")
        log(f"fetch_insider_bse: HTTP {r.status_code} (upstream {upstream})")
        return None
    try:
        return r.json()
    except ValueError:
        log(f"fetch_insider_bse: non-JSON body, len={len(r.text)}")
        return None


def fetch_filings_page(start: date, end: date, page: int) -> list[dict[str, Any]]:
    params = {
        "pageno": str(page),
        "strCat": "Insider Trading / SAST",
        "strPrevDate": start.strftime("%Y%m%d"),
        "strToDate": end.strftime("%Y%m%d"),
        "strScrip": "",
        "strSearch": "P",
        "strType": "C",
        "subcategory": "-1",
    }
    data = call_bse("/BseIndiaAPI/api/AnnSubCategoryGetData/w", params)
    if not isinstance(data, dict):
        return []
    table = data.get("Table")
    return table if isinstance(table, list) else []


def load_bse_to_nse() -> dict[str, str]:
    """Invert nse_to_bse.json mapping. Empty dict on any failure."""
    raw = read_json("nse_to_bse.json", default=None)
    if not isinstance(raw, dict):
        return {}
    mapping = raw.get("mapping")
    if not isinstance(mapping, dict):
        return {}
    out: dict[str, str] = {}
    for nse, bse in mapping.items():
        if not bse:
            continue
        out[str(bse).strip()] = str(nse).strip()
    return out


def normalise(
    rows: list[dict[str, Any]], bse_to_nse: dict[str, str]
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for r in rows:
        scrip_cd = str(r.get("SCRIP_CD") or "").strip()
        nse_symbol = bse_to_nse.get(scrip_cd, "")
        attachment_name = r.get("ATTACHMENTNAME") or ""
        out.append(
            {
                "symbol": nse_symbol,
                "scripCode": scrip_cd,
                "company": r.get("SLONGNAME") or "",
                # Legacy fields — BSE feed doesn't expose per-trade structure
                "insider": "",
                "category": r.get("CATEGORYNAME") or "Insider Trading / SAST",
                "type": "",
                "txnType": "",
                "quantity": 0,
                "value": 0,
                "fromDate": "",
                "toDate": "",
                # Live BSE filing-level fields
                "headline": r.get("HEADLINE") or r.get("NEWSSUB") or "",
                "subcategory": r.get("SUBCATNAME") or "",
                "intimationDate": r.get("NEWS_DT") or r.get("DT_TM") or "",
                "broadcastDate": r.get("DissemDT") or "",
                "attachmentName": attachment_name,
                "attachmentUrl": ATTACH_URL.format(attachment_name) if attachment_name else "",
                "attachmentBytes": r.get("Fld_Attachsize") or 0,
                "pdfFlag": bool(r.get("PDFFLAG")),
                "newsId": r.get("NEWSID") or "",
            }
        )
    return out


def main() -> int:
    if not PROXY:
        log("fetch_insider_bse: BSE_PROXY_URL not set — exiting 0 (graceful no-op)")
        return 0

    bse_to_nse = load_bse_to_nse()
    log(f"fetch_insider_bse: loaded {len(bse_to_nse)} BSE→NSE mappings")

    end = date.today()
    lookback_start = end - timedelta(days=LOOKBACK_DAYS)

    # Carve the lookback into CHUNK_DAYS-sized windows, newest first. Each
    # window is fetched independently — BSE's API caps total rows per query,
    # so a single 90-day query silently drops the oldest ~50 days.
    chunks: list[tuple[date, date]] = []
    cursor = end
    while cursor > lookback_start:
        chunk_start = max(cursor - timedelta(days=CHUNK_DAYS), lookback_start)
        chunks.append((chunk_start, cursor))
        cursor = chunk_start

    log(f"fetch_insider_bse: fetching {len(chunks)} chunks covering {lookback_start} → {end}")

    all_raw: list[dict[str, Any]] = []
    for ci, (chunk_start, chunk_end) in enumerate(chunks, 1):
        log(f"fetch_insider_bse: chunk {ci}/{len(chunks)} {chunk_start} → {chunk_end}")
        chunk_rows: list[dict[str, Any]] = []
        for page in range(1, PAGE_LIMIT + 1):
            rows = fetch_filings_page(chunk_start, chunk_end, page)
            if not rows:
                log(f"  page {page} empty — chunk done")
                break
            chunk_rows.extend(rows)
            if len(rows) < 50:
                log(f"  page {page} -> {len(rows)} rows (partial, chunk done)")
                break
            log(f"  page {page} -> {len(rows)} rows (cum {len(chunk_rows)})")
        log(f"  chunk {ci} total: {len(chunk_rows)} rows")
        if len(chunk_rows) >= 2000:
            log(
                f"  WARNING: chunk {ci} hit ≥2000 rows — BSE may be capping. "
                f"Consider shrinking CHUNK_DAYS."
            )
        all_raw.extend(chunk_rows)

    # Dedupe by NEWSID — BSE chunk boundaries are inclusive on both ends, so a
    # filing dated exactly on the boundary day appears in both adjacent chunks.
    seen: set[str] = set()
    deduped: list[dict[str, Any]] = []
    for r in all_raw:
        nid = r.get("NEWSID") or ""
        if nid and nid in seen:
            continue
        if nid:
            seen.add(nid)
        deduped.append(r)
    if len(deduped) < len(all_raw):
        log(f"fetch_insider_bse: deduped {len(all_raw)} → {len(deduped)} rows ({len(all_raw) - len(deduped)} boundary dupes)")

    normalised = normalise(deduped, bse_to_nse)
    mapped = sum(1 for r in normalised if r["symbol"])
    log(
        f"fetch_insider_bse: {len(normalised)} filings ({mapped} mapped to NSE symbol)"
    )

    fetched_ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    payload = {
        "fetched": fetched_ts,
        "source": "https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w",
        "provider": "BSE",
        "category": "Insider Trading / SAST",
        "rangeFrom": lookback_start.isoformat(),
        "rangeTo": end.isoformat(),
        "count": len(normalised),
        "rows": normalised,
    }

    today_iso = end.isoformat()
    write_json(f"insider/daily/{today_iso}.json", payload)
    write_json("insider/latest.json", payload)
    log(
        f"fetch_insider_bse: wrote {len(normalised)} filings for {lookback_start} -> {end}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
