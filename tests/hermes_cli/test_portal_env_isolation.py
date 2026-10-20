"""Account-provider endpoints must not bleed across product boundaries."""

from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys


_ROOT = Path(__file__).resolve().parents[2]
_PROBE = """
import json
from hermes_cli.auth_constants import DEFAULT_NOUS_PORTAL_URL
from hermes_cli.config_defaults import DEFAULT_CONFIG
print(json.dumps({
    "nous": DEFAULT_NOUS_PORTAL_URL,
    "chronos": DEFAULT_CONFIG["cron"]["chronos"]["portal_url"],
}))
"""


def _probe(**overrides: str) -> dict[str, str]:
    env = os.environ.copy()
    env.pop("HEBRI_PORTAL_URL", None)
    env.pop("NOUS_PORTAL_URL", None)
    env.update(overrides)
    output = subprocess.check_output(
        [sys.executable, "-c", _PROBE],
        cwd=_ROOT,
        env=env,
        text=True,
    )
    return json.loads(output)


def test_hebri_portal_does_not_redirect_the_optional_nous_provider() -> None:
    result = _probe(HEBRI_PORTAL_URL="https://accounts.synapseklabs.org")

    assert result == {
        "nous": "https://portal.nousresearch.com",
        "chronos": "https://portal.nousresearch.com",
    }


def test_nous_override_is_explicit_and_scoped_to_nous_features() -> None:
    result = _probe(NOUS_PORTAL_URL="https://nous-staging.example.com")

    assert result == {
        "nous": "https://nous-staging.example.com",
        "chronos": "https://nous-staging.example.com",
    }
