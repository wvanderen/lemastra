"""GET /api/v1/meta/zones — the D-05 manual-fallback zone picker source.

Lists ``zoneinfo.available_timezones()`` (backed by the pinned
``tzdata``) so the client's IANA picker can never disagree with the
server's zone resolution. Cheap and quota-free; computed once and
cached — the zone database is static for the life of a process.
"""

from __future__ import annotations

import functools
from zoneinfo import available_timezones

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/meta", tags=["meta"])


class ZonesResponse(BaseModel):
    """Sorted IANA zone list (client zonesResponseSchema)."""

    zones: list[str] = Field(
        description=(
            "Sorted IANA zone identifiers from zoneinfo.available_timezones() — "
            "the manual fallback picker never disagrees with server resolution."
        ),
        min_length=1,
    )


@functools.lru_cache(maxsize=1)
def _cached_zones() -> tuple[str, ...]:
    return tuple(sorted(available_timezones()))


@router.get("/zones", response_model=ZonesResponse)
def list_zones() -> ZonesResponse:
    """Serve the sorted IANA zone list for the manual picker (D-05)."""
    return ZonesResponse(zones=list(_cached_zones()))
