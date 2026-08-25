import type { ErrorCode, HouseSystem } from "@/lib/api-schemas";

/**
 * Error-banner copy deck (02-UI-SPEC §"Error banners") — the CALC-04 client
 * rendering vocabulary.
 *
 * Every heading/body/hint/action string is the exact approved copy, keyed by
 * the validated `error_code` from `src/lib/api-schemas.ts` (which must equal
 * `api/lemastra_api/errors.py`). Components never paraphrase these strings;
 * tests assert them exactly.
 *
 * Trust boundary (T-02-18): banner text comes from THIS module, never from
 * the server response — the only pass-through is the CALC_INVALID_INPUT
 * `message`, which the calculator already renders as user-facing field copy
 * (verified in 02-03). Raw stderr/tracebacks never reach the UI.
 */

/** Copy for one banner. `heading` is always present; the rest are optional. */
export interface ErrorBannerCopy {
  heading: string;
  body?: string;
  hint?: string;
  /** Recovery action label; rendered only when the banner receives an `onAction`. */
  action?: string;
}

/** Server/client-supplied values interpolated into copy-deck templates. */
export interface ErrorCopyValues {
  /** The user's place query — fills the PLACE_ZERO_RESULTS heading. */
  query?: string;
  /** The requested house system — fills the CALC_UNSUITABLE_HOUSE_SYSTEM heading. */
  houseSystem?: HouseSystem;
}

/** Network / API-unreachable fallback (rendered when no recognized code is present). */
export const NETWORK_ERROR_COPY: ErrorBannerCopy = {
  heading: "Can't reach the calculation service.",
  body: "Check your connection and try again.",
};

/**
 * Copy for a validated error code. Template values degrade gracefully when
 * the caller cannot supply them (the copy deck's canonical usage always has
 * them: the birth form knows the query, the result flow knows the house system).
 */
export function errorBannerCopy(code: ErrorCode, values: ErrorCopyValues = {}): ErrorBannerCopy {
  switch (code) {
    case "PLACE_ZERO_RESULTS":
      return {
        heading: values.query ? `No match found for “${values.query}”.` : "No match found.",
        hint: "Try a nearby city or a larger place name.",
        action: "Enter coordinates manually",
      };
    case "PLACE_PROVIDER_UNAVAILABLE":
    case "TIMEZONE_PROVIDER_UNAVAILABLE":
      return {
        heading: "Place search is unavailable right now.",
        hint: "Check your connection and try again.",
        action: "Enter coordinates manually",
      };
    case "TIMEZONE_NO_RESULTS":
      return {
        heading: "We couldn't resolve a time zone for these coordinates.",
        hint: "Pick the time zone manually below.",
      };
    case "PLACE_INVALID_QUERY":
    case "TIMEZONE_INVALID_ZONE":
      return {
        heading: "That search couldn't be processed.",
        hint: "Shorten the query and try again.",
      };
    case "CALC_INVALID_INPUT":
      return {
        heading: "Birth details couldn't be processed.",
        body: "Fix the highlighted field and try again.",
      };
    case "CALC_UNSUITABLE_HOUSE_SYSTEM":
      return {
        heading: values.houseSystem
          ? `${values.houseSystem} houses can't be calculated for this location.`
          : "This house system can't be calculated for this location.",
        body: "Switch to Whole Sign or Equal houses under Assumptions, then calculate again.",
        action: "Open Assumptions",
      };
    case "CALC_TIMEOUT":
      return {
        heading: "Calculation timed out.",
        body: "Try again — this is usually temporary.",
        action: "Try again",
      };
    case "CALC_ENGINE_ERROR":
      return {
        heading: "Calculation failed.",
        body: "Try again. If it keeps failing, your details are fine — this is on our side.",
        action: "Try again",
      };
    case "CALC_VALIDATION_FAILED":
      return {
        heading: "The service returned a chart that failed validation.",
        body: "Nothing is wrong with your input. Please try again; if it persists, wait for a fix.",
      };
  }
}
