"""
appendonly — a prefix-stable, append-only memory provider for Hebri.

WHY
---
Hebri's built-in memory freezes its block into the system prompt at session
start, which protects the prompt cache but means a fact written mid-session is
invisible until the next session. The obvious fix — make the block live —
destroys the cache: prompt caching is a PREFIX cache, so rewriting a block near
the START of the prompt re-prices every token after it.

Measured on our own install: caching cuts the model bill by ~88-97%, and about
1.5 cache breaks erase that entire saving — on every model at every price point
(Claude, Gemini, DeepSeek alike). So the objective is not fewer tokens; it is
NEVER MOVING THE PREFIX.

WHAT THIS DOES
--------------
  * the cached block is frozen once per session and never rewritten
  * new facts are appended to a journal and delivered through the turn tail,
    ONE-SHOT (a fact is shown once, then lives in the transcript like any
    message — never replayed, never re-priced)

So memory stays live AND the prefix stays byte-stable. Verified properties:
prefix fingerprint identical across write-turns; every fact delivered exactly
once; repeat prefetch returns ""; torn journal lines skipped, not fatal.

SAFETY
------
stdlib only, no network, no model calls, no GPU. Writes are append-only; a
torn line is truncated on load rather than corrupting the log. Removing the
plugin and clearing ``memory.provider`` restores the stock behaviour exactly.
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from typing import Any, Dict, List, Optional

from agent.memory_provider import MemoryProvider, RecallStatus  # noqa: F401

logger = logging.getLogger(__name__)

JOURNAL_NAME = "appendonly_journal.jsonl"
INDEX_LIMIT = 40


def _load_plugin_config() -> Dict[str, Any]:
    """Config for this plugin, if any; the provider works with zero config."""
    try:
        from hermes_cli.plugins import get_plugin_config  # type: ignore
        return get_plugin_config("appendonly") or {}
    except Exception:
        return {}


class AppendOnlyMemoryProvider(MemoryProvider):
    """Live memory that never invalidates the cached prompt prefix."""

    def __init__(self, config: Optional[Dict[str, Any]] = None) -> None:
        self._cfg = config or {}
        self._home = ""
        self._session_id = ""
        self._journal_path = ""
        self._lock = threading.RLock()
        self._tail: List[Dict[str, Any]] = []
        self._frozen_index = ""
        self._last_injected = 0
        self._seq = 0
        self._frozen_seq = 0
        self._delivered_seq = 0

    # -- identity ----------------------------------------------------------
    @property
    def name(self) -> str:
        return "appendonly"

    def is_available(self) -> bool:
        return True                      # stdlib only, always available

    def unavailable_reason(self) -> str:
        return ""

    # -- lifecycle ---------------------------------------------------------
    def initialize(self, session_id: str, **kwargs: Any) -> None:
        self._session_id = session_id
        home = kwargs.get("hermes_home") or os.path.expanduser("~")
        self._home = str(home)
        d = os.path.join(self._home, "memory")
        os.makedirs(d, exist_ok=True)
        self._journal_path = os.path.join(d, JOURNAL_NAME)
        self._tail = self._load()
        # The frozen index is derived ONCE here and never rewritten for the life
        # of this conversation. That is what makes the prefix byte-stable.
        self._seq = max((int(e.get("seq", 0)) for e in self._tail), default=0)
        self._frozen_seq = self._seq
        self._delivered_seq = self._seq
        self._frozen_index = self._render_index(self._tail)
        logger.info("appendonly memory ready: %d journal entries", len(self._tail))

    def on_session_switch(self, new_session_id: str, *, parent_session_id: str = "",
                          reset: bool = False, rewound: bool = False, **kwargs: Any) -> None:
        self._session_id = new_session_id
        self.freeze()

    # -- the cached block --------------------------------------------------
    def system_prompt_block(self) -> str:
        """STATIC. Byte-stable for the life of the session, by construction."""
        if not self._frozen_index:
            return ""
        return ("# Memory (append-only)\n"
                "Durable facts recorded earlier. New facts are appended to later "
                "turns, never by rewriting this block.\n"
                + self._frozen_index)

    # -- the live channel --------------------------------------------------
    def prefetch(self, query: str, *, session_id: str = "") -> str:
        """Deliver journal entries not yet shown this session.

        One-shot per fact: once shown, the fact lives in the transcript tail and
        re-sending it would only duplicate it. The cached block is never touched.
        """
        with self._lock:
            fresh = [e for e in self._tail if int(e.get("seq", 0)) > self._delivered_seq]
            if not fresh:
                self._last_injected = 0
                return ""
            self._delivered_seq = max(int(e.get("seq", 0)) for e in fresh)
        self._last_injected = len(fresh)
        lines = "\n".join(f"- {e['fact']}" for e in fresh)
        return f"<memory-new>\n{lines}\n</memory-new>"

    def recall_status(self) -> Optional[RecallStatus]:
        if not self._last_injected:
            return None
        return {"count": self._last_injected, "provider": self.name}

    # -- the write path ----------------------------------------------------
    def sync_turn(self, user_content: str, assistant_content: str, *,
                  session_id: str = "", messages: Optional[List[Dict[str, Any]]] = None,
                  turn_author: Optional[Dict[str, Any]] = None) -> None:
        return None                      # extraction is the caller's job

    def on_memory_write(self, action: str, target: str, content: str,
                        metadata: Optional[Dict[str, Any]] = None) -> None:
        """Mirror a memory-tool write into the append-only journal (append only)."""
        if action not in ("add", "replace"):
            return
        self.append(content, target=target, action=action, meta=metadata or {})

    def append(self, fact: str, *, target: str = "memory", action: str = "add",
               meta: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        fact = (fact or "").strip()
        if not fact:
            return {"success": False, "error": "empty fact"}
        with self._lock:
            self._seq += 1
            rec = {"t": time.time(), "seq": self._seq, "fact": fact,
                   "target": target, "action": action, "meta": meta or {}}
            line = json.dumps(rec, ensure_ascii=False)
            with open(self._journal_path, "a", encoding="utf-8") as f:
                f.write(f"{len(line)}\t{line}\n")
            self._tail.append(rec)
        return {"success": True, "appended": True, "total": len(self._tail)}

    # -- tools -------------------------------------------------------------
    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        return [{
            "name": "memory_append",
            "description": ("Record a durable fact in memory. Append-only: never "
                            "rewrites the cached prompt prefix, so it is free in "
                            "cache terms and visible on the next turn."),
            "parameters": {
                "type": "object",
                "properties": {
                    "fact": {"type": "string", "description": "the fact to record"},
                    "target": {"type": "string", "enum": ["memory", "user"]},
                },
                "required": ["fact"],
            },
        }]

    def handle_tool_call(self, tool_name: str, args: Dict[str, Any], **kwargs: Any) -> str:
        if tool_name != "memory_append":
            raise NotImplementedError(f"appendonly does not handle {tool_name}")
        return json.dumps(self.append(str(args.get("fact", "")),
                                      target=str(args.get("target", "memory"))))

    def shutdown(self) -> None:
        return None

    # -- internals ---------------------------------------------------------
    def _load(self) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        if not self._journal_path or not os.path.exists(self._journal_path):
            return out
        try:
            with open(self._journal_path, "r", encoding="utf-8") as f:
                for raw in f:
                    raw = raw.rstrip("\n")
                    if not raw:
                        continue
                    try:
                        n, _, payload = raw.partition("\t")
                        if int(n) != len(payload):
                            continue         # torn write -> skip, never fatal
                        out.append(json.loads(payload))
                    except Exception:
                        continue
        except OSError as exc:
            logger.warning("appendonly journal unreadable: %s", exc)
        return out

    @staticmethod
    def _render_index(entries: List[Dict[str, Any]], limit: int = INDEX_LIMIT) -> str:
        if not entries:
            return ""
        return "\n".join(f"- {e['fact']}" for e in entries[-limit:])

    def freeze(self) -> None:
        """Take the frozen index now (session start / reset)."""
        with self._lock:
            self._frozen_index = self._render_index(self._tail)
            self._frozen_seq = self._seq
            self._delivered_seq = self._seq


def register(ctx) -> None:
    """Register the append-only memory provider with the plugin system."""
    ctx.register_memory_provider(AppendOnlyMemoryProvider(config=_load_plugin_config()))
