import hashlib
import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from hermes_cli.web_routers import team_chat
from tools import bot_mode_probe
from tools import bot_mode_team_context


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    home = tmp_path / ".hebri"
    home.mkdir()
    monkeypatch.setenv("HERMES_HOME", str(home))
    team_chat._rate_log.clear()
    app = FastAPI()
    app.include_router(team_chat.router)
    return TestClient(app)


def test_work_board_and_secure_relay_contract(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    created = client.post("/api/team/work", json={"title": "Ship desktop", "owner": "Ada"})
    assert created.status_code == 200
    item = created.json()["item"]
    assert item["status"] == "backlog"
    updated = client.patch(f"/api/team/work/{item['id']}", json={"status": "in_progress"})
    assert updated.status_code == 200
    assert updated.json()["item"]["status"] == "in_progress"

    shared = client.post("/api/team/rooms/general/share")
    assert shared.status_code == 200
    invite = shared.json()["room"]["code"]
    assert len(invite) >= 20
    rooms_on_disk = json.loads((tmp_path / ".hebri" / "team_chat" / "rooms.json").read_text())
    general = next(room for room in rooms_on_disk["rooms"] if room["id"] == "general")
    assert invite not in json.dumps(general)
    assert general["invite_hash"] == hashlib.sha256(invite.encode()).hexdigest()

    grant = client.post("/api/team/relay/register", json={"code": invite, "peer": "Lin"}).json()["grant"]
    room_id = "general"
    missing = client.get(f"/api/team/relay/{room_id}/messages")
    assert missing.status_code == 403
    allowed = client.get(
        f"/api/team/relay/{room_id}/messages",
        headers={"Authorization": f"Bearer {grant}"},
    )
    assert allowed.status_code == 200
    auth = {"Authorization": f"Bearer {grant}"}
    relay_work = client.get(f"/api/team/relay/{room_id}/work", headers=auth)
    assert relay_work.status_code == 200
    assert relay_work.json()["items"][0]["title"] == "Ship desktop"
    remote_created = client.post(
        f"/api/team/relay/{room_id}/work",
        headers=auth,
        json={"title": "Test Omarchy", "owner": "Not Lin"},
    )
    assert remote_created.status_code == 200
    assert remote_created.json()["item"]["owner"] == "Lin"
    remote_updated = client.patch(
        f"/api/team/relay/{room_id}/work/{remote_created.json()['item']['id']}",
        headers=auth,
        json={"status": "done"},
    )
    assert remote_updated.status_code == 200
    assert remote_updated.json()["item"]["status"] == "done"


class _DB:
    def __init__(self, home: Path):
        self.db_path = str(home / "state.db")

    def get_session_title(self, _session_id):
        return "Bot Chat"


class _Agent:
    def __init__(self, home: Path):
        self._session_db = _DB(home)
        self.session_id = "bot"
        self._session_title_hint = None
        self._bot_mode_protocol = True
        self.tools = []
        self.valid_tool_names = set()


def test_bot_reads_but_cannot_mutate_human_team_context(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    home = tmp_path / ".hebri"
    profile = home / "profiles" / "researcher"
    profile.mkdir(parents=True)
    (profile / "profile.yaml").write_text("ui_meta:\n  hermes-bots:\n    shape: cloud\n", encoding="utf-8")
    client.post("/api/team/work", json={"title": "Verify installers", "owner": "Ada"})
    client.post("/api/team/rooms/general/messages", json={"author": "Ada", "text": "Windows is ready"})

    bot_mode_probe._reset_cache_for_tests()
    agent = _Agent(profile)
    assert bot_mode_team_context.ensure_team_context_tool(agent) is True
    assert [tool["function"]["name"] for tool in agent.tools] == ["team_context"]
    payload = json.loads(bot_mode_team_context.team_context_tool(agent=agent))
    assert payload["scope"] == "human_team_read_only"
    assert payload["work"][0]["title"] == "Verify installers"
    assert payload["messages"][0]["text"] == "Windows is ready"
    assert "mutation" not in bot_mode_team_context.team_context_tool_schema()["function"]["parameters"]
