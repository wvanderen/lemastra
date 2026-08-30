/**
 * Per-kind visual tokens — the renderable half of the trust vocabulary
 * (D-14, EVID-01/A11Y-02).
 *
 * Tokens are SEMANTIC ROLES, not resolved colors: renderers map
 * `colorRole` values onto the themed Colors from
 * src/constants/theme.ts per scheme. Keeping roles here (instead of
 * hex values) keeps the module free of react-native imports —
 * plain-Node testable — while the renderer owns WCAG/contrast
 * resolution. Role names mirror the ThemeColor keys one-to-one; the
 * theme's documented contrast budgets (accent ≥5.5:1 light /
 * ≥9.5:1 dark; error ≥6.5:1 dark) apply wherever a role is resolved.
 *
 * A11Y-02 LAW (Pitfall 7): aspect families and the provisional-factor
 * treatment are differentiated by stroke pattern + weight (with text
 * redundancy via phrases.ts) — NEVER by hue alone. Every style object
 * in ASPECT_STYLE carries both fields; the suite asserts it.
 *
 * D-16 LAW: provisional factors get a DASHED outline marker on the
 * wheel (never color alone), with the "Provisional" label carrying the
 * same fact in text.
 *
 * Pure data module: no React, no react-native, no Skia imports.
 */

import type { EvidenceKind } from "./kinds";

// ---------------------------------------------------------------------------
// Aspect-family stroke tokens (A11Y-02)
// ---------------------------------------------------------------------------

/** Stroke patterns an aspect family may carry — the primary non-hue differentiator. */
export type StrokePattern = "solid" | "dashed" | "dotted";

/**
 * Accessible aspect styling: pattern + weight together. Hue may be
 * ADDED by renderers, but the (strokePattern, strokeWidth) pair is the
 * contract that survives color-blindness and monochrome output.
 */
export interface AspectStyleToken {
  readonly strokePattern: StrokePattern;
  readonly strokeWidth: number;
}

/**
 * Per-family aspect styling, keyed by the envelope's lowercase aspect
 * names (chart_input_schema: conjunction, sextile, square, trine,
 * opposition). Every (strokePattern, strokeWidth) pair is pairwise
 * distinct — the suite pins both presence and distinctness.
 *
 * Values deliberately mirror src/lib/chart-wheel/glyphs.ts ASPECT_STYLES
 * (the canvas-side map) so wheel and evidence surfaces stay visually
 * consistent; this map is the vocabulary-side contract under its own
 * strokePattern/strokeWidth naming.
 */
export const ASPECT_STYLE: Readonly<Record<string, AspectStyleToken>> = {
  conjunction: { strokePattern: "solid", strokeWidth: 2.2 },
  opposition: { strokePattern: "dashed", strokeWidth: 2.0 },
  trine: { strokePattern: "dashed", strokeWidth: 1.4 },
  square: { strokePattern: "solid", strokeWidth: 1.6 },
  sextile: { strokePattern: "dotted", strokeWidth: 1.2 },
} as const;

/**
 * Style for aspect names the vocabulary does not know (future server
 * families) — a benign solid hairline obeying the same both-fields law.
 */
export const DEFAULT_ASPECT_STYLE: AspectStyleToken = {
  strokePattern: "solid",
  strokeWidth: 0.9,
};

// ---------------------------------------------------------------------------
// Per-kind tokens
// ---------------------------------------------------------------------------

/**
 * Semantic color roles — mirror the ThemeColor keys in
 * src/constants/theme.ts (renderers resolve them to themed values;
 * the theme's WCAG contrast budgets govern the resolution).
 */
export type VocabularyColorRole =
  | "text"
  | "textSecondary"
  | "background"
  | "backgroundElement"
  | "backgroundSelected"
  | "accent"
  | "error";

/**
 * Calculated facts (the majority) render PLAIN — no badge, no marker
 * (D-13). The token exists so the kind→treatment mapping is total and
 * explicit, not so calculculated rows get decorated.
 */
export interface CalculatedToken {
  /** Plain render — the absence of a marker is the design (D-13). */
  readonly marker: "none";
  /** Base text role for fact values. */
  readonly colorRole: "text";
}

/**
 * Methodological judgments render as LABELED SECTIONS extending the
 * AssumptionsLine treatment (D-13): a card on the secondary surface
 * with a hairline border and a "Assumptions"-style label — never a
 * per-row badge on the facts themselves.
 */
export interface JudgmentToken {
  readonly treatment: "labeled-section";
  /** Secondary text — judgments are supporting context, not facts. */
  readonly colorRole: "textSecondary";
  readonly border: "hairline";
}

/**
 * Uncertainty keeps the UnavailableFactors/provisional CARD treatment
 * plus the D-16 on-wheel dashed outline marker (see PROVISIONAL_MARKER)
 * — dashed outline + "Provisional" text redundancy, never hue alone.
 */
export interface UncertaintyToken {
  readonly treatment: "card";
  /** Secondary text — caveats read as supporting context. */
  readonly colorRole: "textSecondary";
  readonly border: "hairline";
  /** D-16: the marker outline is DASHED — pattern, not color. */
  readonly outline: "dashed";
}

/**
 * The interpretation kind's token is DEFINED but marks itself
 * unrendered (D-15): Phase 6's reading surfaces join this vocabulary;
 * until then no renderer may style or draw the kind.
 */
export interface InterpretationToken {
  /** False until Phase 6 — the token-level D-15 seam. */
  readonly rendered: false;
  /**
   * Accent is RESERVED for Phase 6's interpretation surfaces (the
   * theme restricts accent to primary CTA/selected/link roles; the
   * reading callout is the one planned future use).
   */
  readonly colorRole: "accent";
}

/** Calculated-kind token (plain render, D-13). */
export const CALCULATED_TOKEN: CalculatedToken = {
  marker: "none",
  colorRole: "text",
} as const;

/** Judgment-kind token (AssumptionsLine-style labeled section, D-13). */
export const JUDGMENT_TOKEN: JudgmentToken = {
  treatment: "labeled-section",
  colorRole: "textSecondary",
  border: "hairline",
} as const;

/** Uncertainty-kind token (card treatment + dashed outline, D-16). */
export const UNCERTAINTY_TOKEN: UncertaintyToken = {
  treatment: "card",
  colorRole: "textSecondary",
  border: "hairline",
  outline: "dashed",
} as const;

/** Interpretation-kind token (defined, NOT rendered until Phase 6, D-15). */
export const INTERPRETATION_TOKEN: InterpretationToken = {
  rendered: false,
  colorRole: "accent",
} as const;

/** Token for every evidence kind, exactly once (keyed by EvidenceKind). */
export const EVIDENCE_KIND_TOKENS: Readonly<
  Record<EvidenceKind, CalculatedToken | JudgmentToken | UncertaintyToken | InterpretationToken>
> = {
  calculated: CALCULATED_TOKEN,
  judgment: JUDGMENT_TOKEN,
  interpretation: INTERPRETATION_TOKEN,
  uncertainty: UNCERTAINTY_TOKEN,
};

// ---------------------------------------------------------------------------
// D-16 provisional marker
// ---------------------------------------------------------------------------

/**
 * The on-wheel provisional-factor marker: a DASHED outline at a
 * readable weight, with the status stated in text (the
 * "Provisional" label via phrases.ts) — never hue alone (A11Y-02,
 * D-16). Wheels draw this around a provisional body's glyph/label;
 * the fact panel/list carries the textual same-fact sentence.
 */
export interface ProvisionalMarker {
  /** Dashed — the D-16 pattern differentiator. */
  readonly outline: "dashed";
  /** Outline stroke width at base size 720. */
  readonly strokeWidth: number;
  /** The text redundancy contract: the label phrase MUST also render. */
  readonly textRedundant: true;
}

/** The D-16 dashed-outline provisional marker. */
export const PROVISIONAL_MARKER: ProvisionalMarker = {
  outline: "dashed",
  strokeWidth: 1.0,
  textRedundant: true,
} as const;
