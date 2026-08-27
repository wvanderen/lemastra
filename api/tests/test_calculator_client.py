"""Calculator subprocess client: real-skill execution + CALC-04 taxonomy.

Runs against the REAL vendored calculator (subprocess included, ~40 ms
per run). Four behavior rows: happy path, invalid zone (exit 2),
high-latitude Placidus (untyped exit 1 crash), and timeout kill. Plus
wrapper-source invariants (never flags-mode, never shell=True, stdin
DEVNULL) and child-env secret stripping (threat T-02-02).
"""

from __future__ import annotations

import asyncio
import json
import subprocess
import sys
from pathlib import Path

import pytest

from lemastra_api.services.calculator import (
    CalculatorEngineError,
    CalculatorInvalidInput,
    CalculatorTimeout,
    CalculatorUnsuitableHouseSystem,
    build_child_env,
    run_chart,
    unknown_time_payload,
)
from lemastra_api.settings import load_settings

from conftest import write_skill_input

REPO_ROOT = Path(__file__).resolve().parents[2]
WRAPPER_SOURCE = (
    REPO_ROOT / "api" / "lemastra_api" / "services" / "calculator.py"
).read_text(encoding="utf-8")

BROOKLYN_1990 = {
    "date": "1990-05-21",
    "time": "14:32",
    "lat": 40.7128,
    "lon": -74.006,
    "tz": "America/New_York",
    "house_system": "Whole Sign",
    "reading_type": "natal",
    "place": "Brooklyn, NY",
    "confidence": "timed",
}


def test_happy_path_brooklyn_1990_via_real_subprocess() -> None:
    chart = asyncio.run(run_chart(dict(BROOKLYN_1990)))
    chart_data = chart["chart_data"]
    assert chart_data["placements"], "placements must be non-empty"
    assert chart_data["birth_time_confidence"] == "Timed"


def test_vendored_script_runs_standalone(tmp_path: Path) -> None:
    """Sanity via the conftest temp-input helper: skill + venv work raw."""
    settings = load_settings()
    script = settings.skill_path / "tools" / "birth_to_chart.py"
    input_path = write_skill_input(
        {**BROOKLYN_1990, "validate": True}, tmp_path
    )
    result = subprocess.run(
        [sys.executable, str(script), "--input", str(input_path), "--validate"],
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr
    assert "VALID:" in result.stderr
    assert json.loads(result.stdout)["chart_data"]["placements"]


def test_invalid_zone_maps_to_typed_invalid_input() -> None:
    payload = dict(BROOKLYN_1990, tz="America/Kentucky/Lexington")
    with pytest.raises(CalculatorInvalidInput) as excinfo:
        asyncio.run(run_chart(payload))
    # The calculator's did-you-mean copy is passed through verbatim.
    assert "Did you mean" in str(excinfo.value)


def test_high_latitude_placidus_maps_to_unsuitable_house_system() -> None:
    payload = dict(
        BROOKLYN_1990,
        lat=69.6496,
        lon=18.9553,
        house_system="Placidus",
        place="Tromsø, Norway",
    )
    with pytest.raises(CalculatorUnsuitableHouseSystem):
        asyncio.run(run_chart(payload))


def test_timeout_kills_subprocess_and_raises_typed_error() -> None:
    with pytest.raises(CalculatorTimeout):
        asyncio.run(run_chart(dict(BROOKLYN_1990), timeout_s=0.001))


def test_unknown_time_payload_contract() -> None:
    payload = unknown_time_payload(dict(BROOKLYN_1990))
    assert payload["time"] == "12:00"
    assert payload["confidence"] == "unknown"
    assert not payload.get("noon_for_unknown")  # D-10: flag never used


def test_unknown_time_run_omits_time_dependent_factors() -> None:
    chart = asyncio.run(run_chart(unknown_time_payload(dict(BROOKLYN_1990))))
    chart_data = chart["chart_data"]
    assert chart_data["birth_time_confidence"] == "Unknown"
    assert "ascendant" not in chart_data
    assert "house_system" not in chart_data
    assert "house_cusps" not in chart_data
    assert chart_data["placements"]  # time-independent factors remain


def test_missing_confidence_rejected_before_subprocess() -> None:
    payload = dict(BROOKLYN_1990)
    del payload["confidence"]
    with pytest.raises(CalculatorInvalidInput):
        asyncio.run(run_chart(payload))


def test_engine_error_raises_for_unrecognized_failure(monkeypatch) -> None:
    """Any unrecognized nonzero exit must never surface raw to callers."""
    from lemastra_api.services import calculator as calc_module

    class FakeProc:
        returncode = 1  # unrecognized failure

        async def communicate(self):
            return b"{}", b"ValueError: something odd"

        def kill(self):
            pass

    async def fake_exec(*args, **kwargs):
        return FakeProc()

    monkeypatch.setattr(calc_module.asyncio, "create_subprocess_exec", fake_exec)
    with pytest.raises(CalculatorEngineError):
        asyncio.run(run_chart(dict(BROOKLYN_1990)))


def test_wrapper_source_invariants() -> None:
    # Never flags-mode: payload travels as --input file content only.
    assert '"--input"' in WRAPPER_SOURCE
    # Never shell=True (threat T-02-01: argv fully controlled).
    assert "shell=True" not in WRAPPER_SOURCE
    # Interactive-mode footgun: stdin always DEVNULL.
    assert "DEVNULL" in WRAPPER_SOURCE
    # Timeout with kill (threat T-02-03).
    assert "wait_for" in WRAPPER_SOURCE and "kill()" in WRAPPER_SOURCE


def test_child_env_strips_secrets(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GOOGLE_API_KEY", "leak-me-not")
    monkeypatch.setenv("SOME_SERVICE_SECRET", "also-not")
    monkeypatch.setenv("SESSION_TOKEN", "nor-this")
    env = build_child_env()
    assert "GOOGLE_API_KEY" not in env
    assert "SOME_SERVICE_SECRET" not in env
    assert "SESSION_TOKEN" not in env
    assert "PATH" in env  # harmless basics survive
