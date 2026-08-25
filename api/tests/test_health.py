"""Health endpoint: version-reporting contract (CALC-03 foundation)."""

from __future__ import annotations

import json
import re
from importlib.metadata import version as pkg_version
from pathlib import Path

import pytest
import swisseph
from fastapi.testclient import TestClient

from lemastra_api.main import create_app

from .conftest import REPO_ROOT

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
