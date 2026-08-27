import type { Confidence } from "@/lib/api-schemas";

/**
 * Chart result-screen copy deck (02-UI-SPEC §"Copy Deck", result-screen
 * section).
 *
 * Exact approved strings for the D-13 placement list, the D-12 assumptions
 * card, the CALC-03 provenance disclosure, and the D-10 unavailable /
 * provisional factor cards. Components never paraphrase these; tests
 * assert them exactly. `{…}` server-supplied values (placements,
 * provenance, factor reasons) arrive from the calculate envelope and are
 * rendered verbatim — never reworded, never invented (trust-boundary
 * display rules).
 *
 * Interpretation prose is FORBIDDEN here by construction (T-02-34): every
 * exported string is a label, a template over calculated facts, or a
 * structural marker.
 */

/** Placements section heading. */
export const PLACEMENTS_HEADING = "Placements";

/** House slot text — "{n}" from the placement's house key. */
export function housePhrase(house: number): string {
  return `House ${house}`;
}

/**
 * Motion display label — capitalized calculator vocabulary
 * ("direct" → "Direct"; likewise Retrograde / Stationary).
 */
export function motionLabel(motion: string): string {
  return motion.charAt(0).toUpperCase() + motion.slice(1);
}

/** Spoken degree form — "X degrees Y minutes" (A-UI-4 screen-reader copy). */
export function spokenDegrees(degrees: number, minutes: number): string {
  return `${degrees} degrees ${minutes} minutes`;
}

/** Inputs to the per-row a11y sentence (already split degrees/minutes). */
export interface PlacementA11yInput {
  body: string;
  sign: string;
  degrees: number;
  minutes: number;
  /** Omitted for Unknown-time placements (no house key — D-10). */
  house?: number;
  /** Raw calculator motion ("direct", …). */
  motion: string;
  /** Dignity labels; the suffix renders only when non-empty. */
  dignities?: readonly string[];
}

/**
 * Copy-deck row sentence (T-02-36): "{body} in {sign}, {degree spoken as
 * "X degrees Y minutes"}, {house phrase}, {motion} motion" — plus
 * ", {dignities}" when dignities exist. Screen-reader users get the same
 * facts as the visual layout.
 */
export function placementA11yLabel(input: PlacementA11yInput): string {
  const segments = [
    `${input.body} in ${input.sign}`,
    spokenDegrees(input.degrees, input.minutes),
    input.house !== undefined ? housePhrase(input.house) : undefined,
    `${motionLabel(input.motion)} motion`,
  ].filter((segment): segment is string => segment !== undefined);
  if (input.dignities && input.dignities.length > 0) {
    segments.push(input.dignities.join(", "));
  }
  return segments.join(", ");
}

// ---------------------------------------------------------------------------
// D-12 compact assumptions card
// ---------------------------------------------------------------------------

/** Assumptions card label. */
export const ASSUMPTIONS_LABEL = "Assumptions";

/** Assumptions value — "{house_system} houses · {zodiac_mode} zodiac · {ephemeris_mode} ephemeris · {orb_policy}". */
export function assumptionsValue(
  houseSystem: string,
  zodiacMode: string,
  ephemerisMode: string,
  orbPolicy: string
): string {
  return `${houseSystem} houses · ${zodiacMode} zodiac · ${ephemerisMode} ephemeris · ${orbPolicy}`;
}

/** Adjust action — returns to /birth with the advanced control open. */
export const ASSUMPTIONS_ADJUST_ACTION = "Adjust & recalculate";

/** Approximate-confidence caveat appended to the assumptions card. */
export const ASSUMPTIONS_APPROXIMATE_CAVEAT =
  "Angles and houses are provisional for approximate times.";

/** The confidences whose envelope carries provisional factors (D-10). */
export const PROVISIONAL_CONFIDENCES: readonly Confidence[] = ["Approximate", "Unknown"];

// ---------------------------------------------------------------------------
// CALC-03 expandable "Calculation details" disclosure
// ---------------------------------------------------------------------------

/** Disclosure header (collapsed by default — progressive disclosure). */
export const CALCULATION_DETAILS_HEADER = "Calculation details";

/** Provenance row labels — the seven-row version chain (02-UI-SPEC). */
export const PROVENANCE_LABEL_SKILL_REVISION = "Skill revision";
export const PROVENANCE_LABEL_SWISSEPH = "Swiss Ephemeris version";
export const PROVENANCE_LABEL_TZDATA = "Timezone database";
export const PROVENANCE_LABEL_SCHEMA = "Schema";
export const PROVENANCE_LABEL_INPUT_REVISION = "Input revision";
export const PROVENANCE_LABEL_PLACE_RESOLUTION = "Place resolution";
export const PROVENANCE_LABEL_CALCULATOR_CMD = "Calculator command";

/**
 * Place-resolution row value — zone source + provider of record.
 *
 * The google branch renders the locked registry provider id
 * (`google-geocoding-timezone`, the Phase-1 provider vocabulary — a
 * machine identifier, not disclosure prose); the manual branch records
 * that the user entered the zone (no external provider was consulted).
 */
export function placeResolutionValue(zoneSource: "google" | "manual"): string {
  return zoneSource === "google"
    ? "google · google-geocoding-timezone"
    : "manual · user-entered zone";
}

// ---------------------------------------------------------------------------
// D-10 unavailable + provisional factor cards
// ---------------------------------------------------------------------------

/** Unavailable-factors section heading (Unknown mode only). */
export const UNAVAILABLE_HEADING = "Not available without a birth time";

/** Label on each provisional factor card. */
export const PROVISIONAL_LABEL = "Provisional";

/**
 * Server factor ids → copy-deck display names. Unknown ids (future server
 * factors) fall back to the raw id — never an invented label (D-10).
 */
const FACTOR_LABELS: Readonly<Record<string, string>> = {
  houses: "Houses",
  ascendant_mc: "Rising sign & Midheaven",
  sect: "Sect",
  lots: "Lots",
  moon: "Moon",
  angles_houses: "Angles & houses",
};

/** Display name for a server factor id. */
export function factorLabel(factor: string): string {
  return FACTOR_LABELS[factor] ?? factor;
}

/** Unavailable card text — "{Factor} — {reason}" (reason verbatim). */
export function factorCardText(factor: string, reason: string): string {
  return `${factorLabel(factor)} — ${reason}`;
}

/** Provisional card text — "{factor} — {reason}" (reason verbatim). */
export function provisionalCardText(factor: string, reason: string): string {
  return `${factorLabel(factor)} — ${reason}`;
}
