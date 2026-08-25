"""Google Geocoding + Time Zone client (D-05/D-07, plan 02-04).

Server-side proxy discipline:

- The ``GOOGLE_API_KEY`` is read from settings at call time and lives
  only in the outbound query string to the fixed Google endpoints —
  never in responses, logs, or ``EXPO_PUBLIC_*`` (GATE-06 /
  docs/governance/secret-isolation-policy.md). An unset key fails
  honestly as the per-endpoint provider-unavailable code instead of
  crashing or silently degrading.
- Query parameters are forwarded to a FIXED Google URL only — no
  arbitrary-URL parameters are accepted (T-02-14 SSRF-adjacent).
- Responses are parsed from an allowlist (T-02-14): geocoding yields
  label + location + location_type + place_id + partial_match;
  ``address_components`` and anything beyond the documented shape is
  deliberately ignored ("may change shape without notice").
- Google statuses map onto the CALC-04 taxonomy per 02-RESEARCH
  §"Geocoder error mapping": ZERO_RESULTS → 404, quota/denied → 503,
  rate limit → 429 with ``Retry-After``, INVALID_REQUEST → 400,
  unknown statuses/network failures → 503.

Tests drive this service through an ``httpx.MockTransport`` (conftest
``places_client``) replaying recorded fixtures — never the live API.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from lemastra_api.errors import AppError, ErrorCode

logger = logging.getLogger(__name__)

GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json"
TIMEZONE_ENDPOINT = "https://maps.googleapis.com/maps/api/timezone/json"

#: Outbound request budget — geocoder latency must never hang a request.
REQUEST_TIMEOUT_S = 5.0

#: Type-ahead results shown to the user (D-05 debounced search).
MAX_CANDIDATES = 5

#: Seconds the client should wait before retrying a rate-limited call.
RATE_LIMIT_RETRY_AFTER_S = "1"


@dataclass(frozen=True)
class GeocodeCandidate:
    """One allowlist-parsed geocoding result.

    ``partial_match`` carries Google's best-match caveat for the
    confirm screen; ``place_id`` is absent on some interpolated or
    partial results.
    """

    label: str
    lat: float
    lon: float
    location_type: str
    place_id: str | None = None
    partial_match: bool = False


def _require_api_key(api_key: str, code: ErrorCode) -> None:
    """Fail honestly when the server-side key is not configured."""
    if not api_key:
        raise AppError(
            code,
            "Place lookup is unavailable: GOOGLE_API_KEY is not configured "
            "on the server. Enter the birthplace manually (coordinates + "
            "IANA zone) instead.",
        )


def _geocode_unavailable(message: str) -> AppError:
    return AppError(
        ErrorCode.PLACE_PROVIDER_UNAVAILABLE,
        message,
    )


def _map_geocode_status(payload: dict) -> AppError | None:
    """Map a Google geocoding status onto the CALC-04 taxonomy.

    Returns ``None`` for ``OK``. Unknown statuses are treated as
    provider failures — the client sees one recoverable code, never a
    raw provider passthrough.
    """
    status = payload.get("status", "")
    error_message = payload.get("error_message", "")
    detail = f" Google says: {error_message}" if error_message else ""

    if status == "OK":
        return None
    if status == "ZERO_RESULTS":
        return AppError(
            ErrorCode.PLACE_ZERO_RESULTS,
            "No matching places were found for that search.",
        )
    if status == "OVER_QUERY_LIMIT":
        return AppError(
            ErrorCode.PLACE_PROVIDER_UNAVAILABLE,
            "Place search is rate-limited right now." + detail,
            status_override=429,
            headers={"Retry-After": RATE_LIMIT_RETRY_AFTER_S},
        )
    if status == "INVALID_REQUEST":
        return AppError(
            ErrorCode.PLACE_INVALID_QUERY,
            "The search query could not be processed." + detail,
        )
    # OVER_DAILY_LIMIT, REQUEST_DENIED, UNKNOWN_ERROR, anything else.
    return _geocode_unavailable(
        "Place search is unavailable right now (Google status: "
        f"{status or 'unknown'}).{detail}"
    )


class GeocodingService:
    """httpx wrapper around the two Google Maps endpoints.

    ``transport`` exists for tests (``httpx.MockTransport`` with
    recorded fixtures); production calls construct a plain
    ``AsyncClient`` per request — no shared connection state.
    """

    def __init__(
        self,
        api_key: str,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._api_key = api_key
        self._transport = transport

    async def _get_json(
        self, url: str, params: dict[str, str], unavailable: AppError
    ) -> dict:
        """GET a Google endpoint and return the parsed JSON body.

        Network/HTTP failures surface as the caller's
        provider-unavailable error; the API key never reaches an
        exception message or log line (T-02-geo).
        """
        try:
            async with httpx.AsyncClient(
                timeout=REQUEST_TIMEOUT_S, transport=self._transport
            ) as client:
                response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning(
                "geocoder request failed (server-only, no secrets logged): %s: %s",
                type(exc).__name__,
                str(exc).replace(self._api_key, "***") if self._api_key else exc,
            )
            raise unavailable from None

    async def search_places(self, query: str) -> list[GeocodeCandidate]:
        """Geocode ``query`` into at most :data:`MAX_CANDIDATES` candidates."""
        _require_api_key(self._api_key, ErrorCode.PLACE_PROVIDER_UNAVAILABLE)
        payload = await self._get_json(
            GEOCODE_ENDPOINT,
            {"address": query, "key": self._api_key},
            unavailable=_geocode_unavailable(
                "Could not reach the Google Geocoding service."
            ),
        )

        error = _map_geocode_status(payload)
        if error is not None:
            raise error

        candidates: list[GeocodeCandidate] = []
        for result in payload.get("results", [])[:MAX_CANDIDATES]:
            geometry = result.get("geometry") or {}
            location = geometry.get("location") or {}
            label = result.get("formatted_address")
            if not isinstance(label, str) or not label:
                continue  # allowlist discipline: skip shapeless entries
            candidates.append(
                GeocodeCandidate(
                    label=label,
                    lat=float(location["lat"]),
                    lon=float(location["lng"]),
                    location_type=str(geometry.get("location_type", "APPROXIMATE")),
                    place_id=result.get("place_id"),
                    partial_match=bool(result.get("partial_match", False)),
                )
            )
        return candidates
