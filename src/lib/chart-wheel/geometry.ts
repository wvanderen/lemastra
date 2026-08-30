/**
 * Pure, renderer-agnostic chart-wheel geometry (04-01 Task 3).
 *
 * Ported from the vendored authority vendor/astrology-skill/tools/
 * chart_diagram.py (render_svg): anchor rotation at the 1st-house cusp
 * to 9 o'clock (line 356–357 `_polar`/`lon_to_angle`), ring radii at
 * base size 720 (lines 337–343), sign spokes on absolute boundaries
 * (383–401), house lines (403–419), angle markers (421–445), aspect
 * chords on the r=130 circle (447–462), and the glyph-collision pass
 * (464–511) imported from ./collision.
 *
 * STACK "Chart Wheel Strategy" split: this module owns ALL wheel math —
 * the Skia canvas (04-03), the mini-wheel preview (D-03), the a11y
 * overlay (D-12), and every numeric test consume the same deterministic
 * primitives. There is no second geometry implementation anywhere.
 *
 * Purity law: zero react-native / @shopify/react-native-skia imports —
 * plain-Node vitest loads this graph (03-01/03-08 facade law). Angles
 * are RADIANS everywhere (Pitfall 1); longitudes are degrees.
 */
import type { CalculateResponse } from "@/lib/api-schemas";

import { declutter } from "./collision";
import { SIGN_ORDER } from "./glyphs";

/** The envelope chart_data shape (api-schemas derives it from the zod contract). */
export type ChartData = CalculateResponse["chart_data"];
export type ChartPlacement = ChartData["placements"][number];

/** Base wheel size the vendor radii are defined against. */
export const BASE_SIZE = 720;

/** Vendor ring radii at base size — scale linearly with size. */
export const RING_RADII = {
  outerRim: 330,
  signOuter: 302,
  signInner: 252,
  planet: 210,
  aspect: 130,
} as const;

/** Pinch-zoom clamp (Pattern 4; A4 starting values). */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

/** Hit-region radii/thresholds at base size — scale linearly with size. */
export const PLANET_HIT_RADIUS = 20;
export const ANGLE_HIT_RADIUS = 16;
export const CHORD_HIT_THRESHOLD = 12;

/** Draw/hit z-order (bottom → top): glyphs win over chords over sectors. */
export const Z_ORDER = { sign: 10, house: 20, aspect: 30, angle: 40, planet: 50 } as const;

/** Vendor inner offsets for house/angle spokes and labels (base size). */
const HOUSE_LINE_INNER_R = 9;
const ANGLE_LINE_INNER_R = 8;
const HOUSE_LABEL_OFFSET = 18;
const ANGLE_LABEL_OFFSET = 38;

export interface Point {
  x: number;
  y: number;
}

/** One selectable wheel factor — the shared selection vocabulary (D-10). */
export type FactorRef =
  | { kind: "planet"; body: string }
  | { kind: "sign"; sign: string }
  | { kind: "house"; house: number }
  | { kind: "angle"; which: "asc" | "mc" | "dsc" | "ic" }
  | { kind: "aspect"; index: number };

/**
 * The anchor longitude: the 1st-house cusp when houses exist, else the
 * ascendant, else 0° Aries (vendor lines 345–354). The wheel rotates so
 * this longitude sits at 9 o'clock.
 */
export function anchorLongitude(chart: ChartData): number {
  const firstCusp = chart.house_cusps?.find((c) => c.house === 1);
  if (firstCusp) return firstCusp.absolute_degree % 360;
  if (chart.ascendant) return chart.ascendant.absolute_degree % 360;
  return 0;
}

/**
 * Map an absolute ecliptic longitude to a wheel angle in RADIANS:
 * anchored at π (9 o'clock), longitudes increasing counter-clockwise
 * (vendor line 356–357). Result lies in [π, 3π).
 */
export function lonToAngle(lon: number, anchorLon: number): number {
  return ((((lon - anchorLon) % 360) + 360) % 360) * (Math.PI / 180) + Math.PI;
}

/** Polar → screen point. Y flips because screen coordinates grow downward. */
export function polar(cx: number, cy: number, angle: number, r: number): Point {
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}

export interface SignSpoke {
  /** The sign STARTING at this boundary (spoke i bounds sign i). */
  sign: string;
  /** Boundary absolute longitude: i·30. */
  longitude: number;
  /** Wheel angle in radians. */
  angle: number;
  inner: Point;
  outer: Point;
}

export interface SignGlyph {
  sign: string;
  /** Anchor at mid-sign (+15°), centered in the sign band. */
  point: Point;
}

export interface HouseLine {
  house: number;
  longitude: number;
  angle: number;
  inner: Point;
  outer: Point;
  label: Point;
}

export type AngleWhich = "asc" | "mc" | "dsc" | "ic";

export interface AngleMarker {
  which: AngleWhich;
  longitude: number;
  angle: number;
  inner: Point;
  outer: Point;
  label: Point;
}

export interface AspectChord {
  /** Index into the envelope's aspects array (D-10 selection vocabulary). */
  index: number;
  /** The envelope's aspect name (e.g. "trine") — drives ASPECT_STYLES (A11Y-02). */
  aspectName: string;
  /** body_a's projection onto the aspect circle. */
  from: Point;
  /** body_b's projection. */
  to: Point;
}

export interface PlanetAnchor {
  body: string;
  longitude: number;
  angle: number;
  radiusLevel: number;
  radius: number;
  point: Point;
  /** True when provisional_factors flags this body (D-16 dashed-treatment input). */
  provisional: boolean;
}

export interface LotAnchor {
  name: string;
  longitude: number;
  angle: number;
  point: Point;
}

export type HitRegion =
  | { kind: "planet"; body: string; center: Point; radius: number; z: number; factor: FactorRef }
  | { kind: "angle"; which: AngleWhich; center: Point; radius: number; z: number; factor: FactorRef }
  | { kind: "aspect"; index: number; from: Point; to: Point; threshold: number; z: number; factor: FactorRef }
  | { kind: "sign"; sign: string; a0: number; a1: number; r0: number; r1: number; z: number; factor: FactorRef }
  | { kind: "house"; house: number; a0: number; a1: number; r0: number; r1: number; z: number; factor: FactorRef };

export interface WheelGeometry {
  size: number;
  cx: number;
  cy: number;
  /** size / BASE_SIZE — every vendor offset scales by this. */
  scale: number;
  /** Anchor longitude in degrees (the 9-o'clock rotation). */
  anchorLongitude: number;
  rings: { outerRim: number; signOuter: number; signInner: number; planet: number; aspect: number };
  signSpokes: SignSpoke[];
  signGlyphs: SignGlyph[];
  /** Empty when the envelope has no house cusps (unknown-time D-10). */
  houseLines: HouseLine[];
  /** Empty when the envelope has no ascendant/midheaven (unknown-time D-10). */
  angleMarkers: AngleMarker[];
  aspectChords: AspectChord[];
  planetAnchors: PlanetAnchor[];
  /** Empty when the envelope has no lots (unknown-time D-10). */
  lotAnchors: LotAnchor[];
  /** Z-descending hit regions — hitTest scans in order, first match wins. */
  hitRegions: HitRegion[];
}

export interface WheelGeometryOptions {
  /** Canvas square size in px. Default 720; vendor minimum 360. */
  size?: number;
}

/**
 * Transform a parsed calculation envelope into deterministic wheel
 * primitives + hit regions. Pure: same envelope + size ⇒ same output,
 * every time (WHEEL-01 golden-fixture contract).
 */
export function buildWheelGeometry(
  envelope: CalculateResponse,
  options: WheelGeometryOptions = {}
): WheelGeometry {
  const size = options.size ?? BASE_SIZE;
  if (size < 360) {
    throw new RangeError(`wheel size must be at least 360 (vendor contract), got ${size}`);
  }
  const chart = envelope.chart_data;
  const scale = size / BASE_SIZE;
  const cx = size / 2;
  const cy = size / 2;
  const rings = {
    outerRim: RING_RADII.outerRim * scale,
    signOuter: RING_RADII.signOuter * scale,
    signInner: RING_RADII.signInner * scale,
    planet: RING_RADII.planet * scale,
    aspect: RING_RADII.aspect * scale,
  };
  const anchor = anchorLongitude(chart);
  const angle = (lon: number) => lonToAngle(lon, anchor);

  // --- signs: boundaries at absolute multiples of 30°, glyphs mid-sign ---
  const signSpokes: SignSpoke[] = SIGN_ORDER.map((sign, i) => {
    const a = angle(i * 30);
    return {
      sign,
      longitude: i * 30,
      angle: a,
      inner: polar(cx, cy, a, rings.signInner),
      outer: polar(cx, cy, a, rings.outerRim),
    };
  });
  const signGlyphs: SignGlyph[] = SIGN_ORDER.map((sign, i) => ({
    sign,
    point: polar(cx, cy, angle(i * 30 + 15), (rings.signInner + rings.signOuter) / 2),
  }));

  // --- houses: one spoke per cusp; absent entirely for unknown-time ---
  const houseLines: HouseLine[] = (chart.house_cusps ?? [])
    .slice()
    .sort((a, b) => a.house - b.house)
    .map((cusp) => {
      const a = angle(cusp.absolute_degree);
      return {
        house: cusp.house,
        longitude: cusp.absolute_degree,
        angle: a,
        inner: polar(cx, cy, a, HOUSE_LINE_INNER_R * scale),
        outer: polar(cx, cy, a, rings.signInner),
        label: polar(cx, cy, a, rings.signInner - HOUSE_LABEL_OFFSET * scale),
      };
    });

  // --- angles: Asc/Dsc at asc/asc+180, MC/IC at mc/mc+180 (vendor 421–435) ---
  const angleMarkers: AngleMarker[] = [];
  const pushMarker = (which: AngleWhich, lon: number) => {
    const a = angle(lon);
    angleMarkers.push({
      which,
      longitude: lon,
      angle: a,
      inner: polar(cx, cy, a, ANGLE_LINE_INNER_R * scale),
      outer: polar(cx, cy, a, rings.signInner),
      label: polar(cx, cy, a, rings.signInner - ANGLE_LABEL_OFFSET * scale),
    });
  };
  if (chart.ascendant) {
    pushMarker("asc", chart.ascendant.absolute_degree);
    pushMarker("dsc", (chart.ascendant.absolute_degree + 180) % 360);
  }
  if (chart.midheaven) {
    pushMarker("mc", chart.midheaven.absolute_degree);
    pushMarker("ic", (chart.midheaven.absolute_degree + 180) % 360);
  }

  // --- placements: vendor declutter over raw-longitude-sorted bodies ---
  const provisionalBodies = new Set(
    (envelope.provisional_factors ?? []).map((f) => f.factor.toLowerCase())
  );
  const sortedPlacements = chart.placements
    .slice()
    .sort((a, b) => a.absolute_degree - b.absolute_degree);
  const positioned = declutter(
    sortedPlacements.map((p) => angle(p.absolute_degree)),
    { baseRadius: rings.planet, radiusStep: 24 * scale }
  );
  const planetAnchors: PlanetAnchor[] = sortedPlacements.map((p, i) => {
    const pos = positioned[i]!;
    return {
      body: p.body,
      longitude: p.absolute_degree,
      angle: pos.angle,
      radiusLevel: pos.radiusLevel,
      radius: pos.radius,
      point: polar(cx, cy, pos.angle, pos.radius),
      provisional: provisionalBodies.has(p.body.toLowerCase()),
    };
  });

  // --- aspects: chords join both bodies' aspect-circle projections ---
  const longitudeByBody = new Map(planetAnchors.map((p) => [p.body, p.longitude]));
  const aspectChords: AspectChord[] = [];
  (chart.aspects ?? []).forEach((aspect, index) => {
    const lonA = longitudeByBody.get(aspect.body_a);
    const lonB = longitudeByBody.get(aspect.body_b);
    if (lonA === undefined || lonB === undefined) return; // vendor skips unresolvable
    aspectChords.push({
      index,
      aspectName: aspect.aspect,
      from: polar(cx, cy, angle(lonA), rings.aspect),
      to: polar(cx, cy, angle(lonB), rings.aspect),
    });
  });

  // --- lots: positioned on the planet ring, no declutter participation ---
  const lotAnchors: LotAnchor[] = (chart.lots ?? []).map((lot) => {
    const a = angle(lot.absolute_degree);
    return { name: lot.name, longitude: lot.absolute_degree, angle: a, point: polar(cx, cy, a, rings.planet) };
  });

  // --- hit regions (z-descending: planets > angles > chords > sectors) ---
  const hitRegions: HitRegion[] = [];
  for (const p of planetAnchors) {
    hitRegions.push({
      kind: "planet",
      body: p.body,
      center: p.point,
      radius: PLANET_HIT_RADIUS * scale,
      z: Z_ORDER.planet,
      factor: { kind: "planet", body: p.body },
    });
  }
  for (const m of angleMarkers) {
    hitRegions.push({
      kind: "angle",
      which: m.which,
      center: m.label,
      radius: ANGLE_HIT_RADIUS * scale,
      z: Z_ORDER.angle,
      factor: { kind: "angle", which: m.which },
    });
  }
  for (const chord of aspectChords) {
    hitRegions.push({
      kind: "aspect",
      index: chord.index,
      from: chord.from,
      to: chord.to,
      threshold: CHORD_HIT_THRESHOLD * scale,
      z: Z_ORDER.aspect,
      factor: { kind: "aspect", index: chord.index },
    });
  }
  SIGN_ORDER.forEach((sign, i) => {
    hitRegions.push({
      kind: "sign",
      sign,
      // lonToAngle adds π (the 9-o'clock anchor); inSector compares
      // against atan2 space, so normalize each bound mod 2π.
      a0: norm2pi(angle(i * 30)),
      a1: norm2pi(angle((i + 1) * 30)),
      r0: rings.signInner,
      r1: rings.signOuter,
      z: Z_ORDER.sign,
      factor: { kind: "sign", sign },
    });
  });
  houseLines.forEach((line, h) => {
    const next = houseLines[(h + 1) % houseLines.length]!;
    hitRegions.push({
      kind: "house",
      house: line.house,
      a0: norm2pi(angle(line.longitude)),
      a1: norm2pi(angle(next.longitude)),
      r0: 0,
      r1: rings.signInner,
      z: Z_ORDER.house,
      factor: { kind: "house", house: line.house },
    });
  });
  hitRegions.sort((a, b) => b.z - a.z);

  return {
    size,
    cx,
    cy,
    scale,
    anchorLongitude: anchor,
    rings,
    signSpokes,
    signGlyphs,
    houseLines,
    angleMarkers,
    aspectChords,
    planetAnchors,
    lotAnchors,
    hitRegions,
  };
}

/** Euclidean distance from p to the segment [a, b]. */
function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  t = Math.min(Math.max(t, 0), 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Normalize an angle into [0, 2π). */
function norm2pi(a: number): number {
  const TWO_PI = 2 * Math.PI;
  return ((a % TWO_PI) + TWO_PI) % TWO_PI;
}

/** Point-in-annulus-sector: radius band + CCW angular interval (wrap-safe). */
function inSector(
  geometry: WheelGeometry,
  region: { a0: number; a1: number; r0: number; r1: number },
  p: Point
): boolean {
  const dx = p.x - geometry.cx;
  const dyUp = geometry.cy - p.y; // flip: math orientation vs screen y-down
  const r = Math.hypot(dx, dyUp);
  if (r < region.r0 || r > region.r1) return false;
  const TWO_PI = 2 * Math.PI;
  let a = Math.atan2(dyUp, dx);
  if (a < 0) a += TWO_PI;
  let span = region.a1 - region.a0;
  if (span <= 0) span += TWO_PI;
  let rel = a - region.a0;
  if (rel < 0) rel += TWO_PI;
  return rel <= span;
}

/**
 * Resolve a BASE-coordinate point to the topmost wheel factor under it
 * (WHEEL-02/WHEEL-03). Screen points must pass through inverseTransform
 * first — hit regions live in base wheel coordinates.
 */
export function hitTest(geometry: WheelGeometry, point: Point): FactorRef | null {
  for (const region of geometry.hitRegions) {
    switch (region.kind) {
      case "planet":
      case "angle":
        if (Math.hypot(point.x - region.center.x, point.y - region.center.y) <= region.radius) {
          return region.factor;
        }
        break;
      case "aspect":
        if (distanceToSegment(point, region.from, region.to) <= region.threshold) {
          return region.factor;
        }
        break;
      case "sign":
      case "house":
        if (inSector(geometry, region, point)) return region.factor;
        break;
    }
  }
  return null;
}

/** The live canvas transform hit-testing must invert (Pattern 4). */
export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  originX: number;
  originY: number;
}

/**
 * Invert the Skia zoom/pan transform (Pitfall 5): screen point → base
 * wheel coordinates. Pure math, unit-testable at any zoom ≠ 1; mirrors
 * the forward `<Group transform={[translate, scale]} origin>` order.
 */
export function inverseTransform(point: Point, view: ViewTransform): Point {
  return {
    x: (point.x - view.offsetX - view.originX) / view.scale + view.originX,
    y: (point.y - view.offsetY - view.originY) / view.scale + view.originY,
  };
}
