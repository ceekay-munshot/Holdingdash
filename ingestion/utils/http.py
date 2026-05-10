"""NSE-friendly HTTP session with retries and browser-like headers.

NSE serves most data behind Cloudflare bot protection. The reliable
pattern is to (a) hit nseindia.com first to seed cookies, (b) use
real browser headers, (c) retry with exponential backoff on transient
failures. Archive subdomain (nsearchives.nseindia.com) is less
protected and serves most of the static files we need.
"""
from __future__ import annotations

import time
from typing import Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

BASE_HEADERS = {
    "User-Agent": BROWSER_UA,
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


def make_session() -> requests.Session:
    s = requests.Session()
    s.headers.update(BASE_HEADERS)
    retry = Retry(
        total=4,
        backoff_factor=1.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET", "HEAD"),
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=20, pool_maxsize=20)
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    return s


def warmup_nse(session: requests.Session) -> None:
    """Seed cookies by hitting the NSE homepage first."""
    try:
        session.get("https://www.nseindia.com/", timeout=15)
        time.sleep(0.4)
    except Exception:
        # Non-fatal — archive subdomain often works without warmup
        pass


def get(session: requests.Session, url: str, *, referer: Optional[str] = None, timeout: int = 30) -> requests.Response:
    headers = {}
    if referer:
        headers["Referer"] = referer
    resp = session.get(url, headers=headers, timeout=timeout)
    resp.raise_for_status()
    return resp
