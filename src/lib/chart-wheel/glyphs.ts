/**
 * Wheel glyph and aspect-style vocabularies (04-01 Task 3).
 *
 * Ported verbatim from vendor/astrology-skill/tools/chart_diagram.py
 * lines 43–104 — the keys are the calculator's EXACT envelope strings
 * (body/sign/aspect names), so a placement from the stored envelope
 * always finds its glyph without client-side re-derivation.
 *
 * Two deliberate adaptations beyond the vendor:
 * - FALLBACK maps give every key a text abbreviation — the A1 tofu path
 *   (Pitfall 4): if a device font lacks a Unicode astrological glyph
 *   (Node/Chiron/Lilith coverage is uncertain on Android), the renderer
 *   degrades that slot to text instead of □.
 * - ASPECT_STYLES replaces the vendor's hue-only ASPECT_COLORS with a
 *   (stroke pattern, strokeWidth) pair per family — color is never the
 *   only differentiator (A11Y-02, Pitfall 7). Renderers may still tint
 *   per family; the pattern/weight pair is the accessible contract.
 *
 * Pure data module: no React, no react-native, no Skia imports.
 */

/** Zodiac signs in order — absolute longitude of sign i spans [i·30, (i+1)·30). */
export const SIGN_ORDER = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

export type SignName = (typeof SIGN_ORDER)[number];

/** Sign glyphs (U+2648–2653), keyed by the envelope's sign strings. */
export const SIGN_GLYPHS: Record<SignName, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓",
};

/** Text abbreviations for signs (A1 tofu fallback). */
export const SIGN_FALLBACKS: Record<SignName, string> = {
  Aries: "Ari",
  Taurus: "Tau",
  Gemini: "Gem",
  Cancer: "Can",
  Leo: "Leo",
  Virgo: "Vir",
  Libra: "Lib",
  Scorpio: "Sco",
  Sagittarius: "Sag",
  Capricorn: "Cap",
  Aquarius: "Aqu",
  Pisces: "Pis",
};

/** Chart bodies in the vendor's canonical order (Sun..Pluto, nodes, Chiron, Lilith). */
export const PLANET_ORDER = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "True Node",
  "North Node",
  "South Node",
  "Chiron",
  "Lilith",
] as const;

export type BodyName = (typeof PLANET_ORDER)[number];

/** Body glyphs (U+260A–26B8 range), keyed by the envelope's body strings. */
export const PLANET_GLYPHS: Record<BodyName, string> = {
  Sun: "☉",
  Moon: "☽",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "♅",
  Neptune: "♆",
  Pluto: "♇",
  "True Node": "☊",
  "North Node": "☊",
  "South Node": "☋",
  Chiron: "⚷",
  Lilith: "⚸",
};

/** Text abbreviations for bodies (A1 tofu fallback). */
export const PLANET_FALLBACKS: Record<BodyName, string> = {
  Sun: "Su",
  Moon: "Mo",
  Mercury: "Me",
  Venus: "Ve",
  Mars: "Ma",
  Jupiter: "Ju",
  Saturn: "Sa",
  Uranus: "Ur",
  Neptune: "Ne",
  Pluto: "Pl",
  "True Node": "TN",
  "North Node": "NN",
  "South Node": "SN",
  Chiron: "Ch",
  Lilith: "Li",
};

/** Stroke patterns an aspect family may carry — dash arrays are renderer-side. */
export type AspectStrokePattern = "solid" | "dashed" | "dotted";

export interface AspectStyle {
  /** Dash treatment — the primary non-hue differentiator (A11Y-02). */
  pattern: AspectStrokePattern;
  /** Stroke width at base size 720 — the secondary differentiator. */
  strokeWidth: number;
}

/**
 * Per-family aspect styling, keyed by the envelope's lowercase aspect
 * names. Every (pattern, strokeWidth) pair is pairwise distinct; the
 * suite asserts it (glyphs describe block in geometry.test.ts).
 */
export const ASPECT_STYLES: Record<string, AspectStyle> = {
  conjunction: { pattern: "solid", strokeWidth: 2.2 },
  opposition: { pattern: "dashed", strokeWidth: 2.0 },
  trine: { pattern: "dashed", strokeWidth: 1.4 },
  square: { pattern: "solid", strokeWidth: 1.6 },
  sextile: { pattern: "dotted", strokeWidth: 1.2 },
  quincunx: { pattern: "dotted", strokeWidth: 1.6 },
  semisextile: { pattern: "dotted", strokeWidth: 1.0 },
  semisquare: { pattern: "solid", strokeWidth: 1.0 },
  sesquisquare: { pattern: "dashed", strokeWidth: 1.0 },
};

/** Style for aspect names the vocabulary does not know — benign solid hairline. */
export const DEFAULT_ASPECT_STYLE: AspectStyle = { pattern: "solid", strokeWidth: 0.9 };
