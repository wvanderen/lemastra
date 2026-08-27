"""CALC-04 error taxonomy: machine-readable codes, HTTP map, body shape.

Every 4xx/5xx body this service emits is
``{"error": {"code", "message", "recoverable", "hint"?}}`` — the client
renders ``hint`` as recovery guidance and switches on ``code``
(``src/lib/api-schemas.ts`` ``errorSchema``). The eleven-code vocabulary
below equals the client ``errorCodeSchema`` enum **verbatim**
(snake_case field names); the two sides are test-enforced downstream and
must stay in lockstep.

HTTP mapping follows 02-RESEARCH.md §"CALC-04 error taxonomy" and the
geocoder status table: zero-results → 404, invalid input/zone → 400,
rate-class provider limits → 429 (call-site override — the static map
carries the 503 default for the same code's non-rate failures),
provider-unavailable → 503, timeout → 504, engine → 500,
unsuitable-house-system → 422.

Every code is ``recoverable=True``: CALC_ENGINE_ERROR and
CALC_VALIDATION_FAILED are still recoverable-with-retry (the client may
re-attempt the calculation), matching the "specific and recoverable"
requirement.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ErrorCode(str, Enum):
    """The eleven CALC-04 error codes.

    Values must equal ``src/lib/api-schemas.ts`` ``errorCodeSchema``
    exactly — this enum is the server-side half of a shared contract.
    """

    PLACE_ZERO_RESULTS = "PLACE_ZERO_RESULTS"
    PLACE_PROVIDER_UNAVAILABLE = "PLACE_PROVIDER_UNAVAILABLE"
    PLACE_INVALID_QUERY = "PLACE_INVALID_QUERY"
    TIMEZONE_NO_RESULTS = "TIMEZONE_NO_RESULTS"
    TIMEZONE_PROVIDER_UNAVAILABLE = "TIMEZONE_PROVIDER_UNAVAILABLE"
    TIMEZONE_INVALID_ZONE = "TIMEZONE_INVALID_ZONE"
    CALC_INVALID_INPUT = "CALC_INVALID_INPUT"
    CALC_ENGINE_ERROR = "CALC_ENGINE_ERROR"
    CALC_TIMEOUT = "CALC_TIMEOUT"
    CALC_VALIDATION_FAILED = "CALC_VALIDATION_FAILED"
    CALC_UNSUITABLE_HOUSE_SYSTEM = "CALC_UNSUITABLE_HOUSE_SYSTEM"


#: Per-code HTTP status (research §3 table). ``PLACE_PROVIDER_UNAVAILABLE``
#: defaults to 503; rate-limit call sites pass ``status_override=429``.
HTTP_STATUS: dict[ErrorCode, int] = {
    ErrorCode.PLACE_ZERO_RESULTS: 404,
    ErrorCode.TIMEZONE_NO_RESULTS: 404,
    ErrorCode.PLACE_INVALID_QUERY: 400,
    ErrorCode.TIMEZONE_INVALID_ZONE: 400,
    ErrorCode.CALC_INVALID_INPUT: 400,
    ErrorCode.CALC_VALIDATION_FAILED: 400,
    ErrorCode.PLACE_PROVIDER_UNAVAILABLE: 503,
    ErrorCode.TIMEZONE_PROVIDER_UNAVAILABLE: 503,
    ErrorCode.CALC_TIMEOUT: 504,
    ErrorCode.CALC_ENGINE_ERROR: 500,
    ErrorCode.CALC_UNSUITABLE_HOUSE_SYSTEM: 422,
}

#: Every code maps to a client-recoverable action. Engine and validation
#: failures are recoverable-with-retry, so they stay ``True`` too.
RECOVERABLE: dict[ErrorCode, bool] = {code: True for code in ErrorCode}

#: Default recovery hints. ``None`` means "omit the hint" — used for
#: CALC_INVALID_INPUT, whose message is already the calculator's
#: field-naming copy (verified excellent).
DEFAULT_HINTS: dict[ErrorCode, str | None] = {
    ErrorCode.PLACE_ZERO_RESULTS: "Try a nearby city or enter coordinates manually.",
    ErrorCode.PLACE_PROVIDER_UNAVAILABLE: (
        "Place search is unavailable right now — enter coordinates manually."
    ),
    ErrorCode.PLACE_INVALID_QUERY: "Adjust the search query and try again.",
    ErrorCode.TIMEZONE_NO_RESULTS: "No timezone covers these coordinates — pick a zone manually.",
    ErrorCode.TIMEZONE_PROVIDER_UNAVAILABLE: (
        "Timezone lookup is unavailable right now — pick a zone manually."
    ),
    ErrorCode.TIMEZONE_INVALID_ZONE: "Pick a valid IANA timezone from the picker.",
    ErrorCode.CALC_INVALID_INPUT: None,
    ErrorCode.CALC_ENGINE_ERROR: "Please retry — the failure has been logged.",
    ErrorCode.CALC_TIMEOUT: "The calculation took too long — please retry.",
    ErrorCode.CALC_VALIDATION_FAILED: (
        "The calculated chart failed schema validation — retry or adjust the birth data."
    ),
    ErrorCode.CALC_UNSUITABLE_HOUSE_SYSTEM: (
        "Quadrant house systems cannot be computed for this latitude/date — "
        "switch to Whole Sign or Equal houses."
    ),
}


class AppError(Exception):
    """Typed API error rendered as the CALC-04 body by the handler.

    ``recoverable`` is always ``True`` for the current taxonomy; it rides
    on the exception (not just the map) so future non-recoverable codes
    cannot silently lose the field. ``hint`` falls back to the per-code
    default unless the raiser supplies sharper copy. ``headers`` carries
    optional extra response headers — used by the rate-limit call site
    (``Retry-After`` on 429 provider-limit failures).
    """

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        *,
        hint: str | None = None,
        status_override: int | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = ErrorCode(code)
        self.message = message
        self.recoverable = RECOVERABLE[self.code]
        self.hint = hint if hint is not None else DEFAULT_HINTS[self.code]
        self.status = status_override if status_override is not None else HTTP_STATUS[self.code]
        self.headers = headers


def error_body(exc: AppError) -> dict[str, Any]:
    """Serialize an :class:`AppError` into the CALC-04 response shape.

    ``hint`` is omitted entirely when unset — the client zod schema
    models it as optional, not nullable.
    """
    body: dict[str, Any] = {
        "error": {
            "code": exc.code.value,
            "message": exc.message,
            "recoverable": exc.recoverable,
        }
    }
    if exc.hint is not None:
        body["error"]["hint"] = exc.hint
    return body


def _format_validation_errors(errors: list[dict[str, Any]]) -> str:
    """Field-naming message for pydantic request-validation failures.

    Produces ``"body.time: String does not match pattern ..."``-style
    copy so a malformed request reads like the calculator's own
    field-naming errors.
    """
    parts: list[str] = []
    for err in errors:
        loc = ".".join(str(piece) for piece in err.get("loc", ()))
        parts.append(f"{loc or 'body'}: {err.get('msg', 'invalid value')}")
    return "; ".join(parts)


def _validation_error_code(request: Request) -> ErrorCode:
    """Per-route code for pydantic request-validation failures.

    Places-search edge rejections carry their own code
    (``PLACE_INVALID_QUERY`` — the short-query gate lives in the
    request model, per plan 02-04); every other route keeps the
    generic ``CALC_INVALID_INPUT`` single error surface from 02-03.
    """
    if request.url.path.startswith("/api/v1/places/search"):
        return ErrorCode.PLACE_INVALID_QUERY
    return ErrorCode.CALC_INVALID_INPUT


def register_error_handlers(app: FastAPI) -> None:
    """Attach the CALC-04 handlers to an app (called from ``create_app``)."""

    @app.exception_handler(AppError)
    async def _app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status, content=error_body(exc), headers=exc.headers
        )

    @app.exception_handler(RequestValidationError)
    async def _request_validation_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Pydantic 422s become 400s with field-naming messages — one
        # error surface per route family, not two.
        mapped = AppError(
            _validation_error_code(request),
            _format_validation_errors(exc.errors()),
        )
        return JSONResponse(status_code=mapped.status, content=error_body(mapped))
