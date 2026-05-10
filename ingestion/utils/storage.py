"""Storage helpers — writes JSON files to the data branch checkout.

The GitHub Action checks out the `data` branch into a workspace, runs
the ingestion scripts pointing OUT_DIR to that workspace, then commits
and pushes. Locally, OUT_DIR can be any folder.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any


def out_root() -> Path:
    root = os.environ.get("OUT_DIR", "data-out")
    p = Path(root)
    p.mkdir(parents=True, exist_ok=True)
    return p


def write_json(rel_path: str, payload: Any, *, pretty: bool = False) -> Path:
    """Write JSON to OUT_DIR/rel_path. Returns the absolute path."""
    full = out_root() / rel_path
    full.parent.mkdir(parents=True, exist_ok=True)
    with full.open("w", encoding="utf-8") as f:
        if pretty:
            json.dump(payload, f, ensure_ascii=False, indent=2, default=str)
        else:
            json.dump(payload, f, ensure_ascii=False, separators=(",", ":"), default=str)
    return full


def read_json(rel_path: str, default: Any = None) -> Any:
    full = out_root() / rel_path
    if not full.exists():
        return default
    with full.open("r", encoding="utf-8") as f:
        return json.load(f)


def log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)
