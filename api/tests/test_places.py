"""Places search + meta zones behavior (02-04 Task 1, TDD).

Every geocoder row runs against the recorded-fixture stub (conftest
``places_client``) — this suite NEVER reaches the live Google
endpoints, with or without a key. Status rows beyond the three
recorded fixture files (quota, rate limit, invalid request) use
inline payloads modeled on the documented response shape
(02-RESEARCH §"Geocoding + Timezone Resolution").
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

import pytest

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "google"

#: The only candidate keys the API may emit — the Google response is
#: parsed from an allowlist (T-02-14); address_components and friends
#: must never leak through.
ALLOWED_CANDIDATE_KEYS = {
    "label",
    "lat",
    "lon",
    "location_type",
    "place_id",
    "partial_match",
}

VALID_ERROR_KEYS = {"code", "message", "recoverable", "hint"}


def _fixture(name: str) -> dict[str, Any]:
    return json.loads((FIXTURE_DIR / name).read_text(encoding="utf-8"))


def _geocode_status_payload(status: str, **extra: Any) -> dict[str, Any]:
    """Inline Google geocode response for a non-OK status row."""
    return {"results": [], "status": status, **extra}


def _assert_error_shape(body: dict, expected_code: str) -> dict:
    """Every 4xx/5xx body matches error.code/message/recoverable(/hint)."""
    assert set(body) == {"error"}, body
    error = body["error"]
    assert set(error) <= VALID_ERROR_KEYS, error
    assert error["code"] == expected_code
    assert isinstance(error["message"], str) and error["message"]
    assert error["recoverable"] is True
    if "hint" in error:
        assert isinstance(error["hint"], str) and error["hint"]
    return error


class TestPlaceSearch:
    def test_ok_fixture_returns_candidates_and_provenance(
        self, places_client, google_stub
    ):
        google_stub.serve_geocode(_fixture("geocode-ok.json"))
        response = places_client.post(
            "/api/v1/places/search", json={"query": "bedford ave brooklyn"}
        )
        assert response.status_code == 200, response.text
        body = response.json()

        candidates = body["candidates"]
        assert len(candidates) == 2

        first = candidates[0]
        assert first["label"] == "277 Bedford Avenue, Brooklyn, NY 11211, USA"
        assert first["lat"] == pytest.approx(40.7172405)
        assert first["lon"] == pytest.approx(-73.9573231)
        assert first["location_type"] == "ROOFTOP"
        assert first["place_id"] == "ChIJd8BlQ2BZwokRAFUEcm_qrcA"
        assert "partial_match" not in first  # full match — nothing to flag

        second = candidates[1]
        assert second["location_type"] == "APPROXIMATE"
        assert second["partial_match"] is True  # surfaced best-match caveat

        provenance = body["provenance"]
        assert provenance["provider"] == "google-geocoding-timezone"
        # ISO-8601 UTC lookup instant (Z-suffixed).
        datetime.strptime(provenance["lookup_timestamp"], "%Y-%m-%dT%H:%M:%SZ")

        # The one outbound call hit the fixed Google endpoint with the
        # server-side key in the query string (never in the body).
        assert len(google_stub.requests) == 1
        request = google_stub.requests[0]
        assert str(request.url).startswith(
            "https://maps.googleapis.com/maps/api/geocode/json"
        )
        assert request.url.params["address"] == "bedford ave brooklyn"
        assert request.url.params["key"] == "test-key"

    def test_only_allowlist_fields_reach_the_client(self, places_client, google_stub):
        google_stub.serve_geocode(_fixture("geocode-ok.json"))
        response = places_client.post(
            "/api/v1/places/search", json={"query": "bedford ave brooklyn"}
        )
        assert response.status_code == 200, response.text
        for candidate in response.json()["candidates"]:
            assert set(candidate) <= ALLOWED_CANDIDATE_KEYS, candidate

    def test_zero_results_maps_to_404_with_nearby_city_hint(
        self, places_client, google_stub
    ):
        google_stub.serve_geocode(_fixture("geocode-zero-results.json"))
        response = places_client.post(
            "/api/v1/places/search", json={"query": "qqqqzzzz nowhere"}
        )
        assert response.status_code == 404, response.text
        error = _assert_error_shape(response.json(), "PLACE_ZERO_RESULTS")
        assert "nearby city" in error["hint"]

    def test_over_daily_limit_maps_to_503_provider_unavailable(
        self, places_client, google_stub
    ):
        google_stub.serve_geocode(
            _geocode_status_payload(
                "OVER_DAILY_LIMIT",
                error_message="You have exceeded your daily request quota.",
            )
        )
        response = places_client.post(
            "/api/v1/places/search", json={"query": "brooklyn"}
        )
        assert response.status_code == 503, response.text
        _assert_error_shape(response.json(), "PLACE_PROVIDER_UNAVAILABLE")

    def test_request_denied_maps_to_503_provider_unavailable(
        self, places_client, google_stub
    ):
        google_stub.serve_geocode(_fixture("geocode-denied.json"))
        response = places_client.post(
            "/api/v1/places/search", json={"query": "brooklyn"}
        )
        assert response.status_code == 503, response.text
        _assert_error_shape(response.json(), "PLACE_PROVIDER_UNAVAILABLE")

    def test_over_query_limit_maps_to_429_with_retry_after(
        self, places_client, google_stub
    ):
        google_stub.serve_geocode(
            _geocode_status_payload(
                "OVER_QUERY_LIMIT",
                error_message="You have exceeded your QPS requests limit.",
            )
        )
        response = places_client.post(
            "/api/v1/places/search", json={"query": "brooklyn"}
        )
        assert response.status_code == 429, response.text
        _assert_error_shape(response.json(), "PLACE_PROVIDER_UNAVAILABLE")
        assert response.headers.get("retry-after"), response.headers

    def test_invalid_request_maps_to_400_place_invalid_query(
        self, places_client, google_stub
    ):
        google_stub.serve_geocode(_geocode_status_payload("INVALID_REQUEST"))
        response = places_client.post(
            "/api/v1/places/search", json={"query": "brooklyn"}
        )
        assert response.status_code == 400, response.text
        _assert_error_shape(response.json(), "PLACE_INVALID_QUERY")

    def test_short_query_rejected_without_any_network_call(
        self, places_client, google_stub
    ):
        response = places_client.post("/api/v1/places/search", json={"query": "b"})
        assert response.status_code == 400, response.text
        _assert_error_shape(response.json(), "PLACE_INVALID_QUERY")
        assert google_stub.requests == []  # rejected at the edge, pre-network

    def test_missing_key_maps_to_503_provider_unavailable(
        self, places_client_no_key, google_stub
    ):
        google_stub.serve_geocode(_fixture("geocode-ok.json"))
        response = places_client_no_key.post(
            "/api/v1/places/search", json={"query": "brooklyn"}
        )
        assert response.status_code == 503, response.text
        _assert_error_shape(response.json(), "PLACE_PROVIDER_UNAVAILABLE")
        assert google_stub.requests == []  # honest failure before any call

    def test_candidates_capped_at_five(self, places_client, google_stub):
        google_stub.serve_geocode(
            {
                "status": "OK",
                "results": [
                    {
                        "formatted_address": f"Result {index}, Brooklyn, NY, USA",
                        "geometry": {
                            "location": {"lat": 40.7 + index / 100, "lng": -73.9},
                            "location_type": "APPROXIMATE",
                        },
                        "place_id": f"place-{index}",
                    }
                    for index in range(7)
                ],
            }
        )
        response = places_client.post(
            "/api/v1/places/search", json={"query": "brooklyn"}
        )
        assert response.status_code == 200, response.text
        assert len(response.json()["candidates"]) == 5


class TestMetaZones:
    def test_zones_sorted_with_marker_zones(self, client):
        response = client.get("/api/v1/meta/zones")
        assert response.status_code == 200, response.text
        zones = response.json()["zones"]
        assert zones, "zone list must never be empty"
        assert zones == sorted(zones)
        assert "America/New_York" in zones
        assert "Australia/Lord_Howe" in zones


class TestResolveTime:
    """POST /api/v1/places/resolve-time (02-04 Task 2, TDD).

    Google supplies zone identity only (D-07); the historical
    birth-instant offset and DST classification are ALWAYS computed
    locally via zoneinfo + the pinned tzdata (the documented Google
    historical caveat) — drift surfaces disagreement instead of
    hiding it.
    """

    def _payload(self, **overrides: Any) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "lat": 40.7128,
            "lon": -74.006,
            "local_date": "1990-05-21",
            "local_time": "14:30",
        }
        payload.update(overrides)
        return payload

    def test_brooklyn_1990_normal_no_drift(self, places_client, google_stub):
        google_stub.serve_timezone(_fixture("timezone-ok.json"))
        response = places_client.post(
            "/api/v1/places/resolve-time", json=self._payload()
        )
        assert response.status_code == 200, response.text
        body = response.json()

        assert body["iana_zone"] == "America/New_York"
        assert body["zone_source"] == "google"
        # google block echoes the provider-of-record fields verbatim
        assert body["google"]["timeZoneId"] == "America/New_York"
        assert body["google"]["rawOffset"] == -18000
        assert body["google"]["dstOffset"] == 3600
        assert body["google"]["timeZoneName"] == "Eastern Daylight Time"

        resolved = body["resolved"]
        assert resolved["offset_seconds"] == -14400
        assert resolved["offset_label"] == "-04:00"
        assert resolved["classification"] == "normal"
        assert resolved["options"] == []
        assert body["drift"] is False

        # The identity call hit the fixed Google endpoint with the
        # coordinates as the location parameter.
        assert len(google_stub.requests) == 1
        request = google_stub.requests[0]
        assert str(request.url).startswith(
            "https://maps.googleapis.com/maps/api/timezone/json"
        )
        assert request.url.params["location"] == "40.7128,-74.006"
        assert request.url.params["key"] == "test-key"

    def test_ny_fall_back_ambiguous_two_options(self, places_client, google_stub):
        google_stub.serve_timezone(_fixture("timezone-ok.json"))
        response = places_client.post(
            "/api/v1/places/resolve-time",
            json=self._payload(local_date="2024-11-03", local_time="01:30"),
        )
        assert response.status_code == 200, response.text
        body = response.json()

        resolved = body["resolved"]
        assert resolved["classification"] == "ambiguous"
        options = resolved["options"]
        assert len(options) == 2
        assert options[0]["mode"] == "first_pass"
        assert options[0]["utc"] == "2024-11-03T05:30:00Z"
        assert "EDT" in options[0]["label"]
        assert "(-04:00)" in options[0]["label"]
        assert options[1]["mode"] == "second_pass"
        assert options[1]["utc"] == "2024-11-03T06:30:00Z"
        assert "EST" in options[1]["label"]
        assert "(-05:00)" in options[1]["label"]

    def test_ny_spring_forward_nonexistent_single_shifted_option(
        self, places_client, google_stub
    ):
        google_stub.serve_timezone(_fixture("timezone-ok.json"))
        response = places_client.post(
            "/api/v1/places/resolve-time",
            json=self._payload(local_date="2024-03-10", local_time="02:30"),
        )
        assert response.status_code == 200, response.text
        body = response.json()

        resolved = body["resolved"]
        assert resolved["classification"] == "nonexistent"
        options = resolved["options"]
        assert len(options) == 1
        assert options[0]["mode"] == "shifted"
        assert options[0]["utc"] == "2024-03-10T07:30:00Z"
        assert "03:30" in options[0]["label"]
        assert "EDT" in options[0]["label"]

    def test_lord_howe_manual_override_ambiguous_half_hour(
        self, places_client, google_stub
    ):
        response = places_client.post(
            "/api/v1/places/resolve-time",
            json=self._payload(
                lat=-31.55,
                lon=159.08,
                local_date="2024-04-07",
                local_time="01:45",
                tz_override="Australia/Lord_Howe",
            ),
        )
        assert response.status_code == 200, response.text
        body = response.json()

        assert body["iana_zone"] == "Australia/Lord_Howe"
        assert body["zone_source"] == "manual"
        assert body["google"] is None  # no provider call on the manual path
        assert google_stub.requests == []

        resolved = body["resolved"]
        assert resolved["classification"] == "ambiguous"
        options = resolved["options"]
        assert len(options) == 2
        assert "(+11:00)" in options[0]["label"]
        assert options[0]["utc"] == "2024-04-06T14:45:00Z"
        assert "(+10:30)" in options[1]["label"]
        assert options[1]["utc"] == "2024-04-06T15:15:00Z"
        # the two passes differ by exactly the 30-minute Lord Howe shift
        assert options[0]["utc"] != options[1]["utc"]
        assert body["drift"] is False  # drift is a google-path concept only

    def test_fixed_offset_override_accepted(self, places_client, google_stub):
        response = places_client.post(
            "/api/v1/places/resolve-time",
            json=self._payload(tz_override="+05:30"),
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["zone_source"] == "manual"
        assert body["iana_zone"] == "+05:30"
        assert body["resolved"]["offset_seconds"] == 19800
        assert body["resolved"]["offset_label"] == "+05:30"
        assert body["resolved"]["classification"] == "normal"
        assert google_stub.requests == []

    def test_drift_true_offset_seconds_stays_local(
        self, places_client, google_stub
    ):
        # Provider claims EST (raw -18000, dst 0) for a May instant the
        # pinned tzdata knows was EDT — computation still uses local.
        google_stub.serve_timezone(
            {
                "dstOffset": 0,
                "rawOffset": -18000,
                "status": "OK",
                "timeZoneId": "America/New_York",
                "timeZoneName": "Eastern Standard Time",
            }
        )
        response = places_client.post(
            "/api/v1/places/resolve-time", json=self._payload()
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["drift"] is True
        assert body["resolved"]["offset_seconds"] == -14400
        assert body["resolved"]["offset_label"] == "-04:00"

    def test_timezone_zero_results_404_with_manual_hint(
        self, places_client, google_stub
    ):
        google_stub.serve_timezone(_fixture("timezone-zero-results.json"))
        response = places_client.post(
            "/api/v1/places/resolve-time", json=self._payload()
        )
        assert response.status_code == 404, response.text
        error = _assert_error_shape(response.json(), "TIMEZONE_NO_RESULTS")
        assert "manually" in error["hint"].lower()

    def test_missing_key_on_google_path_503(
        self, places_client_no_key, google_stub
    ):
        google_stub.serve_timezone(_fixture("timezone-ok.json"))
        response = places_client_no_key.post(
            "/api/v1/places/resolve-time", json=self._payload()
        )
        assert response.status_code == 503, response.text
        _assert_error_shape(response.json(), "TIMEZONE_PROVIDER_UNAVAILABLE")
        assert google_stub.requests == []  # honest failure before any call

    def test_invalid_tz_override_400(self, places_client, google_stub):
        response = places_client.post(
            "/api/v1/places/resolve-time",
            json=self._payload(tz_override="Not/A_Zone"),
        )
        assert response.status_code == 400, response.text
        _assert_error_shape(response.json(), "TIMEZONE_INVALID_ZONE")
