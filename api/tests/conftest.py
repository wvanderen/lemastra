"""Shared fixtures for the LemAstra API test suite."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from lemastra_api.main import create_app

# Repo root: api/tests/conftest.py -> api/ -> repo root.
REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def client() -> TestClient:
    """ASGI TestClient built from the app factory (runs startup checks)."""
    with TestClient(create_app()) as test_client:
        yield test_client


def write_skill_input(payload: dict[str, Any], tmp_path: Path) -> Path:
    """Write a calculator ``--input`` JSON file and return its path.

    Later plans extend this helper; it exists from Wave 0 so every
    calculator-touching test shares one tempfile discipline.
    """
    path = tmp_path / "skill-input.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path
