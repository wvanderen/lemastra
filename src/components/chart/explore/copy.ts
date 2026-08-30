import type { ExploreMode } from "@/hooks/use-explore-mode";
import type { AngleWhich } from "@/lib/chart-wheel/geometry";

import { housePhrase, motionLabel, spokenDegrees } from "../copy";

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
// Wheel zoom hint (04-05 Task 2, D-11) — rendered once near the canvas
// ---------------------------------------------------------------------------

/**
 * Zoom/pan affordance hint under the wheel canvas: states the D-11
 * inspection gestures (and that tap selection keeps working zoomed).
 */
export const WHEEL_ZOOM_HINT =
  "Pinch to zoom and drag to pan the wheel for a closer look at crowded areas.";

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

/**
 * Compact on-wheel angle markers (vendor chart_diagram.py convention) —
 * drawn at the geometry angle-label anchors where the hit circles live.
 */
export const ANGLE_MARKERS: Record<AngleWhich, string> = {
  asc: "AC",
  dsc: "DC",
  mc: "MC",
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

// ---------------------------------------------------------------------------
// Evidence list sections (04-04 Task 1) — WHEEL-04's table half
// ---------------------------------------------------------------------------

/** Houses section heading (renders only when the envelope carries cusps). */
export const HOUSES_HEADING = "Houses";

/** Aspects section heading (renders only when the envelope carries aspects). */
export const ASPECTS_HEADING = "Aspects";

/** Lots section heading — the D-06 Technical-only section, full depth. */
export const LOTS_HEADING = "Lots";

/** Sect section heading — the D-06 Technical-only section, full depth. */
export const SECT_HEADING = "Sect";

/** Sect status line — "{status} chart" with the server verdict verbatim. */
export function sectStatusPhrase(status: string): string {
  return `${status} chart`;
}

/** Sect card line label — the luminary of sect. */
export const SECT_LUMINARY_LABEL = "Luminary of sect";

/** Sect card line label — the planets of the same sect. */
export const SECT_MATES_LABEL = "Sect mates";

/** Visual orb phrase — "Orb: {n}°" (same template as the fact panel). */
export function orbVisualPhrase(orbDegrees: number): string {
  return `${ORB_LABEL}: ${orbDegrees}°`;
}

/** Spoken orb phrase — "Orb {n} degrees" (A-UI-4 spoken form). */
export function orbSpokenPhrase(orbDegrees: number): string {
  return `Orb ${orbDegrees} degrees`;
}

/** Inputs to the house-row a11y sentence (degree already split). */
export interface HouseRowA11yInput {
  house: number;
  cuspSign: string;
  degrees: number;
  minutes: number;
}

/** House-row sentence — "House {n} cusp in {sign}, {degree spoken}". */
export function houseRowA11yLabel(input: HouseRowA11yInput): string {
  return `House ${input.house} cusp in ${input.cuspSign}, ${spokenDegrees(
    input.degrees,
    input.minutes
  )}`;
}

/** Inputs to the aspect-row sentence (presence flags, calculator contract). */
export interface AspectRowA11yInput {
  bodyA: string;
  /** Aspect name verbatim from the envelope (lowercase calculator vocabulary). */
  aspect: string;
  bodyB: string;
  orbDegrees: number;
  applying?: boolean;
  separating?: boolean;
  exact: boolean;
}

/**
 * Aspect-row sentence — "{a} {aspect} {b}, Orb {n} degrees
 * [, Applying|Separating], Exact|Not exact". Applying/separating speak
 * only when the presence flag exists (stationary contacts carry
 * neither — calculator contract).
 */
export function aspectRowA11yLabel(input: AspectRowA11yInput): string {
  return [
    `${input.bodyA} ${input.aspect} ${input.bodyB}`,
    orbSpokenPhrase(input.orbDegrees),
    input.applying === true ? APPLYING_LABEL : undefined,
    input.separating === true ? SEPARATING_LABEL : undefined,
    input.exact ? EXACT_ASPECT_LABEL : NOT_EXACT_ASPECT_LABEL,
  ]
    .filter((segment): segment is string => segment !== undefined)
    .join(", ");
}

/** Inputs to the lot-row sentence (degree already split). */
export interface LotRowA11yInput {
  name: string;
  sign: string;
  degrees: number;
  minutes: number;
  /** Lot formula as computed (day/night sect variant) — verbatim. */
  formula: string;
}

/** Lot-row sentence — "{name} in {sign}, {degree spoken}, {formula verbatim}". */
export function lotRowA11yLabel(input: LotRowA11yInput): string {
  return `${input.name} in ${input.sign}, ${spokenDegrees(input.degrees, input.minutes)}, ${
    input.formula
  }`;
}

/** Inputs to the sect-card sentence — every envelope field. */
export interface SectCardA11yInput {
  /** Server sect verdict ("day" | "night") — verbatim. */
  status: string;
  luminary: string;
  sectMates: readonly string[];
  /** Sun-altitude basis for the verdict — verbatim. */
  notes: string;
}

/** Sect-card sentence — status, luminary, mates, notes; all fields, verbatim. */
export function sectCardA11yLabel(input: SectCardA11yInput): string {
  return [
    sectStatusPhrase(input.status),
    `${SECT_LUMINARY_LABEL}: ${input.luminary}`,
    `${SECT_MATES_LABEL}: ${input.sectMates.join(", ")}`,
    input.notes,
  ].join(", ");
}

// ---------------------------------------------------------------------------
// Global mode toggle + glossary (04-06 Task 1) — D-05/D-07/D-08
// ---------------------------------------------------------------------------

/** Toggle heading — the radiogroup's visible label. */
export const MODE_TOGGLE_HEADING = "View mode";

/** Simple option label — the D-06 plain-language mode. */
export const MODE_LABEL_SIMPLE = "Simple";

/** Technical option label — the D-06 full-precision mode. */
export const MODE_LABEL_TECHNICAL = "Technical";

/** The toggle's two segments, deck-ordered (Simple first — the D-07 default). */
export const MODE_OPTIONS: ReadonlyArray<{ value: ExploreMode; label: string }> = [
  { value: "simple", label: MODE_LABEL_SIMPLE },
  { value: "technical", label: MODE_LABEL_TECHNICAL },
];

/**
 * Glossary definitions (D-08) — copy-deck content, NEVER interpretation
 * (T-04-13): every entry is a static definition of a term (what the
 * word means), never a claim about the user's chart, and never a
 * template — no envelope value flows into a definition. The inventory
 * covers the envelope vocabulary the Simple-mode surfaces actually
 * render: the calculator's five aspect families, orb, retrograde
 * motion, and the ascendant.
 */
export const GLOSSARY: Readonly<Record<string, string>> = {
  conjunction: "Two planets at nearly the same zodiac position — about 0° apart.",
  sextile: "Two planets about 60° apart.",
  square: "Two planets about 90° apart.",
  trine: "Two planets about 120° apart.",
  opposition: "Two planets about 180° apart, on opposite sides of the wheel.",
  orb: "How far an aspect is from its exact angle, measured in degrees.",
  retrograde: "A planet appearing to move backwards through the zodiac, as seen from Earth.",
  ascendant: "The sign rising on the eastern horizon at the birth moment — the anchor of the first house.",
};

/** Deck-owned glossary term key the placement rows chip in Simple mode. */
export const GLOSSARY_TERM_RETROGRADE = "retrograde";

// ---------------------------------------------------------------------------
// Mode-keyed sentence templates (D-06) — Simple plain-language variants.
// Same inputs as the Technical templates (the SAME envelope fields flow
// in; only vocabulary and the D-06 hidden list differ — no second data
// path). Simple hides: absolute longitude, orb, applying/separating.
// ---------------------------------------------------------------------------

/**
 * Simple planet sentence — "{body} in {sign} at {D°MM′}[, in House n][,
 * moving {motion}][, {dignities}]". Same facts and the ONE degree
 * split as planetFactSentence; plain vocabulary, no absolute
 * longitude.
 */
export function planetFactSentenceSimple(input: PlanetFactInput): string {
  return [
    `${input.body} in ${input.sign} at ${input.degreeText}`,
    input.house !== undefined ? `in House ${input.house}` : undefined,
    `moving ${input.motion}`,
    input.dignities && input.dignities.length > 0 ? input.dignities.join(", ") : undefined,
  ]
    .filter((segment): segment is string => segment !== undefined)
    .join(", ");
}

/** Simple angle sentence — "{name} in {sign} at {D°MM′}". */
export function angleFactSentenceSimple(input: AngleFactInput): string {
  return `${ANGLE_NAMES[input.which]} in ${input.sign} at ${input.degreeText}`;
}

/**
 * Simple house sentence — "House {n} starts in {sign} at {D°MM′}[,
 * In this house: {bodies}]" — no "cusp" vocabulary.
 */
export function houseFactSentenceSimple(input: HouseFactInput): string {
  return [
    `House ${input.house} starts in ${input.cuspSign} at ${input.cuspDegreeText}`,
    input.bodies.length > 0 ? `In this house: ${input.bodies.join(", ")}` : undefined,
  ]
    .filter((segment): segment is string => segment !== undefined)
    .join(", ");
}

/** Simple sign sentence — "{sign}[ — In this sign: {bodies}]". */
export function signFactSentenceSimple(input: SignFactInput): string {
  return [
    input.sign,
    input.bodies.length > 0 ? `In this sign: ${input.bodies.join(", ")}` : undefined,
  ]
    .filter((segment): segment is string => segment !== undefined)
    .join(" — ");
}

/**
 * Simple aspect sentence — "{a} {aspect} {b}, Exact|Not exact". The
 * aspect name stays VERBATIM from the envelope (rewording it would be
 * interpretation-adjacent and break the same-data-path law, T-04-12);
 * the glossary chip explains the term instead. Orb, applying, and
 * separating are the D-06 hidden fields.
 */
export function aspectFactSentenceSimple(input: AspectFactInput): string {
  return [
    `${input.bodyA} ${input.aspect} ${input.bodyB}`,
    input.exact ? EXACT_ASPECT_LABEL : NOT_EXACT_ASPECT_LABEL,
  ].join(", ");
}

/** Simple house-row sentence — "House {n} starts in {sign}, {degree spoken}". */
export function houseRowA11yLabelSimple(input: HouseRowA11yInput): string {
  return `House ${input.house} starts in ${input.cuspSign}, ${spokenDegrees(
    input.degrees,
    input.minutes
  )}`;
}

/**
 * Simple aspect-row sentence — "{a} {aspect} {b}, Exact|Not exact" —
 * no orb / applying / separating (D-06 hidden list).
 */
export function aspectRowA11yLabelSimple(input: AspectRowA11yInput): string {
  return [
    `${input.bodyA} ${input.aspect} ${input.bodyB}`,
    input.exact ? EXACT_ASPECT_LABEL : NOT_EXACT_ASPECT_LABEL,
  ].join(", ");
}
