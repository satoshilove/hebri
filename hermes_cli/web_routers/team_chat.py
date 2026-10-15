"""Hebri team chat — local, safe, side-panel team rooms.

A lightweight team-room service for the dashboard: human teammates can chat
side-by-side with their agent work and see who is online and what they are
working on.

Design constraints (Hebri):
  * Local-only.  Data lives under ``$HERMES_HOME/team_chat/`` (JSON +
    append-only JSONL).  Nothing leaves the machine; the routes inherit the
    dashboard's host/token auth middleware like every other ``/api`` route.
  * Zero dependencies beyond stdlib + FastAPI.  No new services, no daemons.
  * Fail-open and bounded: strict input caps, bounded history per room, and
    every store error degrades to a clean 500/404 instead of taking the
    agent loop down.  The agent session path is never touched.
  * Simple clients: plain REST + short polling.  No WS state machines, so a
    half-open connection can never wedge a panel.

Endpoints (mounted under ``/api/team``):
  GET    /api/team/rooms
  POST   /api/team/rooms                     {"name": "Releases"}
  GET    /api/team/rooms/{room}/messages?since_seq=0&limit=300
  POST   /api/team/rooms/{room}/messages     {"author": "ada", "text": "..."}
  GET    /api/team/presence
  POST   /api/team/presence                  {"name": "ada", "status": "fixing auth"}
"""

from __future__ import annotations

import json
import re
import threading
import time
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

# ── Limits (safety) ────────────────────────────────────────────────────────
MAX_ROOMS = 32
MAX_ROOM_NAME = 40
MAX_AUTHORS = 64
MAX_AUTHOR = 32
MAX_MESSAGE_CHARS = 4000
MAX_PRESENCE_STATUS = 120
MAX_HISTORY_LINES = 10_000  # per room; oldest trimmed beyond this
PRESENCE_ONLINE_SECONDS = 20

_LOCK = threading.Lock()


def _hermes_home() -> Path:
    from hermes_cli.config import get_hermes_home

    return Path(get_hermes_home())


def _base_dir() -> Path:
    return _hermes_home() / "team_chat"


def _rooms_file() -> Path:
    return _base_dir() / "rooms.json"


def _messages_file(room_id: str) -> Path:
    return _base_dir() / "messages" / f"{room_id}.jsonl"


def _presence_file() -> Path:
    return _base_dir() / "presence.json"


def _ensure_dirs() -> None:
    (_base_dir() / "messages").mkdir(parents=True, exist_ok=True)


def _read_json(path: Path, fallback: Any) -> Any:
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        return fallback
    except (json.JSONDecodeError, OSError):
        return fallback


def _write_json(path: Path, payload: Any) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False)
    tmp.replace(path)


def _clean_author(raw: Any) -> str:
    name = unicodedata.normalize("NFKC", str(raw or "")).strip()[:MAX_AUTHOR]
    name = re.sub(r"\s+", " ", name)
    if not name:
        raise HTTPException(status_code=400, detail="Author name is required")
    return name


def _clean_room_name(raw: Any) -> str:
    name = unicodedata.normalize("NFKC", str(raw or "")).strip()[:MAX_ROOM_NAME]
    name = re.sub(r"\s+", " ", name)
    if not name:
        raise HTTPException(status_code=400, detail="Room name is required")
    return name


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "room"


def _seed_rooms(doc: Dict[str, Any]) -> Dict[str, Any]:
    rooms = doc.get("rooms")
    if not isinstance(rooms, list):
        rooms = []
    doc["rooms"] = rooms
    if not any(r.get("id") == "general" for r in rooms):
        rooms.insert(0, {
            "id": "general",
            "name": "General",
            "created_at": int(time.time()),
        })
    return doc


def _load_rooms() -> Dict[str, Any]:
    doc = _read_json(_rooms_file(), {})
    return _seed_rooms(doc if isinstance(doc, dict) else {})


def _save_rooms(doc: Dict[str, Any]) -> None:
    _ensure_dirs()
    _write_json(_rooms_file(), doc)


def _find_room(doc: Dict[str, Any], room_id: str) -> Optional[Dict[str, Any]]:
    for room in doc.get("rooms", []):
        if room.get("id") == room_id:
            return room
    return None


def _room_meta(doc: Dict[str, Any]) -> List[Dict[str, Any]]:
    out = []
    for room in doc.get("rooms", []):
        rid = room.get("id", "")
        f = _messages_file(rid)
        count = 0
        last_ts = 0
        try:
            with open(f, "r", encoding="utf-8") as fh:
                for line in fh:
                    if line.strip():
                        count += 1
                        try:
                            last_ts = max(last_ts, float(json.loads(line).get("ts", 0)))
                        except (ValueError, json.JSONDecodeError):
                            pass
        except OSError:
            pass
        out.append({
            "id": rid,
            "name": room.get("name", rid),
            "msg_count": count,
            "last_ts": last_ts,
            "created_at": room.get("created_at", 0),
        })
    return out


def _read_messages(room_id: str, since_seq: int, limit: int) -> List[Dict[str, Any]]:
    f = _messages_file(room_id)
    rows: List[Dict[str, Any]] = []
    try:
        with open(f, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if int(row.get("seq", 0)) > since_seq:
                    rows.append(row)
    except OSError:
        return []
    rows.sort(key=lambda r: int(r.get("seq", 0)))
    if limit > 0:
        rows = rows[-limit:]
    return rows


def _next_seq(f: Path) -> int:
    last = 0
    try:
        with open(f, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    last = max(last, int(json.loads(line).get("seq", 0)))
                except (ValueError, json.JSONDecodeError):
                    pass
    except OSError:
        pass
    return last + 1


def _append_message(room_id: str, row: Dict[str, Any]) -> None:
    _ensure_dirs()
    f = _messages_file(room_id)
    with open(f, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    # Bounded history: trim oldest lines beyond the cap.
    try:
        with open(f, "r", encoding="utf-8") as fh:
            lines = [ln for ln in fh if ln.strip()]
        if len(lines) > MAX_HISTORY_LINES:
            with open(f, "w", encoding="utf-8") as fh:
                fh.writelines(lines[-MAX_HISTORY_LINES:])
    except OSError:
        pass


def _presence_doc() -> Dict[str, Any]:
    doc = _read_json(_presence_file(), {})
    if not isinstance(doc, dict) or not isinstance(doc.get("authors"), dict):
        doc = {"authors": {}}
    return doc


def _online(doc: Dict[str, Any]) -> List[Dict[str, Any]]:
    now = time.time()
    out = []
    for name, info in doc.get("authors", {}).items():
        try:
            seen = float(info.get("seen", 0))
        except (TypeError, ValueError):
            continue
        if now - seen <= PRESENCE_ONLINE_SECONDS:
            out.append({
                "name": name,
                "status": str(info.get("status", ""))[:MAX_PRESENCE_STATUS],
                "seen": seen,
            })
    out.sort(key=lambda a: a["name"].lower())
    return out


# ── Models ─────────────────────────────────────────────────────────────────
class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=MAX_ROOM_NAME)


class MessageCreate(BaseModel):
    author: str = Field(min_length=1, max_length=MAX_AUTHOR)
    text: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class PresenceUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=MAX_AUTHOR)
    status: str = Field(default="", max_length=MAX_PRESENCE_STATUS)


# ── Routes ─────────────────────────────────────────────────────────────────
@router.get("/api/team/rooms")
def team_list_rooms() -> Dict[str, Any]:
    with _LOCK:
        _ensure_dirs()
        doc = _load_rooms()
        _save_rooms(doc)  # seed "General" on first use
        return {"rooms": _room_meta(doc)}


@router.post("/api/team/rooms")
def team_create_room(body: RoomCreate) -> Dict[str, Any]:
    name = _clean_room_name(body.name)
    with _LOCK:
        _ensure_dirs()
        doc = _load_rooms()
        rooms = doc["rooms"]
        if len(rooms) >= MAX_ROOMS:
            raise HTTPException(status_code=409, detail="Room limit reached")
        base = _slugify(name)
        rid, n = base, 2
        while any(r.get("id") == rid for r in rooms):
            rid = f"{base}-{n}"
            n += 1
        room = {"id": rid, "name": name, "created_at": int(time.time())}
        rooms.append(room)
        _save_rooms(doc)
        return {"room": {"id": rid, "name": name}}


@router.get("/api/team/rooms/{room_id}/messages")
def team_list_messages(
    room_id: str,
    since_seq: int = 0,
    limit: int = 300,
) -> Dict[str, Any]:
    limit = max(1, min(int(limit), 1000))
    since_seq = max(0, int(since_seq))
    with _LOCK:
        _ensure_dirs()
        doc = _load_rooms()
        if _find_room(doc, room_id) is None:
            raise HTTPException(status_code=404, detail="Room not found")
        rows = _read_messages(room_id, since_seq, limit)
    return {"messages": rows, "latest_seq": int(rows[-1].get("seq", 0)) if rows else since_seq}


@router.post("/api/team/rooms/{room_id}/messages")
def team_send_message(room_id: str, body: MessageCreate) -> Dict[str, Any]:
    author = _clean_author(body.author)
    text = unicodedata.normalize("NFKC", body.text)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Message is empty")
    with _LOCK:
        _ensure_dirs()
        doc = _load_rooms()
        if _find_room(doc, room_id) is None:
            raise HTTPException(status_code=404, detail="Room not found")
        f = _messages_file(room_id)
        row = {
            "seq": _next_seq(f),
            "room": room_id,
            "author": author,
            "text": text,
            "ts": time.time(),
        }
        _append_message(room_id, row)
    return {"message": row}


@router.get("/api/team/presence")
def team_presence() -> Dict[str, Any]:
    with _LOCK:
        return {"online": _online(_presence_doc())}


@router.post("/api/team/presence")
def team_presence_update(body: PresenceUpdate) -> Dict[str, Any]:
    name = _clean_author(body.name)
    status = unicodedata.normalize("NFKC", str(body.status or "")).strip()[:MAX_PRESENCE_STATUS]
    with _LOCK:
        _ensure_dirs()
        doc = _presence_doc()
        authors = doc["authors"]
        if name not in authors and len(authors) >= MAX_AUTHORS:
            # Drop stalest entries to make room (bounded store).
            stalest = sorted(authors.items(), key=lambda kv: float(kv[1].get("seen", 0)))
            for old_name, _ in stalest[: len(authors) - MAX_AUTHORS + 1]:
                authors.pop(old_name, None)
        authors[name] = {"name": name, "status": status, "seen": time.time()}
        _write_json(_presence_file(), doc)
    return {"ok": True, "online": _online(doc)}
