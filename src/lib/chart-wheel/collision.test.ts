/**
 * Declutter invariant tests for the vendor collision algorithm port
 * (04-01 Task 3).
 *
 * Source: vendor/astrology-skill/tools/chart_diagram.py lines 464–483 —
 * glyphs sorted by longitude keep ≥ MIN_ANGULAR_DISTANCE separation per
 * radius level, bumping inward one level at a time. This port fixes one
 * vendor defect deliberately: the vendor's greedy scan never terminates
 * when a sixth glyph arrives within 12° of five others (the level cap
 * makes the bump a no-op while the restart loops forever) — the port
 * accepts the overlap at MAX_LEVEL and moves on. The cap test below is
 * also the termination regression guard.
 *
 * Zoom parameterization (A4): tierForScale maps the pinch scale to
 * label tiers monotonically; minAngularDistanceForScale shrinks the
 * packing distance as the user zooms in (denser regions resolve).
 */
import {
  MAX_LEVEL,
  MIN_ANGULAR_DISTANCE,
  RADIUS_STEP,
  declutter,
  minAngularDistanceForScale,
  tierForScale,
} from "./collision";

const D2R = Math.PI / 180;

describe("declutter (vendor chart_diagram.py 464–483 port)", () => {
  it("keeps every glyph at level 0 when no two longitudes sit within 12°", () => {
    const angles = [0, 20, 75, 130, 200].map((d) => d * D2R + Math.PI);
    const levels = declutter(angles).map((p) => p.radiusLevel);
    expect(levels).toEqual([0, 0, 0, 0, 0]);
  });

  it("bumps a glyph one level per within-12° neighbor (greedy scan)", () => {
    const angles = [0, 5, 10].map((d) => d * D2R + Math.PI);
    const levels = declutter(angles).map((p) => p.radiusLevel);
    expect(levels).toEqual([0, 1, 2]);
  });

  it("treats the 0°/360° seam circularly", () => {
    // input in raw-longitude order: 0°, 5°, then 355° wraps behind 0°
    const angles = [0, 5, 355].map((d) => d * D2R + Math.PI);
    const levels = declutter(angles).map((p) => p.radiusLevel);
    expect(levels).toEqual([0, 1, 2]);
  });

  it("caps at MAX_LEVEL and terminates instead of looping (vendor defect fix)", () => {
    const angles = [0, 1, 2, 3, 4, 5, 6].map((d) => d * D2R + Math.PI);
    const levels = declutter(angles).map((p) => p.radiusLevel);
    expect(levels).toEqual([0, 1, 2, 3, 4, 4, 4]);
  });

  it("honors a tighter minAngularDistance parameter (zoom parameterization)", () => {
    const angles = [0, 5, 10].map((d) => d * D2R + Math.PI);
    const tight = declutter(angles, { minAngularDistance: 3 * D2R }).map((p) => p.radiusLevel);
    expect(tight).toEqual([0, 0, 0]);
  });

  it("maps levels to radii as baseRadius − level·radiusStep", () => {
    const angles = [0, 5].map((d) => d * D2R + Math.PI);
    const radii = declutter(angles, { baseRadius: 210, radiusStep: 24 }).map((p) => p.radius);
    expect(radii).toEqual([210, 186]);
  });

  it("preserves input order and angle in its output", () => {
    const angles = [132.4, 248.25, 14.75].map((d) => d * D2R + Math.PI);
    const out = declutter(angles);
    expect(out).toHaveLength(3);
    angles.forEach((a, i) => {
      expect(out[i]!.angle).toBeCloseTo(a, 12);
    });
  });

  it("upholds the invariant: no two same-level glyphs within the min distance", () => {
    // dense pseudo-orbit longitudes (deterministic, no Math.random)
    const angles = Array.from({ length: 24 }, (_, i) => ((i * 137.5) % 360) * D2R + Math.PI);
    const out = declutter(angles);
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        if (out[i]!.radiusLevel !== out[j]!.radiusLevel) continue;
        let diff = Math.abs(out[i]!.angle - out[j]!.angle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        expect(diff).toBeGreaterThanOrEqual(MIN_ANGULAR_DISTANCE - 1e-9);
      }
    }
  });

  it("defaults the named parameters to the vendor values", () => {
    expect(MIN_ANGULAR_DISTANCE).toBeCloseTo(12 * D2R, 12);
    expect(RADIUS_STEP).toBe(24);
    expect(MAX_LEVEL).toBe(4);
  });
});

describe("zoom tiers (Pattern 4 / A4)", () => {
  const ORDINAL = { base: 0, mid: 1, high: 2 } as const;

  it("maps 1.0 → base, mid zoom → mid, high zoom → high", () => {
    expect(tierForScale(1.0)).toBe("base");
    expect(tierForScale(1.2)).toBe("base");
    expect(tierForScale(1.5)).toBe("mid");
    expect(tierForScale(2.0)).toBe("mid");
    expect(tierForScale(2.5)).toBe("high");
    expect(tierForScale(4.0)).toBe("high");
  });

  it("maps monotonically across the clamp sweep", () => {
    let prev = 0;
    for (let s = 1; s <= 4.0001; s += 0.01) {
      const ord = ORDINAL[tierForScale(s)];
      expect(ord).toBeGreaterThanOrEqual(prev);
      prev = ord;
    }
  });

  it("shrinks the min angular distance monotonically as zoom grows", () => {
    let prev = Number.POSITIVE_INFINITY;
    for (let s = 1; s <= 4.0001; s += 0.01) {
      const d = minAngularDistanceForScale(s);
      expect(d).toBeLessThanOrEqual(prev + 1e-12);
      prev = d;
    }
    expect(minAngularDistanceForScale(1)).toBeCloseTo(MIN_ANGULAR_DISTANCE, 12);
    expect(minAngularDistanceForScale(4)).toBeLessThan(minAngularDistanceForScale(1));
  });
});
