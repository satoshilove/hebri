"""Human-facing bot identity must not change delivery routes or custom names."""

import json
from pathlib import Path
from types import SimpleNamespace

import pytest
import yaml

from hermes_cli.provider_identity import APP_NAME
from tools import bot_mode_dm, bot_mode_probe
from tools.bot_relay import qualify_sender_stamp


def make_agent(home):
    return SimpleNamespace(
        _session_title_hint=bot_mode_probe.BOT_CHAT_TITLE,
        _session_db=SimpleNamespace(db_path=str(home / "state.db")),
    )


@pytest.mark.parametrize("identity, expected", [
    ({}, APP_NAME),
    ({"display_name": "Maia"}, "Maia"),
    ({"display_name": "Maia", "title": "Captain"}, "Captain"),
    ({"title": "Hermes"}, "Hermes"),  # An explicit custom name is not ours to migrate.
])
def test_handoff_display_name_preserves_local_and_remote_routes(tmp_path, monkeypatch, identity, expected):
    home = tmp_path / "hebri"
    teammate = home / "profiles" / "researcher"
    teammate.mkdir(parents=True)
    monkeypatch.setenv("HERMES_HOME", str(home))
    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    config = {"ui_meta": {"hermes-bots": {}}}
    if "display_name" in identity:
        config["display_name"] = identity["display_name"]
    if "title" in identity:
        config["ui_meta"]["hermes-bots"]["title"] = identity["title"]
    (home / "profile.yaml").write_text(yaml.safe_dump(config), encoding="utf-8")
    (teammate / "profile.yaml").write_text("display_name: Researcher\n", encoding="utf-8")

    deliveries = []

    def capture_delivery(argv, content, label, **kwargs):
        deliveries.append((argv, content, kwargs))
        return json.dumps({"status": "queued"})

    # Only the process-spawn boundary is replaced; authorization, roster and routing are real.
    monkeypatch.setattr(bot_mode_dm, "_start_delivery", capture_delivery)
    body = "Keep the literal import hermes_cli and the quoted name Hermes."
    for sender, target, name, handle, destination in [
        (home, "researcher", expected, "hermes", teammate),
        (teammate, "@hermes", "Researcher", "researcher", home),
        (home, "researcher", expected, "hermes", teammate),
    ]:
        result = json.loads(bot_mode_dm.message_agent_tool(target, body, agent=make_agent(sender)))
        assert result["status"] == "queued"
        argv, content, kwargs = deliveries[-1]
        assert content == f"Message from 🤖 {name} (@{handle}): {body}"
        assert kwargs["profile_home"] == destination
        assert argv[argv.index("-p") + 1] == (
            "default" if destination == home else "researcher"
        )
        assert kwargs["author"]["id"] == f"bot:{'default' if sender == home else 'researcher'}"
        qualified = qualify_sender_stamp(content, handle, "shinobi", [])
        assert qualified == f"Message from 🤖 {name} (@{handle}@shinobi): {body}"


def test_roster_names_default_agent_without_changing_cached_profile_prompts(tmp_path, monkeypatch):
    home = tmp_path / "hebri"
    teammate = home / "profiles" / "researcher"
    teammate.mkdir(parents=True)
    monkeypatch.setenv("HERMES_HOME", str(home))
    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    (home / "profile.yaml").write_text(
        "description: Coordinates research\nui_meta:\n  hermes-bots: {}\n", encoding="utf-8"
    )
    (teammate / "profile.yaml").write_text("display_name: Researcher\n", encoding="utf-8")
    primary = bot_mode_probe.get_bot_mode_protocol_section(home)
    secondary = bot_mode_probe.get_bot_mode_protocol_section(teammate)
    assert f"Your sender name is {APP_NAME}; your handle is `@hermes`" in primary
    assert f"- `@hermes` — {APP_NAME} — Coordinates research" in secondary
    assert "Your sender name is Researcher; your handle is `@researcher`" in secondary
    assert bot_mode_probe.get_bot_mode_protocol_section(home) == primary
    # Disk changes may take effect on a future rebuild, never mutate the cached prompt in place.
    (home / "profile.yaml").write_text(
        "display_name: Captain\nui_meta:\n  hermes-bots: {}\n", encoding="utf-8"
    )
    assert bot_mode_probe.get_bot_mode_protocol_section(home) == primary
    assert bot_mode_probe.get_bot_mode_protocol_section(teammate) == secondary
    refreshed = bot_mode_probe.get_bot_mode_protocol_section(home, force_refresh=True)
    assert "Your sender name is Captain; your handle is `@hermes`" in refreshed
