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

// ---------------------------------------------------------------------------
// Place search & manual fallback (D-05) — 02-UI-SPEC §"Copy Deck", place rows
// ---------------------------------------------------------------------------

/** Field label above the type-ahead / manual place entry. */
export const PLACE_LABEL = "Birthplace";

/** Type-ahead placeholder. */
export const PLACE_SEARCH_PLACEHOLDER = "City or town (e.g. Lisbon)";

/** Loading state while the debounced query is in flight. */
export const PLACE_SEARCHING = "Searching…";

/** Empty state, before 3 characters are typed. */
export const PLACE_EMPTY_HEADING = "Search for your birthplace";

/** Empty state body. */
export const PLACE_EMPTY_BODY =
  "Type at least 3 letters — a city or town works best. You can also enter coordinates manually.";

/** Precision note under a selected approximate candidate. */
export const PLACE_APPROXIMATE_NOTE = "Approximate match — verify before calculating.";

/** Action that clears a resolved candidate back to the search list. */
export const PLACE_CHANGE_ACTION = "Change";

/** Persistent toggle into the manual branch (also the zero/unavailable action). */
export const PLACE_MANUAL_ACTION = "Enter coordinates manually";

/** Toggle back into the search branch. */
export const PLACE_SEARCH_INSTEAD_ACTION = "Search by name instead";

/** Manual-branch place-name placeholder. */
export const PLACE_NAME_PLACEHOLDER = "For reference on your chart";

/** Manual-branch latitude label. */
export const LATITUDE_LABEL = "Latitude";

/** Manual-branch latitude error (−90..90 — U+2212 minus, exact deck copy). */
export const LATITUDE_ERROR = "Enter a number between −90 and 90.";

/** Manual-branch longitude label. */
export const LONGITUDE_LABEL = "Longitude";

/** Manual-branch longitude error (−180..180 — U+2212 minus, exact deck copy). */
export const LONGITUDE_ERROR = "Enter a number between −180 and 180.";

/** Manual-branch zone picker label. */
export const TIME_ZONE_LABEL = "Time zone";

/** Manual-branch zone-required error. */
export const TIME_ZONE_ERROR = "Choose a time zone.";

/**
 * Zone-picker filter placeholder — functional copy; the copy deck specifies
 * "Time zone (searchable picker from /api/v1/meta/zones)" without a filter
 * string.
 */
export const TIME_ZONE_SEARCH_PLACEHOLDER = "Search time zones";

// ---------------------------------------------------------------------------
// Home screen — 02-UI-SPEC §"Copy Deck", Home (`/`) section
// ---------------------------------------------------------------------------

/** Home heading. */
export const HOME_HEADING = "LemAstra";

/** Home sub-line (Label). */
export const HOME_SUBLINE = "Accurate charts. Transparent evidence.";

/** Home primary CTA into the birth flow. */
export const HOME_CTA = "Calculate your first chart";

/** Privacy link label (home + birth form footer). */
export const PRIVACY_LINK = "See what we send — privacy & data";

// ---------------------------------------------------------------------------
// Birth form screen — 02-UI-SPEC §"Copy Deck", Birth form (/birth) section
// ---------------------------------------------------------------------------

/** Birth screen title. */
export const BIRTH_FORM_TITLE = "Birth details";

/** Date field label. */
export const BIRTH_DATE_LABEL = "Birth date";

/** Date field placeholder (formatted text input per A-UI-6). */
export const BIRTH_DATE_PLACEHOLDER = "YYYY-MM-DD";

/** Date field error — empty, malformed, and nonexistent-calendar dates alike. */
export const BIRTH_DATE_ERROR = "Enter a valid date (YYYY-MM-DD).";

/** Time field label. */
export const BIRTH_TIME_LABEL = "Birth time";

/** Time field placeholder (formatted text input per A-UI-6). */
export const BIRTH_TIME_PLACEHOLDER = "HH:MM (24-hour)";

/** Time field error — the copy deck names both the colon and colon-less forms. */
export const BIRTH_TIME_ERROR = "Enter a valid time, like 09:30 or 1430.";

/** Form CTA — runs zod validation, then the resolve-time call. */
export const BIRTH_FORM_CTA = "Review birth details";
