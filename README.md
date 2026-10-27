# Hebri append-only memory plugin

Optional local memory, derived from Hebri PR #40. This standalone branch preserves
the original contributor commit and adds profile isolation, transactional writes,
replacement/removal, bounded delivery and regression tests. Do not merge this branch
into the desktop application's main branch.

Install a reviewed **full 40-character commit SHA** through Hebri's normal plugin
installer:

```sh
hebri plugins install https://github.com/satoshilove/hebri --ref <reviewed-plugin-commit>
hebri memory setup
```

Choose `appendonly` as the memory provider and start a new session. The plugin is
optional and is not enabled by installing a normal Hebri desktop release. It needs
the existing Hebri runtime and Python's standard-library SQLite; it adds no network
service, provider key, or third-party dependency.

Data stays under the active profile's `memory/appendonly-v2.sqlite3`. Active facts
are profile-wide; each conversation freezes its own startup snapshot. The event
sequence retains fact ids and operations, while remove/replace deletes the old
fact body using SQLite secure deletion. No old JSONL journal is imported, because
that journal did not reliably record removal. Review and re-add any wanted legacy
facts deliberately.

The `memory_append` tool supports add, replace and remove. Replace/remove requires
the exact previous fact and target (`memory` or `user`). Built-in memory-tool
notifications use the same write path. Concurrent processes serialize writes in
SQLite. Non-primary agents cannot write, and active-profile mismatches are rejected.

The frozen prompt never changes mid-session. Corrections appear at the turn tail;
they are retried until observed in a completed transcript. This does not erase
previous chat transcripts or prompts already sent to a provider. Disabling the
plugin does not delete its database; close Hebri before manually removing it.

Tests use the real Hebri user-plugin loader and temporary profiles. From a Hebri
source checkout, run its canonical `scripts/run_tests.sh` with the absolute path
to this plugin's `tests/test_appendonly.py`. The tests have passed on Linux and
native Windows; macOS runtime qualification is still required.
