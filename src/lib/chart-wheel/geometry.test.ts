/**
 * Golden numeric fixtures for the pure chart-wheel geometry (04-01
 * Task 3).
 *
 * Every expectation below is a NUMBER derived from the two frozen
 * envelopes (Timed: frozen-natal-envelope.json, anchor cusp 254.25°
 * Sagittarius; Unknown: unknown-time-envelope.json, noon reference) —
 * never a screenshot (WHEEL-01 law: screenshots are never the sole
 * assertion). The numbers pin the vendored authority's conventions
 * (vendor/astrology-skill/tools/chart_diagram.py): anchor at the
 * 1st-house cusp rotated to 9 o'clock, longitudes increasing
 * counter-clockwise, ring radii 330/302/252/210/130 at base size 720,
 * spokes every 30°, aspect chords projected onto the r=130 circle,
 * hit regions in base coordinates.
 *
 * Purity law: this module (and everything it imports) runs in plain
 * Node under vitest — zero react-native / @shopify/react-native-skia
 * imports anywhere under src/lib/chart-wheel/.
 */
import { readFileSync } from "node:fs";

import { calculateResponseSchema } from "@/lib/api-schemas";

import { MAX_ZOOM, MIN_ZOOM, anchorLongitude, buildWheelGeometry, hitTest, inverseTransform, lonToAngle, polar } from "./geometry";
import { ASPECT_STYLES, DEFAULT_ASPECT_STYLE, PLANET_FALLBACKS, PLANET_GLYPHS, SIGN_FALLBACKS, SIGN_GLYPHS } from "./glyphs";

// Fixtures load through the same parse-then-trust contract the app uses
// (repository edge, D-02 Phase 3) — a fixture that drifts out of schema
// fails here loudly instead of poisoning geometry goldens.
const frozenEnvelope = calculateResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../test/fixtures/frozen-natal-envelope.json", import.meta.url), "utf8")
  )
);
const frozenChart = frozenEnvelope.chart_data;

const unknownEnvelope = calculateResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../test/fixtures/unknown-time-envelope.json", import.meta.url), "utf8")
  )
);
const unknownChart = unknownEnvelope.chart_data;

const D2R = Math.PI / 180;

/** Golden anchor of the frozen Timed chart: the 1st-house cusp. */
const ANCHOR = 254.25;

describe("anchor and angle mapping (vendor chart_diagram.py 356–357)", () => {
  it("anchors the frozen Timed chart on the 1st-house cusp absolute degree", () => {
    expect(anchorLongitude(frozenChart)).toBe(ANCHOR);
  });

  it("falls back to the ascendant, then 0° Aries, when cusps/angles are absent", () => {
    expect(anchorLongitude(unknownChart)).toBe(0);
  });

  it("places the anchor longitude at 9 o'clock (angle exactly π)", () => {
    expect(lonToAngle(ANCHOR, ANCHOR)).toBe(Math.PI);
    expect(lonToAngle(0, 0)).toBe(Math.PI);
  });

  it("wraps negative longitude differences into the anchored frame", () => {
    // absolute 0° sits 105.75° CCW past the 254.25° anchor
    expect(lonToAngle(0, ANCHOR)).toBeCloseTo(105.75 * D2R + Math.PI, 10);
  });

  it("increases longitudes counter-clockwise on screen (y grows down)", () => {
    const before = polar(360, 360, lonToAngle(ANCHOR - 30, ANCHOR), 210);
    const after = polar(360, 360, lonToAngle(ANCHOR + 30, ANCHOR), 210);
    expect(before.y).toBeLessThan(360); // above center → clockwise side
    expect(after.y).toBeGreaterThan(360); // below center → CCW side
    expect(lonToAngle(ANCHOR + 30, ANCHOR) - lonToAngle(ANCHOR, ANCHOR)).toBeCloseTo(30 * D2R, 10);
  });
});

describe("ring radii (vendor 337–343, linear size scaling)", () => {
  const g720 = buildWheelGeometry(frozenEnvelope, { size: 720 });
  const g360 = buildWheelGeometry(frozenEnvelope, { size: 360 });

  it("emits the vendor radii at base size 720", () => {
    expect(g720.cx).toBe(360);
    expect(g720.cy).toBe(360);
    expect(g720.rings).toEqual({ outerRim: 330, signOuter: 302, signInner: 252, planet: 210, aspect: 130 });
  });

  it("scales every radius linearly with size", () => {
    expect(g360.cx).toBe(180);
    expect(g360.cy).toBe(180);
    expect(g360.rings).toEqual({ outerRim: 165, signOuter: 151, signInner: 126, planet: 105, aspect: 65 });
  });

  it("defaults to base size 720", () => {
    expect(buildWheelGeometry(frozenEnvelope).size).toBe(720);
  });
});

describe("sign spokes and glyph anchors (vendor 383–401)", () => {
  const g = buildWheelGeometry(frozenEnvelope, { size: 720 });

  it("emits 12 spokes on absolute sign boundaries at exact 30° intervals", () => {
    expect(g.signSpokes).toHaveLength(12);
    for (let i = 0; i < 12; i++) {
      const a = g.signSpokes[i]!.angle;
      const b = g.signSpokes[(i + 1) % 12]!.angle;
      const delta = (((b - a) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      expect(delta).toBeCloseTo(30 * D2R, 6);
    }
    expect(g.signSpokes[0]!.longitude).toBe(0); // Aries boundary
    expect(g.signSpokes[0]!.angle).toBeCloseTo(4.9872783376, 6);
    // spokes span the sign band to the outer rim (252 → 330)
    expect(g.signSpokes[0]!.inner).toEqual({ x: 108, y: 360 });
    expect(g.signSpokes[0]!.outer.x).toBeCloseTo(30, 6);
    expect(g.signSpokes[0]!.outer.y).toBeCloseTo(360, 6);
  });

  it("anchors sign glyphs at mid-sign (+15°) inside the sign band", () => {
    expect(g.signGlyphs).toHaveLength(12);
    const aries = g.signGlyphs[0]!;
    expect(aries.sign).toBe("Aries");
    expect(aries.point.x).toBeCloseTo(501.628185, 5);
    expect(aries.point.y).toBeCloseTo(598.055576, 5);
  });
});

describe("house lines (vendor 403–419)", () => {
  const g = buildWheelGeometry(frozenEnvelope, { size: 720 });

  it("draws one line per cusp from the hub to the sign band", () => {
    expect(g.houseLines).toHaveLength(12);
    const h1 = g.houseLines[0]!;
    expect(h1.house).toBe(1);
    expect(h1.longitude).toBe(ANCHOR);
    expect(h1.angle).toBe(Math.PI); // the anchor IS cusp 1
    expect(h1.inner).toEqual({ x: 351, y: 360 }); // r = 9
    expect(h1.outer).toEqual({ x: 108, y: 360 }); // r = signInner 252
    expect(h1.label).toEqual({ x: 234, y: 360 }); // signInner − 18
  });
});

describe("angle markers (vendor 421–445)", () => {
  const g = buildWheelGeometry(frozenEnvelope, { size: 720 });

  it("emits Asc/Dsc at asc/asc+180 and MC/IC at mc/mc+180 absolute longitudes", () => {
    const byWhich = new Map(g.angleMarkers.map((m) => [m.which, m]));
    expect(byWhich.get("asc")!.longitude).toBe(254.25);
    expect(byWhich.get("dsc")!.longitude).toBe(74.25);
    expect(byWhich.get("mc")!.longitude).toBe(180.5);
    expect(byWhich.get("ic")!.longitude).toBe(0.5);
    // asc label anchor: signInner − 38 → exactly (146, 360)
    expect(byWhich.get("asc")!.label).toEqual({ x: 146, y: 360 });
    expect(byWhich.get("mc")!.label.x).toBeCloseTo(300.116591, 5);
    expect(byWhich.get("mc")!.label.y).toBeCloseTo(154.549331, 5);
  });
});

describe("aspect chords (vendor 447–462)", () => {
  const g = buildWheelGeometry(frozenEnvelope, { size: 720 });

  it("joins both bodies projected onto the r=130 circle, in envelope order", () => {
    expect(g.aspectChords).toHaveLength(4);
    const c0 = g.aspectChords[0]!; // Moon square Uranus
    expect(c0.index).toBe(0);
    expect(c0.from.x).toBeCloseTo(408.172467, 5); // Moon end
    expect(c0.from.y).toBeCloseTo(239.254758, 5);
    expect(c0.to.x).toBeCloseTo(239.004184, 5); // Uranus end
    expect(c0.to.y).toBeCloseTo(312.460411, 5);
    const c1 = g.aspectChords[1]!; // Sun square Saturn
    expect(c1.from.x).toBeCloseTo(447.65931, 5);
    expect(c1.to.x).toBeCloseTo(260.926531, 5);
  });
});

describe("planet anchors (vendor 464–511 declutter + D-16 flags)", () => {
  const g = buildWheelGeometry(frozenEnvelope, { size: 720 });

  it("positions the frozen chart's eight bodies at level 0 (no 12° cluster)", () => {
    expect(g.planetAnchors).toHaveLength(8);
    const byBody = new Map(g.planetAnchors.map((p) => [p.body, p]));
    for (const anchor of g.planetAnchors) {
      expect(anchor.radiusLevel).toBe(0);
      expect(anchor.radius).toBe(210);
    }
    expect(byBody.get("Sun")!.point.x).toBeCloseTo(501.603501, 5);
    expect(byBody.get("Sun")!.point.y).toBeCloseTo(515.075622, 5);
    expect(byBody.get("Moon")!.point).toEqual({
      x: expect.closeTo(437.817062, 5),
      y: expect.closeTo(164.949994, 5),
    });
    expect(byBody.get("Uranus")!.point.x).toBeCloseTo(164.54522, 5);
    expect(byBody.get("Uranus")!.point.y).toBeCloseTo(283.20528, 5);
  });

  it("flags provisional_factors bodies on their anchors (D-16 input)", () => {
    expect(g.planetAnchors.every((p) => !p.provisional)).toBe(true);
    const ug = buildWheelGeometry(unknownEnvelope, { size: 720 });
    const moon = ug.planetAnchors.find((p) => p.body === "Moon")!;
    expect(moon.provisional).toBe(true);
    expect(ug.planetAnchors.filter((p) => p.provisional)).toHaveLength(1);
  });
});

describe("lot anchors (Timed charts)", () => {
  const g = buildWheelGeometry(frozenEnvelope, { size: 720 });

  it("positions lots on the planet ring without declutter participation", () => {
    expect(g.lotAnchors).toHaveLength(2);
    const fortune = g.lotAnchors[0]!;
    expect(fortune.name).toBe("Lot of Fortune");
    expect(fortune.longitude).toBe(10.1);
    expect(fortune.point.x).toBeCloseTo(451.563488, 5);
    expect(fortune.point.y).toBeCloseTo(548.98711, 5);
  });
});

describe("unknown-time honesty (Phase-2 D-10, D-16)", () => {
  const ug = buildWheelGeometry(unknownEnvelope, { size: 720 });

  it("emits NO house lines, angle markers, or lots primitives", () => {
    expect(ug.anchorLongitude).toBe(0);
    expect(ug.houseLines).toHaveLength(0);
    expect(ug.angleMarkers).toHaveLength(0);
    expect(ug.lotAnchors).toHaveLength(0);
  });

  it("keeps the twelve sign spokes (signs are time-independent)", () => {
    expect(ug.signSpokes).toHaveLength(12);
    expect(ug.signGlyphs).toHaveLength(12);
  });

  it("still positions placements — decluttering the noon Mercury–Sun cluster", () => {
    expect(ug.planetAnchors).toHaveLength(5);
    const byBody = new Map(ug.planetAnchors.map((p) => [p.body, p]));
    // Mercury 178.9 and Sun 183.4 sit 4.5° apart (< 12°): Sun bumps inward
    expect(byBody.get("Mercury")!.radiusLevel).toBe(0);
    expect(byBody.get("Mercury")!.radius).toBe(210);
    expect(byBody.get("Mercury")!.point.x).toBeCloseTo(569.9613, 5);
    expect(byBody.get("Sun")!.radiusLevel).toBe(1);
    expect(byBody.get("Sun")!.radius).toBe(186);
    expect(byBody.get("Sun")!.point.x).toBeCloseTo(545.672608, 5);
    expect(byBody.get("Venus")!.point.x).toBeCloseTo(554.014702, 5);
    expect(byBody.get("Mars")!.point.y).toBeCloseTo(150.880965, 5);
    expect(byBody.get("Moon")!.point.x).toBeCloseTo(194.292342, 5);
  });

  it("still positions interplanetary aspects", () => {
    expect(ug.aspectChords).toHaveLength(2);
    expect(ug.aspectChords[0]!.from.x).toBeCloseTo(489.976043, 5);
    expect(ug.aspectChords[1]!.to.y).toBeCloseTo(280.142924, 5);
  });
});

describe("hitTest — every factor kind resolves in base coordinates (WHEEL-03)", () => {
  const g = buildWheelGeometry(frozenEnvelope, { size: 720 });

  it("resolves a planet at its glyph anchor, topmost over the house sector", () => {
    // Sun's anchor lies inside house 4's annulus sector — the glyph wins
    const ref = hitTest(g, { x: 501.603501, y: 515.075622 });
    expect(ref).toEqual({ kind: "planet", body: "Sun" });
  });

  it("resolves a sign between two spokes in the sign band", () => {
    // Taurus mid-band point (absolute 45°, r = 277)
    expect(hitTest(g, { x: 601.681394, y: 495.348084 })).toEqual({ kind: "sign", sign: "Taurus" });
  });

  it("resolves a house inside its annulus sector (Timed fixture)", () => {
    // house 1 mid-longitude (273.325°) at r = 100
    expect(hitTest(g, { x: 265.49084, y: 392.680556 })).toEqual({ kind: "house", house: 1 });
  });

  it("resolves angle markers inside their hit circles", () => {
    expect(hitTest(g, { x: 146, y: 360 })).toEqual({ kind: "angle", which: "asc" });
    expect(hitTest(g, { x: 300.116591, y: 154.549331 })).toEqual({ kind: "angle", which: "mc" });
  });

  it("resolves an aspect within the 12px chord threshold (over the house sector)", () => {
    // chord[0] (Moon square Uranus) midpoint at r ≈ 91.7 — inside house 4's
    // sector, so this also pins chord-over-house z-order
    expect(hitTest(g, { x: 323.588325, y: 275.857585 })).toEqual({ kind: "aspect", index: 0 });
  });

  it("returns null outside every region", () => {
    expect(hitTest(g, { x: 5, y: 5 })).toBeNull();
  });

  it("hit-tests placements and signs on the unknown-time chart (no houses to find)", () => {
    const ug = buildWheelGeometry(unknownEnvelope, { size: 720 });
    expect(hitTest(ug, { x: 194.292342, y: 231.000108 })).toEqual({ kind: "planet", body: "Moon" });
    expect(hitTest(ug, { x: 265.49084, y: 392.680556 })).not.toEqual({ kind: "house", house: 1 });
  });
});

describe("inverseTransform — zoom-safe hit-testing (Pitfall 5)", () => {
  const g = buildWheelGeometry(frozenEnvelope, { size: 720 });
  const view = { scale: 2.7, offsetX: 40, offsetY: -60, originX: 360, originY: 360 };

  /** The forward Skia transform: origin-scaled, then panned. */
  const toScreen = (p: { x: number; y: number }) => ({
    x: view.originX + (p.x - view.originX) * view.scale + view.offsetX,
    y: view.originY + (p.y - view.originY) * view.scale + view.offsetY,
  });

  it("round-trips a base point through the screen transform", () => {
    const base = { x: 501.603501, y: 515.075622 };
    const back = inverseTransform(toScreen(base), view);
    expect(back.x).toBeCloseTo(base.x, 6);
    expect(back.y).toBeCloseTo(base.y, 6);
  });

  it("resolves the same factor at zoom 2.7 with a pan offset", () => {
    const samples = [
      { x: 501.603501, y: 515.075622 }, // planet
      { x: 601.681394, y: 495.348084 }, // sign
      { x: 265.49084, y: 392.680556 }, // house
      { x: 146, y: 360 }, // angle
      { x: 323.588325, y: 275.857585 }, // aspect chord
    ];
    for (const base of samples) {
      expect(hitTest(g, inverseTransform(toScreen(base), view))).toEqual(hitTest(g, base));
    }
    expect(hitTest(g, inverseTransform(toScreen(samples[0]!), view))).toEqual({
      kind: "planet",
      body: "Sun",
    });
  });

  it("exposes the zoom clamp constants (Pattern 4)", () => {
    expect(MIN_ZOOM).toBe(1);
    expect(MAX_ZOOM).toBe(4);
  });
});

describe("glyph vocabularies (vendor 43–104; A1 tofu path; A11Y-02)", () => {
  it("keys sign glyphs by envelope sign strings verbatim", () => {
    expect(Object.keys(SIGN_GLYPHS)).toHaveLength(12);
    expect(SIGN_GLYPHS.Aries).toBe("♈");
    expect(SIGN_GLYPHS.Sagittarius).toBe("♐");
    expect(SIGN_GLYPHS.Pisces).toBe("♓");
  });

  it("gives every sign a text fallback abbreviation", () => {
    expect(Object.keys(SIGN_FALLBACKS)).toHaveLength(12);
    expect(SIGN_FALLBACKS.Sagittarius).toBe("Sag");
  });

  it("covers the vendor body vocabulary including nodes, Chiron, Lilith", () => {
    const bodies = [
      "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn",
      "Uranus", "Neptune", "Pluto", "True Node", "North Node", "South Node",
      "Chiron", "Lilith",
    ];
    for (const body of bodies) {
      expect(typeof PLANET_GLYPHS[body as keyof typeof PLANET_GLYPHS]).toBe("string");
      expect(typeof PLANET_FALLBACKS[body as keyof typeof PLANET_FALLBACKS]).toBe("string");
    }
    expect(PLANET_GLYPHS["True Node"]).toBe("☊");
    expect(PLANET_GLYPHS.Lilith).toBe("⚸");
  });

  it("styles every aspect family with pattern + weight — never hue-only", () => {
    const seen = new Set<string>();
    for (const style of Object.values(ASPECT_STYLES)) {
      expect(["solid", "dashed", "dotted"]).toContain(style.pattern);
      expect(style.strokeWidth).toBeGreaterThan(0);
      const key = `${style.pattern}:${style.strokeWidth}`;
      expect(seen.has(key), `duplicate (pattern, weight) pair: ${key}`).toBe(false);
      seen.add(key);
    }
    // the six aspects the calculator emits are all styled
    for (const name of ["conjunction", "sextile", "square", "trine", "opposition"]) {
      expect(ASPECT_STYLES[name as keyof typeof ASPECT_STYLES]).toBeDefined();
    }
  });

  it("falls back to a default style for unknown aspect names", () => {
    expect(DEFAULT_ASPECT_STYLE.pattern).toBe("solid");
    expect(DEFAULT_ASPECT_STYLE.strokeWidth).toBeGreaterThan(0);
  });
});
