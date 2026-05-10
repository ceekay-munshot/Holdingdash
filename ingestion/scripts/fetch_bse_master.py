"""Build the BSE scrip master (BSE code per ISIN) so we can map NSE symbols
→ BSE codes for the shareholding pattern fetcher.

The previous version hit BSE's `ListofScripCode/w` API which proved
unreliable on first run. The new approach uses BSE's **daily equity
bhavcopy**, which is a static CSV download served from bseindia.com.
It includes SC_CODE (BSE code), SC_NAME, and ISIN_CODE per row — every
equity active that trading day. Static files are far more robust than
JSON APIs behind Cloudflare.

We walk back day-by-day to find the most recent available bhavcopy
(handles weekends/holidays). For redundancy, we also try the JSON API
as a secondary source.

Output:
  bse_master.json      — { updated, source, count, scrips: [...] }
  nse_to_bse.json      — { updated, count, mapping: { "RELIANCE": "500325", ... } }
"""
from __future__ import annotations

import csv
import io
import sys
import zipfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ingestion.utils.bse import make_bse_session  # noqa: E402
from ingestion.utils.http import make_session, warmup_nse  # noqa: E402
from ingestion.utils.storage import read_json, write_json, log  # noqa: E402

# Primary source: BSE daily equity bhavcopy CSV (static download)
BHAVCOPY_NEW = (
    "https://www.bseindia.com/download/BhavCopy/Equity/"
    "BhavCopy_BSE_CM_0_0_0_{ymd}_F_0000.CSV"
)
BHAVCOPY_NEW_ZIP = (
    "https://www.bseindia.com/download/BhavCopy/Equity/"
    "BhavCopy_BSE_CM_0_0_0_{ymd}_F_0000.CSV.zip"
)
# Older format
BHAVCOPY_OLD_ZIP = (
    "https://www.bseindia.com/download/BhavCopy/Equity/EQ_ISINCODE_{ddmmyy}.zip"
)

# Secondary: JSON API
API_URL = "https://api.bseindia.com/BseIndiaAPI/api/ListofScripCode/w"

MAX_LOOKBACK = 7


def _parse_bhavcopy_csv(text: str) -> list[dict[str, Any]]:
    reader = csv.DictReader(io.StringIO(text))
    out: list[dict[str, Any]] = []
    for row in reader:
        clean = {k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in row.items()}
        code = clean.get("FinInstrmId") or clean.get("SC_CODE") or clean.get("TckrSymb") or ""
        isin = clean.get("ISIN") or clean.get("ISIN_CODE") or clean.get("ISINCode") or ""
        name = clean.get("FinInstrmNm") or clean.get("SC_NAME") or clean.get("FinInstrmFullNm") or ""
        group = clean.get("FinInstrmTp") or clean.get("SC_GROUP") or clean.get("SctySrs") or ""
        if not code or not isin:
            continue
        out.append(
            {
                "scripCode": str(code).strip(),
                "scripName": name.strip(),
                "isin": isin.strip(),
                "group": group.strip(),
                "status": "Active",
            }
        )
    return out


def _try_csv(session: requests.Session, url: str) -> str | None:
    try:
        r = session.get(url, timeout=30)
        if r.status_code == 200 and r.content:
            return r.content.decode("utf-8-sig", errors="replace")
    except requests.RequestException:
        return None
    return None


def _try_zip(session: requests.Session, url: str) -> str | None:
    try:
        r = session.get(url, timeout=30)
        if r.status_code == 200 and r.content:
            try:
                with zipfile.ZipFile(io.BytesIO(r.content)) as z:
                    name = next((n for n in z.namelist() if n.lower().endswith(".csv")), None)
                    if name:
                        return z.read(name).decode("utf-8-sig", errors="replace")
            except zipfile.BadZipFile:
                return None
    except requests.RequestException:
        return None
    return None


def fetch_from_bhavcopy() -> list[dict[str, Any]]:
    """Walk back day-by-day looking for the latest available BSE bhavcopy."""
    session = make_bse_session()
    cursor = date.today()
    for _ in range(MAX_LOOKBACK):
        # skip weekends
        if cursor.weekday() >= 5:
            cursor -= timedelta(days=1)
            continue
        ymd = cursor.strftime("%Y%m%d")
        ddmmyy = cursor.strftime("%d%m%y")
        # Try direct CSV first (smallest), then zipped, then old format
        for url, fetcher in [
            (BHAVCOPY_NEW.format(ymd=ymd), _try_csv),
            (BHAVCOPY_NEW_ZIP.format(ymd=ymd), _try_zip),
            (BHAVCOPY_OLD_ZIP.format(ddmmyy=ddmmyy), _try_zip),
        ]:
            text = fetcher(session, url)
            if text:
                rows = _parse_bhavcopy_csv(text)
                if rows:
                    log(f"fetch_bse_master: bhavcopy {cursor.isoformat()} -> {len(rows)} scrips")
                    return rows
        cursor -= timedelta(days=1)
    return []


def fetch_from_api() -> list[dict[str, Any]]:
    """Fallback: JSON API. Less reliable than bhavcopy."""
    session = make_bse_session()
    try:
        r = session.get(API_URL, timeout=45)
        r.raise_for_status()
        payload = r.json()
    except requests.RequestException as e:
        log(f"fetch_bse_master: API fallback failed: {e}")
        return []
    if isinstance(payload, dict):
        raw = payload.get("Table") or payload.get("data") or []
    else:
        raw = payload
    out: list[dict[str, Any]] = []
    for r_ in raw:
        code = r_.get("SCRIP_CD") or r_.get("scripcode")
        if not code:
            continue
        out.append(
            {
                "scripCode": str(code),
                "scripId": (r_.get("SCRIP_ID") or r_.get("scripid") or "").strip(),
                "isin": (r_.get("ISIN_NUMBER") or r_.get("ISINNumber") or r_.get("isin") or "").strip(),
                "scripName": (r_.get("SCRIP_NAME") or r_.get("scripname") or "").strip(),
                "group": (r_.get("GROUP") or r_.get("group") or "").strip(),
                "status": (r_.get("STATUS") or r_.get("status") or "").strip(),
            }
        )
    return out


def build_nse_to_bse(bse_master: list[dict[str, Any]]) -> dict[str, str]:
    nse_master = read_json("equity_master.json", default=None)
    if not nse_master or "companies" not in nse_master:
        log("fetch_bse_master: nse equity_master.json missing — run fetch_equity_master first")
        return {}

    bse_by_isin: dict[str, str] = {}
    for entry in bse_master:
        isin = entry.get("isin")
        code = entry.get("scripCode")
        if not (isin and code):
            continue
        if isin not in bse_by_isin or (entry.get("status", "").lower().startswith("active")):
            bse_by_isin[isin] = code

    mapping: dict[str, str] = {}
    for company in nse_master["companies"]:
        isin = company.get("isin")
        symbol = company.get("symbol")
        if isin and symbol and isin in bse_by_isin:
            mapping[symbol] = bse_by_isin[isin]
    return mapping


def main() -> int:
    # Make sure we have an NSE equity master first (needed for the join)
    if not read_json("equity_master.json"):
        log("fetch_bse_master: no NSE equity_master.json yet, fetching it ...")
        try:
            session = make_session()
            warmup_nse(session)
            from ingestion.scripts.fetch_equity_master import main as fetch_eq

            fetch_eq()
        except Exception as e:
            log(f"fetch_bse_master: nse fetch failed: {e}")

    log("fetch_bse_master: trying BSE bhavcopy (primary) ...")
    bse = fetch_from_bhavcopy()
    if not bse:
        log("fetch_bse_master: bhavcopy unavailable, trying JSON API ...")
        bse = fetch_from_api()
    if not bse:
        log("fetch_bse_master: ERROR — no BSE data from any source")
        # Write empty so downstream scripts can detect and skip gracefully
        empty_ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
        write_json("bse_master.json", {"updated": empty_ts, "count": 0, "scrips": [], "error": "no source available"})
        write_json("nse_to_bse.json", {"updated": empty_ts, "count": 0, "mapping": {}, "error": "no BSE master"})
        return 0

    fetched_ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    write_json(
        "bse_master.json",
        {"updated": fetched_ts, "source": "BSE bhavcopy", "count": len(bse), "scrips": bse},
    )
    log(f"fetch_bse_master: wrote {len(bse)} BSE scrips")

    mapping = build_nse_to_bse(bse)
    write_json(
        "nse_to_bse.json",
        {"updated": fetched_ts, "count": len(mapping), "mapping": mapping},
    )
    log(f"fetch_bse_master: joined NSE→BSE for {len(mapping)} symbols")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
