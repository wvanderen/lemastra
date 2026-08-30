"""Health endpoint: version-reporting contract (CALC-03 foundation).

Keyless-visibility tests (places_search_available + startup warning)
pin GOOGLE_API_KEY via ``monkeypatch.setenv`` — present-but-empty for
the keyless state, because ``setdefault`` (the .env bridge) can only
fill ABSENT variables: this keeps the tests deterministic on machines
where a real populated api/.env exists.
"""

from __future__ import annotations

import json
import logging
import re
from importlib.metadata import version as pkg_version
from pathlib import Path

import pytest
import swisseph
from fastapi.testclient import TestClient

from lemastra_api.main import create_app

# Repo root: api/tests/test_health.py -> api/ -> repo root.
REPO_ROOT = Path(__file__).resolve().parents[2]

PINNED_SKILL_REVISION = (
    (REPO_ROOT / "vendor" / "astrology-skill" / "UPSTREAM.revision")
    .read_text(encoding="utf-8")
    .splitlines()[0]
    .strip()
)


def test_health_reports_ok_status(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"


def test_health_versions_contain_all_five_keys(client: TestClient) -> None:
    versions = client.get("/api/v1/health").json()["versions"]
    assert set(versions) == {
        "skill_revision",
        "swisseph",
        "tzdata",
        "schema",
        "api",
    }


def test_health_skill_revision_is_pinned_sha(client: TestClient) -> None:
    skill_revision = client.get("/api/v1/health").json()["versions"][
        "skill_revision"
    ]
    # 40-char full SHA, matching the recorded upstream pin.
    assert re.fullmatch(r"[0-9a-f]{40}", skill_revision)
    assert skill_revision == PINNED_SKILL_REVISION


def test_health_swisseph_and_tzdata_match_running_venv(
    client: TestClient,
) -> None:
    versions = client.get("/api/v1/health").json()["versions"]
    # Same venv as the calculator subprocess (research A4) — the health
    # report must agree with what the running process actually imports.
    assert versions["swisseph"] == swisseph.version
    assert versions["tzdata"] == pkg_version("tzdata")


def test_health_schema_identity_names_vendored_schema(
    client: TestClient,
) -> None:
    schema = client.get("/api/v1/health").json()["versions"]["schema"]
    schema_doc = json.loads(
        (
            REPO_ROOT
            / "vendor"
            / "astrology-skill"
            / "assets"
            / "schemas"
            / "chart_input_schema.json"
        ).read_text(encoding="utf-8")
    )
    assert schema_doc["title"] in schema
    assert "2020-12" in schema  # draft identity


def test_health_api_version_is_nonempty_string(client: TestClient) -> None:
    api_version = client.get("/api/v1/health").json()["versions"]["api"]
    assert isinstance(api_version, str) and api_version


def test_startup_fails_fast_when_skill_script_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Fresh clone without the vendored tree gets a clear startup error."""
    monkeypatch.setenv("LEMASTRA_SKILL_PATH", "/nonexistent/astrology-skill")
    with pytest.raises(RuntimeError) as excinfo:
        with TestClient(create_app()):
            pass
    message = str(excinfo.value)
    assert "birth_to_chart.py" in message
    assert "git submodule update --init" in message


def test_health_keyless_reports_places_search_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Key cleared -> flag false, versions shape and status unchanged."""
    monkeypatch.setenv("GOOGLE_API_KEY", "")  # present-but-empty beats .env
    with TestClient(create_app()) as client:
        body = client.get("/api/v1/health").json()
    assert body["status"] == "ok"
    assert set(body["versions"]) == {
        "skill_revision",
        "swisseph",
        "tzdata",
        "schema",
        "api",
    }
    assert body["places_search_available"] is False


def test_health_with_key_reports_places_search_available(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GOOGLE_API_KEY", "test-key")
    with TestClient(create_app()) as client:
        body = client.get("/api/v1/health").json()
    assert body["places_search_available"] is True


def test_startup_keyless_warns_once_without_key_material(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Exactly one absence-only remediation warning; no key value logged.

    The .env file is pointed at a canary so the no-leak assertion is
    strong: the file HAS a key, the shell env says empty (precedence),
    the warning fires, and the canary never reaches any log line.
    """
    canary = "leak-canary-key-DO-NOT-LOG"
    monkeypatch.setenv("GOOGLE_API_KEY", "")  # present-but-empty beats .env
    monkeypatch.setattr(
        "lemastra_api.settings._DOTENV_PATH",
        tmp_path / ".env",
    )
    (tmp_path / ".env").write_text(
        f"GOOGLE_API_KEY={canary}\n", encoding="utf-8"
    )
    with caplog.at_level(logging.WARNING):
        with TestClient(create_app()):
            pass
    key_warnings = [
        record
        for record in caplog.records
        if record.levelno == logging.WARNING and "GOOGLE_API_KEY" in record.getMessage()
    ]
    assert len(key_warnings) == 1
    message = key_warnings[0].getMessage()
    assert "PLACE_PROVIDER_UNAVAILABLE" in message
    assert ".env.example" in message
    assert canary not in message
    assert canary not in caplog.text


def test_startup_with_key_emits_no_warning(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setenv("GOOGLE_API_KEY", "test-key")
    with caplog.at_level(logging.WARNING):
        with TestClient(create_app()):
            pass
    key_warnings = [
        record
        for record in caplog.records
        if record.levelno == logging.WARNING and "GOOGLE_API_KEY" in record.getMessage()
    ]
    assert key_warnings == []
