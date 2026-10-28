"""Settings context changes must reach the on-disk model config through the route handler."""

from hermes_cli.config import read_raw_config, save_config
from hermes_cli.web_models import ConfigUpdate
from hermes_cli.web_routers import config_env


def _home_with_context_override(tmp_path, monkeypatch) -> None:
    home = tmp_path / ".hebri"
    home.mkdir()
    monkeypatch.setenv("HERMES_HOME", str(home))
    save_config({
        "model": {
            "default": "example/model",
            "provider": "openrouter",
            "context_length": 2,
        },
    })
    assert read_raw_config()["model"]["context_length"] == 2


def _save_settings(monkeypatch, config: dict) -> None:
    async def run_inline(fn):
        return fn()

    # Exercise the real route and config writer without a Windows event loop;
    # TestClient's loopback socket cannot start in the sandbox.
    monkeypatch.setattr(config_env.asyncio, "to_thread", run_inline)
    request = config_env.update_config(ConfigUpdate(config=config))
    try:
        request.send(None)
    except StopIteration as done:
        assert done.value == {"ok": True}
    else:
        raise AssertionError("The config handler unexpectedly suspended")
    finally:
        request.close()


def test_settings_zero_removes_saved_context_override_without_losing_model(tmp_path, monkeypatch):
    _home_with_context_override(tmp_path, monkeypatch)

    _save_settings(monkeypatch, {"model_context_length": 0})

    model = read_raw_config()["model"]
    assert "context_length" not in model
    assert model["default"] == "example/model"
    assert model["provider"] == "openrouter"


def test_partial_settings_save_leaves_context_override_unchanged(tmp_path, monkeypatch):
    _home_with_context_override(tmp_path, monkeypatch)

    _save_settings(monkeypatch, {"timezone": "UTC"})

    assert read_raw_config()["model"]["context_length"] == 2


def test_settings_positive_context_override_replaces_old_value(tmp_path, monkeypatch):
    _home_with_context_override(tmp_path, monkeypatch)

    _save_settings(monkeypatch, {"model_context_length": 128000})

    assert read_raw_config()["model"]["context_length"] == 128000
