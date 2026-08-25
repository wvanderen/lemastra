"""POST /api/v1/charts/calculate — the product's core trust artifact.

Maps the confirmed birth-data request (D-03 step 2, including the D-08
tricky-time resolution choices and D-10 unknown-time) into calculator
inputs, derives unavailable/provisional factors from the calculator
**output key absence** (never a static list — the D-10 doctrine),
assembles the CALC-03 provenance envelope, and enforces the response-side
schema double gate (T-02-10) against the vendored
``chart_input_schema.json``.

Every calculator failure maps onto the CALC-04 taxonomy via
:class:`~lemastra_api.errors.AppError`; engine tracebacks are logged
server-side only and never reach the response (T-02-11).
"""

from __future__ import annotations

import functools
import hashlib
import json
import logging
from pathlib import Path
from typing import Any

import jsonschema
from fastapi import APIRouter

from lemastra_api.errors import AppError, ErrorCode
from lemastra_api.provenance import read_versions
from lemastra_api.schemas import (
    CalculateRequest,
    CalculateResponse,
    ProvenanceBlock,
    ProvisionalFactor,
    UnavailableFactor,
)
from lemastra_api.services.calculator import (
    CalculatorError,
    CalculatorInvalidInput,
    CalculatorTimeout,
    CalculatorUnsuitableHouseSystem,
    run_chart,
    unknown_time_payload,
)
from lemastra_api.services.civil_time import format_offset
from lemastra_api.settings import load_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/charts", tags=["charts"])

# Request-independent calculator constants, surfaced as assumptions
# (D-12). The pinned skill computes with the built-in Moshier ephemeris
# and the documented per-pair orb table (02-RESEARCH §Calculator).
EPHEMERIS_MODE = "Moshier (built-in)"
ZODIAC_MODE = "tropical"
ORB_POLICY = (
    "birth_to_chart.py default orb table (luminaries 10°, personal 7°, "
    "Jupiter–Pluto 8°, Node 5°, angles 8°; sextile capped 6°)"
)
CALCULATOR_CMD = "python tools/birth_to_chart.py --input <temp-json> --validate"

#: Safe, fixed message for engine failures — the calculator-side message
#: may embed traceback fragments and must never reach the client (T-02-11).
_ENGINE_ERROR_MESSAGE = (
    "The calculation engine failed unexpectedly. The issue has been "
    "logged; please retry."
)


def build_calculator_input(request: CalculateRequest) -> dict[str, Any]:
    """Translate the confirmed request into calculator ``--input`` JSON.

    - normal / ``first_pass``: wall time + IANA zone (the calculator's
      fold=0 default IS the first pass — verified).
    - ``second_pass``: same wall time + a fixed-offset tz string derived
      from ``offset_seconds`` (the argparse-safe JSON path).
    - ``shifted``: the picker's shifted wall time + the IANA zone.
    - Unknown confidence: D-10 noon-reference payload (explicit
      ``time 12:00`` + ``confidence unknown``; ``--noon-for-unknown`` is
      never used).

    Confidence is always passed explicitly (lowercase calculator labels)
    with a clean place label, so wording-hint inference can never
    downgrade the reading.
    """
    base: dict[str, Any] = {
        "date": request.date,
        "lat": request.place.lat,
        "lon": request.place.lon,
        "house_system": request.house_system,
        "place": request.place.label,
        "reading_type": "natal",
        "tz": request.iana_zone,
    }

    if request.confidence == "Unknown":
        return unknown_time_payload(base)

    base["time"] = request.time
    base["confidence"] = request.confidence.lower()

    resolution = request.time_resolution
    if resolution is not None:
        if resolution.mode == "second_pass":
            base["tz"] = format_offset(resolution.offset_seconds or 0)
        elif resolution.mode == "shifted":
            base["time"] = resolution.wall_time
        # first_pass: wall time + IANA zone is already the fold=0 default.
    return base


def derive_unavailable_factors(
    chart_data: dict[str, Any], confidence: str
) -> tuple[list[UnavailableFactor], list[ProvisionalFactor]]:
    """Derive factor availability from OUTPUT KEY ABSENCE (never static).

    The calculator omits ``house_system``/angles/``sect``/``lots`` when
    the birth time is unknown; we mirror that omission as explicit
    unavailable cards with the D-10 reasons, and mark the factors that
    ARE computed but provisional (noon-reference Moon for Unknown,
    angles/houses for Approximate).
    """
    unavailable: list[UnavailableFactor] = []
    if "house_system" not in chart_data:
        unavailable.append(
            UnavailableFactor(factor="houses", reason="Requires a birth time")
        )
        unavailable.append(
            UnavailableFactor(factor="ascendant_mc", reason="Requires a birth time")
        )
    if "sect" not in chart_data:
        unavailable.append(
            UnavailableFactor(factor="sect", reason="Requires sunrise/sunset timing")
        )
    if "lots" not in chart_data:
        unavailable.append(
            UnavailableFactor(
                factor="lots", reason="Lot of Fortune requires the Ascendant"
            )
        )

    provisional: list[ProvisionalFactor] = []
    if confidence == "Unknown":
        provisional.append(
            ProvisionalFactor(
                factor="moon",
                reason=(
                    "Moon moves ~13°/day; degree may shift without a known time"
                ),
            )
        )
    elif confidence == "Approximate":
        provisional.append(
            ProvisionalFactor(
                factor="angles_houses",
                reason=(
                    "Ascendant and house cusps are provisional when the birth "
                    "time is approximate"
                ),
            )
        )
    return unavailable, provisional


def build_provenance(
    request: CalculateRequest, calculator_input: dict[str, Any]
) -> ProvenanceBlock:
    """Assemble the CALC-03 provenance block for this calculation.

    Version chain from :func:`read_versions` (cached per skill path) plus
    request-derived fields; ``input_revision`` is the first 12 hex chars
    of the sha256 over the json-normalized calculator input, so any
    changed input (time, coordinates, zone, house system…) produces a new
    revision id.
    """
    versions = read_versions(load_settings().skill_path)
    normalized = json.dumps(
        calculator_input, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    input_revision = hashlib.sha256(normalized).hexdigest()[:12]
    return ProvenanceBlock(
        skill_revision=versions["skill_revision"],
        swisseph_version=versions["swisseph"],
        tzdata_version=versions["tzdata"],
        schema_version=versions["schema"],
        ephemeris_mode=EPHEMERIS_MODE,
        house_system=request.house_system,
        zodiac_mode=ZODIAC_MODE,
        orb_policy=ORB_POLICY,
        input_revision=input_revision,
        calculator_cmd=CALCULATOR_CMD,
    )


@functools.lru_cache(maxsize=None)
def _chart_schema_validator(
    schema_path_str: str,
) -> jsonschema.Draft202012Validator:
    schema_doc = json.loads(Path(schema_path_str).read_text(encoding="utf-8"))
    return jsonschema.Draft202012Validator(schema_doc)


def validate_chart_envelope(envelope: dict[str, Any]) -> None:
    """Response-side double gate against the vendored chart schema.

    The calculator already ran ``--validate``; this re-checks what the
    API is about to return so a tampered or drifted envelope can never
    reach the client (T-02-10).
    """
    settings = load_settings()
    schema_path = settings.skill_path / "assets" / "schemas" / "chart_input_schema.json"
    validator = _chart_schema_validator(str(schema_path))
    errors = sorted(validator.iter_errors(envelope), key=lambda err: err.message)
    if errors:
        first = errors[0]
        raise AppError(
            ErrorCode.CALC_VALIDATION_FAILED,
            (
                "The calculated chart failed schema validation "
                f"({first.json_path}: {first.message})."
            ),
        )


@router.post(
    "/calculate",
    response_model=CalculateResponse,
    response_model_exclude_none=True,
)
async def calculate_chart(request: CalculateRequest) -> CalculateResponse:
    """Calculate a natal chart from confirmed birth data (D-03 step 2)."""
    calculator_input = build_calculator_input(request)

    try:
        envelope = await run_chart(calculator_input)
    except CalculatorInvalidInput as exc:
        # Field-naming calculator copy passes through verbatim.
        raise AppError(ErrorCode.CALC_INVALID_INPUT, str(exc)) from None
    except CalculatorUnsuitableHouseSystem as exc:
        raise AppError(ErrorCode.CALC_UNSUITABLE_HOUSE_SYSTEM, str(exc)) from None
    except CalculatorTimeout as exc:
        raise AppError(ErrorCode.CALC_TIMEOUT, str(exc)) from None
    except CalculatorError as exc:
        # Engine failures carry a fixed client-safe message; details stay
        # server-side (T-02-11). The monkeypatched-raise path (tests)
        # reaches this branch identically to a real subprocess crash.
        raise AppError(ErrorCode.CALC_ENGINE_ERROR, _ENGINE_ERROR_MESSAGE) from None

    validate_chart_envelope(envelope)

    chart_data = envelope.get("chart_data") or {}
    unavailable, provisional = derive_unavailable_factors(
        chart_data, request.confidence
    )
    return CalculateResponse(
        reading_type=envelope.get("reading_type"),
        chart_data=chart_data,
        provenance=build_provenance(request, calculator_input),
        unavailable_factors=unavailable,
        provisional_factors=provisional,
    )
