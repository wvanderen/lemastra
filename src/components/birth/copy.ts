import type { Confidence } from "@/lib/api-schemas";

/**
 * Birth-form copy deck (02-UI-SPEC §"Copy Deck", birth-form section).
 *
 * Exact approved strings for the D-09 confidence control and the D-11
 * assumptions control — em dashes and curly quotes included. Components
 * never paraphrase these; tests assert them exactly.
 *
 * The confidence option order is the copy-deck display order (Timed
 * default → Unknown last); every value is a member of the
 * confidenceSchema vocabulary (the calculator's capitalized labels).
 */

/** Section heading above the four-state control. */
export const CONFIDENCE_HEADING = "How well do you know your birth time?";

/** The four confidence states with their copy-deck helper text, in display order. */
export const CONFIDENCE_OPTIONS: ReadonlyArray<{
  value: Confidence;
  helper: string;
}> = [
  {
    value: "Timed",
    helper:
      "From a record — birth certificate, hospital paperwork, or a reliably remembered exact time.",
  },
  {
    value: "Approximate",
    helper:
      "Roughly known, like “around 7 in the morning”. Houses and angles are calculated but flagged provisional.",
  },
  {
    value: "Rectified",
    helper: "Estimated by an astrologer working backward from life events.",
  },
  {
    value: "Unknown",
    helper:
      "No time known. You'll get only what doesn't need a time — planets in signs. No houses or rising sign, and nothing is guessed.",
  },
];

/**
 * Helper the birth form swaps onto the (disabled, cleared) time field when
 * the confidence is Unknown (D-09 side effect — the form wires this in 02-06).
 */
export const UNKNOWN_TIME_FIELD_HELPER = "Not needed when the time is unknown.";

/** Collapsed disclosure header for the advanced section (D-11). */
export const ASSUMPTIONS_HEADER = "Assumptions & advanced";

/** Field label inside the expanded assumptions section. */
export const HOUSE_SYSTEM_LABEL = "House system";

/** Quadrant-failure helper — why Whole Sign is the default. */
export const HOUSE_SYSTEM_HELPER =
  "Whole Sign is the default and works everywhere, including extreme latitudes. Quadrant systems like Placidus can fail near the poles.";
