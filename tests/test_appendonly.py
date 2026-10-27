"""Use the real user-plugin loader with isolated profiles; no live user data."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import shutil

import pytest
from agent.memory_provider import ctx_bound
from hermes_constants import set_hermes_home_override, reset_hermes_home_override
from plugins.memory import load_memory_provider


def install(home):
    directory = home / "plugins" / "appendonly"
    directory.mkdir(parents=True)
    for name in ("__init__.py", "plugin.yaml"):
        shutil.copyfile(Path(__file__).parents[1] / name, directory / name)


def test_remove_replace_restart_and_acknowledged_delivery(tmp_path):
    install(tmp_path)
    token = set_hermes_home_override(tmp_path)
    provider = load_memory_provider("appendonly")
    try:
        assert provider is not None
        provider.initialize("a", hermes_home=str(tmp_path))
        provider.on_memory_write("add", "memory", "obsolete fixture")
        provider.on_session_switch("b")
        frozen = provider.system_prompt_block()
        provider.on_memory_write("replace", "memory", "current fixture", {"previous_content": "obsolete fixture"})
        assert provider.system_prompt_block() == frozen
        tail = provider.prefetch("continue", session_id="b")
        assert "Forget entry" in tail and "current fixture" in tail
        assert "obsolete fixture" not in tail
        assert provider.prefetch("retry", session_id="b") == tail
        provider.sync_turn("", "done", session_id="b", messages=[{"role": "user", "content": tail}])
        assert provider.prefetch("again", session_id="b") == ""
        provider.on_memory_write("remove", "memory", "", {"previous_content": "current fixture"})
        provider.shutdown()
        provider.initialize("c", hermes_home=str(tmp_path))
        assert "fixture" not in provider.system_prompt_block()
        assert "fixture" not in provider.prefetch("continue", session_id="c")
        with pytest.raises(ValueError):
            provider.on_memory_write("remove", "memory", "")
    finally:
        provider.shutdown()
        reset_hermes_home_override(token)


def test_concurrent_writers_profile_isolation_and_live_reload(tmp_path):
    a, b = tmp_path / "a", tmp_path / "b"
    install(a)
    install(b)
    token = set_hermes_home_override(a)
    first, second = load_memory_provider("appendonly"), load_memory_provider("appendonly")
    try:
        first.initialize("one", hermes_home=str(a))
        second.initialize("two", hermes_home=str(a))
        with ThreadPoolExecutor(max_workers=2) as pool:
            jobs = [ctx_bound(lambda p=p, i=i: p.on_memory_write("add", "memory", f"private-A-{i}"))
                    for i, p in enumerate([first, second] * 10)]
            list(pool.map(lambda f: f(), jobs))
        assert "private-A" in first.prefetch("continue")
        first.on_session_switch("three")
        assert first.system_prompt_block().count("private-A-") == 20
        token_b = set_hermes_home_override(b)
        try:
            with pytest.raises(PermissionError):
                first.system_prompt_block()
            other = load_memory_provider("appendonly")
            other.initialize("one", hermes_home=str(b))
            assert "private-A" not in other.system_prompt_block()
            other.shutdown()
        finally:
            reset_hermes_home_override(token_b)
        assert "private-A" in first.system_prompt_block()
    finally:
        first.shutdown()
        second.shutdown()
        reset_hermes_home_override(token)
