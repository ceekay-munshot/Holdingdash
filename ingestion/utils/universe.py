"""Resolve the working universe of NSE symbols.

Supports several tiers, fetched live from NSE archives (no Cloudflare wall):

  NIFTY50   — top 50 by market cap (default for testing)
  NIFTY100  — top 100
  NIFTY500  — top 500 (default for the weekly cron)
  ALL       — every active NSE-listed equity (~2000)
  Custom    — comma-separated symbols (e.g. "RELIANCE,TCS,INFY")

Sources:
  https://nsearchives.nseindia.com/content/indices/ind_nifty50list.csv
  https://nsearchives.nseindia.com/content/indices/ind_nifty100list.csv
  https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv

NSE constituent lists rotate roughly twice a year; we re-fetch them
each time this is called rather than caching.
"""
from __future__ import annotations

import csv
import io
from typing import Iterable

from .http import make_session, warmup_nse

INDEX_URLS = {
    "NIFTY50": "https://nsearchives.nseindia.com/content/indices/ind_nifty50list.csv",
    "NIFTY100": "https://nsearchives.nseindia.com/content/indices/ind_nifty100list.csv",
    "NIFTY200": "https://nsearchives.nseindia.com/content/indices/ind_nifty200list.csv",
    "NIFTY500": "https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv",
}

# Hardcoded NIFTY 50 fallback (mirrors NSE's constituent list as of 2026)
NIFTY_50_FALLBACK: list[str] = [
    "RELIANCE", "HDFCBANK", "ICICIBANK", "INFY", "TCS", "BHARTIARTL", "ITC",
    "SBIN", "HINDUNILVR", "LT", "BAJFINANCE", "AXISBANK", "KOTAKBANK", "HCLTECH",
    "MARUTI", "ASIANPAINT", "SUNPHARMA", "TITAN", "NTPC", "POWERGRID", "WIPRO",
    "ULTRACEMCO", "M&M", "TATAMOTORS", "TATASTEEL", "NESTLEIND", "JSWSTEEL",
    "ONGC", "GRASIM", "INDUSINDBK", "ADANIENT", "ADANIPORTS", "COALINDIA",
    "DIVISLAB", "TECHM", "BAJAJFINSV", "BPCL", "HDFCLIFE", "SBILIFE", "HEROMOTOCO",
    "CIPLA", "BRITANNIA", "EICHERMOT", "DRREDDY", "APOLLOHOSP", "TATACONSUM",
    "BAJAJ-AUTO", "LTIM", "HINDALCO", "UPL",
]


def _from_csv(text: str) -> list[str]:
    reader = csv.DictReader(io.StringIO(text))
    out: list[str] = []
    for row in reader:
        clean = {k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in row.items()}
        sym = clean.get("Symbol") or clean.get("symbol") or clean.get("SYMBOL")
        if sym:
            out.append(sym.upper())
    return out


def _fetch_index(name: str) -> list[str]:
    url = INDEX_URLS.get(name)
    if not url:
        return []
    s = make_session()
    warmup_nse(s)
    try:
        r = s.get(url, headers={"Referer": "https://www.nseindia.com/"}, timeout=30)
        if r.status_code == 200 and r.content:
            return _from_csv(r.content.decode("utf-8-sig", errors="replace"))
    except Exception:
        return []
    return []


def _from_equity_master(equity_master: dict | None) -> list[str]:
    if not equity_master:
        return []
    out: list[str] = []
    for c in equity_master.get("companies", []):
        if c.get("series") in ("EQ", "BE", "BZ") and c.get("symbol"):
            out.append(c["symbol"].upper())
    return out


def resolve(universe: str, equity_master: dict | None = None) -> list[str]:
    """Resolve a universe specifier into a list of NSE symbols.

    Args:
      universe: "NIFTY50" | "NIFTY100" | "NIFTY200" | "NIFTY500" | "ALL" | "SYM1,SYM2,..."
      equity_master: optional pre-loaded NSE equity master JSON (for ALL)
    """
    u = (universe or "").strip().upper()
    if not u or u == "NIFTY50":
        symbols = _fetch_index("NIFTY50") or NIFTY_50_FALLBACK
        return _dedupe(symbols)
    if u in INDEX_URLS:
        symbols = _fetch_index(u)
        if symbols:
            return _dedupe(symbols)
        # If NIFTY100/200/500 fetch fails, fall back to NIFTY50
        return _dedupe(NIFTY_50_FALLBACK)
    if u == "ALL":
        symbols = _from_equity_master(equity_master)
        return _dedupe(symbols) if symbols else _dedupe(NIFTY_50_FALLBACK)
    # treat as comma-separated custom list
    return _dedupe([s.strip().upper() for s in u.split(",") if s.strip()])


def _dedupe(items: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in items:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out
