/**
 * Glyph-collision decluttering for the chart wheel (04-01 Task 3).
 *
 * Faithful port of vendor/astrology-skill/tools/chart_diagram.py lines
 * 464–483: glyphs processed in ascending-longitude order keep at least
 * MIN_ANGULAR_DISTANCE of angular separation per radius level; a glyph
 * that would land within that distance of a same-level neighbor bumps
 * one level INWARD (baseRadius − level·radiusStep) and rescans.
 *
 * One deliberate defect fix (Rule 1, documented in collision.test.ts):
 * the vendor's `radius_level = min(radius_level + 1, max)` + restart
 * loops forever once a glyph at MAX_LEVEL still collides with a
 * same-level neighbor (the bump becomes a no-op). This port accepts the
 * overlap at MAX_LEVEL and continues — six-plus bodies within 12° is
 * astronomically rare but must not hang the renderer.
 *
 * Zoom parameterization (A4, Pattern 4): tierForScale maps the pinch
 * scale to a label tier; minAngularDistanceForScale shrinks the packing
 * distance linearly from 12° at 1× to 4° at 4× so dense regions pack as
 * the user zooms in. buildWheelGeometry runs at the base 12°.
 *
 * Pure module: no React, no react-native, no Skia imports — angles are
 * RADIANS everywhere (Pitfall 1).
 */

/** Vendor default: minimum angular separation per radius level, in radians. */
export const MIN_ANGULAR_DISTANCE = (12 * Math.PI) / 180;

/** Vendor default: inward step per collision level at base size 720. */
export const RADIUS_STEP = 24;

/** Vendor default: maximum inward levels before overlap is accepted. */
export const MAX_LEVEL = 4;

export interface DeclutterOptions {
  /** Minimum same-level angular separation (radians). Default 12°. */
  minAngularDistance?: number;
  /** Inward radius step per level. Default 24 (base size 720). */
  radiusStep?: number;
  /** Maximum level before overlap is accepted. Default 4. */
  maxLevel?: number;
  /** Radius of level 0 (the planet ring). Default 210 (base size 720). */
  baseRadius?: number;
}

export interface Decluttered {
  /** The input angle (radians), unchanged. */
  angle: number;
  /** Assigned collision level (0 = on the planet ring). */
  radiusLevel: number;
  /** Final glyph radius: baseRadius − radiusLevel · radiusStep. */
  radius: number;
}

/** Circular angular distance in [0, π]. */
function circularDiff(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return diff > Math.PI ? 2 * Math.PI - diff : diff;
}

/**
 * Assign a radius level to every glyph angle.
 *
 * Contract: `angles` are RADIANS in the wheel's anchored frame, passed
 * in the vendor's processing order (ascending raw longitude) — the
 * caller sorts; the output preserves input order and length.
 */
export function declutter(
  angles: readonly number[],
  options: DeclutterOptions = {}
): Decluttered[] {
  const min = options.minAngularDistance ?? MIN_ANGULAR_DISTANCE;
  const radiusStep = options.radiusStep ?? RADIUS_STEP;
  const maxLevel = options.maxLevel ?? MAX_LEVEL;
  const baseRadius = options.baseRadius ?? 210;

  const positioned: Decluttered[] = [];
  for (const angle of angles) {
    let radiusLevel = 0;
    let index = 0;
    while (index < positioned.length) {
      const other = positioned[index]!;
      const diff = circularDiff(angle, other.angle);
      if (diff < min && radiusLevel === other.radiusLevel) {
        if (radiusLevel >= maxLevel) {
          // Vendor defect fix: at the cap the bump is a no-op — the
          // vendor restarts forever here. Accept the overlap instead.
          index += 1;
          continue;
        }
        radiusLevel = Math.min(radiusLevel + 1, maxLevel);
        index = 0;
        continue;
      }
      index += 1;
    }
    positioned.push({ angle, radiusLevel, radius: baseRadius - radiusLevel * radiusStep });
  }
  return positioned;
}

/** Label-detail tiers driven by the pinch scale (A4 starting values). */
export type DeclutterTier = "base" | "mid" | "high";

export const TIER_THRESHOLDS = { mid: 1.5, high: 2.5 } as const;

/** Map a zoom scale to its label tier (monotone; values are A4 tunables). */
export function tierForScale(scale: number): DeclutterTier {
  if (scale < TIER_THRESHOLDS.mid) return "base";
  if (scale < TIER_THRESHOLDS.high) return "mid";
  return "high";
}

/**
 * Minimum same-level angular distance for a zoom scale: 12° at 1×
 * shrinking linearly to 4° at 4× (clamped outside [1, 4]). Monotone
 * non-increasing — zooming in may only ever relax packing.
 */
export function minAngularDistanceForScale(scale: number): number {
  const clamped = Math.min(Math.max(scale, 1), 4);
  const degrees = 12 - (8 / 3) * (clamped - 1);
  return (degrees * Math.PI) / 180;
}
