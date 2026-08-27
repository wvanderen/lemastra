"""Places endpoints — the D-03/D-05 resolve step (plan 02-04).

``POST /api/v1/places/search`` proxies type-ahead queries to the
server-side Google Geocoding client (the key never leaves the server —
GATE-06) and returns allowlist-parsed candidates with
provider-of-record provenance. ``POST /api/v1/places/resolve-time``
combines Google Time Zone zone *identity* with the locally-computed
historical birth-instant offset (Google's documented caveat: the Time
Zone API ignores historical zone changes), classifies DST
ambiguous/nonexistent civil times, and assembles the D-08 picker
options — disagreement between the two offset sources surfaces as
``drift`` instead of being hidden.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from lemastra_api.errors import AppError, ErrorCode
from lemastra_api.schemas import DATE_PATTERN, TIME_PATTERN
from lemastra_api.services import civil_time
from lemastra_api.services.geocoding import GeocodingService, TimezoneResult
from lemastra_api.settings import load_settings

router = APIRouter(prefix="/api/v1/places", tags=["places"])

#: Locked provider-of-record id (src/data/provider-registry.json).
PLACE_PROVIDER_ID = "google-geocoding-timezone"

#: Manual ``tz_override`` fixed-offset form (ISO maximum ±14:00).
_FIXED_OFFSET_PATTERN = re.compile(r"^([+-])(\d{2}):(\d{2})$")


def get_geocoder() -> GeocodingService:
    """FastAPI dependency — overridable with the recorded-fixture stub."""
    return GeocodingService(api_key=load_settings().google_api_key)


# --- POST /api/v1/places/search ---------------------------------------------


class PlaceSearchRequest(BaseModel):
    """Type-ahead search query (edge validation, threat T-02-14)."""

    query: str = Field(
        description=(
            "Free-text place query. Minimum 2 characters — shorter queries "
            "are rejected as PLACE_INVALID_QUERY before any network call."
        ),
        min_length=2,
        max_length=200,
    )


class PlaceCandidateOut(BaseModel):
    """One allowlist-parsed geocoding candidate (client placeCandidateSchema)."""

    label: str = Field(
        description="Formatted address from Google Geocoding — the confirm screen's place name.",
    )
    lat: float = Field(description="Authoritative latitude from geometry.location.")
    lon: float = Field(description="Authoritative longitude from geometry.location.")
    location_type: str = Field(
        description="Google location_type (ROOFTOP/RANGE_INTERPOLATED/GEOMETRIC_CENTER/APPROXIMATE) — precision hint.",
    )
    place_id: str | None = Field(
        default=None,
        description="Google place_id; absent on some interpolated/partial results.",
    )
    partial_match: bool | None = Field(
        default=None,
        description="Google partial_match caveat — emitted only when true (best-match caveat).",
    )


class PlaceProvenanceOut(BaseModel):
    """Who resolved the place and when (retention §1: timestamp only)."""

    provider: Literal["google-geocoding-timezone"] = Field(
        description="Provider of record — locked registry id, never free-form.",
    )
    lookup_timestamp: str = Field(
        description="ISO-8601 UTC instant of the geocoding lookup.",
    )


class PlaceSearchResponse(BaseModel):
    """Search result envelope (client placeSearchResponseSchema)."""

    candidates: list[PlaceCandidateOut] = Field(
        description="Geocoding candidates for the query, best match first.",
    )
    provenance: PlaceProvenanceOut = Field(
        description="Who resolved the place and when.",
    )


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@router.post(
    "/search",
    response_model=PlaceSearchResponse,
    response_model_exclude_none=True,
)
async def search_places(
    request: PlaceSearchRequest,
    geocoder: GeocodingService = Depends(get_geocoder),
) -> PlaceSearchResponse:
    """Proxy a place search to the server-side Google Geocoding key (D-05)."""
    candidates = await geocoder.search_places(request.query)
    return PlaceSearchResponse(
        candidates=[
            PlaceCandidateOut(
                label=c.label,
                lat=c.lat,
                lon=c.lon,
                location_type=c.location_type,
                place_id=c.place_id,
                partial_match=True if c.partial_match else None,
            )
            for c in candidates
        ],
        provenance=PlaceProvenanceOut(
            provider=PLACE_PROVIDER_ID,
            lookup_timestamp=_utc_now_iso(),
        ),
    )


# --- POST /api/v1/places/resolve-time ----------------------------------------


class ResolveTimeRequest(BaseModel):
    """Birth instant + place coordinates for the resolve step (D-06/D-07)."""

    lat: float = Field(
        description="Latitude in decimal degrees (-90..90).",
        ge=-90,
        le=90,
    )
    lon: float = Field(
        description="Longitude in decimal degrees (-180..180).",
        ge=-180,
        le=180,
    )
    local_date: str = Field(
        description="Birth date, YYYY-MM-DD.",
        pattern=DATE_PATTERN,
    )
    local_time: str = Field(
        description="Birth time, HH:MM (24h).",
        pattern=TIME_PATTERN,
    )
    tz_override: str | None = Field(
        default=None,
        description=(
            "Manual IANA zone (D-05 fallback) or fixed ±HH:MM offset — "
            "replaces the Google identity lookup (zone_source 'manual')."
        ),
        min_length=1,
        max_length=64,
    )


class GoogleZoneOut(BaseModel):
    """Provider-of-record echo (client googleZoneSchema — Google's field names)."""

    timeZoneId: str = Field(
        description="IANA zone identity from the Google Time Zone API (CLDR canonical id).",
    )
    timeZoneName: str = Field(description="Google timeZoneName display string.")
    rawOffset: int = Field(
        description="Google rawOffset in seconds (no DST) — provenance only, never computation.",
    )
    dstOffset: int = Field(
        description="Google dstOffset in seconds at the requested timestamp.",
    )


class TimeResolutionOptionOut(BaseModel):
    """One D-08 picker option (client timeResolutionOptionSchema)."""

    mode: Literal["first_pass", "second_pass", "shifted"] = Field(
        description="Which resolution pass/shift this option represents.",
    )
    label: str = Field(
        description="Human-readable explanation for the D-08 picker (offsets, clock jump).",
    )
    utc: str = Field(
        description="ISO-8601 UTC instant this option corresponds to (options differ only here).",
    )


class ResolvedTimeOut(BaseModel):
    """Locally-computed resolution block (client resolvedTimeSchema)."""

    offset_seconds: int = Field(
        description=(
            "Locally-computed historical offset for the birth instant "
            "(zoneinfo+tzdata — authoritative for computation, D-07)."
        ),
    )
    offset_label: str = Field(
        description="Formatted fixed offset for the D-06 confirm display, e.g. '-04:00'.",
    )
    classification: Literal["normal", "ambiguous", "nonexistent"] = Field(
        description="Normal / ambiguous (fall-back) / nonexistent (spring-forward) verdict.",
    )
    options: list[TimeResolutionOptionOut] = Field(
        description=(
            "D-08 picker payload: two options (first/second pass) when ambiguous, "
            "one shifted option when nonexistent, empty when normal."
        ),
    )


class ResolveTimeResponse(BaseModel):
    """Resolve-time envelope (client resolveTimeResponseSchema).

    Unlike the search endpoint this must NOT drop nulls: the client
    zod contract models ``google`` as nullable (explicit ``null`` on
    the manual path), not optional.
    """

    iana_zone: str = Field(
        description="Resolved IANA zone identity for the coordinates.",
    )
    zone_source: Literal["google", "manual"] = Field(
        description="'google' = resolved via Google Time Zone; 'manual' = user tz_override (D-05).",
    )
    google: GoogleZoneOut | None = Field(
        description="Google Time Zone provider-of-record data; null when zone_source is manual.",
    )
    resolved: ResolvedTimeOut = Field(
        description="Locally-computed offset + classification + D-08 options.",
    )
    drift: bool = Field(
        description=(
            "True when the Google offset disagrees with the locally-resolved "
            "tzdata offset (historical realignment) — computation still uses local."
        ),
    )


def _load_tzinfo(zone: str):
    """Resolve an IANA zone name (CLDR aliases included) or ±HH:MM offset."""
    fixed = _FIXED_OFFSET_PATTERN.match(zone)
    if fixed:
        sign = 1 if fixed.group(1) == "+" else -1
        hours, minutes = int(fixed.group(2)), int(fixed.group(3))
        if hours > 14 or minutes > 59:
            raise AppError(
                ErrorCode.TIMEZONE_INVALID_ZONE,
                f"'{zone}' is not a valid ±HH:MM fixed offset.",
            )
        return timezone(sign * timedelta(hours=hours, minutes=minutes))
    try:
        return ZoneInfo(zone)
    except (ZoneInfoNotFoundError, ValueError):
        raise AppError(
            ErrorCode.TIMEZONE_INVALID_ZONE,
            f"'{zone}' is not a resolvable IANA timezone on this server.",
        ) from None


@router.post("/resolve-time", response_model=ResolveTimeResponse)
async def resolve_time(
    request: ResolveTimeRequest,
    geocoder: GeocodingService = Depends(get_geocoder),
) -> ResolveTimeResponse:
    """Resolve zone identity + historical offset + DST classification."""
    local = datetime.strptime(
        f"{request.local_date} {request.local_time}", "%Y-%m-%d %H:%M"
    )

    google_result: TimezoneResult | None = None
    if request.tz_override is not None:
        # D-05 manual fallback: the override replaces the Google lookup
        # entirely and gets the same classification/options treatment.
        iana_zone = request.tz_override
        zone_source = "manual"
    else:
        # D-07: zone identity from Google (coordinates + birth instant),
        # never the device clock. The naive wall time is interpreted as
        # UTC purely to form the provider timestamp — identity is
        # location-driven.
        google_result = await geocoder.resolve_timezone(
            request.lat,
            request.lon,
            int(local.replace(tzinfo=timezone.utc).timestamp()),
        )
        iana_zone = google_result.time_zone_id
        zone_source = "google"

    # The Google historical caveat design consequence: the ACTUAL
    # birth-instant offset and DST classification are ALWAYS computed
    # locally from zoneinfo + the pinned tzdata — the same database the
    # calculator subprocess uses (internally consistent by construction).
    tz = _load_tzinfo(iana_zone)
    classification, offset0, _offset1 = civil_time.classify(local, tz)
    options = civil_time.resolve_options(local, tz)
    offset_seconds = int(offset0.total_seconds())  # fold=0 representative

    drift = False
    if google_result is not None:
        # Surface provider/local disagreement instead of hiding it —
        # computation above already used the local value regardless.
        drift = (
            google_result.raw_offset + google_result.dst_offset
        ) != offset_seconds

    return ResolveTimeResponse(
        iana_zone=iana_zone,
        zone_source=zone_source,
        google=None
        if google_result is None
        else GoogleZoneOut(
            timeZoneId=google_result.time_zone_id,
            timeZoneName=google_result.time_zone_name,
            rawOffset=google_result.raw_offset,
            dstOffset=google_result.dst_offset,
        ),
        resolved=ResolvedTimeOut(
            offset_seconds=offset_seconds,
            offset_label=civil_time.format_offset(offset_seconds),
            classification=classification,
            options=[TimeResolutionOptionOut(**option) for option in options],
        ),
        drift=drift,
    )
