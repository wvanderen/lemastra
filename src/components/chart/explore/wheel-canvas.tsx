import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";
import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Line,
  Path,
  Skia,
  Text,
  matchFont,
} from "@shopify/react-native-skia";

import { PROVISIONAL_MARKER } from "@/components/chart/evidence-vocabulary/tokens";
import { useTheme } from "@/hooks/use-theme";
import {
  ASPECT_STYLES,
  DEFAULT_ASPECT_STYLE,
  PLANET_GLYPHS,
  SIGN_GLYPHS,
  type AspectStyle,
} from "@/lib/chart-wheel/glyphs";
import {
  inverseTransform,
  hitTest,
  type FactorRef,
  type HitRegion,
  type Point,
  type WheelGeometry,
} from "@/lib/chart-wheel/geometry";

import { ANGLE_MARKERS } from "./copy";

/**
 * WheelCanvas — the repo's first Skia surface (04-03 Task 2, WHEEL-02's
 * wheel half). Renders the pure geometry module's deterministic
 * primitives (04-01) and selects factors by tap:
 *
 *   tap px ──÷ displayScale ──► inverseTransform(zoom view) ──► hitTest
 *
 * All math lives in the pure module; the canvas only forwards pointer
 * coordinates (STACK renderer split). Tap coordinates arrive in canvas
 * pixels; hit regions live in base wheel coordinates — the display
 * mapping divides by size/geometry.size, the zoom mapping inverts the
 * live shared-value view (identity values this plan; pinch/pan arrive
 * in 04-05 through this same named seam).
 *
 * Gesture law: the Tap worklet forwards only numbers through runOnJS;
 * hitTest and the inverse transform run on the JS side against the same
 * pure functions the golden tests pin (no duplicated math).
 *
 * A11Y-02 laws: aspect chords differ by stroke pattern + weight per
 * family (ASPECT_STYLES — never hue alone); provisional bodies carry
 * the D-16 dashed outline (PROVISIONAL_MARKER). Selection renders an
 * accent OUTLINE over the region (stroke + weight, not a hue swap).
 * The canvas itself is a visual surface — every fact it shows also
 * lives in the FactPanel/lists (A11Y-03); the a11y overlay (04-06)
 * will wrap this canvas with accessible elements.
 *
 * Responsive square: `size` is the canvas side in px — pass the
 * measured container width (the parent owns responsiveness); the 720
 * base geometry scales linearly about the wheel center (Pitfall 1).
 */

// ---------------------------------------------------------------------------
// Fonts (module scope — one per glyph class; matchFont default family,
// the A1 Android-glyph risk is handled by glyphs.ts fallbacks, 04-07)
// ---------------------------------------------------------------------------

const SIGN_FONT_SIZE = 24;
const PLANET_FONT_SIZE = 30;
const ANGLE_FONT_SIZE = 16;
const signFont = matchFont({ fontFamily: "serif", fontSize: SIGN_FONT_SIZE });
const planetFont = matchFont({ fontFamily: "serif", fontSize: PLANET_FONT_SIZE });
const angleFont = matchFont({ fontFamily: "serif", fontSize: ANGLE_FONT_SIZE });

/** Dash intervals per non-solid stroke pattern (base-size units). */
const DASH_INTERVALS = { dashed: [8, 6], dotted: [1, 4] } as const;

/** Selection outline stroke at base size — outline/weight, never hue-only. */
const SELECTION_STROKE_WIDTH = 3;

/** Provisional marker radius around the body's glyph anchor (base size). */
const PROVISIONAL_OUTLINE_RADIUS = 18;

/** Wheel-structural stroke widths (base size). */
const RIM_STROKE = 1.5;
const RING_STROKE = 1;
const SPOKE_STROKE = 1;
const ANGLE_SPOKE_STROKE = 2;

// ---------------------------------------------------------------------------
// Pure render helpers (run on JS; the worklet only forwards numbers)
// ---------------------------------------------------------------------------

/** Center a glyph text at a point (measure → top-left anchor). */
function glyphText(
  font: ReturnType<typeof matchFont>,
  fontSize: number,
  text: string,
  point: Point,
  color: string,
  key: string
) {
  const width = font.measureText(text).width;
  return (
    <Text
      key={key}
      x={point.x - width / 2}
      y={point.y + fontSize / 3}
      text={text}
      font={font}
      color={color}
    />
  );
}

/** A stroked line with the optional dash effect child per pattern. */
function styledLine(
  key: string,
  from: Point,
  to: Point,
  color: string,
  width: number,
  pattern: AspectStyle["pattern"]
) {
  const effect =
    pattern === "dashed" || pattern === "dotted" ? (
      <DashPathEffect
        intervals={DASH_INTERVALS[pattern] as unknown as number[]}
        phase={0}
      />
    ) : null;
  return (
    <Line
      key={key}
      p1={from}
      p2={to}
      color={color}
      style="stroke"
      strokeWidth={width}
    >
      {effect}
    </Line>
  );
}

/** Does a hit region's factor equal the selection? */
function regionMatches(region: HitRegion, selection: FactorRef): boolean {
  const factor = region.factor;
  if (factor.kind !== selection.kind) return false;
  switch (selection.kind) {
    case "planet":
      return factor.kind === "planet" && factor.body === selection.body;
    case "sign":
      return factor.kind === "sign" && factor.sign === selection.sign;
    case "house":
      return factor.kind === "house" && factor.house === selection.house;
    case "angle":
      return factor.kind === "angle" && factor.which === selection.which;
    case "aspect":
      return factor.kind === "aspect" && factor.index === selection.index;
  }
}

/** Math angle (radians, y-up) → Skia screen degrees (y-down, clockwise). */
function screenDegrees(radians: number): number {
  return -((radians * 180) / Math.PI);
}

/**
 * Annular-sector outline path for sign/house selection highlights:
 * outer arc a0→a1 (CCW in math space = negative sweep on screen), then
 * the inner arc back. r0 = 0 (house sectors) degenerates to the center.
 */
function annularSectorPath(
  geometry: WheelGeometry,
  region: Extract<HitRegion, { kind: "sign" | "house" }>
) {
  const { cx, cy } = geometry;
  const { a0, a1, r0, r1 } = region;
  const path = Skia.Path.Make();
  const outerStart = polarLocal(cx, cy, a0, r1);
  const outerEnd = polarLocal(cx, cy, a1, r1);
  path.moveTo(outerStart.x, outerStart.y);
  path.arcToOval(
    Skia.XYWHRect(cx - r1, cy - r1, r1 * 2, r1 * 2),
    screenDegrees(a0),
    screenDegrees(a1) - screenDegrees(a0),
    false
  );
  if (r0 <= 0) {
    // Full pie sector: both arcs meet at the wheel center.
    path.lineTo(cx, cy);
  } else {
    path.lineTo(outerEnd.x, outerEnd.y);
    const innerStart = polarLocal(cx, cy, a0, r0);
    path.lineTo(innerStart.x, innerStart.y);
    path.arcToOval(
      Skia.XYWHRect(cx - r0, cy - r0, r0 * 2, r0 * 2),
      screenDegrees(a1),
      screenDegrees(a0) - screenDegrees(a1),
      false
    );
  }
  path.close();
  return path;
}

/** Local polar (the pure module's polar, repeated to keep imports flat here). */
function polarLocal(cx: number, cy: number, angle: number, r: number): Point {
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export type WheelCanvasProps = {
  /** Base-size wheel geometry (buildWheelGeometry — the single geometry source). */
  geometry: WheelGeometry;
  /** The shared selection (D-10) — renders the accent outline highlight. */
  selection: FactorRef | null;
  /** Fired with the hit-tested factor under a tap (WHEEL-02). */
  onSelect: (factor: FactorRef) => void;
  /** Canvas square side in px — pass the measured container width. */
  size: number;
};

export function WheelCanvas({ geometry, selection, onSelect, size }: WheelCanvasProps) {
  const theme = useTheme();
  const displayScale = size / geometry.size;

  // 04-05 zoom seam (named, identity this plan): pinch/pan will drive
  // these shared values on the UI thread; taps already inverse through
  // the live view below (Pitfall 5 — selection survives zoom ≠ 1).
  const scale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  // JS-side hit-testing: the worklet forwards tap px + the live view
  // numbers; everything else runs through the pure module here.
  const handleTap = useMemo(
    () =>
      (x: number, y: number, viewScale: number, viewOffsetX: number, viewOffsetY: number) => {
        const canvasPoint: Point = { x: x / displayScale, y: y / displayScale };
        const base = inverseTransform(canvasPoint, {
          scale: viewScale,
          offsetX: viewOffsetX,
          offsetY: viewOffsetY,
          originX: geometry.cx,
          originY: geometry.cy,
        });
        const factor = hitTest(geometry, base);
        if (factor !== null) onSelect(factor);
      },
    [geometry, onSelect, displayScale]
  );

  const tap = useMemo(
    () =>
      Gesture.Tap().onEnd((event) => {
        "worklet";
        runOnJS(handleTap)(event.x, event.y, scale.value, offsetX.value, offsetY.value);
      }),
    [handleTap, scale, offsetX, offsetY]
  );

  const selectedRegion =
    selection === null
      ? undefined
      : geometry.hitRegions.find((region) => regionMatches(region, selection));

  return (
    <View style={styles.frame} testID="wheel-canvas">
      <GestureDetector gesture={tap}>
        <Canvas style={{ width: size, height: size }}>
          {/* Display scale about the wheel center wraps the zoom group:
              canvas px = displayScale × zoom(base) — the exact chain the
              tap inverse above reverses (Pitfall 1: origin = center). */}
          <Group transform={[{ scale: displayScale }]} origin={{ x: geometry.cx, y: geometry.cy }}>
            <Group
              transform={[
                { translateX: offsetX.value },
                { translateY: offsetY.value },
                { scale: scale.value },
              ]}
              origin={{ x: geometry.cx, y: geometry.cy }}
            >
              {/* Rim + sign band rings */}
              <Circle
                cx={geometry.cx}
                cy={geometry.cy}
                r={geometry.rings.outerRim}
                color={theme.text}
                style="stroke"
                strokeWidth={RIM_STROKE}
              />
              <Circle
                cx={geometry.cx}
                cy={geometry.cy}
                r={geometry.rings.signOuter}
                color={theme.text}
                style="stroke"
                strokeWidth={RING_STROKE}
              />
              <Circle
                cx={geometry.cx}
                cy={geometry.cy}
                r={geometry.rings.signInner}
                color={theme.text}
                style="stroke"
                strokeWidth={RING_STROKE}
              />
              <Circle
                cx={geometry.cx}
                cy={geometry.cy}
                r={geometry.rings.aspect}
                color={theme.textSecondary}
                style="stroke"
                strokeWidth={RING_STROKE}
              />

              {/* Sign spokes + glyphs (mid-sign anchors) */}
              {geometry.signSpokes.map((spoke) => (
                <Line
                  key={`spoke-${spoke.sign}`}
                  p1={spoke.inner}
                  p2={spoke.outer}
                  color={theme.textSecondary}
                  style="stroke"
                  strokeWidth={SPOKE_STROKE}
                />
              ))}
              {geometry.signGlyphs.map((glyph) =>
                glyphText(
                  signFont,
                  SIGN_FONT_SIZE,
                  SIGN_GLYPHS[glyph.sign as keyof typeof SIGN_GLYPHS] ?? glyph.sign,
                  glyph.point,
                  theme.text,
                  `sign-glyph-${glyph.sign}`
                )
              )}

              {/* House lines (empty for unknown-time — D-10 geometry honesty) */}
              {geometry.houseLines.map((line) => (
                <Line
                  key={`house-line-${line.house}`}
                  p1={line.inner}
                  p2={line.outer}
                  color={theme.textSecondary}
                  style="stroke"
                  strokeWidth={SPOKE_STROKE}
                />
              ))}

              {/* Aspect chords — pattern + weight per family (A11Y-02) */}
              {geometry.aspectChords.map((chord) => {
                const style = ASPECT_STYLES[chord.aspectName] ?? DEFAULT_ASPECT_STYLE;
                return styledLine(
                  `chord-${chord.index}`,
                  chord.from,
                  chord.to,
                  theme.text,
                  style.strokeWidth,
                  style.pattern
                );
              })}

              {/* Angle spokes + compact markers at the label anchors
                  (empty for unknown-time — D-10) */}
              {geometry.angleMarkers.map((marker) => (
                <Line
                  key={`angle-spoke-${marker.which}`}
                  p1={marker.inner}
                  p2={marker.outer}
                  color={theme.text}
                  style="stroke"
                  strokeWidth={ANGLE_SPOKE_STROKE}
                />
              ))}
              {geometry.angleMarkers.map((marker) =>
                glyphText(
                  angleFont,
                  ANGLE_FONT_SIZE,
                  ANGLE_MARKERS[marker.which],
                  marker.label,
                  theme.text,
                  `angle-marker-${marker.which}`
                )
              )}

              {/* Planet glyphs at the decluttered anchors; provisional
                  bodies carry the D-16 dashed outline (never hue-only,
                  and never drawn around non-provisional bodies) */}
              {geometry.planetAnchors
                .filter((anchor) => anchor.provisional)
                .map((anchor) => (
                  <Circle
                    key={`provisional-${anchor.body}`}
                    cx={anchor.point.x}
                    cy={anchor.point.y}
                    r={PROVISIONAL_OUTLINE_RADIUS * geometry.scale}
                    color={theme.textSecondary}
                    style="stroke"
                    strokeWidth={PROVISIONAL_MARKER.strokeWidth}
                  >
                    <DashPathEffect
                      intervals={DASH_INTERVALS.dashed as unknown as number[]}
                      phase={0}
                    />
                  </Circle>
                ))}
              {geometry.planetAnchors.map((anchor) =>
                glyphText(
                  planetFont,
                  PLANET_FONT_SIZE,
                  PLANET_GLYPHS[anchor.body as keyof typeof PLANET_GLYPHS] ?? anchor.body,
                  anchor.point,
                  theme.text,
                  `planet-glyph-${anchor.body}`
                )
              )}

              {/* Selection highlight — accent outline over the region
                  (stroke + weight; a hue-only change is forbidden) */}
              {renderSelectionOutline(geometry, selectedRegion, theme.accent)}
            </Group>
          </Group>
        </Canvas>
      </GestureDetector>
    </View>
  );
}

/** The accent outline for the selected region, per kind. */
function renderSelectionOutline(
  geometry: WheelGeometry,
  region: HitRegion | undefined,
  accent: string
) {
  if (region === undefined) return null;
  switch (region.kind) {
    case "planet":
    case "angle":
      return (
        <Circle
          key={`selection-${region.kind}`}
          cx={region.center.x}
          cy={region.center.y}
          r={region.radius}
          color={accent}
          style="stroke"
          strokeWidth={SELECTION_STROKE_WIDTH}
        />
      );
    case "aspect": {
      // Heavier accent underlay over the chord — the family's own
      // pattern/weight stays visible beneath the highlight.
      const chord = geometry.aspectChords.find((c) => c.index === region.index);
      const style =
        (chord !== undefined ? ASPECT_STYLES[chord.aspectName] : undefined) ??
        DEFAULT_ASPECT_STYLE;
      return (
        <Line
          key="selection-aspect"
          p1={region.from}
          p2={region.to}
          color={accent}
          style="stroke"
          strokeWidth={style.strokeWidth * 2 + 2}
        />
      );
    }
    case "sign":
    case "house":
      return (
        <Path
          key={`selection-${region.kind}`}
          path={annularSectorPath(geometry, region)}
          color={accent}
          style="stroke"
          strokeWidth={SELECTION_STROKE_WIDTH}
        />
      );
  }
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    alignItems: "center",
  },
});
