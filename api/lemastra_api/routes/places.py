"""Places endpoints — the D-03/D-05 resolve step (plan 02-04).

``POST /api/v1/places/search`` proxies type-ahead queries to the
server-side Google Geocoding client (the key never leaves the server —
GATE-06) and returns allowlist-parsed candidates with
provider-of-record provenance. ``POST /api/v1/places/resolve-time``
(Task 2) combines Google Time Zone identity with the locally-computed
historical offset.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from lemastra_api.services.geocoding import GeocodingService
from lemastra_api.settings import load_settings

router = APIRouter(prefix="/api/v1/places", tags=["places"])

#: Locked provider-of-record id (src/data/provider-registry.json).
PLACE_PROVIDER_ID = "google-geocoding-timezone"


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
