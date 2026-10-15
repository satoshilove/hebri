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
        meta = {
            "id": rid,
            "name": room.get("name", rid),
            "msg_count": count,
            "last_ts": last_ts,
            "created_at": room.get("created_at", 0),
        }
        if room.get("code"):
            meta["code"] = room["code"]
        out.append(meta)
    return out


def _new_room_code(existing: set) -> str:
    import secrets as _secrets
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no I/L/O/0/1 lookalikes
    while True:
        code = "".join(_secrets.choice(alphabet) for _ in range(6))
        if code not in existing:
            return code


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
    shared: bool = Field(default=False, description="Also mint a relay code for cross-machine joins")


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
        if body.shared:
            room["code"] = _new_room_code({r.get("code") for r in rooms if r.get("code")})
        rooms.append(room)
        _save_rooms(doc)
        out = {"id": rid, "name": name}
        if body.shared:
            out["code"] = room["code"]
        return {"room": out}


@router.post("/api/team/rooms/{room_id}/share")
def team_share_room(room_id: str) -> Dict[str, Any]:
    """Mint (or return) the relay code for a room so peers on other machines can join."""
    with _LOCK:
        _ensure_dirs()
        doc = _load_rooms()
        room = _find_room(doc, room_id)
        if room is None:
            raise HTTPException(status_code=404, detail="Room not found")
        if not room.get("code"):
            room["code"] = _new_room_code({r.get("code") for r in doc.get("rooms", []) if r.get("code")})
            _save_rooms(doc)
        return {"room": {"id": room["id"], "name": room.get("name", room["id"]), "code": room["code"]}}


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


# ── Cross-machine relay (hub + HMAC peer grants) ─────────────────────────
# One machine "hosts" a room: it mints a 6-char code (above).  Peers on other
# machines register with that code and receive an HMAC-signed peer grant
# (same pattern as gateway/hosted_room_peer.py: canonical payload +
# hmac-sha256 + compare_digest, bounded TTL).  The grant — not a shared
# dashboard token — is the security boundary, so the /api/team/relay/* paths
# are on the dashboard's public-path allowlist (see public_paths.py /
# dashboard_auth/middleware.py) and CORS-enabled for cross-origin peers.
# The host writes relay traffic into the SAME local store, so the host's own
# Team panel and the peers' relays see one shared conversation.

import base64 as _b64
import hashlib as _hashlib
import hmac as _hmac
import secrets as _secrets
from collections import deque as _deque

GRANT_TTL_SECONDS = 24 * 60 * 60  # 1 day; re-register with the code to refresh
_RELAY_RATE = (120, 60)  # max 120 messages per 60 s per (room, peer)
_rate_log: Dict[tuple, _deque] = {}


def _relay_secret_file() -> Path:
    return _base_dir() / "relay_secret"


def _relay_secret() -> bytes:
    f = _relay_secret_file()
    try:
        raw = f.read_bytes().strip()
        if len(raw) == 32:
            return raw
    except OSError:
        pass
    raw = _secrets.token_bytes(32)
    _ensure_dirs()
    f.write_bytes(raw)
    try:
        import os as _os
        _os.chmod(f, 0o600)
    except OSError:
        pass
    return raw


def _b64u(data: bytes) -> str:
    return _b64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _issue_grant(secret: bytes, room_id: str, peer: str) -> str:
    payload = {
        "v": 1,
        "room": room_id,
        "peer": peer[:MAX_AUTHOR],
        "exp": int(time.time()) + GRANT_TTL_SECONDS,
        "nonce": _secrets.token_hex(8),
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("ascii")
    sig = _hmac.new(secret, encoded, _hashlib.sha256).digest()
    return _b64u(encoded) + "." + _b64u(sig)


def _check_grant(secret: bytes, room_id: str, token: Optional[str]) -> Optional[str]:
    """Verify grant; return the bound peer name, or None when invalid."""
    if not token or "." not in token or len(token) > 2048:
        return None
    def _pad(s: str) -> str:
        return s + "=" * (-len(s) % 4)

    try:
        encoded_b64, sig_b64 = token.split(".", 1)
        encoded = _b64.urlsafe_b64decode(_pad(encoded_b64))
        sig = _b64.urlsafe_b64decode(_pad(sig_b64))
        expected = _hmac.new(secret, encoded, _hashlib.sha256).digest()
        if not _hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(encoded.decode("ascii"))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
        return None
    if (
        not isinstance(payload, dict)
        or payload.get("v") != 1
        or payload.get("room") != room_id
        or int(payload.get("exp", 0)) < time.time()
        or not isinstance(payload.get("peer"), str)
        or not payload["peer"]
    ):
        return None
    return payload["peer"]


def _find_room_by_code(doc: Dict[str, Any], code: str) -> Optional[Dict[str, Any]]:
    if not code or len(code) != 6:
        return None
    for room in doc.get("rooms", []):
        if room.get("code") and _hmac.compare_digest(str(room["code"]).upper(), code.upper()):
            return room
    return None


def _relay_rate_ok(key: tuple) -> bool:
    now = time.time()
    log = _rate_log.get(key)
    if log is None:
        log = _deque()
        _rate_log[key] = log
    while log and now - log[0] > _RELAY_RATE[1]:
        log.popleft()
    if len(log) >= _RELAY_RATE[0]:
        return False
    log.append(now)
    if len(_rate_log) > 1024:  # bounded: drop oldest keys
        for old in list(_rate_log)[:-512]:
            _rate_log.pop(old, None)
    return True


class RelayRegister(BaseModel):
    code: str = Field(min_length=6, max_length=6)
    peer: str = Field(min_length=1, max_length=MAX_AUTHOR)


class RelayMessageCreate(BaseModel):
    author: str = Field(min_length=1, max_length=MAX_AUTHOR)
    text: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    grant: str = Field(min_length=8, max_length=2048)


class RelayPresenceUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=MAX_AUTHOR)
    status: str = Field(default="", max_length=MAX_PRESENCE_STATUS)
    grant: str = Field(min_length=8, max_length=2048)


@router.post("/api/team/relay/register")
def relay_register(body: RelayRegister) -> Dict[str, Any]:
    """Peer on another machine exchanges the room code for a peer grant."""
    peer = _clean_author(body.peer)
    with _LOCK:
        _ensure_dirs()
        doc = _load_rooms()
        room = _find_room_by_code(doc, body.code)
        if room is None:
            raise HTTPException(status_code=404, detail="Room code not found")
        secret = _relay_secret()
        grant = _issue_grant(secret, room["id"], peer)
    return {
        "grant": grant,
        "expires_in": GRANT_TTL_SECONDS,
        "room": {"id": room["id"], "name": room.get("name", room["id"])},
    }


def _relay_room(code: str):
    doc = _load_rooms()
    room = _find_room_by_code(doc, code)
    if room is None:
        raise HTTPException(status_code=404, detail="Room code not found")
    return room


def _relay_peer(code: str, token: Optional[str]) -> str:
    room = _relay_room(code)
    peer = _check_grant(_relay_secret(), room["id"], token)
    if peer is None:
        raise HTTPException(status_code=403, detail="Invalid or expired relay grant")
    return peer


@router.get("/api/team/relay/{code}/messages")
def relay_list_messages(code: str, since_seq: int = 0, limit: int = 300, grant: str = "") -> Dict[str, Any]:
    limit = max(1, min(int(limit), 1000))
    since_seq = max(0, int(since_seq))
    with _LOCK:
        _relay_peer(code, grant)
        room = _relay_room(code)
        rows = _read_messages(room["id"], since_seq, limit)
    return {"messages": rows, "latest_seq": int(rows[-1].get("seq", 0)) if rows else since_seq}


@router.post("/api/team/relay/{code}/messages")
def relay_send_message(code: str, body: RelayMessageCreate) -> Dict[str, Any]:
    text = unicodedata.normalize("NFKC", body.text)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Message is empty")
    with _LOCK:
        peer = _relay_peer(code, body.grant)
        if _clean_author(body.author) != peer:
            raise HTTPException(status_code=400, detail="author must match the grant peer")
        if not _relay_rate_ok((code, peer)):
            raise HTTPException(status_code=429, detail="Rate limit: slow down")
        room = _relay_room(code)
        f = _messages_file(room["id"])
        row = {"seq": _next_seq(f), "room": room["id"], "author": peer, "text": text, "ts": time.time()}
        _append_message(room["id"], row)
    return {"message": row}


@router.get("/api/team/relay/{code}/presence")
def relay_presence(code: str, grant: str = "") -> Dict[str, Any]:
    with _LOCK:
        _relay_peer(code, grant)
        return {"online": _online(_presence_doc())}


@router.post("/api/team/relay/{code}/presence")
def relay_presence_update(code: str, body: RelayPresenceUpdate) -> Dict[str, Any]:
    status = unicodedata.normalize("NFKC", str(body.status or "")).strip()[:MAX_PRESENCE_STATUS]
    with _LOCK:
        _ensure_dirs()
        peer = _relay_peer(code, body.grant)
        if _clean_author(body.name) != peer:
            raise HTTPException(status_code=400, detail="name must match the grant peer")
        doc = _presence_doc()
        authors = doc["authors"]
        if peer not in authors and len(authors) >= MAX_AUTHORS:
            stalest = sorted(authors.items(), key=lambda kv: float(kv[1].get("seen", 0)))
            for old_name, _ in stalest[: len(authors) - MAX_AUTHORS + 1]:
                authors.pop(old_name, None)
        authors[peer] = {"name": peer, "status": status, "seen": time.time()}
        _write_json(_presence_file(), doc)
    return {"ok": True, "online": _online(doc)}
