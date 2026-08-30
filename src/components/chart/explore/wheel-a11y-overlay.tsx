import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import type { FactorRef, HitRegion, Point, WheelGeometry } from "@/lib/chart-wheel/geometry";

/**
 * WheelA11yOverlay (04-07 Task 1) — D-12/WHEEL-05: every wheel factor
 * exists as an INVISIBLE accessible element positioned over its
 * geometry hit region, so screen-reader users navigate and select
 * wheel factors exactly where sighted users tap — same place, same
 * gesture, same exact facts (A11Y-01/A11Y-03; the synchronized lists
 * remain the canonical structured path).
 *
 * Pattern 6 (04-RESEARCH, verified against reactnative.dev/docs/
 * accessibility 0.86): one transparent Pressable per hit region with
 * accessibilityRole="button", accessibilityState={{ selected }}, and
 * an accessibilityLabel composed by the panel's OWN resolver — the
 * explore surface passes factPanelA11yLabel(resolveFact(...)) per
 * factor, so overlay ↔ panel parity is structural (A-UI-4: never a
 * second formatter, T-04-15).
 *
 * Positioning law: frames derive from the SAME geometry module the
 * canvas renders (bounding rects of the base-coordinate hit regions,
 scaled to the canvas square) — single source prevents drift (T-04-14).
 * Per A3 the overlay stays at BASE (unzoomed) geometry: the elements
 * are invisible and linearly navigated, so they need not track live
 * zoom — zoom inspection is a sighted-user gesture (D-11), and the
 * lists carry the same selection at any zoom.
 *
 * Layering law (Pitfall 6): the overlay renders UNDER the canvas —
 * the surface places this host beneath the (a11y-transparent) canvas
 * wrapper, so every sighted touch, tap, pan, and pinch keeps flowing
 * to the canvas's RNGH gesture shell exactly as before (an overlay of
 * touchable Pressables ABOVE the canvas would starve the pan/pinch).
 * Screen readers never see the canvas (the wrapper's
 * importantForAccessibility="no-hide-descendants" /
 * accessibilityElementsHidden hides it), so they navigate straight to
 * the overlay elements underneath — z-order does not remove elements
 * from the accessibility tree, and activation goes to the focused
 * element regardless of visual stacking. On-device VoiceOver/TalkBack
 * verification is the 04-07 Task 3 checkpoint (simulators cannot run
 * screen readers).
 *
 * Element ORDER mirrors the geometry's z-order (hitRegions arrive
 * z-descending, planets first): screen readers encounter the planets —
 * the densest, most selected factors — before sectors and chords.
 */

/** Minimum square overlay element in display px (A11Y touch-target law). */
export const MIN_OVERLAY_TARGET = 44;

/** An absolutely-positioned display-px frame (the overlay element's box). */
export interface OverlayFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A base-coordinate axis-aligned rect. */
interface BaseRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The bounding rect of a hit region in BASE wheel coordinates —
 * positioning math over emitted geometry only (never an astrological
 * fact). Circles → their square bounds; chords → the segment bounds
 * grown by the hit threshold; annulus sectors → the extremes of both
 * arc endpoints (at both radii) plus every cardinal angle inside the
 * CCW interval at the outer radius.
 */
export function regionBoundingRect(
  geometry: WheelGeometry,
  region: HitRegion
): BaseRect {
  switch (region.kind) {
    case "planet":
    case "angle":
      return {
        x: region.center.x - region.radius,
        y: region.center.y - region.radius,
        width: region.radius * 2,
        height: region.radius * 2,
      };
    case "aspect": {
      const minX = Math.min(region.from.x, region.to.x) - region.threshold;
      const maxX = Math.max(region.from.x, region.to.x) + region.threshold;
      const minY = Math.min(region.from.y, region.to.y) - region.threshold;
      const maxY = Math.max(region.from.y, region.to.y) + region.threshold;
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    case "sign":
    case "house":
      return sectorRect(geometry, region);
  }
}

/** Annulus-sector bounding rect (see regionBoundingRect). */
function sectorRect(
  geometry: WheelGeometry,
  region: Extract<HitRegion, { kind: "sign" | "house" }>
): BaseRect {
  const TWO_PI = Math.PI * 2;
  // CCW span from a0 to a1 (both normalized into [0, 2π) by geometry).
  const span = (((region.a1 - region.a0) % TWO_PI) + TWO_PI) % TWO_PI;
  const points: Point[] = [];
  const push = (angle: number, radius: number) => {
    points.push({
      x: geometry.cx + radius * Math.cos(angle),
      y: geometry.cy - radius * Math.sin(angle),
    });
  };
  push(region.a0, region.r1);
  push(region.a1, region.r1);
  push(region.a0, region.r0);
  push(region.a1, region.r0);
  // Extreme directions inside the interval (r0 = 0 degenerates to the
  // wheel center — included by the endpoint pushes above).
  for (let cardinal = 0; cardinal < 4; cardinal += 1) {
    const angle = (cardinal * Math.PI) / 2;
    const rel = (((angle - region.a0) % TWO_PI) + TWO_PI) % TWO_PI;
    if (rel <= span) push(angle, region.r1);
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

/**
 * The display-px frame for a region: the base rect scaled to the
 * canvas square, grown about its center to the 44px minimum target.
 */
export function overlayFrameFor(
  geometry: WheelGeometry,
  region: HitRegion,
  displaySize: number
): OverlayFrame {
  const scale = displaySize / geometry.size;
  const rect = regionBoundingRect(geometry, region);
  const width = Math.max(rect.width * scale, MIN_OVERLAY_TARGET);
  const height = Math.max(rect.height * scale, MIN_OVERLAY_TARGET);
  const centerX = (rect.x + rect.width / 2) * scale;
  const centerY = (rect.y + rect.height / 2) * scale;
  return { left: centerX - width / 2, top: centerY - height / 2, width, height };
}

/** The stable overlay element testID for a factor. */
export function overlayTestId(factor: FactorRef): string {
  switch (factor.kind) {
    case "planet":
      return `wheel-a11y-planet-${factor.body}`;
    case "sign":
      return `wheel-a11y-sign-${factor.sign}`;
    case "house":
      return `wheel-a11y-house-${factor.house}`;
    case "angle":
      return `wheel-a11y-angle-${factor.which}`;
    case "aspect":
      return `wheel-a11y-aspect-${factor.index}`;
  }
}

/**
 * The DISTINCT registry key for a factor in the sentences map. This is
 * NOT scroll-target's rowKeyFor: that key collapses sign/angle factors
 * (list rows exist for planets/houses/aspects only, so their keys may
 * collide harmlessly there) — the overlay has an element per sign and
 * per angle, and a colliding key would map every sign to one sentence
 * (caught by the parity suite: labels must be per-factor distinct).
 */
export function overlayKeyFor(factor: FactorRef): string {
  switch (factor.kind) {
    case "planet":
      return `planet-${factor.body}`;
    case "sign":
      return `sign-${factor.sign}`;
    case "house":
      return `house-${factor.house}`;
    case "angle":
      return `angle-${factor.which}`;
    case "aspect":
      return `aspect-${factor.index}`;
  }
}

/** Does a region's factor equal the selection? (the regionMatches law.) */
function factorEquals(a: FactorRef, b: FactorRef): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "planet":
      return b.kind === "planet" && b.body === a.body;
    case "sign":
      return b.kind === "sign" && b.sign === a.sign;
    case "house":
      return b.kind === "house" && b.house === a.house;
    case "angle":
      return b.kind === "angle" && b.which === a.which;
    case "aspect":
      return b.kind === "aspect" && b.index === a.index;
  }
}

export type WheelA11yOverlayProps = {
  /** Base-size wheel geometry (the same module output the canvas renders). */
  geometry: WheelGeometry;
  /** The geometry's hit regions — one overlay element per region. */
  regions: readonly HitRegion[];
  /** The shared selection (D-10) — conveys selected state per element. */
  selection: FactorRef | null;
  /** Activation → the surface's shared setSelection (identical to a tap). */
  onSelect: (factor: FactorRef) => void;
  /**
   * The panel's composed a11y sentence per factor, keyed by
   * overlayKeyFor(factor) — the A-UI-4 parity source
   * (factPanelA11yLabel ∘ resolveFact on the surface; zero second
   * formatters).
   */
  sentences: ReadonlyMap<string, string>;
  /** Canvas square side in display px — mirrors WheelCanvas's size prop. */
  displaySize: number;
  /** Host positioning within the parent (an absolute frame over the canvas square). */
  style?: StyleProp<ViewStyle>;
};

export function WheelA11yOverlay({
  geometry,
  regions,
  selection,
  onSelect,
  sentences,
  displaySize,
  style,
}: WheelA11yOverlayProps) {
  return (
    <View style={[styles.host, style]} testID="wheel-a11y-overlay">
      {regions.map((region) => {
        const sentence = sentences.get(overlayKeyFor(region.factor));
        if (sentence === undefined) return null; // no facts ⇒ no element (never an empty label)
        const selected = selection !== null && factorEquals(region.factor, selection);
        return (
          <Pressable
            key={overlayKeyFor(region.factor)}
            onPress={() => onSelect(region.factor)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={sentence}
            testID={overlayTestId(region.factor)}
            style={[styles.element, overlayFrameFor(geometry, region, displaySize)]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
  },
  // Transparent by construction: no background, no border — the
  // element is invisible; only its accessibility semantics render.
  element: {
    position: "absolute",
  },
});
