# Context engines and memory consolidation

This replaces PRs #37–#39. Their original commits remain in the branch history.
PR #40 is extracted as a separately installed plugin, following the maintainer's
choice and the existing `plugins/AGENTS.md` policy. Nothing activates automatically.

## Configuration

The normal compressor and fixed 64K admission rule remain the defaults. To try
smaller local models, set `agent.context_floor: measured` in the active profile's
configuration. The estimate includes the assembled system prompt, resident tool
schemas (including context-engine tools), an output reservation, and an 8192-token
working window. Invalid numeric settings use positive defaults. This is an estimate,
not the model's tokenizer; request preflight and overflow handling remain necessary.
Set `agent.context_floor: fixed` to restore the original admission rule.

Select either `context.engine: boundedstate` or `context.engine: keyedstore`.
Both use the stock compression lifecycle: thresholds, checkpoint gates, stale-attempt
checks, tool-pair repair, tail protection and output reservations. They do not
replace request history on every model call. Both produce deterministic summaries
without an auxiliary model call. Bounded-state summaries are lossy excerpts; no
cost saving or quality improvement is claimed without representative model tests.

Keyedstore requires the `context_engine` toolset when an explicit enabled-toolset
list is configured. Startup refuses a keyedstore configuration that hides recall.
Recall searches return previews and ids; fetching an id returns at most 12,000
characters plus `next_offset` for the remainder. The content is historical data,
not new instructions.

## Isolation and retention

Discovery opens no database. Keyedstore opens a database only after a profile and
session are bound. Files live under the active Hebri home at
`context/keyedstore/<sha256-of-session-id>.sqlite3`, with private filesystem modes
where the OS supports them. Windows uses the user's profile ACLs. Operations
reject a mismatched active profile. Different session ids use different archives;
an explicit compression-parent lifecycle event copies only that parent's archive
into the continuation. No archive is implicitly shared with a new conversation.

The old unscoped `plugins/keyedstore/store.db` is not imported. Archives contain
redacted transcript copies, remain on the local disk after a session ends, and
are not automatically removed by deleting a chat in the desktop UI. Disable the
engine and close Hebri before removing the relevant archive files. This opt-in
retention is separate from chat history; do not enable it where that retention
policy is inappropriate. It grants no Synapsek team or account access.

## Standalone memory provider

The separate `codex/appendonly-standalone` branch contains only the memory plugin,
its license, usage documentation and tests. It must not be merged into the app's
main branch. Install only a reviewed, exact commit using the normal plugin installer.
Its original PR #40 author history is preserved by a subtree split.

Reviewed candidate: `7058da030ab8da08fcd968ff26e82625dc7cc866` on
`https://github.com/satoshilove/hebri/tree/7058da030ab8da08fcd968ff26e82625dc7cc866`.
Install with `hebri plugins install https://github.com/satoshilove/hebri --ref
7058da030ab8da08fcd968ff26e82625dc7cc866`, then choose `appendonly` through
`hebri memory setup` and start a new session.

The plugin uses a transactional local SQLite event sequence. Replacement and removal
delete superseded fact bodies; future sessions never rebuild memory from those
deleted facts. Existing prompts and chat transcripts are not retroactively erased.
The session's frozen memory prefix is unchanged; later turns carry corrections.
Prefetch is acknowledged only when its text appears in a completed turn, avoiding
loss on cancelled requests. No legacy JSONL journal is imported automatically.

## Validation

Regression tests use real loaders, real temporary profile homes, SQLite and the
real compressor. They cover A→B→A isolation, session isolation, restart and compression
continuations, concurrent access, bounded recall, tool-call/result pairing, normal
request stability, and actual agent startup with an estimated 32K context window.
The separate plugin tests cover removal, replacement, concurrent writers and delivery.
No customer prompts, provider calls, account grants or production changes are needed.
