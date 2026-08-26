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

// ---------------------------------------------------------------------------
// Tricky-time picker (D-08) — 02-UI-SPEC §"Copy Deck", Tricky-time picker
// ---------------------------------------------------------------------------

/** Ambiguous (fall-back overlap) heading. */
export const TRICKY_TIME_AMBIGUOUS_HEADING = "This time happened twice";

/** Ambiguous body — {date}/{iana_zone}/{time} interpolated from the draft. */
export function trickyTimeAmbiguousBody(date: string, ianaZone: string, time: string): string {
  return `On ${date}, clocks fell back in ${ianaZone}, so ${time} occurred twice. Which one is your birth time?`;
}

/** Nonexistent (spring-forward gap) heading. */
export const TRICKY_TIME_NONEXISTENT_HEADING = "This time didn't exist";

/** Nonexistent body — {date}/{iana_zone}/{time} interpolated from the draft. */
export function trickyTimeNonexistentBody(date: string, ianaZone: string, time: string): string {
  return `On ${date}, clocks sprung forward in ${ianaZone}, so ${time} never happened.`;
}

/** Picker footnote (both cases) — the never-silent-choice promise. */
export const TRICKY_TIME_FOOTNOTE = "We never pick for you — ambiguous times change the chart.";

/** Required-choice helper — visible while no option is selected. */
export const TRICKY_TIME_CHOICE_REQUIRED = "Choose a time above to continue";

/** Helper under the first-pass option card. */
export const TRICKY_TIME_FIRST_HELPER = "Before the clocks changed";

/** Helper under the second-pass option card. */
export const TRICKY_TIME_SECOND_HELPER = "After the clocks changed";

// ---------------------------------------------------------------------------
// One-time calculation disclosure (D-04) — 02-UI-SPEC §"Copy Deck" section
// ---------------------------------------------------------------------------

/** Disclosure intercept heading. */
export const DISCLOSURE_HEADING = "Before your first calculation";

/** Disclosure intro — provider facts below come from the registry itself. */
export const DISCLOSURE_INTRO =
  "Here's exactly what leaves your device, where it goes, and for how long — from our privacy registry:";

/** Disclosure acknowledgement CTA — persists the v1 flag and proceeds. */
export const DISCLOSURE_CTA = "Got it — Calculate chart";

/** Link to the full privacy screen. */
export const DISCLOSURE_PRIVACY_LINK = "Read full privacy details";

// ---------------------------------------------------------------------------
// Confirm screen (/birth/confirm) — 02-UI-SPEC §"Copy Deck" section
// ---------------------------------------------------------------------------

/** Confirm screen title. */
export const CONFIRM_TITLE = "Confirm birth details";

/** Resolved-card field label — the place label. */
export const CONFIRM_BIRTHPLACE_LABEL = "Birthplace";

/** Resolved-card field label — the coordinates (Data mono value). */
export const CONFIRM_COORDINATES_LABEL = "Coordinates";

/** Resolved-card field label — the IANA zone (Data mono value). */
export const CONFIRM_TIME_ZONE_LABEL = "Time zone";

/** Resolved-card field label — the locally-resolved historical offset (D-06). */
export const CONFIRM_OFFSET_LABEL_LABEL = "UTC offset at birth";

/** Coordinates value — "{lat}°, {lon}°". */
export function confirmCoordinates(lat: number, lon: number): string {
  return `${lat}°, ${lon}°`;
}

/** Offset value — "{offset_label} ({timeZoneName})"; bare label when manual/null. */
export function confirmOffsetValue(offsetLabel: string, timeZoneName?: string | null): string {
  return timeZoneName ? `${offsetLabel} (${timeZoneName})` : offsetLabel;
}

/** Drift note — only rendered when the resolve payload says drift: true. */
export const DRIFT_NOTE =
  "Note: Google's current-rules offset differs from the historical record for this date. We used the historical one.";

/** Zone-source note — Google server-side resolution (D-07). */
export const ZONE_SOURCE_GOOGLE = "Time zone resolved via Google (server-side)";

/** Zone-source note — manual tz_override entry (D-05). */
export const ZONE_SOURCE_MANUAL = "Time zone entered manually";

/** Birth summary line — "{date} · {time} · {confidence}"; empty time is omitted (Unknown). */
export function confirmBirthSummary(date: string, time: string, confidence: string): string {
  return [date, time, confidence].filter((segment) => segment.length > 0).join(" · ");
}

/** Confirm CTA — runs the calculate mutation (behind the D-04 first-run intercept). */
export const CONFIRM_CTA = "Calculate chart";

/** In-flight CTA label (calculating state). */
export const CONFIRM_CALCULATING = "Calculating chart…";

/** Back link — returns to /birth with the draft intact. */
export const CONFIRM_BACK_LINK = "Edit birth details";

// ---------------------------------------------------------------------------
// Result screen (/chart/result, minimal) — 02-UI-SPEC §"Copy Deck" section
// (placements/provenance/unavailable sections are 02-09 scope; only the
// strings the minimal screen renders live here for now)
// ---------------------------------------------------------------------------

/** Result screen title (Display). */
export const RESULT_TITLE = "Your natal chart";

/** Identity line input — date/time/label with the envelope's confidence. */
export interface ResultIdentity {
  date: string;
  time: string;
  label: string;
}

/** Identity line — "{date} · {time} · {label} · {confidence}"; Unknown omits the time slot. */
export function resultIdentityLine(
  identity: ResultIdentity,
  confidence: string
): string {
  return [identity.date, identity.time, identity.label, confidence]
    .filter((segment) => segment.length > 0)
    .join(" · ");
}

/** Validation-status line — schema gate the envelope already passed. */
export function resultValidationStatus(schemaVersion: string): string {
  return `Validated — passed chart schema ${schemaVersion}`;
}
