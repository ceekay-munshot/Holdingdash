"""Parse SAST Reg 29(1)/29(2) and Reg 31(1)/31(2) PDFs into structured fields.

The BSE AnnSubCategoryGetData/w feed gives filing-level metadata (headline,
subcategory, PDF URL) but NOT the per-trade details that make the dashboard
useful (who acquired/disposed, how many shares, at what %). Those live inside
the PDF attached to each filing — a SEBI-mandated form with consistent
layout per regulation.

This script:
  1. Reads insider/latest.json (the snapshot fetch_insider_bse just wrote).
  2. For each row in a parseable subcategory (currently SAST Reg 29 and
     Reg 31), looks up insider/parsed_pdfs/{newsId}.json — a per-PDF cache.
  3. On a cache miss: downloads the PDF, extracts text with pdfplumber, runs
     a subcategory-specific regex parser, writes the result to the cache.
     Failures cache an empty {"parseStatus":"failed", ...} so we don't keep
     re-downloading unparseable PDFs.
  4. Merges the parsed fields back into the row in-place and rewrites
     insider/latest.json and insider/daily/{today}.json.

Cache shape (insider/parsed_pdfs/{newsId}.json):
  {
    "parseStatus": "parsed" | "failed" | "skipped",
    "parserVersion": 1,
    "fetchedAt": "...",
    "subcategoryParsed": "Reg29" | "Reg31",
    "acquirer": "...",
    "isPromoter": bool | null,
    "txnType": "Acquisition" | "Disposal" | "" ,
    "mode": "Market purchase" | "Off-market" | ...,
    "transactionDate": "YYYY-MM-DD" | "",
    "sharesBefore": int | null,
    "pctBefore": float | null,
    "sharesTransacted": int | null,
    "pctTransacted": float | null,
    "sharesAfter": int | null,
    "pctAfter": float | null,
    "rawTextHead": "first 800 chars for debugging on parse failures",
  }

Bump PARSER_VERSION to invalidate the cache when the parser logic changes.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import date, datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any

import pdfplumber  # type: ignore[import-untyped]
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from ingestion.utils.storage import out_root, read_json, write_json, log  # noqa: E402

PARSER_VERSION = 1
HTTP_TIMEOUT = 30
DOWNLOAD_DELAY = 0.4  # seconds — gentle on BSE
# Per-run cap. At ~2.5s per PDF (download + extract + parse + sleep), 400
# rows ≈ 17 min — fits the 25-min workflow budget alongside the other steps.
# Initial cold-cache backfill takes ~3 daily runs to cover the full lookback;
# steady-state incremental volume is ~30–50 new filings per day so a single
# run handles it comfortably.
MAX_NEW_PARSES_PER_RUN = 400

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)


def _is_reg29(subcat: str) -> bool:
    s = (subcat or "").lower()
    return "reg. 29" in s or "regulation 29" in s


def _is_reg31(subcat: str) -> bool:
    s = (subcat or "").lower()
    return "reg. 31" in s or "regulation 31" in s


def _clean(s: str | None) -> str:
    if not s:
        return ""
    return re.sub(r"\s+", " ", s).strip()


def _to_int(s: str | None) -> int | None:
    if not s:
        return None
    cleaned = re.sub(r"[^\d-]", "", s)
    if not cleaned or cleaned == "-":
        return None
    try:
        return int(cleaned)
    except ValueError:
        return None


def _to_float(s: str | None) -> float | None:
    if not s:
        return None
    cleaned = s.replace(",", "").replace("%", "").strip()
    if not cleaned or cleaned in ("-", "--", "NA", "N/A"):
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _to_iso_date(s: str | None) -> str:
    """'25-Apr-2026' / '25/04/2026' / '2026-04-25' → '2026-04-25'. Empty on fail."""
    if not s:
        return ""
    s = s.strip()
    # ISO already
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return m.group(0)
    # DD-Mon-YYYY
    months = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    }
    m = re.match(r"^(\d{1,2})[\s\-/]+([A-Za-z]{3,9})[\s\-/]+(\d{4})", s)
    if m:
        d, mon, y = m.group(1), m.group(2)[:3].lower(), m.group(3)
        if mon in months:
            return f"{int(y):04d}-{months[mon]:02d}-{int(d):02d}"
    # DD-MM-YYYY or DD/MM/YYYY
    m = re.match(r"^(\d{1,2})[\s\-/]+(\d{1,2})[\s\-/]+(\d{4})", s)
    if m:
        d, mon, y = m.group(1), m.group(2), m.group(3)
        return f"{int(y):04d}-{int(mon):02d}-{int(d):02d}"
    return ""


def download_pdf(url: str, session: requests.Session) -> bytes | None:
    headers = {"User-Agent": UA, "Referer": "https://www.bseindia.com/"}
    try:
        r = session.get(url, headers=headers, timeout=HTTP_TIMEOUT)
    except requests.RequestException as e:
        log(f"    pdf download {type(e).__name__}: {e}")
        return None
    if r.status_code != 200:
        log(f"    pdf HTTP {r.status_code}")
        return None
    if not r.content.startswith(b"%PDF"):
        log(f"    pdf magic missing (got {r.content[:8].hex()})")
        return None
    return r.content


def extract_text(pdf_bytes: bytes) -> str:
    try:
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            parts: list[str] = []
            for page in pdf.pages[:6]:  # SAST forms are 1-3 pages; cap defensively
                txt = page.extract_text() or ""
                parts.append(txt)
            return "\n".join(parts)
    except Exception as e:
        log(f"    pdfplumber {type(e).__name__}: {e}")
        return ""


# ===== Reg 29(1) / 29(2) parser =====

# The SEBI Reg 29 form has a triple-row table:
#   Before the acquisition / disposal              | shares | %
#   Shares acquired / sold                          | shares | %
#   After the acquisition / disposal                | shares | %
# Different filers render the table differently — sometimes labels span lines,
# sometimes the numbers are on the same row. We extract by anchoring on the
# label phrases and pulling the nearest number + percentage.

NUMBER_RE = r"([\d,]+(?:\.\d+)?)"
PCT_RE = r"([\d.]+)\s*%?"


def parse_reg29(text: str) -> dict[str, Any]:
    """Parse a SAST Reg 29(1)/29(2) form. Returns dict with parseStatus."""
    out: dict[str, Any] = {
        "parseStatus": "failed",
        "subcategoryParsed": "Reg29",
        "acquirer": "",
        "isPromoter": None,
        "txnType": "",
        "mode": "",
        "transactionDate": "",
        "sharesBefore": None, "pctBefore": None,
        "sharesTransacted": None, "pctTransacted": None,
        "sharesAfter": None, "pctAfter": None,
    }
    if not text:
        return out
    norm = re.sub(r"[ \t]+", " ", text)

    # Acquirer name — anchor on "Name(s) of the acquirer" up to the next form
    # label ("Whether ... promoter" / "Mode" / "Name(s) of the").
    m = re.search(
        r"Name\(s\) of the\s+(?:acquirer|Acquirer|Seller|Disposer|person.*?)\b[^\n]*?[:.]?\s*(.+?)\s+(?=PAN|Whether|Mode|Name\(s\)|Date|Address)",
        norm,
        re.IGNORECASE | re.DOTALL,
    )
    if m:
        out["acquirer"] = _clean(m.group(1))[:200]

    # Promoter flag
    m = re.search(
        r"Whether (?:the acquirer|the seller|disposer).*?Promoter.*?(Yes|No)",
        norm,
        re.IGNORECASE | re.DOTALL,
    )
    if m:
        out["isPromoter"] = m.group(1).strip().lower() == "yes"

    # Mode (open market / off-market / preferential / etc.)
    m = re.search(
        r"Mode of\s+(?:acquisition|disposal|acquisition\s*/\s*disposal)[^:\n]*[:.]\s*([^\n]+)",
        norm,
        re.IGNORECASE,
    )
    if m:
        out["mode"] = _clean(m.group(1))[:120]

    # Transaction date
    m = re.search(
        r"Date of\s+(?:acquisition|disposal|acquisition\s*/\s*disposal)[^:\n]*[:.]\s*([0-9A-Za-z\-/\s]+)",
        norm,
        re.IGNORECASE,
    )
    if m:
        out["transactionDate"] = _to_iso_date(_clean(m.group(1)).split("(")[0])

    # The shareholding table — match by row label, capture next two numerics
    # on the same logical row (number, percentage). Different PDFs interleave
    # the columns with text; we use a permissive number-pair search after
    # each label.
    def _grab_pair(label_regex: str) -> tuple[int | None, float | None]:
        m = re.search(
            label_regex + r"[^\n]*?" + NUMBER_RE + r"\s*[^\n%]*?" + PCT_RE,
            norm,
            re.IGNORECASE | re.DOTALL,
        )
        if not m:
            return (None, None)
        return (_to_int(m.group(1)), _to_float(m.group(2)))

    before_re = r"Before the (?:acquisition|disposal|said transaction|sale)"
    txn_re = r"(?:Shares\s*/?\s*Voting rights|Shares|Voting rights)\s+(?:acquired|sold|disposed|acquired\s*/\s*sold)"
    after_re = r"After the (?:acquisition|disposal|said transaction|sale)"

    out["sharesBefore"], out["pctBefore"] = _grab_pair(before_re)
    out["sharesTransacted"], out["pctTransacted"] = _grab_pair(txn_re)
    out["sharesAfter"], out["pctAfter"] = _grab_pair(after_re)

    # Infer txnType from sharesBefore vs sharesAfter, or from form heading.
    if (
        out["sharesBefore"] is not None
        and out["sharesAfter"] is not None
    ):
        diff = out["sharesAfter"] - out["sharesBefore"]
        if diff > 0:
            out["txnType"] = "Acquisition"
        elif diff < 0:
            out["txnType"] = "Disposal"
    if not out["txnType"]:
        if re.search(r"\bdisposal\b", norm, re.IGNORECASE):
            out["txnType"] = "Disposal"
        elif re.search(r"\bacquisition\b", norm, re.IGNORECASE):
            out["txnType"] = "Acquisition"

    # Consider parse successful if we got an acquirer name AND at least one
    # share count. Otherwise the form layout drifted and we should fall back.
    if out["acquirer"] and (
        out["sharesBefore"] is not None
        or out["sharesAfter"] is not None
        or out["sharesTransacted"] is not None
    ):
        out["parseStatus"] = "parsed"

    return out


# ===== Reg 31(1) / 31(2) parser (encumbrance / pledge) =====

def parse_reg31(text: str) -> dict[str, Any]:
    """SAST Reg 31 — pledge / encumbrance. Different fields than Reg 29.

    Key fields:
      - Name of the promoter / PAC
      - Encumbrance type (Pledge / Non-disposal undertaking / Other)
      - Shares already encumbered (count + %)
      - Shares newly encumbered / released
      - Total shares encumbered after
    """
    out: dict[str, Any] = {
        "parseStatus": "failed",
        "subcategoryParsed": "Reg31",
        "acquirer": "",  # promoter name in this context
        "isPromoter": True,
        "txnType": "",   # "Encumbrance" | "Release"
        "mode": "",
        "transactionDate": "",
        "sharesBefore": None, "pctBefore": None,
        "sharesTransacted": None, "pctTransacted": None,
        "sharesAfter": None, "pctAfter": None,
    }
    if not text:
        return out
    norm = re.sub(r"[ \t]+", " ", text)

    # Promoter name
    m = re.search(
        r"Name of\s+(?:the\s+)?(?:promoter|PAC|persons acting in concert)[^:\n]*[:.]\s*(.+?)\s+(?=PAN|Whether|Address|Number|Type|Reason)",
        norm,
        re.IGNORECASE | re.DOTALL,
    )
    if m:
        out["acquirer"] = _clean(m.group(1))[:200]

    # Encumbrance type
    m = re.search(
        r"Type of\s+encumbrance[^:\n]*[:.]\s*([^\n]+)",
        norm,
        re.IGNORECASE,
    )
    if m:
        out["mode"] = _clean(m.group(1))[:120]

    # Date
    m = re.search(
        r"Date of\s+(?:encumbrance|creation|release|invocation)[^:\n]*[:.]\s*([0-9A-Za-z\-/\s]+)",
        norm,
        re.IGNORECASE,
    )
    if m:
        out["transactionDate"] = _to_iso_date(_clean(m.group(1)).split("(")[0])

    # Acquisition/release intent — "creation" → encumbrance; "release"/"invocation" → release
    if re.search(r"\b(?:release|released)\b", norm, re.IGNORECASE):
        out["txnType"] = "Release"
    elif re.search(r"\b(?:creation|created|encumber|pledge)\b", norm, re.IGNORECASE):
        out["txnType"] = "Encumbrance"

    # Encumbered shares — best-effort triple
    def _grab_pair(label_regex: str) -> tuple[int | None, float | None]:
        m = re.search(
            label_regex + r"[^\n]*?" + NUMBER_RE + r"\s*[^\n%]*?" + PCT_RE,
            norm,
            re.IGNORECASE | re.DOTALL,
        )
        if not m:
            return (None, None)
        return (_to_int(m.group(1)), _to_float(m.group(2)))

    out["sharesBefore"], out["pctBefore"] = _grab_pair(r"shares already encumbered|prior\s+encumbrance|pre[\-\s]*existing")
    out["sharesTransacted"], out["pctTransacted"] = _grab_pair(r"shares (?:encumbered|released|created)\s*(?:in this transaction|now)")
    out["sharesAfter"], out["pctAfter"] = _grab_pair(r"total\s+(?:shares\s+)?encumbered|aggregate encumbrance")

    if out["acquirer"] and (
        out["sharesBefore"] is not None
        or out["sharesAfter"] is not None
        or out["sharesTransacted"] is not None
    ):
        out["parseStatus"] = "parsed"

    return out


def parse_pdf(text: str, subcategory: str) -> dict[str, Any]:
    if _is_reg29(subcategory):
        return parse_reg29(text)
    if _is_reg31(subcategory):
        return parse_reg31(text)
    return {"parseStatus": "skipped", "reason": "unsupported subcategory"}


def main() -> int:
    snapshot = read_json("insider/latest.json", default=None)
    if not isinstance(snapshot, dict) or not snapshot.get("rows"):
        log("parse_insider_pdfs: no insider/latest.json — nothing to parse")
        return 0

    rows: list[dict[str, Any]] = snapshot["rows"]
    log(f"parse_insider_pdfs: {len(rows)} rows in snapshot")

    parsed_dir = out_root() / "insider" / "parsed_pdfs"
    parsed_dir.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    stats = {
        "candidates": 0,
        "cache_hits": 0,
        "downloaded": 0,
        "parsed": 0,
        "failed": 0,
        "skipped": 0,
    }

    new_parses = 0
    for row in rows:
        subcat = row.get("subcategory", "") or ""
        url = row.get("attachmentUrl", "")
        news_id = row.get("newsId") or ""
        if not (_is_reg29(subcat) or _is_reg31(subcat)) or not url or not news_id:
            continue
        stats["candidates"] += 1

        cache_path = parsed_dir / f"{news_id}.json"
        cached: dict[str, Any] | None = None
        if cache_path.exists():
            try:
                with cache_path.open("r", encoding="utf-8") as f:
                    cached = json.load(f)
                if cached.get("parserVersion") == PARSER_VERSION:
                    stats["cache_hits"] += 1
                else:
                    cached = None  # version mismatch — re-parse
            except (OSError, json.JSONDecodeError):
                cached = None

        if cached is None:
            if new_parses >= MAX_NEW_PARSES_PER_RUN:
                stats["skipped"] += 1
                continue
            new_parses += 1
            pdf_bytes = download_pdf(url, session)
            stats["downloaded"] += 1
            time.sleep(DOWNLOAD_DELAY)
            if not pdf_bytes:
                cached = {
                    "parseStatus": "failed",
                    "reason": "download",
                    "parserVersion": PARSER_VERSION,
                    "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                }
            else:
                text = extract_text(pdf_bytes)
                parsed = parse_pdf(text, subcat)
                cached = {
                    **parsed,
                    "parserVersion": PARSER_VERSION,
                    "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    "rawTextHead": text[:800] if parsed.get("parseStatus") != "parsed" else "",
                }
            try:
                with cache_path.open("w", encoding="utf-8") as f:
                    json.dump(cached, f, ensure_ascii=False, separators=(",", ":"))
            except OSError as e:
                log(f"    cache write {cache_path.name}: {e}")

        # Merge parsed fields back into row
        status = cached.get("parseStatus")
        if status == "parsed":
            stats["parsed"] += 1
            # Map to existing LiveInsiderRow shape: keep BSE fields as-is,
            # populate the legacy/per-trade fields with parsed values.
            row["insider"] = cached.get("acquirer", "")
            row["txnType"] = cached.get("txnType", "")
            if cached.get("sharesTransacted") is not None:
                row["quantity"] = cached["sharesTransacted"]
            # Add new fields (LiveInsiderRow TS interface will declare these
            # as optional in a follow-up frontend PR — JSON is permissive).
            row["parsedAcquirer"] = cached.get("acquirer", "")
            row["parsedIsPromoter"] = cached.get("isPromoter")
            row["parsedTxnType"] = cached.get("txnType", "")
            row["parsedMode"] = cached.get("mode", "")
            row["parsedTransactionDate"] = cached.get("transactionDate", "")
            row["parsedSharesBefore"] = cached.get("sharesBefore")
            row["parsedPctBefore"] = cached.get("pctBefore")
            row["parsedSharesTransacted"] = cached.get("sharesTransacted")
            row["parsedPctTransacted"] = cached.get("pctTransacted")
            row["parsedSharesAfter"] = cached.get("sharesAfter")
            row["parsedPctAfter"] = cached.get("pctAfter")
            row["parseStatus"] = "parsed"
        else:
            stats["failed"] += 1
            row["parseStatus"] = status or "failed"

    # Update snapshot in place + rewrite daily file
    snapshot["rows"] = rows
    write_json("insider/latest.json", snapshot)
    today_iso = snapshot.get("rangeTo") or date.today().isoformat()
    write_json(f"insider/daily/{today_iso}.json", snapshot)

    log(
        f"parse_insider_pdfs: candidates={stats['candidates']} "
        f"cache_hits={stats['cache_hits']} new_downloads={stats['downloaded']} "
        f"parsed={stats['parsed']} failed={stats['failed']} skipped={stats['skipped']}"
    )
    if stats["candidates"] > 0:
        rate = (stats["parsed"] / stats["candidates"]) * 100
        log(f"parse_insider_pdfs: parse rate {rate:.1f}%")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
