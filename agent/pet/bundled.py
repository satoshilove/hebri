"""Offline Hebri artwork catalog. Only exact packaged IDs may resolve assets."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

ASSETS = Path(__file__).parent / "assets" / "hebri"


@lru_cache(maxsize=1)
def entries() -> dict[str, dict]:
    return {entry["slug"]: entry for entry in json.loads((ASSETS / "catalog.json").read_text(encoding="utf-8"))}


def asset(slug: str) -> Path | None:
    if slug not in entries():
        return None
    return ASSETS / f"{slug}.webp"


def gallery(installed: dict) -> list[dict]:
    return [{"slug": slug, "displayName": entry["displayName"], "installed": slug in installed,
             "spritesheetUrl": "", "curated": True, "bundled": True, "generated": False}
            for slug, entry in entries().items()]
