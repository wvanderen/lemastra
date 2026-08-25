"""CALC-04 error matrix through POST /api/v1/charts/calculate (02-03 Task 3, TDD).

Every failure class must be reachable through the endpoint and
distinguishable by its machine-readable ``error.code`` — the gate
discipline mirrors ``src/schemas/registry.test.ts`` (each mutation trips
its own gate). Rows 1–2 drive the REAL subprocess; timeout/engine/
validation rows monkeypatch. Engine tracebacks are asserted to live in
server-side logs (caplog) and NEVER in the response body (T-02-11).
"""

from __future__ import annotations

import logging

import pytest

BROOKLYN = {"label": "Brooklyn", "lat": 40.7128, "lon": -74.006}
TROMSO = {"label": "Tromsø", "lat": 69.6496, "lon": 18.9553}

VALID_ERROR_KEYS = {"code", "message", "recoverable", "hint"}


def _payload(**overrides) -> dict:
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
    payload["place"] = dict(payload["place"])
    return payload


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


class TestCalculatorExitCodes:
    """Real subprocess rows (verified stderr shapes, 02-RESEARCH §Exit codes)."""

    def test_exit2_bad_zone_maps_to_calc_invalid_input_with_did_you_mean(
        self, client
    ):
        response = client.post(
            "/api/v1/charts/calculate",
            json=_payload(iana_zone="America/Kentucky/Lexington"),
        )
        assert response.status_code == 400, response.text
        error = _assert_error_shape(response.json(), "CALC_INVALID_INPUT")
        message = error["message"].lower()
        assert "did you mean" in message or "louisville" in message, error["message"]

    def test_high_latitude_placidus_maps_to_unsuitable_house_system(self, client):
        response = client.post(
            "/api/v1/charts/calculate",
            json=_payload(
                date="1990-06-21",
                time="12:00",
                house_system="Placidus",
                place=TROMSO,
                iana_zone="Europe/Oslo",
            ),
        )
        assert response.status_code == 422, response.text
        error = _assert_error_shape(
            response.json(), "CALC_UNSUITABLE_HOUSE_SYSTEM"
        )
        assert "Whole Sign" in error["hint"]
        assert "Equal" in error["hint"]


class TestTimeoutRow:
    def test_timeout_maps_to_calc_timeout(self, client, monkeypatch):
        # run_chart reads settings per call, so a tiny env timeout reaches
        # the real subprocess wait_for and kills it.
        monkeypatch.setenv("LEMASTRA_CALC_TIMEOUT_S", "0.001")
        response = client.post(
            "/api/v1/charts/calculate", json=_payload()
        )
        assert response.status_code == 504, response.text
        _assert_error_shape(response.json(), "CALC_TIMEOUT")


class TestEngineRow:
    def test_engine_error_logged_server_side_never_in_body(
        self, client, monkeypatch, caplog
    ):
        import lemastra_api.routes.charts as charts_module
        from lemastra_api.services.calculator import CalculatorEngineError

        marker = "ValueError: boomer-traceback-marker"

        async def exploding(payload, **kwargs):
            raise CalculatorEngineError(marker)

        monkeypatch.setattr(charts_module, "run_chart", exploding)
        with caplog.at_level(logging.ERROR):
            response = client.post(
                "/api/v1/charts/calculate", json=_payload()
            )

        assert response.status_code == 500, response.text
        _assert_error_shape(response.json(), "CALC_ENGINE_ERROR")
        # T-02-11: the traceback detail never reaches the client…
        assert "boomer-traceback-marker" not in response.text
        # …but is captured server-side for diagnosis.
        assert any(
            marker in record.getMessage() for record in caplog.records
        ), [record.getMessage() for record in caplog.records]


class TestValidationGateRow:
    def test_validation_gate_maps_to_calc_validation_failed(self, client, monkeypatch):
        import lemastra_api.routes.charts as charts_module

        async def broken_run_chart(payload, **kwargs):
            return {"chart_data": {"placements": 42}}

        monkeypatch.setattr(charts_module, "run_chart", broken_run_chart)
        response = client.post("/api/v1/charts/calculate", json=_payload())
        assert response.status_code == 400, response.text
        _assert_error_shape(response.json(), "CALC_VALIDATION_FAILED")


class TestPydanticEdgeRow:
    def test_pydantic_rejection_maps_to_calc_invalid_input(self, client):
        """Request-edge rejections share the one error surface (400, field-naming)."""
        response = client.post(
            "/api/v1/charts/calculate",
            json=_payload(place={"label": "X", "lat": 91.0, "lon": 0.0}),
        )
        assert response.status_code == 400, response.text
        error = _assert_error_shape(response.json(), "CALC_INVALID_INPUT")
        assert "lat" in error["message"]

    def test_unknown_house_system_rejected_at_edge(self, client):
        response = client.post(
            "/api/v1/charts/calculate",
            json=_payload(house_system="Krusinski"),
        )
        assert response.status_code == 400, response.text
        error = _assert_error_shape(response.json(), "CALC_INVALID_INPUT")
        assert "house_system" in error["message"]
