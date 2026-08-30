import type { AngleWhich } from "@/lib/chart-wheel/geometry";

import { housePhrase, motionLabel } from "../copy";

/**
 * Explore copy deck (04-03 Task 1) — exact approved strings for the D-09
 * inline fact panel, the D-03 mini-wheel entry card, and the unsaved
 * save-to-explore path. Components never paraphrase these; tests assert
 * them exactly (T-02-34 deck law — every exported string is a label, a
 * template over calculated facts, or a structural marker).
 *
 * Sentence templates compose segments with the deck's filter idiom
 * (placementA11yLabel law): undefined segments render nothing — absent
 * envelope fields NEVER produce a dash placeholder (D-10 present-only
 * rule). `{…}` server-supplied values (names, orb degrees, reasons)
 * arrive from the calculate envelope and are embedded verbatim — never
 * reworded, never invented.
 *
 * A-UI-4 law: the caller passes the ONE degree split's formatted output
 * (`formatDegreeMinutes` from placement-list) as `degreeText`; the same
 * template string renders visually AND as the accessibilityLabel, so
 * visual and spoken facts cannot drift.
 *
 * Pure data module: no React, no react-native, no Skia imports — the
 * degree formatting itself lives in placement-list.tsx (the single
 * formatter; the deck stays plain-Node testable).
 */

// ---------------------------------------------------------------------------
// Mini-wheel entry card (D-03) + unsaved save-to-explore helper
// ---------------------------------------------------------------------------

/** Mini-wheel preview card title (result/saved screens, native only). */
export const EXPLORE_CARD_TITLE = "Chart wheel";

/** Card helper — what tapping the preview opens. */
export const EXPLORE_CARD_HELPER =
  "Open the interactive wheel and tap any factor for its exact facts.";

/**
 * Caption under the result screen's card while the chart is UNSAVED:
 * exploring requires a repository id, so the hint states the save step
 * before the user taps (the SavePrompt confirm stays the only write
 * trigger — PRIV-01).
 */
export const EXPLORE_CARD_SAVE_HINT = "Exploring saves this chart to your workspace first.";

// ---------------------------------------------------------------------------
// Fact panel (D-09)
// ---------------------------------------------------------------------------

/** Fact panel card label. */
export const FACT_PANEL_LABEL = "Chart facts";

/** Idle hint while no factor is selected. */
export const FACT_PANEL_IDLE =
  "Tap a planet, sign, house, angle, or aspect in the wheel to see its exact calculated facts.";

/**
 * Angle display names — keyed by the geometry module's AngleWhich ids,
 * never rendered as raw ids ("asc"/"ic").
 */
export const ANGLE_NAMES: Record<AngleWhich, string> = {
  asc: "Ascendant",
  dsc: "Descendant",
  mc: "Midheaven",
  ic: "IC",
};

/** Segment labels. */
export const DIGNITIES_LABEL = "Dignities";
export const BODIES_LABEL = "Bodies";
export const ORB_LABEL = "Orb";
export const APPLYING_LABEL = "Applying";
export const SEPARATING_LABEL = "Separating";
export const EXACT_ASPECT_LABEL = "Exact";
export const NOT_EXACT_ASPECT_LABEL = "Not exact";

/** Absolute-longitude fact — "{n}°" with the server value verbatim. */
export function absoluteDegreesPhrase(absoluteDegree: number): string {
  return `absolute ${absoluteDegree}°`;
}

// ---------------------------------------------------------------------------
// Per-kind sentence templates (visual + spoken share the same string)
// ---------------------------------------------------------------------------

/** Inputs to the planet sentence (degree already split-formatted). */
export interface PlanetFactInput {
  body: string;
  sign: string;
  /** formatDegreeMinutes(placement.degree) — the one degree split (A-UI-4). */
  degreeText: string;
  /** Omitted for Unknown-time placements (no house key — D-10). */
  house?: number;
  /** Raw calculator motion ("direct", …). */
  motion: string;
  /** Dignity labels; the segment renders only when non-empty. */
  dignities?: readonly string[];
  absoluteDegree: number;
}

/**
 * Planet sentence — "{body} in {sign} {D°MM′}, {House n}, {Motion} motion,
 * [Dignities: {list},] absolute {n}°". Every segment present-only.
 */
export function planetFactSentence(input: PlanetFactInput): string {
  return [
    `${input.body} in ${input.sign} ${input.degreeText}`,
    input.house !== undefined ? housePhrase(input.house) : undefined,
    `${motionLabel(input.motion)} motion`,
    input.dignities && input.dignities.length > 0
      ? `${DIGNITIES_LABEL}: ${input.dignities.join(", ")}`
      : undefined,
    absoluteDegreesPhrase(input.absoluteDegree),
  ]
    .filter((segment): segment is string => segment !== undefined)
    .join(", ");
}

/** Inputs to the angle sentence. */
export interface AngleFactInput {
  which: AngleWhich;
  sign: string;
  /** formatDegreeMinutes(degree) — the one degree split (A-UI-4). */
  degreeText: string;
}

/** Angle sentence — "{Ascendant|Descendant|Midheaven|IC} in {sign} {D°MM′}". */
export function angleFactSentence(input: AngleFactInput): string {
  return `${ANGLE_NAMES[input.which]} in ${input.sign} ${input.degreeText}`;
}

/** Inputs to the house sentence. */
export interface HouseFactInput {
  house: number;
  cuspSign: string;
  /** formatDegreeMinutes(cusp.degree) — the one degree split (A-UI-4). */
  cuspDegreeText: string;
  /** Bodies placed in this house, from the same envelope placements. */
  bodies: readonly string[];
}

/** House sentence — "House {n} — cusp {sign} {D°MM′}[, Bodies: {list}]". */
export function houseFactSentence(input: HouseFactInput): string {
  return [
    `${housePhrase(input.house)} — cusp ${input.cuspSign} ${input.cuspDegreeText}`,
    input.bodies.length > 0 ? `${BODIES_LABEL}: ${input.bodies.join(", ")}` : undefined,
  ]
    .filter((segment): segment is string => segment !== undefined)
    .join(", ");
}

/** Inputs to the sign sentence. */
export interface SignFactInput {
  sign: string;
  /** Bodies in this sign, from the same envelope placements. */
  bodies: readonly string[];
}

/** Sign sentence — "{sign}[ — Bodies: {list}]". */
export function signFactSentence(input: SignFactInput): string {
  return [
    input.sign,
    input.bodies.length > 0 ? `${BODIES_LABEL}: ${input.bodies.join(", ")}` : undefined,
  ]
    .filter((segment): segment is string => segment !== undefined)
    .join(" — ");
}

/** Inputs to the aspect sentence (presence flags, per the calculator contract). */
export interface AspectFactInput {
  bodyA: string;
  /** Aspect name verbatim from the envelope (lowercase calculator vocabulary). */
  aspect: string;
  bodyB: string;
  /** Orb in degrees — rendered verbatim with the degree sign. */
  orbDegrees: number;
  applying?: boolean;
  separating?: boolean;
  exact: boolean;
}

/**
 * Aspect sentence — "{a} {aspect} {b}, Orb: {n}°[, Applying|Separating],
 * Exact|Not exact". Applying/separating render only when the presence
 * flag exists (stationary contacts carry neither — calculator contract).
 */
export function aspectFactSentence(input: AspectFactInput): string {
  return [
    `${input.bodyA} ${input.aspect} ${input.bodyB}`,
    `${ORB_LABEL}: ${input.orbDegrees}°`,
    input.applying === true ? APPLYING_LABEL : undefined,
    input.separating === true ? SEPARATING_LABEL : undefined,
    input.exact ? EXACT_ASPECT_LABEL : NOT_EXACT_ASPECT_LABEL,
  ]
    .filter((segment): segment is string => segment !== undefined)
    .join(", ");
}

/**
 * The panel root's composed a11y label: the fact sentence plus the
 * provisional note (when present), joined with the deck's em-dash
 * idiom — the label equals the composed visible sentence (A-UI-4).
 */
export function factPanelA11yLabel(sentence: string, provisionalNote?: string): string {
  return [sentence, provisionalNote]
    .filter((segment): segment is string => segment !== undefined)
    .join(" — ");
}
