"""One-off probe to figure out what BSE actually returns for insider trades.

Phase 1 of the live-insider buildout. NOT part of the production data flow —
runs via .github/workflows/probe-bse-insider.yml, prints to the job log,
AND commits a JSON findings file back to this branch so the dev workflow
can read the structured output (the worker doesn't expose log APIs).

Three checks, all routed via BSE_PROXY_URL Worker:
  1. AnnSubCategoryGetData/w with strCat="Insider Trading / SAST" — the
     endpoint the current fetch_insider_bse.py uses. Confirms proxy path
     and dumps the FULL key set of the first row so we can map fields.
  2. Speculative richer endpoints (InsiderTrading_New/w etc.) — would give
     per-trade structured data if exposed.
  3. Fetch one PDF attachment — verify URL pattern and that the attachment
     domain (www.bseindia.com) is reachable from Actions IPs.

Output file: ingestion/debug/probe_bse_insider_output.json
"""
from __future__ import annotations

import json
import os
import sys
import urllib.parse
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

PROXY = os.environ.get("BSE_PROXY_URL")
SECRET = os.environ.get("BSE_PROXY_SECRET")
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "debug" / "probe_bse_insider_output.json"

FINDINGS: dict = {
    "ranAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "proxySet": False,
    "secretSet": False,
    "probe1a": None,
    "probe1b": None,
    "probe2": [],
    "probe3": None,
}


def call(path: str, params: dict[str, str], session: requests.Session) -> tuple[int, str, str]:
    """GET via proxy. Returns (http_status, upstream_status, body_text)."""
    if not PROXY:
        return (0, "no-proxy", "BSE_PROXY_URL not set")
    base = f"{PROXY.rstrip('/')}/bse"
    qs = [("path", path)] + list(params.items())
    url = base + "?" + urllib.parse.urlencode(qs, quote_via=urllib.parse.quote)
    headers = {"Accept": "application/json, */*"}
    if SECRET:
        headers["X-Proxy-Secret"] = SECRET
    try:
        r = session.get(url, headers=headers, timeout=45)
        upstream = r.headers.get("X-Upstream-Status", "?")
        return (r.status_code, upstream, r.text)
    except requests.RequestException as e:
        return (0, "error", f"{type(e).__name__}: {e}")


def probe_anncat(session: requests.Session, start: str, end: str, *, label: str) -> dict:
    print(f"\n=== Probe 1{label}: AnnSubCategoryGetData  {start} → {end} ===", flush=True)
    params = {
        "pageno": "1",
        "strCat": "Insider Trading / SAST",
        "strPrevDate": start,
        "strToDate": end,
        "strScrip": "",
        "strSearch": "P",
        "strType": "C",
        "subcategory": "-1",
    }
    status, upstream, body = call("/BseIndiaAPI/api/AnnSubCategoryGetData/w", params, session)
    print(f"  HTTP {status}  upstream={upstream}  body_len={len(body)}", flush=True)
    finding: dict = {
        "range": [start, end],
        "httpStatus": status,
        "upstreamStatus": upstream,
        "bodyLen": len(body),
        "rowCount": 0,
        "firstRowKeys": [],
        "firstRow": None,
        "sampleHeadlines": [],
    }
    if status != 200:
        print(f"  body[:500]: {body[:500]}", flush=True)
        finding["bodySnippet"] = body[:1500]
        return {"finding": finding, "first": {}}
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        print(f"  not JSON. body[:300]: {body[:300]}", flush=True)
        finding["error"] = "not-json"
        finding["bodySnippet"] = body[:1500]
        return {"finding": finding, "first": {}}
    print(f"  top-level type: {type(data).__name__}", flush=True)
    table = None
    if isinstance(data, dict):
        print(f"  top-level keys: {list(data.keys())}", flush=True)
        finding["topLevelKeys"] = list(data.keys())
        table = data.get("Table")
        if table is None:
            for k in ("data", "Result", "result", "rows"):
                if k in data:
                    table = data[k]
                    print(f"  using key '{k}' for rows", flush=True)
                    finding["rowsKey"] = k
                    break
    else:
        table = data
    if not isinstance(table, list) or not table:
        print(f"  no row list found. raw[:600]: {body[:600]}", flush=True)
        finding["error"] = "empty-table"
        finding["bodySnippet"] = body[:1500]
        return {"finding": finding, "first": {}}
    first = table[0] if isinstance(table[0], dict) else {}
    print(f"  rows: {len(table)}", flush=True)
    finding["rowCount"] = len(table)
    if first:
        print(f"  FIRST ROW KEYS ({len(first)}): {list(first.keys())}", flush=True)
        print(f"  FIRST ROW DUMP:\n{json.dumps(first, indent=2, default=str)[:2500]}", flush=True)
        finding["firstRowKeys"] = list(first.keys())
        finding["firstRow"] = first
        print("\n  SAMPLE HEADLINES:", flush=True)
        for r in table[:8]:
            if isinstance(r, dict):
                hdr = r.get("HEADLINE") or r.get("NEWSSUB") or r.get("Headline") or ""
                scrip = r.get("SCRIP_CD") or r.get("scripcd") or ""
                comp = r.get("SLONGNAME") or r.get("CompanyName") or ""
                dt = r.get("NEWS_DT") or r.get("DT_TM") or ""
                line = f"[{dt}] {scrip} {str(comp)[:30]}: {str(hdr)[:140]}"
                print(f"    {line}", flush=True)
                finding["sampleHeadlines"].append(line)
    return {"finding": finding, "first": first}


def probe_alternate_endpoints(session: requests.Session, scripcode: str) -> None:
    print(f"\n=== Probe 2: alternate insider endpoints (scrip={scripcode or '(none)'}) ===", flush=True)
    today = date.today().strftime("%Y%m%d")
    fortnight = (date.today() - timedelta(days=21)).strftime("%Y%m%d")
    # Candidates inferred from BSE corporates Insider_Trading_Reg7.aspx XHR
    # patterns and AnnSubCategoryGetData subcategory variants. All speculative
    # except the last (subcategory filter on the verified endpoint).
    candidates = [
        ("/BseIndiaAPI/api/InsiderTrading_New/w", {
            "Scripcode": scripcode,
            "Fdate": fortnight,
            "Tdate": today,
            "Sno": "",
            "pageno": "1",
        }),
        ("/BseIndiaAPI/api/InsiderTradingData/w", {
            "scripcd": scripcode,
            "fromdate": fortnight,
            "todate": today,
        }),
        ("/BseIndiaAPI/api/InsiderTrading/w", {
            "scripcode": scripcode,
            "FromDate": fortnight,
            "ToDate": today,
        }),
        ("/BseIndiaAPI/api/SearchSastCompanyEbo/w", {
            "scripcode": scripcode,
            "fdate": fortnight,
            "tdate": today,
        }),
        # Verified endpoint, but with a structured PIT subcategory filter
        ("/BseIndiaAPI/api/AnnSubCategoryGetData/w", {
            "pageno": "1",
            "strCat": "Insider Trading / SAST",
            "strPrevDate": fortnight,
            "strToDate": today,
            "strScrip": scripcode,
            "strSearch": "P",
            "strType": "C",
            "subcategory": "Acquisition/Disposal under SEBI (Prohibition of Insider Trading) Regulations, 2015",
        }),
    ]
    for path, params in candidates:
        print(f"\n  → GET {path}", flush=True)
        status, upstream, body = call(path, params, session)
        snippet = body[:600].replace("\n", " ").replace("\r", " ")
        print(f"    HTTP {status} upstream={upstream} body_len={len(body)}", flush=True)
        print(f"    body[:600]: {snippet}", flush=True)
        entry: dict = {
            "path": path,
            "params": params,
            "httpStatus": status,
            "upstreamStatus": upstream,
            "bodyLen": len(body),
            "bodySnippet": body[:1200],
        }
        if status == 200 and len(body) > 50 and body.lstrip().startswith(("{", "[")):
            try:
                data = json.loads(body)
                if isinstance(data, dict):
                    print(f"    keys: {list(data.keys())}", flush=True)
                    entry["topLevelKeys"] = list(data.keys())
                    for k in ("Table", "data", "Result"):
                        v = data.get(k)
                        if isinstance(v, list) and v and isinstance(v[0], dict):
                            print(f"    {k}[0] keys: {list(v[0].keys())}", flush=True)
                            print(f"    {k}[0] dump: {json.dumps(v[0], indent=2, default=str)[:800]}", flush=True)
                            entry["rowsKey"] = k
                            entry["firstRowKeys"] = list(v[0].keys())
                            entry["firstRow"] = v[0]
                            break
                elif isinstance(data, list) and data and isinstance(data[0], dict):
                    print(f"    [0] keys: {list(data[0].keys())}", flush=True)
                    print(f"    [0] dump: {json.dumps(data[0], indent=2, default=str)[:800]}", flush=True)
                    entry["firstRowKeys"] = list(data[0].keys())
                    entry["firstRow"] = data[0]
            except json.JSONDecodeError:
                pass
        FINDINGS["probe2"].append(entry)


def probe_pdf(session: requests.Session, first_row: dict) -> None:
    print(f"\n=== Probe 3: PDF attachment ===", flush=True)
    attach = (
        first_row.get("ATTACHMENTNAME")
        or first_row.get("AttachmentName")
        or first_row.get("attachment")
        or ""
    )
    pdf_finding: dict = {"attachment": attach, "attempts": []}
    if not attach:
        print(f"  no attachment field on first row. keys: {list(first_row.keys())}", flush=True)
        pdf_finding["error"] = "no-attachment-field"
        FINDINGS["probe3"] = pdf_finding
        return
    candidates = [
        f"https://www.bseindia.com/xml-data/corpfiling/AttachLive/{attach}",
        f"https://www.bseindia.com/xml-data/corpfiling/AttachHis/{attach}",
    ]
    for url in candidates:
        print(f"\n  → GET {url}", flush=True)
        attempt: dict = {"url": url}
        try:
            r = session.get(
                url,
                timeout=30,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                    "Referer": "https://www.bseindia.com/",
                },
            )
            ctype = r.headers.get("Content-Type", "")
            print(f"    HTTP {r.status_code}  content-type={ctype}  bytes={len(r.content)}", flush=True)
            print(f"    first 24 bytes (hex): {r.content[:24].hex()}", flush=True)
            is_pdf = r.content.startswith(b"%PDF")
            print(f"    starts with %PDF: {is_pdf}", flush=True)
            attempt.update({
                "httpStatus": r.status_code,
                "contentType": ctype,
                "bytes": len(r.content),
                "first24Hex": r.content[:24].hex(),
                "isPdf": is_pdf,
            })
            pdf_finding["attempts"].append(attempt)
            if r.status_code == 200 and is_pdf:
                FINDINGS["probe3"] = pdf_finding
                return
        except requests.RequestException as e:
            print(f"    {type(e).__name__}: {e}", flush=True)
            attempt["error"] = f"{type(e).__name__}: {e}"
            pdf_finding["attempts"].append(attempt)
    FINDINGS["probe3"] = pdf_finding


def main() -> int:
    print(f"PROXY = {PROXY or '(unset)'}", flush=True)
    print(f"SECRET set: {bool(SECRET)}", flush=True)
    FINDINGS["proxySet"] = bool(PROXY)
    FINDINGS["secretSet"] = bool(SECRET)
    session = requests.Session()
    # Probe 1a — Dec 2024 (definitely-historical, definitely has filings)
    hist = probe_anncat(session, "20241215", "20241222", label="a")
    FINDINGS["probe1a"] = hist["finding"]
    # Probe 1b — last 21 days against real Actions runner clock
    today_str = date.today().strftime("%Y%m%d")
    three_weeks = (date.today() - timedelta(days=21)).strftime("%Y%m%d")
    recent = probe_anncat(session, three_weeks, today_str, label="b")
    FINDINGS["probe1b"] = recent["finding"]

    first = hist.get("first") or recent.get("first") or {}
    scrip = ""
    if first:
        scrip = str(first.get("SCRIP_CD") or first.get("scripcd") or "").strip()
    probe_alternate_endpoints(session, scrip)

    if first:
        probe_pdf(session, first)
    else:
        print("\n=== Probe 3 skipped (no row from probe 1) ===", flush=True)
        FINDINGS["probe3"] = {"error": "no-row-from-probe-1"}

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(FINDINGS, f, indent=2, default=str)
    print(f"\nWrote findings → {OUTPUT_PATH}", flush=True)
    print("\n=== Probe complete ===", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
