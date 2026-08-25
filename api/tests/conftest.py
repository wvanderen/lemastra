"""Shared fixtures for the LemAstra API test suite."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterator

import httpx
import pytest
from fastapi.testclient import TestClient

from lemastra_api.main import create_app

# Repo root: api/tests/conftest.py -> api/ -> repo root.
REPO_ROOT = Path(__file__).resolve().parents[2]

# Recorded Google API response fixtures (02-04). Unit tests NEVER hit
# the live endpoints — the stub below replays these payloads.
GOOGLE_FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "google"


def load_google_fixture(name: str) -> dict[str, Any]:
    """Load a recorded Google API response fixture by file name."""
    return json.loads((GOOGLE_FIXTURE_DIR / name).read_text(encoding="utf-8"))


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


class GoogleStub:
    """Recorded-response geocoder behind ``httpx.MockTransport``.

    Tests stage per-endpoint payloads (fixture files via
    :func:`load_google_fixture`, or inline dicts modeled on the
    documented response shapes); the stub replays them for every
    request and records each request so tests can assert the outbound
    call shape (fixed Google host, key only in the query string) — or
    that NO network call happened at all.
    """

    def __init__(self) -> None:
        self.geocode_response: dict[str, Any] | None = None
        self.timezone_response: dict[str, Any] | None = None
        self.requests: list[httpx.Request] = []

    def serve_geocode(self, payload: dict[str, Any]) -> None:
        """Stage the response for maps.googleapis.com/.../geocode/json."""
        self.geocode_response = payload

    def serve_timezone(self, payload: dict[str, Any]) -> None:
        """Stage the response for maps.googleapis.com/.../timezone/json."""
        self.timezone_response = payload

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        url = str(request.url)
        if "/maps/api/geocode/json" in url:
            payload = self.geocode_response
        elif "/maps/api/timezone/json" in url:
            payload = self.timezone_response
        else:  # pragma: no cover — defensive: only Google endpoints are called
            raise AssertionError(f"stub received an unexpected request: {url}")
        if payload is None:
            raise AssertionError(
                "geocoder stub received a request with no staged response"
            )
        return httpx.Response(200, json=payload)


def _places_client(google_stub: GoogleStub, api_key: str) -> Iterator[TestClient]:
    """TestClient whose geocoder dependency serves recorded payloads.

    The imports are deferred so the RED phase of a TDD cycle fails on
    the missing endpoints rather than on module collection.
    """
    from lemastra_api.routes.places import get_geocoder
    from lemastra_api.services.geocoding import GeocodingService

    service = GeocodingService(
        api_key=api_key, transport=httpx.MockTransport(google_stub.handler)
    )
    with TestClient(create_app()) as test_client:
        test_client.app.dependency_overrides[get_geocoder] = lambda: service
        yield test_client


@pytest.fixture
def google_stub() -> GoogleStub:
    """Recorded-fixture geocoder stub — stage payloads, inspect requests."""
    return GoogleStub()


@pytest.fixture
def places_client(google_stub: GoogleStub) -> Iterator[TestClient]:
    """TestClient with the geocoder dependency overridden by the stub."""
    yield from _places_client(google_stub, api_key="test-key")


@pytest.fixture
def places_client_no_key(google_stub: GoogleStub) -> Iterator[TestClient]:
    """Same override but with no API key — the honest-failure path."""
    yield from _places_client(google_stub, api_key="")
