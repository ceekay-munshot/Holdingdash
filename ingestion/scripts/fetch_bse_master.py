"""Build the BSE scrip master (BSE code per ISIN) and an NSE→BSE map.

Source resolution order:
  1. BSE daily equity bhavcopy (static CSV, most reliable)
  2. BSE ListofScripCode JSON API (less reliable)
  3. Hardcoded NIFTY 50 mapping (always works, bundled in repo)

The script **always returns exit code 0** and **always writes
nse_to_bse.json** so downstream `fetch_shareholding.py` can rely on
it. Worst case the mapping has just 50 entries (NIFTY 50), which
matches our smallest universe tier.
"""
from __future__ import annotations

import csv
import io
import sys
import traceback
import zipfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from ingestion.utils.bse import make_bse_session  # noqa: E402
from ingestion.utils.bse_codes import NIFTY50_BSE_CODES  # noqa: E402
from ingestion.utils.storage import read_json, write_json, log  # noqa: E402

# Primary source: BSE daily equity bhavcopy CSV (static download, no API)
BHAVCOPY_URLS = [
    "https://www.bseindia.com/download/BhavCopy/Equity/BhavCopy_BSE_CM_0_0_0_{ymd}_F_0000.CSV",
    "https://www.bseindia.com/download/BhavCopy/Equity/BhavCopy_BSE_CM_0_0_0_{ymd}_F_0000.CSV.zip",
    "https://www.bseindia.com/download/BhavCopy/Equity/EQ_ISINCODE_{ddmmyy}.zip",
]
# Secondary: JSON API (less reliable)
API_URL = "https://api.bseindia.com/BseIndiaAPI/api/ListofScripCode/w"

MAX_LOOKBACK = 10


def _parse_bhavcopy_csv(text: str) -> list[dict[str, Any]]:
    reader = csv.DictReader(io.StringIO(text))
    out: list[dict[str, Any]] = []
    for row in reader:
        clean = {
            (k.strip() if isinstance(k, str) else k): (v.strip() if isinstance(v, str) else v)
            for k, v in row.items()
            if isinstance(k, str)
        }
        # Multiple format variants over time
        code = (
            clean.get("FinInstrmId")
            or clean.get("SC_CODE")
            or clean.get("TckrSymb")
            or clean.get("scripcode")
            or ""
        )
        isin = (
            clean.get("ISIN")
            or clean.get("ISIN_CODE")
            or clean.get("ISINCode")
            or clean.get("ISIN_NO")
            or ""
        )
        name = (
            clean.get("FinInstrmNm")
            or clean.get("SC_NAME")
            or clean.get("FinInstrmFullNm")
            or clean.get("scripname")
            or ""
        )
        group = clean.get("FinInstrmTp") or clean.get("SC_GROUP") or clean.get("SctySrs") or ""
        if not code or not isin:
            continue
        out.append(
            {
                "scripCode": str(code).strip(),
                "scripName": str(name).strip(),
                "isin": str(isin).strip(),
                "group": str(group).strip(),
                "status": "Active",
            }
        )
    return out


def _try_csv(session: requests.Session, url: str) -> str | None:
    try:
        r = session.get(url, timeout=30, allow_redirects=True)
        if r.status_code == 200 and r.content:
            return r.content.decode("utf-8-sig", errors="replace")
    except requests.RequestException as e:
        log(f"  CSV fetch failed: {e}")
    return None


def _try_zip(session: requests.Session, url: str) -> str | None:
    try:
        r = session.get(url, timeout=30, allow_redirects=True)
        if r.status_code == 200 and r.content:
            try:
                with zipfile.ZipFile(io.BytesIO(r.content)) as z:
                    name = next((n for n in z.namelist() if n.lower().endswith(".csv")), None)
                    if name:
                        return z.read(name).decode("utf-8-sig", errors="replace")
            except zipfile.BadZipFile as e:
                log(f"  ZIP open failed: {e}")
                return None
    except requests.RequestException as e:
        log(f"  ZIP fetch failed: {e}")
    return None


def warmup_bse(session: requests.Session) -> None:
    """Seed cookies by hitting BSE homepage first."""
    try:
        session.get("https://www.bseindia.com/", timeout=15)
    except requests.RequestException as e:
        log(f"  BSE warmup failed (non-fatal): {e}")


def fetch_from_bhavcopy() -> list[dict[str, Any]]:
    session = make_bse_session()
    warmup_bse(session)
    cursor = date.today()
    attempts_remaining = MAX_LOOKBACK
    while attempts_remaining > 0:
        if cursor.weekday() >= 5:
            cursor -= timedelta(days=1)
            continue
        ymd = cursor.strftime("%Y%m%d")
        ddmmyy = cursor.strftime("%d%m%y")
        log(f"  trying BSE bhavcopy {cursor.isoformat()} ...")
        for url_pattern in BHAVCOPY_URLS:
            url = url_pattern.format(ymd=ymd, ddmmyy=ddmmyy)
            fetcher = _try_zip if url.lower().endswith(".zip") else _try_csv
            text = fetcher(session, url)
            if text:
                rows = _parse_bhavcopy_csv(text)
                if rows:
                    log(f"  bhavcopy hit: {len(rows)} scrips from {url}")
                    return rows
        attempts_remaining -= 1
        cursor -= timedelta(days=1)
    return []


def fetch_from_api() -> list[dict[str, Any]]:
    session = make_bse_session()
    warmup_bse(session)
    try:
        r = session.get(API_URL, timeout=45)
        r.raise_for_status()
        payload = r.json()
    except requests.RequestException as e:
        log(f"  API fallback failed: {e}")
        return []
    if isinstance(payload, dict):
        raw = payload.get("Table") or payload.get("data") or []
    else:
        raw = payload
    out: list[dict[str, Any]] = []
    for r_ in raw or []:
        if not isinstance(r_, dict):
            continue
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


def fallback_from_hardcoded() -> tuple[list[dict[str, Any]], dict[str, str]]:
    """Always-works fallback: bundled NIFTY 50 BSE codes. No ISINs (we
    don't need them since mapping is already keyed by NSE symbol).
    """
    log(f"  using hardcoded NIFTY 50 fallback ({len(NIFTY50_BSE_CODES)} entries)")
    scrips: list[dict[str, Any]] = [
        {
            "scripCode": code,
            "scripName": symbol,
            "isin": "",
            "group": "A",
            "status": "Active",
            "source": "hardcoded",
        }
        for symbol, code in NIFTY50_BSE_CODES.items()
    ]
    return scrips, dict(NIFTY50_BSE_CODES)


def build_nse_to_bse(bse_master: list[dict[str, Any]]) -> dict[str, str]:
    """Join NSE master (by ISIN) → BSE scrip code."""
    nse_master = read_json("equity_master.json", default=None)
    if not nse_master or "companies" not in nse_master:
        log("  no NSE equity_master.json, skipping ISIN join")
        return {}

    bse_by_isin: dict[str, str] = {}
    for entry in bse_master:
        isin = entry.get("isin")
        code = entry.get("scripCode")
        if not (isin and code):
            continue
        # Prefer Active status when ISINs duplicate
        if isin not in bse_by_isin or str(entry.get("status", "")).lower().startswith("active"):
            bse_by_isin[isin] = code

    mapping: dict[str, str] = {}
    for company in nse_master["companies"]:
        isin = company.get("isin")
        symbol = company.get("symbol")
        if isin and symbol and isin in bse_by_isin:
            mapping[symbol] = bse_by_isin[isin]
    return mapping


def main() -> int:
    log("=" * 60)
    log(f"fetch_bse_master: starting")
    log(f"  CWD: {Path.cwd()}")
    log(f"  OUT_DIR: {Path.cwd()}")  # storage.py uses env or cwd-relative
    log("=" * 60)

    try:
        log("step 1: BSE bhavcopy (primary)")
        bse = fetch_from_bhavcopy()

        if not bse:
            log("step 2: BSE JSON API (fallback)")
            bse = fetch_from_api()

        # Always build mapping from whatever we got
        mapping = build_nse_to_bse(bse) if bse else {}

        if not mapping:
            log("step 3: hardcoded NIFTY 50 fallback")
            bse_fallback, mapping = fallback_from_hardcoded()
            if not bse:
                bse = bse_fallback

        fetched_ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
        write_json(
            "bse_master.json",
            {
                "updated": fetched_ts,
                "count": len(bse),
                "scrips": bse,
                "source": "live" if mapping and len(mapping) > len(NIFTY50_BSE_CODES) else "hardcoded-fallback",
            },
        )
        write_json(
            "nse_to_bse.json",
            {
                "updated": fetched_ts,
                "count": len(mapping),
                "mapping": mapping,
                "source": "live" if len(mapping) > len(NIFTY50_BSE_CODES) else "hardcoded-fallback",
            },
        )
        log(f"fetch_bse_master: DONE — {len(bse)} scrips, {len(mapping)} NSE→BSE mappings")
        return 0
    except Exception as e:
        log(f"fetch_bse_master: UNEXPECTED ERROR: {e}")
        log(traceback.format_exc())
        # Even on a crash, write the hardcoded fallback so downstream
        # scripts can produce some output.
        try:
            bse_fallback, mapping = fallback_from_hardcoded()
            fetched_ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
            write_json(
                "bse_master.json",
                {"updated": fetched_ts, "count": len(bse_fallback), "scrips": bse_fallback,
                 "source": "hardcoded-fallback", "error": str(e)},
            )
            write_json(
                "nse_to_bse.json",
                {"updated": fetched_ts, "count": len(mapping), "mapping": mapping,
                 "source": "hardcoded-fallback", "error": str(e)},
            )
            log("fetch_bse_master: wrote hardcoded fallback after error")
        except Exception as inner:
            log(f"fetch_bse_master: even fallback write failed: {inner}")
        return 0  # always succeed at the workflow level


if __name__ == "__main__":
    raise SystemExit(main())
