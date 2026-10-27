"""Standalone Hebri memory plugin: frozen prefix, transactional live changes.

Derived from Hebri PR #40 (e7c6c7729e3215b5f720287d3a058e17ca25bc97).
The event sequence is append-only; removed/replaced fact bodies are deleted.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import sqlite3
import threading

from agent.memory_provider import MemoryProvider, RecallStatus
from hermes_constants import get_hermes_home, hermes_home_key, mkdir_under_hermes_home


class AppendOnlyMemoryProvider(MemoryProvider):
    def __init__(self):
        self._lock = threading.RLock()
        self._db = None
        self._home = ""
        self._session_id = ""
        self._frozen_index = ""
        self._delivered_seq = 0
        self._last_count = 0
        self._pending = {}

    @property
    def name(self):
        return "appendonly"

    def is_available(self):
        return True

    def _check_scope(self, session_id=""):
        if self._db is None or self._home != hermes_home_key():
            raise PermissionError("appendonly requires its owning active profile")
        if session_id and session_id != self._session_id:
            raise PermissionError("appendonly session mismatch")

    def initialize(self, session_id, **kwargs):
        home = kwargs.get("hermes_home") or get_hermes_home()
        if hermes_home_key(home) != hermes_home_key():
            raise PermissionError("appendonly profile mismatch")
        self.shutdown()
        self._home = hermes_home_key(home)
        self._session_id = session_id
        self._writable = kwargs.get("agent_context", "primary") == "primary"
        directory = Path(self._home) / "memory"
        if not directory.resolve().is_relative_to(Path(self._home)):
            raise ValueError("memory directory escapes the profile")
        mkdir_under_hermes_home(directory)
        directory.chmod(0o700)
        path = directory / "appendonly-v2.sqlite3"
        if path.is_symlink():
            raise ValueError("memory database must not be a symlink")
        fd = os.open(path, os.O_CREAT | os.O_RDWR, 0o600)
        os.close(fd)
        path.chmod(0o600)
        self._db = sqlite3.connect(path, check_same_thread=False, timeout=10)
        self._db.execute("PRAGMA secure_delete=ON")
        self._db.executescript("""
            CREATE TABLE IF NOT EXISTS events (
                seq INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL,
                action TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS facts (
                key TEXT PRIMARY KEY, target TEXT NOT NULL, fact TEXT NOT NULL,
                seq INTEGER NOT NULL);
        """)
        self.freeze()

    def freeze(self):
        self._check_scope()
        with self._lock, self._db:
            # A read transaction keeps the high-water mark and snapshot coherent
            # while another process commits a fact.
            self._db.execute("BEGIN")
            self._delivered_seq = self._db.execute("SELECT coalesce(max(seq), 0) FROM events").fetchone()[0]
            facts = self._db.execute("SELECT key, target, fact FROM facts ORDER BY seq DESC LIMIT 40").fetchall()
            lines = []
            for key, target, fact in facts:
                line = f"[{key}] {target}: {fact}"
                if sum(map(len, lines)) + len(lines) + len(line) > 6000:
                    break
                lines.append(line)
            self._frozen_index = "\n".join(reversed(lines))
        self._pending = {}
        self._last_count = 0

    def on_session_switch(self, new_session_id, **kwargs):
        self._check_scope()
        self._session_id = new_session_id
        self.freeze()

    def system_prompt_block(self):
        self._check_scope()
        if not self._frozen_index:
            return ""
        return "# Saved memory\nLater memory updates supersede these entries by id.\n" + self._frozen_index

    @staticmethod
    def _key(target, fact):
        return hashlib.sha256((target + "\0" + fact.strip()).encode()).hexdigest()

    def on_memory_write(self, action, target, content, metadata=None):
        previous = (metadata or {}).get("previous_content")
        return self.write(action, target, content, previous)

    def write(self, action, target, content="", previous=None):
        self._check_scope()
        if not self._writable:
            raise PermissionError("only the primary agent may write memory")
        if action not in {"add", "replace", "remove"} or target not in {"memory", "user"}:
            raise ValueError("invalid memory operation")
        if action != "remove" and (not isinstance(content, str) or not content.strip() or len(content) > 4096):
            raise ValueError("fact must contain 1 to 4096 characters")
        if action != "add" and (not isinstance(previous, str) or not previous.strip()):
            raise ValueError("replace/remove requires the exact previous fact")
        with self._lock, self._db:
            # SQLite serializes writers across provider instances AND processes.
            self._db.execute("BEGIN IMMEDIATE")
            if action != "add":
                old_key = self._key(target, previous)
                self._db.execute("DELETE FROM facts WHERE key=?", (old_key,))
                self._db.execute("INSERT INTO events(key, action) VALUES (?, 'remove')", (old_key,))
            if action != "remove":
                key = self._key(target, content)
                seq = self._db.execute("INSERT INTO events(key, action) VALUES (?, 'add')", (key,)).lastrowid
                self._db.execute("INSERT OR REPLACE INTO facts VALUES (?, ?, ?, ?)", (key, target, content.strip(), seq))
        return {"success": True}

    def prefetch(self, query, *, session_id=""):
        self._check_scope(session_id)
        with self._lock:
            rows = self._db.execute(
                "SELECT e.seq, e.key, e.action, f.fact FROM events e "
                "LEFT JOIN facts f ON f.key=e.key AND f.seq=e.seq "
                "WHERE e.seq > ? ORDER BY e.seq LIMIT 40", (self._delivered_seq,)).fetchall()
            if not rows:
                self._last_count = 0
                return ""
            return self._prefetch_bounded(rows)

    def _prefetch_bounded(self, rows):
        lines, seq = [], self._delivered_seq
        for number, key, action, fact in rows:
            line = f"Forget entry [{key}]; it is no longer current memory." if action == "remove" else (f"[{key}] {fact}" if fact else "")
            if sum(map(len, lines)) + len(line) > 4800:
                break
            lines.append(line)
            seq = number
        text = "<memory-updates>\n" + "\n".join(lines) + "\n</memory-updates>"
        # Keep at most one candidate per observed journal position.
        self._pending = {pending: number for pending, number in self._pending.items() if number > self._delivered_seq}
        self._pending[text] = seq
        self._last_count = len(lines)
        return text

    def sync_turn(self, user_content, assistant_content, *, session_id="", messages=None, **kwargs):
        self._check_scope(session_id)
        # Prefetch may time out or a request may be interrupted. Acknowledge only
        # text present in the completed turn's transcript, never on lookup alone.
        text = json.dumps(messages or [], ensure_ascii=False)
        with self._lock:
            for pending, seq in list(self._pending.items()):
                if json.dumps(pending, ensure_ascii=False)[1:-1] in text:
                    self._delivered_seq = max(self._delivered_seq, seq)
                    del self._pending[pending]

    def recall_status(self):
        return RecallStatus("Hebri memory", self._last_count) if self._last_count else None

    def get_tool_schemas(self):
        return [{"name": "memory_append", "description": "Add, replace, or remove a saved fact. Replace/remove needs its exact previous text. Changes apply to later turns without rewriting earlier prompts.",
                 "parameters": {"type": "object", "properties": {
                     "action": {"type": "string", "enum": ["add", "replace", "remove"]},
                     "fact": {"type": "string", "maxLength": 4096},
                     "previous": {"type": "string"},
                     "target": {"type": "string", "enum": ["memory", "user"]}}, "required": ["action", "target"]}}]

    def handle_tool_call(self, tool_name, args, **kwargs):
        if tool_name != "memory_append":
            return json.dumps({"error": "unknown_tool"})
        try:
            return json.dumps(self.write(args.get("action", "add"), args.get("target", "memory"), args.get("fact", ""), args.get("previous")))
        except (ValueError, PermissionError) as exc:
            return json.dumps({"error": str(exc)})

    def shutdown(self):
        with self._lock:
            if self._db is not None:
                self._db.close()
                self._db = None


def register(ctx):
    ctx.register_memory_provider(AppendOnlyMemoryProvider())
