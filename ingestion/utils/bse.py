"""BSE-friendly HTTP helpers.

BSE's API endpoints at api.bseindia.com generally don't have the same
Cloudflare bot wall that NSE's main domain has. They DO require a
Referer header pointing at bseindia.com and a real browser user-agent.
"""
from __future__ import annotations

import requests

from .http import BROWSER_UA

BSE_HEADERS = {
    "User-Agent": BROWSER_UA,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.bseindia.com",
    "Referer": "https://www.bseindia.com/",
}


def make_bse_session() -> requests.Session:
    s = requests.Session()
    s.headers.update(BSE_HEADERS)
    return s
