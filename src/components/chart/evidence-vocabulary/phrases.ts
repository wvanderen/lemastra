/**
 * Evidence-vocabulary copy and a11y phrasing (D-14/D-15, EVID-01).
 *
 * This module JOINS the chart copy-deck law (src/components/chart/copy.ts):
 * exact approved strings as SCREAMING_SNAKE constants, pure template
 * functions composing sentence segments, undefined segments filtered
 * (the `.filter((s): s is string => …)` idiom from placementA11yLabel),
 * and `{…}` server-supplied values embedded VERBATIM — never reworded,
 * never invented (trust-boundary display rules). Where a phrase already
 * exists in the deck (Assumptions label, UnavailableFactors cards,
 * factor display names) this module reuses the deck's definition site
 * instead of duplicating it — the vocabulary joins the deck, not a
 * parallel system.
 *
 * Phrasing for the INTERPRETATION kind is defined here so Phase 6's
 * reading output joins an existing vocabulary — but nothing renders
 * that kind before Phase 6 (D-15): `INTERPRETATION_NOT_RENDERED` is
 * the explicit marker, and kinds.renderableEvidenceKinds excludes the
 * kind.
 *
 * Interpretation prose is FORBIDDEN here by construction (T-02-34
 * extension): every exported string is a label or a template over
 * calculated facts / server-supplied reasons.
 *
 * Pure data module: no React, no react-native, no Skia imports, zero
 * component imports.
 */

import {
  ASSUMPTIONS_LABEL,
  PROVISIONAL_LABEL,
  UNAVAILABLE_HEADING,
  factorLabel,
} from "../copy";

// ---------------------------------------------------------------------------
// Calculated (plain render — D-13)
// ---------------------------------------------------------------------------

/**
 * Calculated-fact sentence — "{label}: {value}" with both parts
 * rendered verbatim. No badge, no marker: calculated facts are the
 * plain majority (D-13).
 */
export function calculatedFactPhrase(label: string, value: string): string {
  return `${label}: ${value}`;
}

// ---------------------------------------------------------------------------
// Judgment (extends the AssumptionsLine section vocabulary — D-13)
// ---------------------------------------------------------------------------

/**
 * Judgment-section label — the SAME "Assumptions" vocabulary the
 * AssumptionsLine card renders (one definition site: re-exported from
 * the deck, never duplicated).
 */
export const JUDGMENT_SECTION_LABEL = ASSUMPTIONS_LABEL;

/**
 * Judgment-section a11y phrasing — "{Assumptions}: {value}" where
 * value is the deck's assumptions-style summary ("{house_system}
 * houses · {zodiac_mode} zodiac · …") embedded verbatim.
 */
export function judgmentSectionA11yLabel(value: string): string {
  return `${JUDGMENT_SECTION_LABEL}: ${value}`;
}

// ---------------------------------------------------------------------------
// Uncertainty (extends UnavailableFactors / provisional vocabulary — D-16)
// ---------------------------------------------------------------------------

/**
 * Unavailable-factors heading — the deck's exact "Not available
 * without a birth time" string (one definition site).
 */
export const UNCERTAINTY_UNAVAILABLE_HEADING = UNAVAILABLE_HEADING;

/**
 * Provisional label — the deck's exact "Provisional" string (one
 * definition site).
 */
export const UNCERTAINTY_PROVISIONAL_LABEL = PROVISIONAL_LABEL;

/**
 * Unavailable-card phrase — "{Factor} — {reason}" with the deck's
 * factor display-name mapping (unknown server ids fall back to the
 * raw id — never an invented label) and the server reason verbatim.
 */
export function unavailableFactorPhrase(factor: string, reason: string): string {
  return `${factorLabel(factor)} — ${reason}`;
}

/**
 * Provisional-card phrase — "{Factor} — {reason}", same law as
 * {@link unavailableFactorPhrase}: display name via the deck, reason
 * verbatim.
 */
export function provisionalFactorPhrase(factor: string, reason: string): string {
  return `${factorLabel(factor)} — ${reason}`;
}

/** Inputs to the D-16 on-wheel marker's spoken sentence. */
export interface ProvisionalMarkerA11yInput {
  /** Server factor id (resolved through the deck's display names). */
  factor: string;
  /** Optional server reason — omitted segments render nothing. */
  reason?: string;
}

/**
 * D-16 text redundancy for the on-wheel dashed outline: the spoken
 * form states provisional status ("Provisional: {Factor}") plus the
 * reason when present — composed with the deck's segment-filter
 * idiom (placementA11yLabel law: visual and spoken facts agree).
 */
export function provisionalMarkerA11yPhrase(
  input: ProvisionalMarkerA11yInput
): string {
  return [
    `${UNCERTAINTY_PROVISIONAL_LABEL}: ${factorLabel(input.factor)}`,
    input.reason,
  ]
    .filter((segment): segment is string => segment !== undefined)
    .join(" — ");
}

// ---------------------------------------------------------------------------
// Interpretation (DEFINED, NOT RENDERED until Phase 6 — D-15)
// ---------------------------------------------------------------------------

/**
 * Explicit not-rendered marker for the interpretation kind: the
 * phrasing below exists so Phase 6 joins an existing vocabulary;
 * NOTHING may render the kind before then. Pair with
 * kinds.renderableEvidenceKinds (which excludes the kind) — the test
 * suite pins both.
 */
export const INTERPRETATION_NOT_RENDERED =
  "interpretation:not-rendered-until-phase-6" as const;

/** Interpretation-section label (Phase 6+ surfaces only). */
export const INTERPRETATION_SECTION_LABEL = "Interpretation";

/**
 * Interpretation-section a11y phrasing — "{Interpretation}: {value}".
 * DEFINED for Phase 6; no current consumer renders it (D-15).
 */
export function interpretationSectionA11yLabel(value: string): string {
  return `${INTERPRETATION_SECTION_LABEL}: ${value}`;
}
