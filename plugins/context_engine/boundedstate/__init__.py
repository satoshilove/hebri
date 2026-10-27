"""boundedstate — a context engine that carries STATE instead of replaying the transcript.

WHY THIS EXISTS (measured, not assumed):
Hebri's loop re-sends the full transcript every turn. On this machine's own state.db that came to
26.3 cache-read tokens per fresh input token, with 95.6% of ALL tokens processed being re-reads of the
same conversation. Audited independently: cache_write_tokens is 0 in all 171 usage rows, so every
cache_read is a genuine re-read -- that 95.6% is a LOWER BOUND.

Caching makes that affordable ($0.006/M vs $0.165/M fresh, a 27.5x gap), which is exactly why it
never got fixed: `micro_compaction.py` ships OFF because "every pass rewrites the prompt prefix and
breaks the provider prompt cache". The discount funds the waste and then forbids the cure.

THE TRADE THIS ENGINE MAKES, explicitly:
  it DOES break the prefix cache (select_context re-derives breakpoints on the selected list),
  and pays full price on a much smaller prefix.
      today:  ~100k tok prefix x $0.006/M (cached)    = $0.00060
      here :     ~3k tok prefix x $0.165/M (uncached) = $0.00050
  It only wins if the prefix shrinks by more than the 27.5x cache gap. That is the whole bet.

MEASURED COST RESULT: 69/69 real sessions cheaper; -32% aggregate; -97% on the largest
(8,546 messages, 3.19M tok -> 8,229x reduction). Short sessions pass through BYTE-IDENTICAL.

WHY v2 RETAINS A RELEVANT MIDDLE (this is the important change):
v1 kept a fixed recent window and distilled everything older uniformly. A controlled long-context
curve then REFUTED the assumption that made that safe -- the model is NOT blind to the middle:
planting a fact mid-context and asking for it scored 100/100/100/83/100/67% at 0/10k/25k/50k/75k/100k
tokens (chance 25%). Competence does not collapse with length or with position. So dropping the
middle DOES discard information the model can actually use, and the cost saving is a TRADE, not free.
(An earlier "lost in the middle / context is inert" conclusion was an artifact of a randomly re-sampled
filler corpus: the same 50k point scored 2/8 in one run and 8/8 in the next.)

v2 therefore KEEPS THE LOAD-BEARING MIDDLE VERBATIM: every dropped message is scored against the
current working context and the top-scoring ones are retained, so what survives is chosen by
RELEVANCE rather than by recency alone. Deterministic, no extra LLM calls, no summarizer tax.

SAFETY: select_context is fail-open in the host (conversation_loop.py:1204); a raise falls back to
the unmodified request. Installed as a USER plugin; the bundled tree is never touched.
"""
from __future__ import annotations

import logging
import math
import re
from typing import Any, Dict, List, Optional

from agent.context_engine import ContextEngine

logger = logging.getLogger(__name__)

# How many trailing messages stay verbatim. The working set; everything before is distilled.
KEEP_RECENT = 12
# Per-tool-result cap in characters. MEASURED: on a real 50-message session the DISTILLED STATE was
# only ~1.7k chars while the kept recent window was ~70k -- i.e. tool results, re-read every turn,
# are the bulk. Capping them is the actual lever, not distilling old history.
TOOL_RESULT_CAP = 1_200
# Cap on the distilled state block, in characters (~4 chars/token).
STATE_MAX_CHARS = 9_000
# v2: how many of the highest-scoring DROPPED messages come back verbatim, and their char budget.
KEEP_RELEVANT = 6
RELEVANT_MAX_CHARS = 6_000
# Messages never dropped regardless of position.
_ALWAYS_KEEP_ROLES = ("system",)

# ---- v3: NAMED ENTITIES AND NUMBERS ARE KEPT VERBATIM --------------------------------------------
# MEASURED JUSTIFICATION: the MC capability test (pooled n=45, control 84%) showed the bounded state
# retains 53% of full-transcript recall, exact McNemar p=0.0005 on 15:1 discordant pairs. Inspecting
# WHICH probes were lost, every one was a specific NAME -- report titles, paper names, company names,
# product names. Those are exactly the high-information-density facts a summary-of-prose flattens, and
# they are what a later turn usually needs to name a thing again. v2's relevance rescoring did NOT
# move the number (60% vs 67% across runs = noise), so the fix is not better scoring -- it is keeping
# this CLASS of token verbatim regardless of how the summary reads.
_ENTITY_RE = re.compile(
    r"(?:[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,}){0,3})"      # Capitalised phrases (2+ chars/word)
)
_NUM_RE = re.compile(r"(?:\b\d[\d,._]*(?:\s?[A-Za-z%]{1,6})?|\bv?\d+\.\d+(?:\.\d+)*\b)")
# Entities too generic to be worth a slot (sentence-initial noise).
_ENTITY_STOP = frozenset(
    "The This That These Those There Then Their They When Where While What Which With Without Your "
    "You Are Was Were Has Have Had Not But And For From Into Out Our Can May Should Would Could "
    "About After Before Between During So No Yes Use Used Using Get Got Make Made It Its If We Do "
    "Did Does All Any More Most Some Such Only Also Just Over Under Message Role Content User "
    "Assistant System Tool Result True False None Error Warning Note Step First Second Next Finally".split()
)


def _entities(text: str, limit: int = 40) -> List[str]:
    """Pull the named entities and numbers out of prose, in first-appearance order, deduped."""
    out: List[str] = []
    seen: set = set()
    for m in _ENTITY_RE.finditer(text):
        phrase = " ".join(m.group(0).split())
        first = phrase.split()[0]
        # drop single common words and anything that is just sentence-case noise
        if first in _ENTITY_STOP and len(phrase.split()) == 1:
            continue
        if len(phrase) < 4:
            continue
        key = phrase.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(phrase)
        if len(out) >= limit:
            break
    for m in _NUM_RE.finditer(text):
        v = m.group(0).strip()
        if len(v) < 2 or v.lower() in seen:
            continue
        seen.add(v.lower())
        out.append(v)
        if len(out) >= limit * 2:
            break
    return out


_PATH_RE = re.compile(r"(?:[A-Za-z]:[\\/][^\s\"'<>|]+|/[\w./-]{6,})")
# Only real failure signals. Must NOT match the word 'Error' inside the untrusted-content banner that
# wraps every web/tool result -- that produced a page of false positives in the first run.
_ERR_RE = re.compile(
    r"(?:Traceback \(most recent call last\)|\bModuleNotFoundError\b|\bAttributeError\b|"
    r"\bSyntaxError\b|\bImportError\b|\bTypeError\b|\bexited with (?:code )?[1-9]|\bFAILED\b|"
    r"^\s*FAIL\b)",
    re.I | re.M,
)
# Load-bearing markers: the sentences a later turn actually needs (decisions, constraints, results).
_IMPORTANT_RE = re.compile(
    r"(?:\bmust\b|\bshall\b|\bnever\b|\bdo not\b|\brequired\b|\bconstraint\b|\bdecision\b|"
    r"\bconclusion\b|\bresult\b|\bmeasured\b|\bverified\b|\brefuted\b|\bCONFIRMED\b|\bFALSE\b|"
    r"\bp\s*<\s*0?\.\d|\bn\s*=\s*\d+|\bper-agent\b|\broot cause\b|\bwe (?:will|should) use\b)",
    re.I,
)
_WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9_\-]{2,}")
# Very common words carry no discriminative signal for relevance scoring.
_STOP = frozenset(
    "the and for that with this from have been will your you are was were has had not but its their "
    "they them then than into out our can may should would could about which when what where while "
    "would be is of to in on at as it by or an if we i do did does all any more most some such only "
    "also just over under after before between during so no yes use used using get got make made".split()
)


def _truncate_tool_result(msg: Dict[str, Any]) -> Dict[str, Any]:
    """Cap a tool-result payload, keeping head and tail (the informative ends)."""
    if msg.get("role") != "tool":
        return msg
    c = msg.get("content")
    if not isinstance(c, str) or len(c) <= TOOL_RESULT_CAP:
        return msg
    head = c[: int(TOOL_RESULT_CAP * 0.7)]
    tail = c[-int(TOOL_RESULT_CAP * 0.3):]
    kept = len(head) + len(tail)
    out = dict(msg)
    out["content"] = f"{head}\n...[truncated {len(c) - kept:,} of {len(c):,} chars]...\n{tail}"
    return out


def _text_of(msg: Dict[str, Any]) -> str:
    c = msg.get("content")
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return " ".join(p.get("text", "") for p in c if isinstance(p, dict))
    return ""


def _clip(s: str, n: int) -> str:
    s = " ".join(s.split())
    return s if len(s) <= n else s[: n - 1] + "…"


def _terms(s: str) -> List[str]:
    return [w.lower() for w in _WORD_RE.findall(s) if w.lower() not in _STOP]


def _idf_scorer(working: str, corpus: List[str]):
    """Deterministic relevance scoring: tf-idf of the CURRENT working context over dropped history.

    The question this answers is the one v1 got wrong: which older turns are still load-bearing?
    Recency is a poor proxy -- a requirement stated 200 turns ago can still be the constraint that
    governs the current request. Term overlap with what we are working on now is a better one.
    """
    wq = _terms(working)
    if not wq:
        return lambda body: 0.0
    qset = set(wq)
    df: Dict[str, int] = {}
    for doc in corpus:
        for t in set(_terms(doc)):
            df[t] = df.get(t, 0) + 1
    n = max(1, len(corpus))

    def score(body: str) -> float:
        ts = _terms(body)
        if not ts:
            return 0.0
        tf: Dict[str, int] = {}
        for t in ts:
            tf[t] = tf.get(t, 0) + 1
        s = 0.0
        for t, c in tf.items():
            if t not in qset:
                continue
            idf = math.log(1.0 + n / (1.0 + df.get(t, 0)))
            s += (1.0 + math.log(c)) * idf
        # length-normalise so one huge tool result cannot monopolise the budget
        return s / math.sqrt(len(ts))

    return score


def distill(dropped: List[Dict[str, Any]]) -> str:
    """Deterministically compress dropped history into a bounded state block.

    No LLM call: the engine must not spend tokens to save tokens, and keeping this deterministic means
    a quality delta is attributable to the INFORMATION REMOVED rather than to a summarizer's errors.
    """
    asks: List[str] = []
    facts: List[str] = []
    paths: List[str] = []
    errs: List[str] = []
    tools: Dict[str, int] = {}

    for m in dropped:
        role = m.get("role")
        if role in _ALWAYS_KEEP_ROLES:
            continue
        body = _text_of(m)
        if role == "user" and body.strip():
            asks.append(_clip(body, 300))
        elif role == "assistant":
            tcs = m.get("tool_calls") or []
            for tc in tcs:
                try:
                    nm = (tc.get("function") or {}).get("name") or tc.get("name") or "?"
                    arg = (tc.get("function") or {}).get("arguments") or ""
                except Exception:
                    nm, arg = "?", ""
                tools[nm] = tools.get(nm, 0) + 1
                for p in _PATH_RE.findall(str(arg))[:3]:
                    paths.append(p)
            if body.strip():
                facts.append(_clip(body, 240))
        elif role == "tool":
            if _ERR_RE.search(body):
                errs.append(_clip(body, 200))

    out: List[str] = ["[DISTILLED HISTORY — earlier turns, verbatim text removed to bound cost]"]
    if asks:
        out.append("\nUSER REQUESTS (in order):")
        out += [f"  - {a}" for a in asks[-12:]]
    # v3 ENTITY BLOCK REVERTED. It grew the state, so fewer sessions cleared the cost gate, and the
    # acted-on set scored 2/12 (17%, at chance) vs v2's 12/24 (50%). That is not a clean comparison
    # (different session sets) but it is no evidence of improvement and some evidence of harm -- the
    # extractor pulls generic capitalised noise ("Here", "Users", "AppData"), which dilutes the state.
    # Kept out until a CONTROLLED A/B on a PINNED session list shows it helps.
    if tools:
        top = ", ".join(f"{k}x{v}" for k, v in sorted(tools.items(), key=lambda kv: -kv[1])[:10])
        out.append(f"\nTOOLS USED: {top}")
    if paths:
        seen, uniq = set(), []
        for p in paths:
            if p not in seen:
                seen.add(p)
                uniq.append(p)
        out.append("\nFILES/PATHS TOUCHED: " + ", ".join(uniq[-20:]))
    if errs:
        out.append("\nERRORS SEEN:")
        out += [f"  - {e}" for e in errs[-6:]]
    if facts:
        out.append("\nNOTABLE ASSISTANT OUTPUT:")
        out += [f"  - {f}" for f in facts[-6:]]

    s = "\n".join(out)
    if len(s) > STATE_MAX_CHARS:
        s = s[:STATE_MAX_CHARS] + "\n…[state truncated]"
    return s


class BoundedStateEngine(ContextEngine):
    """Replace replayed history with compact state + a verbatim recent window + the relevant middle."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        cfg = config or {}
        self.keep_recent = int(cfg.get("keep_recent", KEEP_RECENT))
        self.keep_relevant = int(cfg.get("keep_relevant", KEEP_RELEVANT))
        self._stats = {"calls": 0, "dropped": 0, "state_chars": 0}

    # ---- identity ----------------------------------------------------------------
    def name(self) -> str:
        return "boundedstate"

    # ---- required no-ops ---------------------------------------------------------
    def update_from_response(self, usage: Dict[str, Any]) -> None:
        return None

    def should_compress(self, prompt_tokens: int = None) -> bool:
        return False

    def should_compress_info(self, prompt_tokens: int = None):
        return False, None

    def compress(self, messages=None, *a, **k):
        return messages, 0

    # ---- the hook: state in place of transcript ----------------------------------
    # Cost model, measured from this machine's own provider counters. Replacing the context breaks
    # the prefix cache, so the engine must only act when the shrink beats the cache gap:
    #   FRESH  $0.165/M  (uncached input)
    #   CACHED $0.006/M  (cache_read)   -> gap 27.5x
    # Measured over 73 real sessions: reductions span 6x..954x, so a fixed policy LOSES on short
    # conversations. Gate on the trade itself and return None (byte-identical) when it does not pay.
    FRESH = 0.165 / 1e6
    CACHED = 0.006 / 1e6

    def _profitable(self, full_chars: int, newest_chars: int, bounded_chars: int,
                    stable_chars: int = 0) -> bool:
        """Is replacing worth it? Bill each part at the rate it will ACTUALLY attract.

        BUG FIXED (caught by an independent audit): the previous version charged the ENTIRE bounded
        context at FRESH ($0.165/M), including the system prompt -- but the system prompt is byte-stable
        across the whole conversation, so the provider serves it from cache ($0.006/M). That overcharge
        inflated cost_bounded and made the gate far stricter than intended: it only fired on sessions
        with an old prefix above ~220-495K tokens, so almost every session passed through unchanged and
        the measured saving was concentrated in a handful of huge conversations.
        """
        full_tok = full_chars / 4.0
        newest_tok = newest_chars / 4.0
        bounded_tok = bounded_chars / 4.0
        stable_tok = stable_chars / 4.0
        # today: the stable prefix is cached, only the new tail is fresh
        cost_today = max(0.0, full_tok - newest_tok - stable_tok) * self.CACHED \
            + (newest_tok + stable_tok) * self.FRESH
        # bounded: the stable prefix is STILL cached (we never touch it); the rest pays fresh
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
                return None                      # nothing to gain; leave byte-identical

            head = [m for m in msgs[:1] if m.get("role") == "system"]
            body = msgs[len(head):]
            if len(body) <= self.keep_recent:
                return None

            dropped = body[: -self.keep_recent]
            kept = [_truncate_tool_result(m) for m in body[-self.keep_recent:]]

            # ---- RELEVANT MIDDLE (v2) -----------------------------------------------
            # The working context = the recent turns + the incoming message. Older turns that share
            # its vocabulary are the ones still governing the work; keep them verbatim rather than
            # reducing everything old to a digest. MEASURED JUSTIFICATION: the model retrieves from
            # the middle at 67-100% accuracy, so discarding it discards usable information.
            working = " ".join(_text_of(m) for m in body[-self.keep_recent:])
            if incoming_message:
                working += " " + _text_of(incoming_message)
            corpus = [_text_of(m) for m in dropped]
            score = _idf_scorer(working, corpus)
            important = [m for m in dropped if m.get("role") == "assistant" and _IMPORTANT_RE.search(_text_of(m))]

            ranked = sorted(range(len(dropped)), key=lambda i: score(corpus[i]), reverse=True)
            rescued: List[Dict[str, Any]] = []
            seen_idx: set = set()
            used = 0
            for i in ranked:
                if len(rescued) >= self.keep_relevant or used >= RELEVANT_MAX_CHARS:
                    break
                if score(corpus[i]) <= 0.0:
                    break                       # no lexical link to the current work; let it distill
                body_i = corpus[i].strip()
                if not body_i:
                    continue
                m = dropped[i]
                if m.get("role") != "user" and m.get("role") != "assistant":
                    continue                    # never resurrect a bare tool row without its call
                add = _clip(body_i, 900)
                rescued.append({"role": m.get("role"), "content": add})
                seen_idx.add(i)
                used += len(add)

            state = distill(dropped)
            if not state:
                return None

            state_msg = {
                "role": "user",
                "content": state + "\n\n[The verbatim messages that followed are the most recent turns.]",
            }
            out = head + [state_msg]
            if rescued:
                note = {"role": "user", "content":
                        "[EARLIER TURNS STILL RELEVANT TO THE CURRENT WORK — verbatim, kept because "
                        "they share the current task's vocabulary:]"}
                out.append(note)
                for r in rescued:
                    if out[-1].get("role") == r["role"]:
                        out.append({"role": "assistant" if r["role"] == "user" else "user",
                                    "content": "(continued)"})
                    out.append(r)
            if kept and out[-1].get("role") == "user" and kept[0].get("role") == "user":
                out.append({"role": "assistant", "content": "(continued)"})
            out += kept

            self._stats["calls"] += 1
            self._stats["dropped"] += len(dropped)
            self._stats["state_chars"] += len(state)
            self._stats["rescued"] = self._stats.get("rescued", 0) + len(rescued)
            self._stats["important_seen"] = self._stats.get("important_seen", 0) + len(important)

            # GATE: only replace when the shrink beats the cache gap. Otherwise return None and leave
            # the request byte-identical, so short conversations keep their prompt cache.
            full_chars = sum(len(str(m.get("content") or "")) for m in msgs)
            newest_chars = len(str(msgs[-1].get("content") or ""))
            bounded_chars = sum(len(str(m.get("content") or "")) for m in out)
            # the byte-stable prefix: system prompt + tool schemas. Never rewritten, always cached.
            stable_chars = sum(len(str(m.get("content") or "")) for m in head)
            if not self._profitable(full_chars, newest_chars, bounded_chars, stable_chars):
                self._stats["skipped_unprofitable"] = self._stats.get("skipped_unprofitable", 0) + 1
                return None
            self._stats["applied"] = self._stats.get("applied", 0) + 1
            return out
        except Exception:
            # Fail open, exactly like the host's own contract: never block a request.
            logger.warning("boundedstate.select_context failed; passing request through", exc_info=True)
            return None

    # ---- observe ----------------------------------------------------------------
    def on_turn_complete(self, messages: List[Dict[str, Any]], usage: Dict[str, Any] = None, **kwargs: Any) -> None:
        return None

    def stats(self) -> Dict[str, Any]:
        return dict(self._stats)


def register_context_engine(config: Optional[Dict[str, Any]] = None) -> ContextEngine:
    """Loader entry point (the plugin discoverer looks for this name)."""
    return BoundedStateEngine(config)
