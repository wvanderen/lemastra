import { z } from "zod";

/**
 * Zod response contracts for the LemAstra API service
 * (`api/lemastra_api`, phase 02).
 *
 * These schemas mirror the endpoint table in
 * `.planning/phases/02-trustworthy-natal-chart/02-RESEARCH.md`
 * §"FastAPI Service Skeleton" and the D-08 picker payload from §"DST
 * Gap/Overlap Handling" — the contract was verified against the real
 * calculator. Conventions follow `src/schemas/provider-registry.ts`: every
 * field carries its own `.describe()` documentation so the schema doubles
 * as the contract reference, vocabularies are closed enums traceable to the
 * calculator (`HOUSE_SYSTEMS`, confidence labels), and malformed data must
 * fail validation loudly.
 *
 * Parse-then-trust (T-02-06): `src/lib/api.ts` runs every HTTP response
 * through the matching schema BEFORE anything reaches calling code —
 * unvalidated API data never flows into components.
 */

// ---------------------------------------------------------------------------
// Closed vocabularies (traceable to the calculator + CALC-04 taxonomy)
// ---------------------------------------------------------------------------

/** The ten house systems supported by the wrapped calculator (D-11 selector vocabulary). */
export const houseSystemSchema = z
  .enum([
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
  ])
  .describe(
    "House system used for the calculation. Verbatim from birth_to_chart.py " +
      "HOUSE_SYSTEMS — the D-11 selector's exact vocabulary; Whole Sign is the default."
  );

/** Birth-time confidence as emitted by the calculator (D-09 four-state control). */
export const confidenceSchema = z
  .enum(["Timed", "Approximate", "Unknown", "Rectified"])
  .describe(
    "Birth-time confidence label. Capitalized calculator labels; drives the " +
      "D-09 inline control and the D-10 unknown-time factor omissions."
  );

/** PEP 495 civil-time classification of the requested local wall time. */
export const classificationSchema = z
  .enum(["normal", "ambiguous", "nonexistent"])
  .describe(
    "Server-side classification of the local civil time: 'normal' needs no " +
      "resolution; 'ambiguous' (fall-back overlap) offers first/second pass; " +
      "'nonexistent' (spring-forward gap) shifts to the adjacent valid instant."
  );

/** How the user resolved a tricky civil time via the D-08 picker. */
export const timeResolutionModeSchema = z
  .enum(["first_pass", "second_pass", "shifted"])
  .describe(
    "Tricky-time resolution choice: 'first_pass' = wall time with IANA zone " +
      "(fold=0); 'second_pass' = equivalent fixed-offset tz; 'shifted' = the " +
      "adjacent valid wall time after a spring-forward gap."
  );

/** The eleven CALC-04 recoverable error codes (mirrors api errors.py). */
export const errorCodeSchema = z
  .enum([
    "PLACE_ZERO_RESULTS",
    "PLACE_PROVIDER_UNAVAILABLE",
    "PLACE_INVALID_QUERY",
    "TIMEZONE_NO_RESULTS",
    "TIMEZONE_PROVIDER_UNAVAILABLE",
    "TIMEZONE_INVALID_ZONE",
    "CALC_INVALID_INPUT",
    "CALC_ENGINE_ERROR",
    "CALC_TIMEOUT",
    "CALC_VALIDATION_FAILED",
    "CALC_UNSUITABLE_HOUSE_SYSTEM",
  ])
  .describe(
    "Machine-readable error code carried by every 4xx/5xx body. Each code " +
      "maps to a recoverable UI action (02-UI-SPEC §'Error banners'); the " +
      "vocabulary must equal api/lemastra_api/errors.py exactly."
  );

export type HouseSystem = z.infer<typeof houseSystemSchema>;
export type Confidence = z.infer<typeof confidenceSchema>;
export type Classification = z.infer<typeof classificationSchema>;
export type TimeResolutionMode = z.infer<typeof timeResolutionModeSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;

// ---------------------------------------------------------------------------
// POST /api/v1/places/search
// ---------------------------------------------------------------------------

export const placeCandidateSchema = z.object({
  label: z
    .string()
    .describe("Formatted address from Google Geocoding — the confirm screen's place name."),
  lat: z.number().describe("Authoritative latitude from geometry.location."),
  lon: z.number().describe("Authoritative longitude from geometry.location."),
  location_type: z
    .enum(["ROOFTOP", "RANGE_INTERPOLATED", "GEOMETRIC_CENTER", "APPROXIMATE"])
    .describe("Google location_type — displayed as a precision hint."),
  place_id: z
    .string()
    .optional()
    .describe("Google place_id; optional because partial/interpolated results may lack it."),
  partial_match: z
    .boolean()
    .optional()
    .describe(
      "Google partial_match caveat — emitted only when true (best-match " +
        "approximation); drives the selected-candidate precision note (D-05)."
    ),
});

export const placeProvenanceSchema = z.object({
  provider: z
    .literal("google-geocoding-timezone")
    .describe(
      "Provider of record — locked registry id from src/data/provider-registry.json; " +
        "never a free-form string."
    ),
  lookup_timestamp: z
    .string()
    .describe("ISO-8601 UTC instant of the geocoding lookup (provenance, retention §1)."),
});

export const placeSearchResponseSchema = z.object({
  candidates: z
    .array(placeCandidateSchema)
    .describe("Geocoding candidates for the query, best match first."),
  provenance: placeProvenanceSchema.describe("Who resolved the place and when."),
});

export type PlaceCandidate = z.infer<typeof placeCandidateSchema>;
export type PlaceSearchResponse = z.infer<typeof placeSearchResponseSchema>;

// ---------------------------------------------------------------------------
// POST /api/v1/places/resolve-time
// ---------------------------------------------------------------------------

export const timeResolutionOptionSchema = z.object({
  mode: timeResolutionModeSchema.describe("Which resolution pass/shift this option represents."),
  label: z
    .string()
    .describe("Human-readable explanation rendered by the D-08 picker (offsets, clock jump)."),
  utc: z
    .string()
    .describe("ISO-8601 UTC instant this option corresponds to (options differ only here)."),
});

export const googleZoneSchema = z.object({
  timeZoneId: z
    .string()
    .describe("IANA zone identity from the Google Time Zone API (CLDR canonical id)."),
  rawOffset: z
    .number()
    .int()
    .describe("Google rawOffset in seconds (no DST) — provider-of-record provenance only."),
  dstOffset: z
    .number()
    .int()
    .describe("Google dstOffset in seconds at the requested timestamp."),
  timeZoneName: z.string().describe("Google timeZoneName display string."),
});

export const resolvedTimeSchema = z.object({
  offset_seconds: z
    .number()
    .int()
    .describe(
      "Locally-computed historical offset for the birth instant (zoneinfo+tzdata — " +
        "authoritative for computation, D-07)."
    ),
  offset_label: z
    .string()
    .describe("Formatted fixed offset for the D-06 confirm display, e.g. '-04:00'."),
  classification: classificationSchema.describe("Normal / ambiguous / nonexistent verdict."),
  options: z
    .array(timeResolutionOptionSchema)
    .describe(
      "D-08 picker payload: two options (first/second pass) when ambiguous, one " +
        "shifted option when nonexistent, empty when normal."
    ),
});

export const resolveTimeResponseSchema = z.object({
  iana_zone: z.string().describe("Resolved IANA zone identity for the coordinates."),
  zone_source: z
    .enum(["google", "manual"])
    .describe("'google' = resolved via Google Time Zone; 'manual' = user tz_override (D-05)."),
  google: googleZoneSchema
    .nullable()
    .describe("Google Time Zone provider-of-record data; null when zone_source is manual."),
  resolved: resolvedTimeSchema.describe("Locally-computed offset + classification + options."),
  drift: z
    .boolean()
    .describe(
      "True when the Google offset disagrees with the locally-resolved tzdata offset " +
        "(historical realignment) — the confirm screen shows a subtle note."
    ),
});

export type TimeResolutionOption = z.infer<typeof timeResolutionOptionSchema>;
export type ResolveTimeResponse = z.infer<typeof resolveTimeResponseSchema>;

// ---------------------------------------------------------------------------
// POST /api/v1/charts/calculate
// ---------------------------------------------------------------------------

export const angleSchema = z.looseObject({
  sign: z.string().describe("Zodiac sign of the angle."),
  degree: z.number().describe("Degree within the sign."),
  absolute_degree: z.number().describe("Absolute ecliptic longitude 0–360."),
});

export const placementSchema = z.looseObject({
  body: z.string().describe("Chart body (Sun, Moon, … True Node)."),
  sign: z.string().describe("Zodiac sign the body occupies."),
  degree: z.number().describe("Degree within the sign."),
  absolute_degree: z.number().describe("Absolute ecliptic longitude 0–360."),
  motion: z
    .string()
    .describe("Observed motion: 'direct', 'retrograde', or 'stationary' (<0.01°/day)."),
  house: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Whole-number house placement; ABSENT when birth time is unknown (D-10)."),
  dignity: z
    .array(z.string())
    .optional()
    .describe("Major essential dignities; populated for the seven classical planets only."),
  condition: z
    .array(z.string())
    .optional()
    .describe("Interpretive condition tags — currently always empty (trust boundary)."),
  notes: z
    .string()
    .optional()
    .describe("Calculator caveat, e.g. the provisional Moon at the noon reference."),
});

export const aspectSchema = z.looseObject({
  body_a: z.string().describe("First aspecting body."),
  aspect: z.string().describe("Aspect name (conjunction, sextile, square, trine, opposition)."),
  body_b: z.string().describe("Second aspecting body."),
  orb_degrees: z.number().describe("Orb between exact aspect, in degrees."),
  applying: z.literal(true).optional().describe(
    "Presence flag, always true when present — the aspect is applying; " +
      "mutually exclusive with separating. The calculator (vendor " +
      "birth_to_chart.py compute_aspects) omits both flags when relative " +
      "motion is zero (stationary bodies and Asc/MC contacts)."
  ),
  separating: z.literal(true).optional().describe(
    "Presence flag, always true when present — the aspect is separating; " +
      "mutually exclusive with applying."
  ),
  exact: z.boolean().describe("True when the orb is under 0.05°."),
});

export const houseCuspSchema = z.looseObject({
  house: z.number().int().positive().describe("House number 1–12."),
  sign: z.string().describe("Zodiac sign on the cusp."),
  degree: z.number().describe("Degree within the sign."),
  absolute_degree: z.number().describe("Absolute ecliptic longitude of the cusp."),
});

export const sectSchema = z.looseObject({
  status: z.string().describe("Sect of the chart: 'day' or 'night'."),
  luminary_of_sect: z.string().describe("Sun (day) or Moon (night)."),
  sect_mate_planets: z.array(z.string()).describe("Planets of the same sect."),
  notes: z.string().describe("Sun-altitude basis for the verdict."),
});

export const lotSchema = z.looseObject({
  name: z.string().describe("Lot name, e.g. 'Lot of Fortune'."),
  sign: z.string().describe("Zodiac sign of the lot position."),
  degree: z.number().describe("Degree within the sign."),
  absolute_degree: z.number().describe("Absolute ecliptic longitude of the lot."),
  formula: z.string().describe("Lot formula as computed (day/night sect variant)."),
});

export const chartDataSchema = z.looseObject({
  house_system: houseSystemSchema
    .optional()
    .describe("House system; ABSENT when birth time is unknown (D-10)."),
  ascendant: angleSchema.optional().describe("Ascendant; absent when time is unknown."),
  midheaven: angleSchema.optional().describe("Midheaven (MC); absent when time is unknown."),
  house_cusps: z
    .array(houseCuspSchema)
    .optional()
    .describe("Twelve cusps; absent when time is unknown."),
  placements: z
    .array(placementSchema)
    .min(1)
    .describe("Every calculated body — always present, even without a birth time."),
  aspects: z
    .array(aspectSchema)
    .optional()
    .describe("Interplanetary aspects; no angle contacts when time is unknown."),
  sect: sectSchema.optional().describe("Sect analysis; absent when time is unknown."),
  lots: z.array(lotSchema).optional().describe("Hermetic lots; absent when time is unknown."),
  source_notes: z
    .string()
    .optional()
    .describe("Calculator prose provenance — audit trail; structured fields live alongside it."),
  birth_time_confidence: confidenceSchema.describe("Confidence echoed from the inputs."),
});

export const calculateProvenanceSchema = z.object({
  skill_revision: z
    .string()
    .describe("Git revision of the vendored astrology-skill submodule at request time."),
  swisseph_version: z.string().describe("Swiss Ephemeris version, e.g. '2.10.03'."),
  tzdata_version: z.string().describe("Locked IANA tzdata version, e.g. '2026.3'."),
  schema_version: z.string().describe("Vendored chart_input_schema identity."),
  ephemeris_mode: z.string().describe("Ephemeris mode, e.g. 'Moshier (built-in)'."),
  house_system: houseSystemSchema
    .describe("Requested house system (an input — recorded even for unknown-time charts)."),
  zodiac_mode: z.string().describe("Zodiac frame, e.g. 'tropical'."),
  orb_policy: z.string().describe("Documented orb policy label (assumptions line, D-12)."),
  input_revision: z
    .string()
    .describe("Stable id of the normalized calculation inputs (revision concept, CALC-03)."),
  calculator_cmd: z
    .string()
    .describe("The subprocess invocation shape used for this calculation."),
});

export const factorAvailabilitySchema = z.object({
  factor: z.string().describe("Unavailable factor id, e.g. 'houses', 'ascendant_mc', 'sect'."),
  reason: z.string().describe("Short why — rendered on the D-10 unavailable cards."),
});

export const provisionalFactorSchema = z.object({
  factor: z.string().describe("Provisional factor id, e.g. 'moon'."),
  reason: z.string().describe("Why the value is provisional (e.g. Moon moves ~13°/day)."),
});

export const calculateResponseSchema = z.object({
  reading_type: z.string().optional().describe("Calculator reading type, e.g. 'natal'."),
  chart_data: chartDataSchema.describe("The calculated chart facts (never interpretation)."),
  provenance: calculateProvenanceSchema.describe(
    "Structured machine-readable provenance block (CALC-03)."
  ),
  unavailable_factors: z
    .array(factorAvailabilitySchema)
    .optional()
    .describe("Time-dependent factors omitted for unknown birth times (D-10) — derived, not static."),
  provisional_factors: z
    .array(provisionalFactorSchema)
    .optional()
    .describe("Factors computed but flagged provisional (noon-reference Moon, approximate angles)."),
});

export type Placement = z.infer<typeof placementSchema>;
export type CalculateResponse = z.infer<typeof calculateResponseSchema>;
export type CalculateProvenance = z.infer<typeof calculateProvenanceSchema>;
export type FactorAvailability = z.infer<typeof factorAvailabilitySchema>;
export type ProvisionalFactor = z.infer<typeof provisionalFactorSchema>;

// ---------------------------------------------------------------------------
// GET /api/v1/meta/zones
// ---------------------------------------------------------------------------

export const zonesResponseSchema = z.object({
  zones: z
    .array(z.string())
    .min(1)
    .describe(
      "Sorted IANA zone identifiers from zoneinfo.available_timezones() — the manual " +
        "fallback picker never disagrees with server resolution."
    ),
});

export type ZonesResponse = z.infer<typeof zonesResponseSchema>;

// ---------------------------------------------------------------------------
// Error body (every 4xx/5xx response)
// ---------------------------------------------------------------------------

export const errorSchema = z.object({
  error: z.object({
    code: errorCodeSchema.describe("Machine-readable CALC-04 code."),
    message: z
      .string()
      .describe(
        "User-facing message; for CALC_INVALID_INPUT this is the calculator's " +
          "field-naming copy (already excellent, verified) — never raw stderr."
      ),
    recoverable: z
      .boolean()
      .describe("Whether the client can recover without code changes (retry, fix input, …)."),
    hint: z
      .string()
      .optional()
      .describe("Optional recovery guidance rendered by the error banner."),
  }),
});

export type ApiErrorBody = z.infer<typeof errorSchema>;
