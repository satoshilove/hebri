"""Read-only human-team context tool for Bot Mode canonical chats.

Human Team rooms and work tracking remain separate from Bot Mode. A managed
bot may explicitly read a bounded snapshot so it can follow current work and
recent messages without impersonating a human or mutating the team board.
Like ``message_agent``, this schema is injected only into canonical Bot Chats.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

TEAM_CONTEXT_TOOL_NAME = "team_context"
_DEFAULT_MESSAGE_LIMIT = 40
_MAX_MESSAGE_LIMIT = 100


def team_context_tool_schema() -> dict:
    return {
        "type": "function",
        "function": {
            "name": TEAM_CONTEXT_TOOL_NAME,
            "description": (
                "Read the human Team workspace: current work items, online statuses, and a bounded "
                "tail of recent room messages. Use this before acting on team-wide work or when the "
                "user asks what the team is doing. This is read-only: never claim to be a human teammate."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "room": {
                        "type": "string",
                        "description": "Optional room id. Empty reads recent messages from every room.",
                    },
                    "max_messages": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": _MAX_MESSAGE_LIMIT,
                        "description": "Maximum recent messages to return across the selected rooms.",
                    },
                },
            },
        },
    }


def team_context_authorized(agent: Any) -> bool:
    from tools.bot_mode_dm import message_agent_authorized

    return message_agent_authorized(agent)


def ensure_team_context_tool(agent: Any) -> bool:
    try:
        tools = getattr(agent, "tools", None)
        present = bool(tools) and any(
            isinstance(item, dict) and item.get("function", {}).get("name") == TEAM_CONTEXT_TOOL_NAME
            for item in tools
        )
        if not present:
            if not team_context_authorized(agent):
                return False
            if agent.tools is None:
                agent.tools = []
            agent.tools.append(team_context_tool_schema())
        valid = getattr(agent, "valid_tool_names", None)
        if isinstance(valid, set):
            valid.add(TEAM_CONTEXT_TOOL_NAME)
        return True
    except Exception:
        logger.debug("ensure_team_context_tool failed", exc_info=True)
        return False


def _read_json(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return fallback


def _message_rows(path: Path) -> list[dict]:
    rows: list[dict] = []
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                row = json.loads(line)
            except (ValueError, TypeError):
                continue
            if isinstance(row, dict):
                rows.append(row)
    except OSError:
        pass
    return rows


def team_context_tool(room: str = "", max_messages: int = _DEFAULT_MESSAGE_LIMIT, agent: Any = None) -> str:
    if not team_context_authorized(agent):
        return json.dumps({"error": "team_context is only available in a managed canonical Bot Chat."})
    from hermes_constants import get_default_hermes_root

    base = Path(get_default_hermes_root()) / "team_chat"
    rooms_doc = _read_json(base / "rooms.json", {"rooms": []})
    rooms = rooms_doc.get("rooms", []) if isinstance(rooms_doc, dict) else []
    if not any(isinstance(entry, dict) and entry.get("id") == "general" for entry in rooms):
        rooms = [{"id": "general", "name": "General"}, *rooms]
    selected = [entry for entry in rooms if isinstance(entry, dict) and (not room or entry.get("id") == room)]
    try:
        limit = max(1, min(int(max_messages), _MAX_MESSAGE_LIMIT))
    except (TypeError, ValueError):
        limit = _DEFAULT_MESSAGE_LIMIT
    messages: list[dict] = []
    for entry in selected:
        room_id = str(entry.get("id") or "")
        for row in _message_rows(base / "messages" / f"{room_id}.jsonl"):
            messages.append({
                "room": room_id,
                "room_name": str(entry.get("name") or room_id),
                "author": str(row.get("author") or ""),
                "text": str(row.get("text") or "")[:4000],
                "ts": row.get("ts", 0),
            })
    messages.sort(key=lambda row: float(row.get("ts") or 0))
    work_doc = _read_json(base / "work.json", {"items": []})
    presence_doc = _read_json(base / "presence.json", {"authors": {}})
    work = work_doc.get("items", []) if isinstance(work_doc, dict) else []
    authors = presence_doc.get("authors", {}) if isinstance(presence_doc, dict) else {}
    return json.dumps({
        "scope": "human_team_read_only",
        "work": [item for item in work if isinstance(item, dict)][-256:],
        "presence": [value for value in authors.values() if isinstance(value, dict)],
        "messages": messages[-limit:],
    }, ensure_ascii=False)
