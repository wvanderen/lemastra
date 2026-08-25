"""Pydantic request/response models mirroring the calculator contract.

Edge validation (threat T-02-09): lat/lon bounds, date/time patterns,
and closed enums whose vocabularies trace verbatim to the wrapped
``birth_to_chart.py`` (``HOUSE_SYSTEMS``, confidence labels). Every
field carries its own description — mirroring the ``.describe()``
convention of ``src/schemas/provider-registry.ts`` / ``src/lib/api-schemas.ts``
so the models double as the contract reference.

``chart_data`` is intentionally a ``dict`` passthrough: the vendored
``chart_input_schema.json`` (applied via jsonschema in the route — the
double gate) is the authority on chart shape, and re-modeling it here
would create a second schema to drift.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

# --- Closed vocabularies (verbatim from birth_to_chart.py) -----------------

#: The D-11 selector vocabulary — order and labels equal the calculator's
#: ``HOUSE_SYSTEMS`` dict and the client ``houseSystemSchema`` enum.
HOUSE_SYSTEM_LABELS = (
    "Whole Sign",
    "Placidus",
    "Regiomontanus",
    "Koch",
    "Equal",
    "Campanus",
    "Porphyrius",
    "Morinus",
    "Alcabitius",
    "Topocentric",
)

HouseSystem = Literal[
    "Whole Sign",
    "Placidus",
    "Regiomontanus",
    "Koch",
    "Equal",
    "Campanus",
    "Porphyrius",
    "Morinus",
    "Alcabitius",
    "Topocentric",
]

Confidence = Literal["Timed", "Approximate", "Unknown", "Rectified"]

#: D-08 tricky-time resolution modes (client ``timeResolutionModeSchema``).
TimeResolutionMode = Literal["first_pass", "second_pass", "shifted"]

ZoneSource = Literal["google", "manual"]

DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"
TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"

# --- Request models ---------------------------------------------------------


class PlaceInput(BaseModel):
    """Confirmed birthplace (label + authoritative coordinates)."""

    label: str = Field(
        description="Place label from the confirm screen (formatted address or manual entry).",
        min_length=1,
        max_length=200,
    )
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


class TimeResolution(BaseModel):
    """How the user resolved a tricky civil time via the D-08 picker."""

    mode: TimeResolutionMode = Field(
        description=(
            "'first_pass' = wall time with the IANA zone (fold=0); "
            "'second_pass' = equivalent fixed-offset tz (offset_seconds required); "
            "'shifted' = the adjacent valid wall time after a spring-forward gap "
            "(wall_time required)."
        )
    )
    offset_seconds: int | None = Field(
        default=None,
        description=(
            "Fold=1 UTC offset in seconds for second_pass resolution "
            "(e.g. -18000 for EST). Required when mode is second_pass."
        ),
        ge=-50400,
        le=50400,
    )
    wall_time: str | None = Field(
        default=None,
        description=(
            "Shifted HH:MM wall time the calculator receives for 'shifted' "
            "resolution (e.g. 03:30 after a 02:00->03:00 jump). Required when "
            "mode is shifted."
        ),
        pattern=TIME_PATTERN,
    )


class CalculateRequest(BaseModel):
    """Confirmed birth data for POST /api/v1/charts/calculate (D-03 step 2)."""

    date: str = Field(description="Birth date, YYYY-MM-DD.", pattern=DATE_PATTERN)
    time: str | None = Field(
        default=None,
        description=(
            "Birth time, HH:MM (24h). Absent for Unknown confidence; a "
            "missing time for known confidence is rejected by the calculator "
            "with field-naming copy (surfaces as CALC_INVALID_INPUT)."
        ),
        pattern=TIME_PATTERN,
    )
    time_resolution: TimeResolution | None = Field(
        default=None,
        description=(
            "Present only when the D-08 picker resolved an ambiguous or "
            "nonexistent civil time (classification was not 'normal')."
        ),
    )
    confidence: Confidence = Field(
        description=(
            "Birth-time confidence (D-09 four-state control): Timed, "
            "Approximate, Unknown, or Rectified."
        )
    )
    house_system: HouseSystem = Field(
        default="Whole Sign",
        description=(
            "House system for the calculation (D-11) — verbatim calculator "
            "vocabulary; Whole Sign is the default."
        ),
    )
    place: PlaceInput = Field(description="Confirmed birthplace.")
    iana_zone: str = Field(
        description=(
            "IANA zone identity for the birthplace (Google Time Zone or the "
            "manual picker, D-05/D-07)."
        ),
        min_length=1,
        max_length=64,
    )
    zone_source: ZoneSource = Field(
        default="google",
        description="'google' = resolved via Google Time Zone; 'manual' = user override (D-05).",
    )

    @model_validator(mode="after")
    def _check_time_requirements(self) -> "CalculateRequest":
        """Cross-field edge rules the calculator contract implies.

        - A missing ``time`` for known-confidence charts is *not* rejected
          here: the calculator's exit-2 copy ("No birth time supplied…")
          is verified field-naming messaging and reaches the client as
          CALC_INVALID_INPUT (double validation, parse-then-trust).
        - A tricky-time resolution presupposes a wall time and a known
          time (Unknown charts skip the picker entirely).
        - second_pass needs ``offset_seconds``; shifted needs ``wall_time``
          — without them the input translation is undefined.
        """
        if self.time_resolution is not None:
            if self.time is None:
                raise ValueError(
                    "time_resolution requires a birth time — resolve the "
                    "civil time first (D-08 picker)"
                )
            if self.confidence == "Unknown":
                raise ValueError(
                    "time_resolution is not applicable when confidence is "
                    "'Unknown' — unknown-time charts skip the picker"
                )
            mode = self.time_resolution.mode
            if mode == "second_pass" and self.time_resolution.offset_seconds is None:
                raise ValueError(
                    "offset_seconds is required when time_resolution.mode is "
                    "'second_pass'"
                )
            if mode == "shifted" and self.time_resolution.wall_time is None:
                raise ValueError(
                    "wall_time is required when time_resolution.mode is 'shifted'"
                )
        return self


# --- Response models --------------------------------------------------------


class UnavailableFactor(BaseModel):
    """A time-dependent factor the chart legitimately omits (D-10)."""

    factor: str = Field(
        description="Factor id: 'houses', 'ascendant_mc', 'sect', or 'lots'."
    )
    reason: str = Field(
        description="Short why — rendered on the D-10 unavailable cards."
    )


class ProvisionalFactor(BaseModel):
    """A factor computed but flagged provisional."""

    factor: str = Field(description="Factor id, e.g. 'moon' or 'angles_houses'.")
    reason: str = Field(
        description="Why the value is provisional (e.g. Moon moves ~13°/day)."
    )


class ProvenanceBlock(BaseModel):
    """Structured machine-readable provenance (CALC-03).

    Field names equal the client ``calculateProvenanceSchema`` exactly —
    this block is the version chain the D-12 expandable details section
    renders.
    """

    skill_revision: str = Field(
        description="Git revision of the vendored astrology-skill tree used for this chart."
    )
    swisseph_version: str = Field(description="Swiss Ephemeris version, e.g. '2.10.03'.")
    tzdata_version: str = Field(description="Locked IANA tzdata version, e.g. '2026.3'.")
    schema_version: str = Field(
        description="Vendored chart_input_schema.json identity (draft + title or $id)."
    )
    ephemeris_mode: str = Field(
        description="Ephemeris mode, e.g. 'Moshier (built-in)' — no .se1 files."
    )
    house_system: HouseSystem = Field(
        description=(
            "Requested house system — an input, recorded even for "
            "unknown-time charts whose output omits houses."
        )
    )
    zodiac_mode: str = Field(description="Zodiac frame; the calculator is tropical.")
    orb_policy: str = Field(
        description="Documented orb policy label for the assumptions line (D-12)."
    )
    input_revision: str = Field(
        description=(
            "First 12 hex chars of the sha256 over the json-normalized "
            "calculator input — identifies the exact computation (CALC-03)."
        )
    )
    calculator_cmd: str = Field(
        description="The subprocess invocation shape used for this calculation."
    )


class CalculateResponse(BaseModel):
    """POST /api/v1/charts/calculate success envelope."""

    reading_type: str | None = Field(
        default=None,
        description="Calculator reading type, e.g. 'natal'.",
    )
    chart_data: dict[str, Any] = Field(
        description=(
            "The calculated chart facts (never interpretation) — passthrough; "
            "the vendored chart_input_schema.json is the authority."
        )
    )
    provenance: ProvenanceBlock = Field(
        description="Structured provenance block (CALC-03)."
    )
    unavailable_factors: list[UnavailableFactor] = Field(
        default_factory=list,
        description=(
            "Time-dependent factors omitted by this chart (D-10) — derived "
            "from calculator output-key absence, never a static list."
        ),
    )
    provisional_factors: list[ProvisionalFactor] = Field(
        default_factory=list,
        description=(
            "Factors computed but flagged provisional (noon-reference Moon "
            "for Unknown, angles/houses for Approximate)."
        ),
    )
