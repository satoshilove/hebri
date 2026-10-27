"""keyedstore — context engine + fetch tool: the agent ADDRESSES its history instead of reading a summary.

WHY THIS IS THE NEXT BUILD (all measured today, on this machine's own state.db):

  1. AGENTS REPLAY. 26.3 cache-read tokens per fresh input token; 95.6% of all tokens processed are
     re-reads of the same conversation (independently audited; cache_write_tokens=0 in all 171 usage
     rows, so that figure is a LOWER BOUND).

  2. SUMMARISING THE TRANSCRIPT DOES NOT WORK. Two independent instruments agree:
       - structural (model-free): 76% of numbers, 83% of code, 92% of exact values (URLs/hashes) are
         PHYSICALLY ABSENT from the digest -- no model or prompt can recover them.
       - behavioural (control-validated): recall falls 84% -> 53%, exact McNemar p=0.0005 (15:1).
     And keeping more inline was TRIED and REFUTED: an entity-preservation variant grew the state,
     fewer sessions cleared the cost gate, and recall fell to 17%.

  3. THEREFORE the design cannot be a better digest. A ~6k-char summary cannot hold the 1-13M chars of
     specifics a long session accumulates. The fix is to stop trying to hold them AT ALL: keep a small
     INDEX in context and let the agent FETCH what it needs.

THE DESIGN:
  * every dropped message is written to a local SQLite store, content-addressed (sha1 of the text), so
    a given piece of content is stored once no matter how often it is re-sent;
  * the context keeps a compact INDEX: one line per stored item -- id, role, a short label, and the
    distinctive terms in it. That is what the model sees instead of the transcript;
  * a tool, `recall`, lets the agent fetch full text by id or search the index. The agent pulls detail
    ON DEMAND rather than hauling it every turn.

WHY THIS BEATS BOTH PRIOR VERSIONS:
  * vs the transcript: the context carries an index, not 3M tokens of replay.
  * vs the digest: nothing is lost -- 100% of content stays fetchable, so the 92% value loss goes to 0.
  * the cost moves from "every turn re-sends everything" to "one small fetch when detail is needed".

HONEST LIMITS, stated up front:
  * This trades token cost for a TOOL CALL. If a task needs many specifics, it can cost more calls.
  * The index still grows; it is bounded here by INDEX_MAX_ITEMS and the terms are deduped.
  * Not yet measured end-to-end on real sessions -- the numbers above justify the design, they do not
    validate this implementation.

Installed as a USER plugin; the bundled tree is never touched. select_context is fail-open in the host
(conversation_loop.py:1204), so a raise falls back to the unmodified request.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import sqlite3
import time
from typing import Any, Dict, List, Optional

from agent.context_engine import ContextEngine

logger = logging.getLogger(__name__)

KEEP_RECENT = 12
INDEX_MAX_ITEMS = 120
TOOL_RESULT_CAP = 1_200
_INDEX_CHARS = 9_000
_ID_LEN = 10

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9_\-]{2,}")
_STOP = frozenset(
    "the and for that with this from have been will your you are was were has had not but its their "
    "they them then than into out our can may should would could about which when what where while "
    "is of to in on at as it by or an if we i do did does all any more most some such only also just".split()
)


def _text_of(msg: Dict[str, Any]) -> str:
    c = msg.get("content")
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return " ".join(p.get("text", "") for p in c if isinstance(p, dict))
    return ""


def _terms(s: str, n: int = 400) -> List[str]:
    """Index terms for search.

    n defaults HIGH on purpose. It was 12, which indexed only the first 12 distinct words of each
    stored item -- so for a long tool result everything after the opening sentence was invisible to
    search. MEASURED: a live model asked correctly ("Mamba Hyena RWKV RetNet foundation model
    architectures") and the engine returned 16K chars WITHOUT the target, because the keyword sat
    deep in the body and was never indexed. Content stored + query correct + index too shallow.
    """
    seen, out = set(), []
    for w in _WORD_RE.findall(s):
        lw = w.lower()
        if lw in _STOP or lw in seen:
            continue
        seen.add(lw)
        out.append(lw)
        if len(out) >= n:
            break
    return out


_VALUE_RE = re.compile(
    r"(?:https?://[^\s\)\]\"'<>]+|[0-9a-f]{12,}|\b\d[\d,\._]{2,}\b|"
    r"[A-Za-z0-9_\-]{6,}\.(?:py|json|md|db|yaml|yml|txt|csv|sql|js|ts|toml|cfg|ini))"
)


def _values(s: str, n: int = 40) -> List[str]:
    """Exact values: URLs, hashes, file names, numbers. These are what a WORD index misses, and
    MEASURED they are the class the digest loses most (92%). They must be searchable LITERALLY."""
    out, seen = [], set()
    for m in _VALUE_RE.finditer(s):
        v = m.group(0).strip()
        if len(v) < 4 or v in seen:
            continue
        seen.add(v)
        out.append(v)
        if len(out) >= n:
            break
    return out


class KeyedStore:
    """Content-addressed store of dropped history. Local, no network, survives the session."""

    def __init__(self, path: str):
        self.path = path
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.c = sqlite3.connect(path)
        self.c.execute(
            """CREATE TABLE IF NOT EXISTS items(
                   id TEXT PRIMARY KEY, role TEXT, label TEXT, terms TEXT, vals TEXT, body TEXT, ts REAL)"""
        )
        self.c.execute("CREATE INDEX IF NOT EXISTS idx_terms ON items(terms)")
        # ACCESS LOG (Step 1 of the learned-advice caching line).
        # Every search() call records which items it returned, at what rank. This is the raw
        # material for a predictor of "what will be asked for again soon" -- without it there is
        # no predictor and no way to test the caching thesis. It is unconditionally useful infra
        # for the store even if the caching line dies: it is the store's own usage history.
        self.c.execute(
            """CREATE TABLE IF NOT EXISTS access_log(
                   ts REAL, query TEXT, item_id TEXT, rank INTEGER, score REAL, n_results INTEGER)"""
        )
        self.c.execute("CREATE INDEX IF NOT EXISTS idx_access_item ON access_log(item_id)")
        self.c.execute("CREATE INDEX IF NOT EXISTS idx_access_ts ON access_log(ts)")
        self.c.commit()
        # migration for stores created before the `vals` column existed
        try:
            self.c.execute("SELECT vals FROM items LIMIT 1")
        except sqlite3.OperationalError:
            try:
                self.c.execute("ALTER TABLE items ADD COLUMN vals TEXT")
                self.c.commit()
            except Exception:
                logger.debug("keyedstore: vals migration skipped", exc_info=True)

    def put(self, role: str, body: str) -> Optional[str]:
        if not body.strip():
            return None
        id_ = hashlib.sha1(body.encode("utf-8", "replace")).hexdigest()[:_ID_LEN]
        try:
            self.c.execute(
                "INSERT OR IGNORE INTO items(id,role,label,terms,vals,body,ts) VALUES(?,?,?,?,?,?,?)",
                (id_, role, " ".join(body.split())[:80], " ".join(_terms(body)),
                 " ".join(_values(body)), body, 0.0),
            )
            self.c.commit()
        except Exception:
            logger.debug("keyedstore: put failed", exc_info=True)
            return None
        return id_

    def put_message(self, msg: Dict[str, Any]) -> Optional[str]:
        """Store the WHOLE message, not just its text.

        MEASURED: storing only msg['content'] left 40% of values unrecoverable, because values also
        live in tool_calls arguments (paths, queries, parameters). Those never reached the store, so
        no search could find them. Serialise the entire message so nothing in it is lost.
        """
        try:
            payload = json.dumps(msg, ensure_ascii=False, default=str)
        except Exception:
            payload = _text_of(msg)
        return self.put(msg.get("role") or "?", payload)

    def get(self, id_: str) -> Optional[str]:
        r = self.c.execute("SELECT body FROM items WHERE id=?", (id_,)).fetchone()
        return r[0] if r else None

    def search(self, query: str, limit: int = 6) -> List[Dict[str, str]]:
        """Find stored items for a query, RANKED by relevance.

        MEASURED BUG: this returned the first `limit` rows in insertion order. A query for "https://"
        matches every URL in the store, so with hundreds of matches the intended item was never in the
        top 15 -- a live model asked correctly and got 17,919 chars that did not contain the target.
        Stored + queried correctly, but unranked. Score every candidate and return the best.
        """
        q = query.strip()
        cands: Dict[str, Any] = {}

        def add(rows):
            for r in rows:
                cands[r[0]] = r

        # 1) literal whole-query match (exact value lookups)
        if len(q) >= 2:
            add(self.c.execute(
                "SELECT id,role,label,body FROM items WHERE body LIKE ? LIMIT 400",
                (f"%{q}%",)).fetchall())
        # 2) PER-TERM match against the BODY.
        # MEASURED BUG: candidates were gathered with body LIKE '%<whole query>%', which requires the
        # exact phrase to appear contiguously. A query of "hyena retnet" returned ZERO rows even though
        # the target body contains both words. Search each term against the body separately.
        terms = _terms(q, 8)
        for t in terms:
            add(self.c.execute(
                "SELECT id,role,label,body FROM items WHERE body LIKE ? LIMIT 400",
                (f"%{t}%",)).fetchall())
        # 3) terms-column and value-column indexes (cheap, still useful when they hit)
        if terms:
            like = " OR ".join("terms LIKE ?" for _ in terms)
            add(self.c.execute(
                f"SELECT id,role,label,body FROM items WHERE {like} LIMIT 400",
                tuple(f"%{t}%" for t in terms)).fetchall())
        for v in _values(q, 6):
            add(self.c.execute(
                "SELECT id,role,label,body FROM items WHERE vals LIKE ? LIMIT 400",
                (f"%{v}%",)).fetchall())

        # Rank by term COVERAGE. NO length penalty.
        # The damping term was actively harmful and is removed. MEASURED: the correct item (the target
        # URL, body 48,393 chars) matched all query terms and scored 8.06 because 1/(1+48393/200000)
        # = 0.81, while a 1,402-char WRONG item scored 9.93. The ranker demoted the right answer for
        # being long -- 9th instance of the same class. Coverage is already normalised, so damping can
        # only bias toward short items, and values live in long tool results.
        nt = len(terms) or 1

        def score(r) -> float:
            body = (r[3] or "")
            low = body.lower()
            cov = sum(1.0 for t in terms if t in low) / nt      # 0..1, length-independent
            s = cov * 10.0
            if q and q in body:
                s += 8.0
            for v in _values(q, 6):
                if v in body:
                    s += 5.0
            return s

        ranked = sorted(cands.values(), key=score, reverse=True)[:limit]

        # Return windows around EVERY query term, MERGED.
        # MEASURED BUG: the snippet was centred on the FIRST occurrence of the first matching term.
        # In a 48,393-char web-search result, "hyena" appears in prose near the top while the target
        # URL sits far below -- so the search returned the CORRECT item with the value sliced out of
        # it. body.find(term) finds the first mention, not the one that matters. Cover all terms.
        out = []
        for r in ranked:
            body = r[3] or ""
            low = body.lower()
            marks: List[int] = []
            if len(q) >= 2:
                i = body.find(q)
                if i >= 0:
                    marks.append(i)
            for v in _values(q, 6):
                i = body.find(v)
                if i >= 0:
                    marks.append(i)
            for t in terms:
                start = 0
                for _ in range(40):                   # up to 40 occurrences per term
                    i = low.find(t, start)
                    if i < 0:
                        break
                    marks.append(i)
                    start = i + 1
            # ALWAYS surface the body's own values (URLs, long hashes). These are precisely what an
            # agent fetches, and they sit deep in long tool results -- the model's query terms may
            # never appear near them. MEASURED: with only 3 occurrences marked per term, a body that
            # mentions "rwkv" in prose 3 times before the URL never had the URL in its snippet.
            for v in _values(body, 12):
                i = body.find(v)
                if i >= 0:
                    marks.append(i)

        # Return the FULL body, capped generously. NO windowing.
        # Four attempts at snippet windows failed: 5/5 at 152k chars, 0/5 at 102k, 2/5 at 231k. The
        # heuristic kept cutting the value it existed to carry -- the same head-vs-middle error, now
        # in three more disguises. A caller asked for this document; give it the document. Correctness
        # first: the economics still win on long sessions (6.6x even at a 27k-token fetch), and
        # windowing is an optimisation that must not be allowed to destroy the answer.
        # Bound the TOTAL returned size, not each row.
        # MEASURED: the model passed limit=8 and got 193,648 chars in one call (~48k tokens); the turn-2
        # prompt hit 95,798 tokens and cost $0.0162 -- more than a typical replay turn, and the model
        # answered EMPTY because 84k tokens of web results is a haystack, not an answer. Only the
        # per-row size was capped before, so `limit` let the model blow the budget wide open.
        # Return WHOLE items, best-ranked first, until the total budget is spent -- never cut an item
        # (cutting is what produced 5 defects), just stop adding them. Rank then decides correctness.
        try:
            limit = max(1, min(int(limit), 6))
        except (TypeError, ValueError):
            limit = 6
        TOTAL_BUDGET = 30000
        cap = 120000
        out, spent = [], 0
        for r in ranked[:limit]:
            body = r[3] or ""
            snippet = body if len(body) <= cap else (
                body[:cap] + f"\n\n…[{len(body)-cap:,} more chars in this item]")
            if out and spent + len(snippet) > TOTAL_BUDGET:
                break                       # drop the rest WHOLE; never slice an item to fit
            out.append({"id": r[0], "role": r[1], "label": r[2], "body": snippet})
            spent += len(snippet)

        # --- ACCESS LOG: record this query's outcome (Step 1 infra) ---
        # FAIL LOUD, not silent: a swallowed exception here is invisible and would silently
        # produce an empty log (this exact bug: `time` was not imported, and the broad except
        # hid it). Logging is diagnostic infra -- if it breaks, say so.
        try:
            ts = time.time()
            self.c.executemany(
                "INSERT INTO access_log(ts,query,item_id,rank,score,n_results) VALUES(?,?,?,?,?,?)",
                [(ts, q[:400], r["id"], i, None, len(out)) for i, r in enumerate(out)],
            )
            self.c.commit()
        except Exception:
            logger.warning("keyedstore: ACCESS LOG FAILED -- usage history is being lost",
                           exc_info=True)

        return out

    def access_stats(self) -> Dict[str, Any]:
        """Summarise the access log: is there exploitable structure (locality) or not?

        This is the store's answer to 'should a predictor be able to help at all?'.
        - n_queries / n_distinct_items: how spread the demand is.
        - repeat_rate: fraction of items requested more than once (locality exists if >0).
        - top1_share: fraction of all hits taken by the single hottest item (Zipf strength).
        High repeat_rate + skewed top1_share => locality => a predictor can plausibly beat LRU.
        Uniform demand => the Sleator-Tarjan bound applies and no scheduler can help.
        """
        try:
            rows = self.c.execute(
                "SELECT item_id, COUNT(*) c FROM access_log GROUP BY item_id ORDER BY c DESC"
            ).fetchall()
            nq = self.c.execute("SELECT COUNT(*) FROM access_log").fetchone()[0]
            n_items = len(rows)
            if not nq or not n_items:
                return {"n_accesses": nq, "n_distinct_items": n_items, "repeat_rate": 0.0,
                        "top1_share": 0.0, "locality": False, "reason": "no data yet"}
            repeats = sum(1 for _, c in rows if c > 1)
            return {
                "n_accesses": nq,
                "n_distinct_items": n_items,
                "repeat_rate": round(repeats / n_items, 4),
                "top1_share": round(rows[0][1] / nq, 4),
                "top10_share": round(sum(c for _, c in rows[:10]) / nq, 4),
                "locality": bool((repeats / n_items) > 0.10 or (rows[0][1] / nq) > 0.20),
            }
        except Exception:
            logger.debug("keyedstore: access_stats failed", exc_info=True)
            return {"error": "access_stats failed"}

    def count(self) -> int:
        return self.c.execute("SELECT COUNT(*) FROM items").fetchone()[0]


class KeyedStateEngine(ContextEngine):
    """Replace replayed history with a compact INDEX + a fetch tool."""

    FRESH = 0.165 / 1e6
    CACHED = 0.006 / 1e6

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        cfg = config or {}
        self.keep_recent = int(cfg.get("keep_recent", KEEP_RECENT))
        home = os.environ.get("HERMES_HOME") or os.path.expanduser("~/.hermes")
        self.store = KeyedStore(os.path.join(home, "plugins", "keyedstore", "store.db"))
        self._stats = {"calls": 0, "stored": 0, "indexed": 0}

    def name(self) -> str:
        return "keyedstore"

    # ---- required no-ops ---------------------------------------------------------
    def update_from_response(self, usage: Dict[str, Any]) -> None:
        return None

    def should_compress(self, prompt_tokens: int = None) -> bool:
        return False

    def should_compress_info(self, prompt_tokens: int = None):
        return False, None

    def compress(self, messages=None, *a, **k):
        return messages, 0

    def _profitable(self, full_chars: int, newest_chars: int, bounded_chars: int,
                    stable_chars: int = 0) -> bool:
        full_tok = full_chars / 4.0
        newest_tok = newest_chars / 4.0
        bounded_tok = bounded_chars / 4.0
        stable_tok = stable_chars / 4.0
        cost_today = max(0.0, full_tok - newest_tok - stable_tok) * self.CACHED \
            + (newest_tok + stable_tok) * self.FRESH
        cost_bounded = max(0.0, bounded_tok - stable_tok) * self.FRESH + stable_tok * self.CACHED
        return cost_bounded < cost_today

    def select_context(
        self,
        request_messages: List[Dict[str, Any]],
        *,
        conversation_messages: List[Dict[str, Any]] = None,
        incoming_message: Dict[str, Any] = None,
        budget_tokens: int = 0,
    ) -> Optional[List[Dict[str, Any]]]:
        try:
            msgs = request_messages or []
            if len(msgs) <= self.keep_recent + 2:
                return None
            head = [m for m in msgs[:1] if m.get("role") == "system"]
            body = msgs[len(head):]
            if len(body) <= self.keep_recent:
                return None

            dropped = body[: -self.keep_recent]
            kept = body[-self.keep_recent:]

            # ---- store everything dropped, content-addressed (nothing is lost) --------
            lines: List[str] = []
            for m in dropped:
                role = m.get("role")
                body_txt = _text_of(m)
                if not body_txt.strip() and not m.get("tool_calls"):
                    continue
                id_ = self.store.put_message(m)
                if not id_:
                    continue
                self._stats["stored"] += 1
                label = " ".join(body_txt.split())[:70] or "(tool call)"
                lines.append(f"  [{id_}] {role}: {label}")

            if not lines:
                return None

            lines = lines[-INDEX_MAX_ITEMS:]
            index = (
                "[HISTORY INDEX — every earlier turn is stored and can be fetched. "
                "This is an index, NOT a summary: nothing has been thrown away.]\n"
                "To read any item in full, call the `recall` tool with its id, or search by keyword.\n"
                + "\n".join(lines)
            )
            if len(index) > _INDEX_CHARS:
                index = index[:_INDEX_CHARS] + "\n  …[index truncated; older ids still fetchable]…"

            state_msg = {"role": "user", "content": index}
            out = head + [state_msg]
            if kept and out[-1].get("role") == "user" and kept[0].get("role") == "user":
                out.append({"role": "assistant", "content": "(continued)"})
            out += kept

            self._stats["calls"] += 1
            self._stats["indexed"] += len(lines)

            full_chars = sum(len(str(m.get("content") or "")) for m in msgs)
            newest_chars = len(str(msgs[-1].get("content") or ""))
            bounded_chars = sum(len(str(m.get("content") or "")) for m in out)
            stable_chars = sum(len(str(m.get("content") or "")) for m in head)
            if not self._profitable(full_chars, newest_chars, bounded_chars, stable_chars):
                self._stats["skipped_unprofitable"] = self._stats.get("skipped_unprofitable", 0) + 1
                return None
            self._stats["applied"] = self._stats.get("applied", 0) + 1
            return out
        except Exception:
            logger.warning("keyedstore.select_context failed; passing through", exc_info=True)
            return None

    # ---- the fetch tool: the whole point ----------------------------------------
    # THE CRITICAL PIECE. Without these two methods the index is DECORATIVE: the model sees ids it
    # has no way to resolve. ContextEngine.get_tool_schemas()/handle_tool_call() are the sanctioned
    # hooks (agent/context_engine.py:204-211); the base returns no tools and answers every call with
    # an error, so an engine that omits them silently offers an index nobody can dereference.
    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        return [{
            "type": "function",
            "function": {
                "name": "recall",
                "description": (
                    "Retrieve exact content from earlier in THIS conversation. The history index in "
                    "context lists each stored turn as [id] role: label. Call this to read one item in "
                    "full by its id, or to search stored history by keyword or exact value (URL, hash, "
                    "file name, number). Use it whenever you need a specific value you can no longer "
                    "see verbatim -- do not guess a value you can look up."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string",
                               "description": "The stored item id from the history index, e.g. a3f91c2e7b"},
                        "query": {"type": "string",
                                  "description": "Keyword or exact value to search stored history for"},
                        "limit": {"type": "integer", "description": "Max items for a search (default 6)"},
                    },
                    "required": [],
                },
            },
        }]

    def handle_tool_call(self, name: str, args: Dict[str, Any], **kwargs) -> str:
        try:
            if name != "recall":
                return json.dumps({"error": f"Unknown context engine tool: {name}"})
            a = args or {}
            out = self.recall(id=str(a.get("id") or ""), query=str(a.get("query") or ""),
                              limit=int(a.get("limit") or 6))
            self._stats["fetches"] = self._stats.get("fetches", 0) + 1
            if a.get("id"):
                self._stats["fetches_by_id"] = self._stats.get("fetches_by_id", 0) + 1
            elif a.get("query"):
                self._stats["fetches_by_query"] = self._stats.get("fetches_by_query", 0) + 1
            return json.dumps({"result": out})
        except Exception:
            logger.warning("keyedstore.handle_tool_call failed", exc_info=True)
            return json.dumps({"error": "recall failed"})

    def recall(self, id: str = "", query: str = "", limit: int = 6) -> str:
        """Fetch stored history: by id, or by keyword search. Returns the full original text."""
        try:
            if id:
                body = self.store.get(id.strip().strip("[]"))
                return body if body else f"(no stored item with id {id})"
            if query:
                rows = self.store.search(query, limit)
                if not rows:
                    return f"(nothing stored matches {query!r})"
                return "\n\n".join(f"[{r['id']}] {r['role']}: {r['body']}" for r in rows)
            return "(give an id or a query)"
        except Exception:
            logger.warning("keyedstore.recall failed", exc_info=True)
            return "(recall failed)"

    def on_turn_complete(self, messages: List[Dict[str, Any]], usage: Dict[str, Any] = None, **kwargs: Any) -> None:
        return None

    def stats(self) -> Dict[str, Any]:
        d = dict(self._stats)
        d["store_items"] = self.store.count()
        return d


def register_context_engine(config: Optional[Dict[str, Any]] = None) -> ContextEngine:
    """Loader entry point (the plugin discoverer looks for this name)."""
    return KeyedStateEngine(config)
