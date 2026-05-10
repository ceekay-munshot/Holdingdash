"""Fetch the BSE equity scrip master and build NSE-symbol → BSE-code map.

BSE shareholding APIs require the BSE scrip code (numeric, e.g. 500325
for Reliance). Our universe uses NSE symbols. This script fetches BSE's
list and joins on ISIN to produce a lookup.

Source: https://api.bseindia.com/BseIndiaAPI/api/ListofScripCode/w
Returns JSON: [{ SCRIP_CD, SCRIP_ID, ISIN_NUMBER, FACE_VALUE, ... }]

We also write the full BSE master so future scripts can use it.

Output:
  bse_master.json
  nse_to_bse.json   { "RELIANCE": "500325", ... }
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ingestion.utils.bse import make_bse_session  # noqa: E402
from ingestion.utils.storage import read_json, write_json, log  # noqa: E402

LIST_URL = "https://api.bseindia.com/BseIndiaAPI/api/ListofScripCode/w"


def _normalise(raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for r in raw:
        code = r.get("SCRIP_CD") or r.get("scripcode")
        if not code:
            continue
        out.append(
            {
                "scripCode": str(code),
                "scripId": (r.get("SCRIP_ID") or r.get("scripid") or "").strip(),
                "isin": (r.get("ISIN_NUMBER") or r.get("ISINNumber") or r.get("isin") or "").strip(),
                "scripName": (r.get("SCRIP_NAME") or r.get("scripname") or "").strip(),
                "group": (r.get("GROUP") or r.get("group") or "").strip(),
                "status": (r.get("STATUS") or r.get("status") or "").strip(),
                "faceValue": r.get("FACE_VALUE") or r.get("facevalue"),
                "industry": (r.get("INDUSTRY") or r.get("industry") or "").strip(),
            }
        )
    return out


def fetch_bse_master() -> list[dict[str, Any]]:
    session = make_bse_session()
    r = session.get(LIST_URL, timeout=60)
    r.raise_for_status()
    payload = r.json()
    if isinstance(payload, dict):
        raw = payload.get("Table") or payload.get("data") or []
    else:
        raw = payload
    return _normalise(raw)


def build_nse_to_bse(bse_master: list[dict[str, Any]]) -> dict[str, str]:
    """Join NSE master (by ISIN) → BSE scrip code."""
    nse_master = read_json("equity_master.json", default=None)
    if not nse_master or "companies" not in nse_master:
        log("fetch_bse_master: nse equity_master.json not found, skipping join")
        return {}

    bse_by_isin: dict[str, str] = {}
    for entry in bse_master:
        isin = entry.get("isin")
        code = entry.get("scripCode")
        # Prefer "Active" status if duplicates exist
        if isin and code:
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
    log("fetch_bse_master: pulling BSE scrip list ...")
    bse = fetch_bse_master()
    fetched_ts = datetime.now(timezone.utc).isoformat(timespec="seconds")

    write_json(
        "bse_master.json",
        {"updated": fetched_ts, "source": LIST_URL, "count": len(bse), "scrips": bse},
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
