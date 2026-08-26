"""GATE-02 golden fixture suite (D-14) — closes CALC-01.

Discovers every case contract under ``tests/fixtures/golden/cases/`` and
drives it through POST /api/v1/charts/calculate (ASGI TestClient → real
calculator subprocess), asserting the recorded stable-field digests —
never whole-document equality: ``source_notes`` embeds version strings
that legitimately change on dependency promotion, so the digest
vocabulary below is a strict whitelist and anything else fails loudly.

The final class guards the CI wiring that makes this suite a permanent
gate: the ``api`` job in ``.github/workflows/ci.yml`` must run the full
pytest suite plus the vendored skill's own smoke tests against the
locked environment (T-02-25/T-02-26). Text-level assertions are
deliberate — no YAML dependency is added for four drift-guards.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

# api/tests/test_golden.py -> api/tests -> api -> repo root.
REPO_ROOT = Path(__file__).resolve().parents[2]
GOLDEN_CASES_DIR = Path(__file__).resolve().parent / "fixtures" / "golden" / "cases"
CI_FILE = REPO_ROOT / ".github" / "workflows" / "ci.yml"

ENDPOINT = "/api/v1/charts/calculate"

#: The vendored skill's own smoke scripts the CI api job must run.
SMOKE_SCRIPTS = (
    "smoke_test.py",
    "tz_smoke_test.py",
    "dignity_smoke_test.py",
    "timing_smoke_test.py",
)

#: Digest tolerance: recorded degrees are rounded to 4 decimals.
DEGREE_TOLERANCE = 1e-4


def _load_cases() -> list[dict[str, Any]]:
    files = sorted(GOLDEN_CASES_DIR.glob("*.json"))
    assert files, "no golden case files found under fixtures/golden/cases"
    return [json.loads(f.read_text(encoding="utf-8")) for f in files]


CASES = _load_cases()
CASE_IDS = [case["id"] for case in CASES]


def _placement_degree(chart_data: dict[str, Any], body: str) -> float:
    for placement in chart_data["placements"]:
        if placement["body"] == body:
            return placement["absolute_degree"]
    pytest.fail(f"placement body {body!r} missing from chart_data")


def assert_digest(digest: dict[str, Any], chart_data: dict[str, Any]) -> None:
    """Assert every recorded digest field against live chart_data.

    Unknown digest keys fail immediately — the vocabulary whitelist is
    the mechanism that keeps version-bearing fields (``source_notes``,
    ``provenance``) out of the comparison.
    """
    for key, expected in digest.items():
        if key in ("ascendant.absolute_degree", "midheaven.absolute_degree"):
            angle, _, field = key.partition(".")
            actual = chart_data[angle][field]
            assert actual == pytest.approx(expected, abs=DEGREE_TOLERANCE), key
        elif key.startswith("placements.") and key.endswith(".absolute_degree"):
            body = key[len("placements.") : -len(".absolute_degree")]
            actual = _placement_degree(chart_data, body)
            assert actual == pytest.approx(expected, abs=DEGREE_TOLERANCE), key
        elif key == "house_cusps_count":
            assert len(chart_data["house_cusps"]) == expected, key
        elif key == "aspects_count_range":
            count = len(chart_data["aspects"])
            low, high = expected  # inclusive window
            assert low <= count <= high, f"{key}: {count} not in [{low}, {high}]"
        elif key == "birth_time_confidence":
            assert chart_data["birth_time_confidence"] == expected, key
        else:  # pragma: no cover — whitelist guard
            pytest.fail(
                f"digest key {key!r} is outside the stable-field vocabulary; "
                "version-bearing fields (source_notes, provenance) must never "
                "be digested"
            )


@pytest.mark.parametrize("case", CASES, ids=CASE_IDS)
def test_golden_case(case: dict[str, Any], client) -> None:
    """One golden contract through the real calculate endpoint."""
    expect = case["expect"]
    response = client.post(ENDPOINT, json=case["input"])

    if expect["outcome"] == "error":
        spec = expect["error"]
        assert response.status_code == spec["status"], response.text
        error = response.json()["error"]
        assert error["code"] == spec["code"]
        assert error["recoverable"] is spec["recoverable"]
        return

    assert response.status_code == 200, response.text
    body = response.json()
    chart_data = body["chart_data"]
    assert_digest(expect["digest"], chart_data)

    if "second_pass" in expect:
        # DST-ambiguous family: the fixed-offset D-08 variant must produce
        # the second-pass digest (the picker is material — a whole sign
        # apart on the anchored NY 2024 case).
        payload = dict(case["input"])
        payload["time_resolution"] = dict(expect["second_pass"]["time_resolution"])
        second = client.post(ENDPOINT, json=payload)
        assert second.status_code == 200, second.text
        assert_digest(expect["second_pass"]["digest"], second.json()["chart_data"])

    if "absent_keys" in expect:
        # D-10: time-dependent factors are ABSENT, not empty placeholders.
        for key in expect["absent_keys"]:
            assert key not in chart_data, f"{key} must be absent, not empty"
        if expect.get("placement_house_keys_absent"):
            for placement in chart_data["placements"]:
                assert "house" not in placement
        assert sorted(f["factor"] for f in body["unavailable_factors"]) == (
            expect["unavailable_factors"]
        )
        assert sorted(f["factor"] for f in body["provisional_factors"]) == (
            expect["provisional_factors"]
        )


def test_nine_committed_cases() -> None:
    """The GATE-02 contract set is exactly nine cases — additions and
    removals are deliberate, reviewed changes."""
    assert len(CASES) == 9, [case["id"] for case in CASES]


class TestCiApiJobWiring:
    """The api job turns the golden suite into a permanent CI gate."""

    @staticmethod
    def _ci_yaml() -> str:
        assert CI_FILE.exists(), f"missing {CI_FILE}"
        return CI_FILE.read_text(encoding="utf-8")

    def test_api_job_exists(self):
        assert "\n  api:\n" in self._ci_yaml()

    def test_locked_env_and_full_pytest_in_api_dir(self):
        content = self._ci_yaml()
        # uv sync --locked (never bare sync — T-02-26) and the FULL suite
        # (golden included) scoped to the api project.
        assert "uv sync --locked" in content
        assert "uv run pytest -q" in content

    def test_vendored_skill_smoke_tests_run(self):
        content = self._ci_yaml()
        for script in SMOKE_SCRIPTS:
            assert f"vendor/astrology-skill/tools/{script}" in content, script

    def test_no_soft_gates_and_no_submodule_wiring(self):
        content = self._ci_yaml()
        # No step may swallow failures (ci.yml header contract).
        assert "continue-on-error" not in content
        # vendor/astrology-skill is a committed snapshot (02-01 sanctioned
        # deviation): plain checkout materializes it — no submodule config.
        assert "submodules" not in content
