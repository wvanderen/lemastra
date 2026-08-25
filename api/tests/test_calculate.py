"""POST /api/v1/charts/calculate behavior (02-03 Task 2, TDD).

Drives the endpoint through the ASGI TestClient against the REAL
calculator subprocess (happy path, unknown-time contract) and against a
captured-input fake for the D-08 mode-translation rows. The vendored
``chart_input_schema.json`` is loaded directly here to prove the
response-side double gate.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import jsonschema
import pytest

# Repo root: api/tests/test_calculate.py -> api/ -> repo root.
REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = (
    REPO_ROOT / "vendor" / "astrology-skill" / "assets" / "schemas" / "chart_input_schema.json"
)

BROOKLYN = {"label": "Brooklyn", "lat": 40.7128, "lon": -74.006}

# Minimal calculator envelope that passes the vendored schema — used by
# the monkeypatched translation rows (which must NOT spawn subprocesses).
CANNED_ENVELOPE = {
    "reading_type": "natal",
    "tradition_mode": "blended",
    "tone": "practical",
    "chart_data": {
        "birth_time_confidence": "Timed",
        "house_system": "Whole Sign",
        "placements": [
            {
                "body": "Sun",
                "sign": "Gemini",
                "degree": 0.4375,
                "absolute_degree": 60.4375,
                "motion": "direct",
                "condition": [],
            }
        ],
    },
}


def brooklyn_payload(**overrides) -> dict:
    payload = {
        "date": "1990-05-21",
        "time": "14:32",
        "confidence": "Timed",
        "house_system": "Whole Sign",
        "place": dict(BROOKLYN),
        "iana_zone": "America/New_York",
        "zone_source": "google",
    }
    payload.update(overrides)
    return payload


def envelope_validator() -> jsonschema.Draft202012Validator:
    return jsonschema.Draft202012Validator(json.loads(SCHEMA_PATH.read_text(encoding="utf-8")))


@pytest.fixture
def capture_run_chart(monkeypatch):
    """Replace the subprocess call with a payload-capturing fake.

    Returns a dict the fake mutates with the calculator input it
    received, so tests can assert the D-08 mode translation exactly.
    """
    import lemastra_api.routes.charts as charts_module

    captured: dict = {}

    async def fake_run_chart(payload, **kwargs):
        captured.clear()
        captured.update(payload)
        return json.loads(json.dumps(CANNED_ENVELOPE))

    monkeypatch.setattr(charts_module, "run_chart", fake_run_chart)
    return captured


class TestHappyPath:
    """Brooklyn 1990-05-21 14:32, Timed, Whole Sign — real subprocess."""

    def test_chart_factors_present(self, client):
        response = client.post("/api/v1/charts/calculate", json=brooklyn_payload())
        assert response.status_code == 200, response.text
        body = response.json()
        chart_data = body["chart_data"]

        assert len(chart_data["placements"]) == 11  # Sun..Pluto + True Node
        assert "ascendant" in chart_data
        assert len(chart_data["house_cusps"]) == 12
        assert "sect" in chart_data
        assert len(chart_data["aspects"]) > 0
        assert chart_data["birth_time_confidence"] == "Timed"

    def test_provenance_block_complete(self, client):
        from lemastra_api.provenance import read_versions
        from lemastra_api.settings import load_settings

        response = client.post("/api/v1/charts/calculate", json=brooklyn_payload())
        assert response.status_code == 200, response.text
        provenance = response.json()["provenance"]

        versions = read_versions(load_settings().skill_path)
        assert set(provenance) == {
            "skill_revision",
            "swisseph_version",
            "tzdata_version",
            "schema_version",
            "ephemeris_mode",
            "house_system",
            "zodiac_mode",
            "orb_policy",
            "input_revision",
            "calculator_cmd",
        }
        assert provenance["skill_revision"] == versions["skill_revision"]
        assert len(provenance["skill_revision"]) == 40
        assert provenance["swisseph_version"] == versions["swisseph"]
        assert provenance["tzdata_version"] == versions["tzdata"]
        assert provenance["schema_version"] == versions["schema"]
        assert provenance["house_system"] == "Whole Sign"
        assert "Moshier" in provenance["ephemeris_mode"]
        assert provenance["zodiac_mode"] == "tropical"
        assert provenance["orb_policy"]
        assert len(provenance["input_revision"]) == 12
        int(provenance["input_revision"], 16)  # twelve hex chars
        assert "birth_to_chart.py" in provenance["calculator_cmd"]
        assert "--validate" in provenance["calculator_cmd"]

    def test_response_passes_vendored_schema_double_gate(self, client):
        response = client.post("/api/v1/charts/calculate", json=brooklyn_payload())
        assert response.status_code == 200, response.text
        # The response body itself must conform (root additionalProperties
        # is true, so provenance/factor fields ride along legally).
        envelope_validator().validate(response.json())


class TestUnknownTime:
    """D-10 contract: Unknown confidence returns time-independent factors only."""

    def test_unknown_time_omits_time_dependent_factors(self, client):
        payload = brooklyn_payload()
        payload.pop("time")
        payload["confidence"] = "Unknown"
        response = client.post("/api/v1/charts/calculate", json=payload)
        assert response.status_code == 200, response.text
        body = response.json()
        chart_data = body["chart_data"]

        # Absent keys — not empty placeholders (D-10 doctrine).
        for absent in (
            "house_system",
            "ascendant",
            "midheaven",
            "house_cusps",
            "sect",
            "lots",
        ):
            assert absent not in chart_data, f"{absent} must be absent for Unknown"

        # Derived unavailable factors with the D-10 reasons.
        unavailable = {f["factor"]: f["reason"] for f in body["unavailable_factors"]}
        assert unavailable == {
            "houses": "Requires a birth time",
            "ascendant_mc": "Requires a birth time",
            "sect": "Requires sunrise/sunset timing",
            "lots": "Lot of Fortune requires the Ascendant",
        }

        # Provisional moon entry (Moon moves ~13°/day at the noon reference).
        provisional = {f["factor"]: f["reason"] for f in body["provisional_factors"]}
        assert "moon" in provisional
        assert "13" in provisional["moon"]

        # Placements carry no house key at all.
        assert chart_data["placements"], "placements are always present"
        for placement in chart_data["placements"]:
            assert "house" not in placement

        moon = next(p for p in chart_data["placements"] if p["body"] == "Moon")
        assert "Provisional" in moon.get("notes", "")

        envelope_validator().validate(body)


class TestTimeResolutionTranslation:
    """D-08 mode -> calculator-input translation (captured, no subprocess)."""

    def test_second_pass_uses_fixed_offset_tz(self, client, capture_run_chart):
        payload = brooklyn_payload(
            date="2024-11-03",
            time="01:30",
            time_resolution={"mode": "second_pass", "offset_seconds": -18000},
        )
        response = client.post("/api/v1/charts/calculate", json=payload)
        assert response.status_code == 200, response.text

        assert capture_run_chart["tz"] == "-05:00"
        assert capture_run_chart["time"] == "01:30"  # same wall time
        assert capture_run_chart["confidence"] == "timed"
        assert capture_run_chart["date"] == "2024-11-03"
        assert capture_run_chart["lat"] == BROOKLYN["lat"]
        assert capture_run_chart["lon"] == BROOKLYN["lon"]
        assert capture_run_chart["house_system"] == "Whole Sign"
        assert capture_run_chart["place"] == "Brooklyn"
        assert capture_run_chart["reading_type"] == "natal"

    def test_second_pass_input_revision_hashes_normalized_input(
        self, client, capture_run_chart
    ):
        payload = brooklyn_payload(
            date="2024-11-03",
            time="01:30",
            time_resolution={"mode": "second_pass", "offset_seconds": -18000},
        )
        response = client.post("/api/v1/charts/calculate", json=payload)
        assert response.status_code == 200, response.text

        normalized = json.dumps(
            capture_run_chart, sort_keys=True, separators=(",", ":")
        ).encode("utf-8")
        expected = hashlib.sha256(normalized).hexdigest()[:12]
        assert response.json()["provenance"]["input_revision"] == expected

    def test_shifted_uses_shifted_wall_time_with_iana_zone(
        self, client, capture_run_chart
    ):
        payload = brooklyn_payload(
            date="2024-03-10",
            time="02:30",
            time_resolution={"mode": "shifted", "wall_time": "03:30"},
        )
        response = client.post("/api/v1/charts/calculate", json=payload)
        assert response.status_code == 200, response.text

        assert capture_run_chart["time"] == "03:30"
        assert capture_run_chart["tz"] == "America/New_York"

    def test_first_pass_uses_wall_time_with_iana_zone(self, client, capture_run_chart):
        payload = brooklyn_payload(
            date="2024-11-03",
            time="01:30",
            time_resolution={"mode": "first_pass"},
        )
        response = client.post("/api/v1/charts/calculate", json=payload)
        assert response.status_code == 200, response.text

        assert capture_run_chart["time"] == "01:30"
        assert capture_run_chart["tz"] == "America/New_York"

    def test_unknown_uses_noon_reference_without_noon_flag(
        self, client, capture_run_chart
    ):
        payload = brooklyn_payload(confidence="Unknown")
        payload.pop("time")
        response = client.post("/api/v1/charts/calculate", json=payload)
        assert response.status_code == 200, response.text

        # D-10: explicit noon time + unknown confidence; the
        # --noon-for-unknown flag is never used.
        assert capture_run_chart["time"] == "12:00"
        assert capture_run_chart["confidence"] == "unknown"
        assert "noon_for_unknown" not in capture_run_chart


class TestValidationGate:
    """Response-side schema double gate (T-02-10)."""

    def test_broken_envelope_raises_calc_validation_failed(
        self, client, monkeypatch
    ):
        import lemastra_api.routes.charts as charts_module

        async def broken_run_chart(payload, **kwargs):
            return {
                "reading_type": "natal",
                "chart_data": {"placements": "not-an-array"},
            }

        monkeypatch.setattr(charts_module, "run_chart", broken_run_chart)
        response = client.post("/api/v1/charts/calculate", json=brooklyn_payload())
        assert response.status_code == 400, response.text
        error = response.json()["error"]
        assert error["code"] == "CALC_VALIDATION_FAILED"
        assert error["recoverable"] is True
        assert error["message"]
