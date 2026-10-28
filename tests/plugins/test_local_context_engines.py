"""Real loader, compression, recall and active-profile boundary tests."""
import copy
import json
from concurrent.futures import ThreadPoolExecutor

import pytest
from hermes_constants import set_hermes_home_override, reset_hermes_home_override
from agent.memory_provider import ctx_bound
from plugins.context_engine import load_context_engine


def bind(home):
    home.mkdir(exist_ok=True)
    return set_hermes_home_override(home)


def transcript():
    rows = [{"role": "system", "content": "Stable system prompt"}]
    for i in range(32):
        rows.extend([
            {"role": "user", "content": f"Task {i}: " + "requirements " * 500},
            {"role": "assistant", "content": None, "tool_calls": [{"id": f"call_{i}", "type": "function", "function": {"name": "read_file", "arguments": "{}"}}]},
            {"role": "tool", "tool_call_id": f"call_{i}", "content": f"result {i}: " + "evidence " * 800},
            {"role": "assistant", "content": f"Completed {i}"},
        ])
    rows.append({"role": "user", "content": "Continue the final task"})
    return rows


@pytest.mark.parametrize("name", ["boundedstate", "keyedstore"])
def test_compression_preserves_system_tool_pairs_and_request_prefix(name, tmp_path):
    token = bind(tmp_path / name)
    try:
        engine = load_context_engine(name)
        assert engine is not None and engine.name == name
        engine.update_model("fixture-model", 32000)
        engine.on_session_start("fixture", hermes_home=str(tmp_path / name))
        original = transcript()
        saved = copy.deepcopy(original)
        assert engine.select_context(original, budget_tokens=32000) is None
        assert original == saved
        assert engine.should_compress(31000)
        compacted = engine.compress(original, current_tokens=100000, force=True)
        assert isinstance(compacted, list) and len(compacted) < len(saved)
        # The stock compressor appends its handoff notice at this sanctioned
        # cache boundary. Ordinary request selection must leave it untouched.
        assert compacted[0]["content"].startswith(saved[0]["content"])
        pending = set()
        for message in compacted:
            if message["role"] == "assistant":
                assert not pending
                pending.update(tc["id"] for tc in message.get("tool_calls", []))
            if message["role"] == "tool":
                assert message["tool_call_id"] in pending
                pending.remove(message["tool_call_id"])
        assert not pending
        stable = copy.deepcopy(compacted)
        assert engine.select_context(compacted, budget_tokens=32000) is None
        assert compacted == stable
        engine.on_session_end("fixture", compacted)
    finally:
        reset_hermes_home_override(token)


def test_keyedstore_profiles_sessions_restart_and_bounded_recall(tmp_path):
    a, b = tmp_path / "a", tmp_path / "b"
    token = bind(a)
    engine = load_context_engine("keyedstore")
    try:
        assert engine.store is None  # discovery must not open a database
        engine.on_session_start("same-session", hermes_home=str(a))
        key = engine.store.put_message({"role": "user", "content": "private-A " * 6000})
        first = json.loads(engine.handle_tool_call("recall", {"id": key}))["result"]
        assert len(first["body"]) <= 12000 and first["next_offset"]
        second = json.loads(engine.handle_tool_call("recall", {"id": key, "offset": first["next_offset"]}))["result"]
        assert second["body"]
        child = engine.clone_for_agent()
        assert child.store is None
        child.on_session_start("different-session", hermes_home=str(a))
        assert child.store.get(key)["error"] == "item_not_found"
        child.on_session_end("different-session", [])
        token_b = bind(b)
        try:
            assert "profile_mismatch" in engine.handle_tool_call("recall", {"id": key})
            other = load_context_engine("keyedstore")
            other.on_session_start("same-session", hermes_home=str(b))
            assert other.store.get(key)["error"] == "item_not_found"
            other.on_session_end("same-session", [])
        finally:
            reset_hermes_home_override(token_b)
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda f: f(), [ctx_bound(lambda: engine.store.get(key)) for _ in range(2)]))
        assert all("private-A" in result["body"] for result in results)
        engine.on_session_end("same-session", [])
        engine.on_session_start("same-session", hermes_home=str(a))
        assert "private-A" in engine.store.get(key)["body"]
        assert "private-A" in engine.store.search("private-A")[0]["preview"]
        engine.on_session_start("compacted-child", boundary_reason="compression", old_session_id="same-session")
        assert "private-A" in engine.store.get(key)["body"]
        engine.on_session_end("compacted-child", [])
        engine.on_session_start("compacted-child", hermes_home=str(a))
        assert "private-A" in engine.store.get(key)["body"]
        engine.on_session_end("compacted-child", [])
    finally:
        engine._close_store()
        reset_hermes_home_override(token)
