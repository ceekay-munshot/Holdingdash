"""Fetch the daily NSE Bhavcopy and write per-day price snapshot.

NSE switched bhavcopy format in mid-2024. Both URL patterns are tried:

  new: https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_YYYYMMDD_F_0000.csv.zip
  old: https://nsearchives.nseindia.com/content/historical/EQUITIES/{YYYY}/{MMM}/cm{DDMMMYYYY}bhav.csv.zip

Output: data/prices/daily/{YYYY-MM-DD}.json
Schema:
  {
    "date": "YYYY-MM-DD",
    "source": "NSE Bhavcopy",
    "count": int,
    "rows": [
       { "symbol": str, "series": str, "open": float, "high": float,
         "low": float, "close": float, "previousClose": float,
         "volume": int, "value": float, "trades": int }
    ]
  }

If today's bhavcopy is not yet available (weekend, holiday, before 6pm
IST), the script walks back day-by-day up to MAX_LOOKBACK days.
"""
from __future__ import annotations

import argparse
import csv
import io
import sys
import zipfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.http import make_session, warmup_nse  # noqa: E402
from utils.storage import write_json, log  # noqa: E402

NEW_URL = (
    "https://nsearchives.nseindia.com/content/cm/"
    "BhavCopy_NSE_CM_0_0_0_{ymd}_F_0000.csv.zip"
)
OLD_URL = (
    "https://nsearchives.nseindia.com/content/historical/EQUITIES/"
    "{yyyy}/{mmm}/cm{ddmmmyyyy}bhav.csv.zip"
)

MAX_LOOKBACK = 5


def _try_download(session: requests.Session, target: date) -> tuple[str, bytes] | None:
    ymd = target.strftime("%Y%m%d")
    yyyy = target.strftime("%Y")
    mmm = target.strftime("%b").upper()
    ddmmmyyyy = target.strftime("%d%b%Y").upper()

    candidates = [
        ("new", NEW_URL.format(ymd=ymd)),
        ("old", OLD_URL.format(yyyy=yyyy, mmm=mmm, ddmmmyyyy=ddmmmyyyy)),
    ]
    for label, url in candidates:
        try:
            r = session.get(url, headers={"Referer": "https://www.nseindia.com/"}, timeout=30)
            if r.status_code == 200 and r.content:
                return label, r.content
        except requests.RequestException:
            continue
    return None


def _parse_new_format(payload: bytes) -> list[dict]:
    """Parse the post-2024 bhavcopy CSV (UDIFF format)."""
    rows: list[dict] = []
    with zipfile.ZipFile(io.BytesIO(payload)) as z:
        csv_name = next(n for n in z.namelist() if n.lower().endswith(".csv"))
        with z.open(csv_name) as f:
            text = f.read().decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    for r in reader:
        # New format column names (UDIFF spec)
        if (r.get("SctySrs") or "").strip() != "EQ":
            continue
        try:
            rows.append(
                {
                    "symbol": (r.get("TckrSymb") or "").strip(),
                    "series": (r.get("SctySrs") or "").strip(),
                    "open": float(r.get("OpnPric") or 0),
                    "high": float(r.get("HghPric") or 0),
                    "low": float(r.get("LwPric") or 0),
                    "close": float(r.get("ClsPric") or 0),
                    "previousClose": float(r.get("PrvsClsgPric") or 0),
                    "volume": int(float(r.get("TtlTradgVol") or 0)),
                    "value": float(r.get("TtlTrfVal") or 0),
                    "trades": int(float(r.get("TtlNbOfTxsExctd") or 0)),
                }
            )
        except ValueError:
            continue
    return rows


def _parse_old_format(payload: bytes) -> list[dict]:
    """Parse the pre-2024 bhavcopy CSV."""
    rows: list[dict] = []
    with zipfile.ZipFile(io.BytesIO(payload)) as z:
        csv_name = next(n for n in z.namelist() if n.lower().endswith(".csv"))
        with z.open(csv_name) as f:
            text = f.read().decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    for r in reader:
        if (r.get("SERIES") or "").strip() != "EQ":
            continue
        try:
            rows.append(
                {
                    "symbol": (r.get("SYMBOL") or "").strip(),
                    "series": (r.get("SERIES") or "").strip(),
                    "open": float(r.get("OPEN") or 0),
                    "high": float(r.get("HIGH") or 0),
                    "low": float(r.get("LOW") or 0),
                    "close": float(r.get("CLOSE") or 0),
                    "previousClose": float(r.get("PREVCLOSE") or 0),
                    "volume": int(float(r.get("TOTTRDQTY") or 0)),
                    "value": float(r.get("TOTTRDVAL") or 0),
                    "trades": int(float(r.get("TOTALTRADES") or 0)),
                }
            )
        except ValueError:
            continue
    return rows


def fetch_for(target: date) -> dict | None:
    session = make_session()
    warmup_nse(session)
    result = _try_download(session, target)
    if not result:
        return None
    fmt, payload = result
    rows = _parse_new_format(payload) if fmt == "new" else _parse_old_format(payload)
    if not rows:
        return None
    return {
        "date": target.isoformat(),
        "source": "NSE Bhavcopy",
        "format": fmt,
        "fetched": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "count": len(rows),
        "rows": rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", help="YYYY-MM-DD (default: latest available)")
    args = parser.parse_args()

    if args.date:
        target = date.fromisoformat(args.date)
        data = fetch_for(target)
        if not data:
            log(f"fetch_bhavcopy: no data for {target}")
            return 2
    else:
        # Walk back day-by-day from today to find the most recent bhavcopy
        data = None
        for delta in range(0, MAX_LOOKBACK + 1):
            target = date.today() - timedelta(days=delta)
            # Skip weekends quickly
            if target.weekday() >= 5:
                continue
            log(f"fetch_bhavcopy: trying {target} ...")
            data = fetch_for(target)
            if data:
                break
        if not data:
            log("fetch_bhavcopy: no bhavcopy found in lookback window")
            return 2

    iso = data["date"]
    write_json(f"prices/daily/{iso}.json", data, pretty=False)
    # Also update latest pointer
    write_json("prices/latest.json", data, pretty=False)
    log(f"fetch_bhavcopy: wrote {data['count']} rows for {iso}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
