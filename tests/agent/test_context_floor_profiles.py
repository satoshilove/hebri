"""Profile isolation and invalid-config regressions for the opt-in fit check."""
from contextlib import contextmanager
from types import SimpleNamespace

from hermes_constants import set_hermes_home_override, reset_hermes_home_override


@contextmanager
def profile(path):
    path.mkdir(exist_ok=True)
    token = set_hermes_home_override(path)
    try:
        yield path
    finally:
        reset_hermes_home_override(token)


def test_floor_follows_profile_and_config_edits(tmp_path):
    from agent.model_metadata import get_context_floor_mode, effective_aux_floor
    for name, mode, working in [("a", "fixed", 8192), ("b", "measured", 6000), ("a", "fixed", 8192)]:
        with profile(tmp_path / name) as home:
            (home / "config.yaml").write_text(f"agent:\n  context_floor: {mode}\n  context_floor_working_window: {working}\n")
            assert get_context_floor_mode() == mode
            if mode == "measured":
                floor, detail = effective_aux_floor()
                assert detail["w"] == working
                assert detail["max_tokens"] > 0
                assert floor == sum(detail[k] for k in ("o", "w", "max_tokens"))
            (home / "config.yaml").write_text("agent:\n  context_floor: measured\n  context_floor_working_window: -99999\n  context_floor_max_tokens: false\n")
            floor, detail = effective_aux_floor()
            assert detail["w"] > 0 and detail["max_tokens"] > 0


def test_missing_or_unmeasurable_surface_preserves_fixed_floor(tmp_path):
    from agent.model_metadata import effective_main_floor, get_context_floor_mode, MINIMUM_CONTEXT_LENGTH
    with profile(tmp_path / "fresh") as home:
        assert get_context_floor_mode() == "fixed"
        (home / "config.yaml").write_text("agent:\n  context_floor: measured\n")
        assert effective_main_floor(SimpleNamespace()) == (MINIMUM_CONTEXT_LENGTH, None)


def test_real_agent_fit_check_includes_context_engine_tools(tmp_path):
    from run_agent import AIAgent
    from agent.model_metadata import effective_main_floor
    with profile(tmp_path / "runtime") as home:
        (home / "config.yaml").write_text(
            "agent:\n  context_floor: measured\nmodel:\n  context_length: 32000\ncontext:\n  engine: keyedstore\n")
        agent = AIAgent(model="fixture-local", api_key="fixture-not-a-real-key",
                        base_url="http://127.0.0.1:9/v1", provider="custom",
                        enabled_toolsets=["context_engine"], quiet_mode=True, skip_memory=True,
                        skip_context_files=True, max_tokens=2048, session_id="fit-test")
        try:
            floor, detail = effective_main_floor(agent)
            assert detail is not None
            assert any(t["function"]["name"] == "recall" for t in agent.tools)
            assert floor < agent.context_compressor.context_length
            assert 0 < agent.context_compressor.threshold_tokens < 32000 - 2048
        finally:
            agent.context_compressor.on_session_end("fit-test", [])
