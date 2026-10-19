"""Hebri team chat — local, safe, side-panel team rooms.

A lightweight team-room service for the dashboard: human teammates can chat
side-by-side with their agent work and see who is online and what they are
working on.

Design constraints (Hebri):
  * Install-scoped. Data lives under the default Hebri root's ``team_chat/``
    (JSON +
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
  GET    /api/team/work
  POST   /api/team/work                      {"title": "Ship desktop", "owner": "ada"}
  PATCH  /api/team/work/{item_id}            {"status": "done"}
"""

from __future__ import annotations

import json
import re
import threading
import time
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter()

# ── Limits (safety) ────────────────────────────────────────────────────────
MAX_ROOMS = 32
MAX_ROOM_NAME = 40
MAX_AUTHORS = 64
MAX_AUTHOR = 32
MAX_MESSAGE_CHARS = 4000
MAX_PRESENCE_STATUS = 120
MAX_WORK_ITEMS = 256
MAX_WORK_TITLE = 160
MAX_WORK_NOTES = 1000
MAX_HISTORY_LINES = 10_000  # per room; oldest trimmed beyond this
PRESENCE_ONLINE_SECONDS = 20
WORK_STATUSES = frozenset({"backlog", "in_progress", "blocked", "done"})

_LOCK = threading.Lock()


def _base_dir() -> Path:
    # Team state belongs to the human team/install, not to an individual Bot
    # Mode profile. All profiles and their canonical Bot Chats see one feed.
    from hermes_constants import get_default_hermes_root

    return Path(get_default_hermes_root()) / "team_chat"


def _rooms_file() -> Path:
    return _base_dir() / "rooms.json"


def _messages_file(room_id: str) -> Path:
    return _base_dir() / "messages" / f"{room_id}.jsonl"


def _presence_file() -> Path:
    return _base_dir() / "presence.json"


def _work_file() -> Path:
    return _base_dir() / "work.json"


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
        out.append(meta)
    return out


def _new_room_code(existing: set) -> str:
    import secrets as _secrets
    while True:
        # 192 bits of entropy. This is an invite secret, not a short pairing
        # code; guessing it must be infeasible even though registration is a
        # public endpoint for cross-machine clients.
        code = _secrets.token_urlsafe(24)
        if code not in existing:
            return code


def _invite_hash(code: str) -> str:
    import hashlib

    return hashlib.sha256(code.encode("utf-8")).hexdigest()


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


class WorkCreate(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_WORK_TITLE)
    owner: str = Field(default="", max_length=MAX_AUTHOR)
    status: str = Field(default="backlog", max_length=32)
    notes: str = Field(default="", max_length=MAX_WORK_NOTES)


class WorkUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=MAX_WORK_TITLE)
    owner: Optional[str] = Field(default=None, max_length=MAX_AUTHOR)
    status: Optional[str] = Field(default=None, max_length=32)
    notes: Optional[str] = Field(default=None, max_length=MAX_WORK_NOTES)


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
        invite = None
        if body.shared:
            invite = _new_room_code(set())
            room["invite_hash"] = _invite_hash(invite)
        rooms.append(room)
        _save_rooms(doc)
        out = {"id": rid, "name": name}
        if body.shared:
            out["code"] = invite
        return {"room": out}


@router.post("/api/team/rooms/{room_id}/share")
def team_share_room(room_id: str) -> Dict[str, Any]:
    """Rotate and return a high-entropy invite secret for a room.

    Only its SHA-256 digest is persisted. Sharing again revokes the prior
    invite without changing grants already issued for their bounded lifetime.
    """
    with _LOCK:
        _ensure_dirs()
        doc = _load_rooms()
        room = _find_room(doc, room_id)
        if room is None:
            raise HTTPException(status_code=404, detail="Room not found")
        invite = _new_room_code(set())
        room["invite_hash"] = _invite_hash(invite)
        room.pop("code", None)
        _save_rooms(doc)
        return {"room": {"id": room["id"], "name": room.get("name", room["id"]), "code": invite}}


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
        _save_rooms(doc)  # persist the seeded General room on first direct use
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


def _clean_work_text(raw: Any, limit: int) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", str(raw or "")).strip())[:limit]


def _work_doc() -> Dict[str, Any]:
    doc = _read_json(_work_file(), {})
    if not isinstance(doc, dict) or not isinstance(doc.get("items"), list):
        return {"items": []}
    doc["items"] = [item for item in doc["items"] if isinstance(item, dict)][-MAX_WORK_ITEMS:]
    return doc


def _clean_work_status(value: Any) -> str:
    status = str(value or "").strip().lower()
    if status not in WORK_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid work status")
    return status


@router.get("/api/team/work")
def team_list_work() -> Dict[str, Any]:
    with _LOCK:
        items = list(_work_doc()["items"])
    items.sort(key=lambda item: float(item.get("updated_at", 0)), reverse=True)
    return {"items": items}


@router.post("/api/team/work")
def team_create_work(body: WorkCreate) -> Dict[str, Any]:
    with _LOCK:
        item = _create_work_item(body)
    return {"item": item}


def _create_work_item(body: WorkCreate, *, owner: Optional[str] = None) -> Dict[str, Any]:
    import secrets

    title = _clean_work_text(body.title, MAX_WORK_TITLE)
    if not title:
        raise HTTPException(status_code=400, detail="Work title is required")
    now = time.time()
    item = {
        "id": secrets.token_urlsafe(9),
        "title": title,
        "owner": _clean_work_text(owner if owner is not None else body.owner, MAX_AUTHOR),
        "status": _clean_work_status(body.status),
        "notes": _clean_work_text(body.notes, MAX_WORK_NOTES),
        "created_at": now,
        "updated_at": now,
    }
    _ensure_dirs()
    doc = _work_doc()
    if len(doc["items"]) >= MAX_WORK_ITEMS:
        raise HTTPException(status_code=409, detail="Work item limit reached")
    doc["items"].append(item)
    _write_json(_work_file(), doc)
    return item


@router.patch("/api/team/work/{item_id}")
def team_update_work(item_id: str, body: WorkUpdate) -> Dict[str, Any]:
    with _LOCK:
        item = _update_work_item(item_id, body)
    return {"item": item}


def _update_work_item(item_id: str, body: WorkUpdate) -> Dict[str, Any]:
    _ensure_dirs()
    doc = _work_doc()
    item = next((row for row in doc["items"] if row.get("id") == item_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Work item not found")
    updates = body.model_dump(exclude_unset=True)
    if "title" in updates:
        title = _clean_work_text(updates["title"], MAX_WORK_TITLE)
        if not title:
            raise HTTPException(status_code=400, detail="Work title is required")
        item["title"] = title
    if "owner" in updates:
        item["owner"] = _clean_work_text(updates["owner"], MAX_AUTHOR)
    if "status" in updates:
        item["status"] = _clean_work_status(updates["status"])
    if "notes" in updates:
        item["notes"] = _clean_work_text(updates["notes"], MAX_WORK_NOTES)
    item["updated_at"] = time.time()
    _write_json(_work_file(), doc)
    return item


# ── Cross-machine relay (hub + HMAC peer grants) ─────────────────────────
# One machine "hosts" a room: it mints a high-entropy invite. Peers on other
# machines exchange that invite for an HMAC-signed, room-bound peer grant
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
_REGISTER_RATE = (20, 60)  # max 20 invite exchanges per minute per source IP
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
    except (TypeError, ValueError, json.JSONDecodeError, UnicodeDecodeError):
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
    if not code or len(code) > 128:
        return None
    digest = _invite_hash(code)
    for room in doc.get("rooms", []):
        stored = str(room.get("invite_hash") or "")
        if stored and _hmac.compare_digest(stored, digest):
            return room
        # One-release migration path for previously shared six-character codes.
        if room.get("code") and _hmac.compare_digest(str(room["code"]).upper(), code.upper()):
            return room
    return None


def _relay_rate_ok(key: tuple) -> bool:
    now = time.time()
    limit, window = _REGISTER_RATE if key and key[0] == "register" else _RELAY_RATE
    log = _rate_log.get(key)
    if log is None:
        log = _deque()
        _rate_log[key] = log
    while log and now - log[0] > window:
        log.popleft()
    if len(log) >= limit:
        return False
    log.append(now)
    if len(_rate_log) > 1024:  # bounded: drop oldest keys
        for old in list(_rate_log)[:-512]:
            _rate_log.pop(old, None)
    return True


def _bearer(request: Request) -> str:
    value = request.headers.get("authorization", "")
    scheme, _, token = value.partition(" ")
    return token.strip() if scheme.lower() == "bearer" else ""


class RelayRegister(BaseModel):
    code: str = Field(min_length=20, max_length=128)
    peer: str = Field(min_length=1, max_length=MAX_AUTHOR)


class RelayMessageCreate(BaseModel):
    author: str = Field(min_length=1, max_length=MAX_AUTHOR)
    text: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class RelayPresenceUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=MAX_AUTHOR)
    status: str = Field(default="", max_length=MAX_PRESENCE_STATUS)


@router.post("/api/team/relay/register")
def relay_register(body: RelayRegister, request: Request) -> Dict[str, Any]:
    """Peer on another machine exchanges the room code for a peer grant."""
    peer = _clean_author(body.peer)
    source = request.client.host if request.client else "unknown"
    if not _relay_rate_ok(("register", source)):
        raise HTTPException(status_code=429, detail="Too many join attempts")
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


def _relay_room(room_id: str):
    doc = _load_rooms()
    room = _find_room(doc, room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


def _relay_peer(room_id: str, token: Optional[str]) -> str:
    room = _relay_room(room_id)
    peer = _check_grant(_relay_secret(), room["id"], token)
    if peer is None:
        raise HTTPException(status_code=403, detail="Invalid or expired relay grant")
    return peer


@router.get("/api/team/relay/{room_id}/messages")
def relay_list_messages(room_id: str, request: Request, since_seq: int = 0, limit: int = 300) -> Dict[str, Any]:
    limit = max(1, min(int(limit), 1000))
    since_seq = max(0, int(since_seq))
    with _LOCK:
        _relay_peer(room_id, _bearer(request))
        room = _relay_room(room_id)
        rows = _read_messages(room["id"], since_seq, limit)
    return {"messages": rows, "latest_seq": int(rows[-1].get("seq", 0)) if rows else since_seq}


@router.post("/api/team/relay/{room_id}/messages")
def relay_send_message(room_id: str, body: RelayMessageCreate, request: Request) -> Dict[str, Any]:
    text = unicodedata.normalize("NFKC", body.text)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Message is empty")
    with _LOCK:
        peer = _relay_peer(room_id, _bearer(request))
        if _clean_author(body.author) != peer:
            raise HTTPException(status_code=400, detail="author must match the grant peer")
        if not _relay_rate_ok((room_id, peer)):
            raise HTTPException(status_code=429, detail="Rate limit: slow down")
        room = _relay_room(room_id)
        f = _messages_file(room["id"])
        row = {"seq": _next_seq(f), "room": room["id"], "author": peer, "text": text, "ts": time.time()}
        _append_message(room["id"], row)
    return {"message": row}


@router.get("/api/team/relay/{room_id}/presence")
def relay_presence(room_id: str, request: Request) -> Dict[str, Any]:
    with _LOCK:
        _relay_peer(room_id, _bearer(request))
        return {"online": _online(_presence_doc())}


@router.post("/api/team/relay/{room_id}/presence")
def relay_presence_update(room_id: str, body: RelayPresenceUpdate, request: Request) -> Dict[str, Any]:
    status = unicodedata.normalize("NFKC", str(body.status or "")).strip()[:MAX_PRESENCE_STATUS]
    with _LOCK:
        _ensure_dirs()
        peer = _relay_peer(room_id, _bearer(request))
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


@router.get("/api/team/relay/{room_id}/work")
def relay_list_work(room_id: str, request: Request) -> Dict[str, Any]:
    """Return the shared human work board to an authenticated room peer."""
    with _LOCK:
        _relay_peer(room_id, _bearer(request))
        items = list(_work_doc()["items"])
    items.sort(key=lambda item: float(item.get("updated_at", 0)), reverse=True)
    return {"items": items}


@router.post("/api/team/relay/{room_id}/work")
def relay_create_work(room_id: str, body: WorkCreate, request: Request) -> Dict[str, Any]:
    """Create work as the peer identity bound into the relay grant."""
    with _LOCK:
        peer = _relay_peer(room_id, _bearer(request))
        if not _relay_rate_ok((room_id, peer, "work")):
            raise HTTPException(status_code=429, detail="Rate limit: slow down")
        item = _create_work_item(body, owner=peer)
    return {"item": item}


@router.patch("/api/team/relay/{room_id}/work/{item_id}")
def relay_update_work(room_id: str, item_id: str, body: WorkUpdate, request: Request) -> Dict[str, Any]:
    """Let authenticated teammates maintain the shared work board."""
    with _LOCK:
        peer = _relay_peer(room_id, _bearer(request))
        if not _relay_rate_ok((room_id, peer, "work")):
            raise HTTPException(status_code=429, detail="Rate limit: slow down")
        item = _update_work_item(item_id, body)
    return {"item": item}
