"""Fetch the full NSE equity master list (~2000+ companies).

Source: https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv

This is THE list of all active NSE equity series. It's a simple CSV
served from the archive subdomain (no Cloudflare bot wall). We
normalise the columns and write to data/equity_master.json on the data
branch.

Output schema:
{
  "updated": "ISO-8601 UTC",
  "count": int,
  "companies": [
    {
      "symbol": "RELIANCE",         # NSE ticker without suffix
      "ticker": "RELIANCE.NS",      # Yahoo-style ticker
      "name": "Reliance Industries Limited",
      "isin": "INE002A01018",
      "series": "EQ",
      "listingDate": "1995-11-29",
      "faceValue": 10,
      "marketLot": 1,
      "paidUpValue": 10
    },
    ...
  ]
}
"""
from __future__ import annotations

import csv
import io
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.http import make_session, get, warmup_nse  # noqa: E402
from utils.storage import write_json, log  # noqa: E402

NSE_EQUITY_MASTER_URL = (
    "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"
)


def _parse_int(v: str) -> int | None:
    try:
        return int(v.strip())
    except (TypeError, ValueError):
        return None


def _parse_date(v: str) -> str | None:
    """NSE returns dates like '29-NOV-1995'. Normalise to ISO YYYY-MM-DD."""
    v = (v or "").strip()
    if not v:
        return None
    try:
        return datetime.strptime(v, "%d-%b-%Y").date().isoformat()
    except ValueError:
        try:
            return datetime.strptime(v, "%d/%m/%Y").date().isoformat()
        except ValueError:
            return None


def fetch() -> dict:
    session = make_session()
    warmup_nse(session)
    resp = get(session, NSE_EQUITY_MASTER_URL, referer="https://www.nseindia.com/")

    text = resp.content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))

    companies: list[dict] = []
    for row in reader:
        # NSE column header names tend to have trailing spaces
        clean = {k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in row.items()}
        symbol = clean.get("SYMBOL") or ""
        if not symbol:
            continue
        companies.append(
            {
                "symbol": symbol,
                "ticker": f"{symbol}.NS",
                "name": clean.get("NAME OF COMPANY") or "",
                "series": clean.get("SERIES") or "",
                "listingDate": _parse_date(clean.get("DATE OF LISTING") or ""),
                "paidUpValue": _parse_int(clean.get("PAID UP VALUE") or ""),
                "marketLot": _parse_int(clean.get("MARKET LOT") or ""),
                "isin": clean.get("ISIN NUMBER") or "",
                "faceValue": _parse_int(clean.get("FACE VALUE") or ""),
            }
        )

    return {
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": NSE_EQUITY_MASTER_URL,
        "count": len(companies),
        "companies": companies,
    }


def main() -> int:
    log("fetch_equity_master: downloading EQUITY_L.csv ...")
    data = fetch()
    out = write_json("equity_master.json", data, pretty=False)
    log(f"fetch_equity_master: wrote {data['count']} companies -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
