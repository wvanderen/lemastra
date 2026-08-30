import { useMemo, useState } from "react";
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

import { formatDegreeMinutes, splitDegreeMinutes } from "@/components/chart/placement-list";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { PROVISIONAL_MARKER } from "@/components/chart/evidence-vocabulary/tokens";
import type { ExploreMode } from "@/hooks/use-explore-mode";
import { useTheme } from "@/hooks/use-theme";
import { tierForScale, type DeclutterTier } from "@/lib/chart-wheel/collision";
import {
  ASPECT_STYLES,
  DEFAULT_ASPECT_STYLE,
  PLANET_GLYPHS,
  SIGN_GLYPHS,
  type AspectStyle,
} from "@/lib/chart-wheel/glyphs";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  inverseTransform,
  hitTest,
  type FactorRef,
  type HitRegion,
  type Point,
  type WheelGeometry,
} from "@/lib/chart-wheel/geometry";

import { ANGLE_MARKERS, WHEEL_ZOOM_HINT } from "./copy";

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
 * live shared-value view (Pitfall 5 — selection survives zoom ≠ 1).
 *
 * Zoom/pan shell (04-05 Task 1, Pattern 4): Gesture.Pan + Gesture.Pinch
 * drive the shared values on the UI thread through
 * Gesture.Simultaneous(pan, pinch, tap) — gesture frames NEVER
 * re-render React (D-11 law; T-04-10). Each gesture derives its live
 * value from the value SAVED at the previous gesture's end
 * (savedScale/savedOffset); the scale is clamped to [MIN_ZOOM,
 * MAX_ZOOM] (1–4×) and the pan offset is clamped so the transformed
 * wheel center stays inside the canvas square — the wheel can never be
 * lost off-canvas. The Group transform carries origin = wheel center
 * (Skia's default is top-left — Pitfall 1).
 *
 * Gesture law: the Tap worklet forwards only numbers through runOnJS;
 * hitTest and the inverse transform run on the JS side against the same
 * pure functions the golden tests pin (no duplicated math). The same
 * law governs Pan/Pinch callbacks: only shared-value writes inside
 * worklets — React state changes never happen per gesture frame.
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
 * base square maps linearly onto the canvas square (base 0,0 →
 * canvas 0,0), so the wheel center always lands at (size/2, size/2).
 */

// ---------------------------------------------------------------------------
// Fonts (module scope — one per glyph class; matchFont default family,
// the A1 Android-glyph risk is handled by glyphs.ts fallbacks, 04-07)
// ---------------------------------------------------------------------------

const SIGN_FONT_SIZE = 24;
const PLANET_FONT_SIZE = 30;
const ANGLE_FONT_SIZE = 16;
/** Degree-label font for the mid/high declutter tiers (04-05 Task 2). */
const DEGREE_FONT_SIZE = 13;
const signFont = matchFont({ fontFamily: "serif", fontSize: SIGN_FONT_SIZE });
const planetFont = matchFont({ fontFamily: "serif", fontSize: PLANET_FONT_SIZE });
const angleFont = matchFont({ fontFamily: "serif", fontSize: ANGLE_FONT_SIZE });
const degreeFont = matchFont({ fontFamily: "serif", fontSize: DEGREE_FONT_SIZE });

/**
 * Radial offset from each glyph anchor toward the sign band where the
 * tiered degree labels sit (base size 720; A4 tunable, verified
 * on-device at the 04-07 checkpoint).
 */
const DEGREE_LABEL_OFFSET = 16;

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

/**
 * Pan activation threshold (px, either axis): smaller movements stay
 * taps (and page scrolls), beyond it the wheel pan claims the drag —
 * RNGH activation tuning so the wheel pan does not fight the page
 * ScrollView (Pitfall 6; feel verified on-device at the 04-07
 * checkpoint).
 */
const PAN_ACTIVATION_OFFSET = 6;

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
// Components
// ---------------------------------------------------------------------------

/** Themed colors the graphics tree resolves (renderers own WCAG resolution). */
export interface WheelColors {
  text: string;
  textSecondary: string;
  accent: string;
}

export type WheelGraphicsProps = {
  /** Base-size wheel geometry (buildWheelGeometry — the single geometry source). */
  geometry: WheelGeometry;
  /** The shared selection (D-10) — renders the accent outline highlight. */
  selection: FactorRef | null;
  colors: WheelColors;
  /**
   * Label-detail tier (04-05, tierForScale): "base" renders glyphs
   * only; "mid" adds D° degree labels; "high" adds the finest set
   * (D°MM′). Static consumers (the D-03 mini preview) omit it and stay
   * at base — the preview never forks from the wheel's data path.
   */
  tier?: DeclutterTier;
  /**
   * Explore mode (04-06, D-06): "technical" renders glyphs + tiered
   * degree labels; "simple" renders glyph labels only — the mode
   * FILTERS the label set while the tier governs density (the two
   * compose: labels exist only when both allow). Defaults to
   * "technical" so static consumers (the D-03 mini preview) keep the
   * full label path.
   */
  mode?: ExploreMode;
};

/**
 * WheelGraphics — the pure presentational primitive tree (no Canvas, no
 * gesture): rings, spokes, glyphs, chords, provisional outlines, and the
 * selection highlight, in base coordinates. The interactive WheelCanvas
 * AND the D-03 static mini-wheel preview render the SAME deterministic
 * primitives through this component (one geometry, one renderer — never
 * a forked preview).
 */
export function WheelGraphics({
  geometry,
  selection,
  colors,
  tier = "base",
  mode = "technical",
}: WheelGraphicsProps) {
  const selectedRegion =
    selection === null
      ? undefined
      : geometry.hitRegions.find((region) => regionMatches(region, selection));

  return (
    <>
      {/* Rim + sign band rings */}
      <Circle
        cx={geometry.cx}
        cy={geometry.cy}
        r={geometry.rings.outerRim}
        color={colors.text}
        style="stroke"
        strokeWidth={RIM_STROKE}
      />
      <Circle
        cx={geometry.cx}
        cy={geometry.cy}
        r={geometry.rings.signOuter}
        color={colors.text}
        style="stroke"
        strokeWidth={RING_STROKE}
      />
      <Circle
        cx={geometry.cx}
        cy={geometry.cy}
        r={geometry.rings.signInner}
        color={colors.text}
        style="stroke"
        strokeWidth={RING_STROKE}
      />
      <Circle
        cx={geometry.cx}
        cy={geometry.cy}
        r={geometry.rings.aspect}
        color={colors.textSecondary}
        style="stroke"
        strokeWidth={RING_STROKE}
      />

      {/* Sign spokes + glyphs (mid-sign anchors) */}
      {geometry.signSpokes.map((spoke) => (
        <Line
          key={`spoke-${spoke.sign}`}
          p1={spoke.inner}
          p2={spoke.outer}
          color={colors.textSecondary}
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
          colors.text,
          `sign-glyph-${glyph.sign}`
        )
      )}

      {/* House lines (empty for unknown-time — D-10 geometry honesty) */}
      {geometry.houseLines.map((line) => (
        <Line
          key={`house-line-${line.house}`}
          p1={line.inner}
          p2={line.outer}
          color={colors.textSecondary}
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
          colors.text,
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
          color={colors.text}
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
          colors.text,
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
            color={colors.textSecondary}
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
          colors.text,
          `planet-glyph-${anchor.body}`
        )
      )}

      {/* Tiered degree labels (04-05 Task 2, D-11 declutter tiers):
           hidden at base, D° at mid, D°MM′ at high — derived from the
           EMITTED absolute longitudes through the ONE degree split
           (positioning math over emitted facts, never a recalculated
           astrological fact), placed just radially outward of each
           decluttered glyph anchor. Labels are not hit targets.
           04-06 (D-06): Simple mode filters the label set to glyphs
           only — the tier governs density, the mode governs whether
           degree labels exist at all; both must allow. */}
      {mode === "technical" &&
        tier !== "base" &&
        geometry.planetAnchors.map((anchor) => {
          const withinSign = anchor.longitude % 30;
          const label =
            tier === "mid"
              ? `${splitDegreeMinutes(withinSign).degrees}°`
              : formatDegreeMinutes(withinSign);
          return glyphText(
            degreeFont,
            DEGREE_FONT_SIZE,
            label,
            polarLocal(geometry.cx, geometry.cy, anchor.angle, anchor.radius + DEGREE_LABEL_OFFSET),
            colors.textSecondary,
            `degree-label-${anchor.body}`
          );
        })}

      {/* Selection highlight — accent outline over the region
          (stroke + weight; a hue-only change is forbidden) */}
      {renderSelectionOutline(geometry, selectedRegion, colors.accent)}
    </>
  );
}

export type WheelCanvasProps = {
  /** Base-size wheel geometry (buildWheelGeometry — the single geometry source). */
  geometry: WheelGeometry;
  /** The shared selection (D-10) — renders the accent outline highlight. */
  selection: FactorRef | null;
  /** Fired with the hit-tested factor under a tap (WHEEL-02). */
  onSelect: (factor: FactorRef) => void;
  /** Canvas square side in px — pass the measured container width. */
  size: number;
  /** The explore mode (04-06, D-06): Simple renders glyphs only. */
  mode: ExploreMode;
};

export function WheelCanvas({ geometry, selection, onSelect, size, mode }: WheelCanvasProps) {
  const theme = useTheme();
  const displayScale = size / geometry.size;

  // Pattern-4 zoom shell (04-05 Task 1): the live view shared values
  // pinch/pan drive on the UI thread, plus the SAVED counterparts each
  // gesture derives from (onUpdate reads saved, onEnd writes saved —
  // the verified RNGH pattern, 04-RESEARCH §Pattern 4).
  const scale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedOffsetX = useSharedValue(0);
  const savedOffsetY = useSharedValue(0);

  // Declutter tier (04-05 Task 2): React state holds the TIER — never
  // the per-frame scale (D-11 law). The settled pinch end commits
  // tierForScale(live scale) through runOnJS, so labels recompute
  // exactly once per threshold crossing, not per gesture frame.
  const [tier, setTier] = useState<DeclutterTier>("base");
  const commitTier = useMemo(
    () => (viewScale: number) => {
      const next = tierForScale(viewScale);
      setTier((prev) => (prev === next ? prev : next));
    },
    []
  );

  // Pan clamp (base coordinates): the transformed wheel center
  // (cx + offsetX, cy + offsetY) must stay inside the canvas square —
  // the wheel can never be dragged entirely off-canvas.
  const panMinX = -geometry.cx;
  const panMaxX = geometry.size - geometry.cx;
  const panMinY = -geometry.cy;
  const panMaxY = geometry.size - geometry.cy;

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

  // Wheel pan: translate the live offset from the saved offset, clamped
  // so the wheel center stays on the canvas. Only shared-value writes
  // happen per frame — never a React state change (D-11, T-04-10).
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-PAN_ACTIVATION_OFFSET, PAN_ACTIVATION_OFFSET])
        .activeOffsetY([-PAN_ACTIVATION_OFFSET, PAN_ACTIVATION_OFFSET])
        .onUpdate((event) => {
          "worklet";
          offsetX.value = Math.min(
            Math.max(savedOffsetX.value + event.translationX, panMinX),
            panMaxX
          );
          offsetY.value = Math.min(
            Math.max(savedOffsetY.value + event.translationY, panMinY),
            panMaxY
          );
        })
        .onEnd(() => {
          "worklet";
          savedOffsetX.value = offsetX.value;
          savedOffsetY.value = offsetY.value;
        }),
    [offsetX, offsetY, savedOffsetX, savedOffsetY, panMinX, panMaxX, panMinY, panMaxY]
  );

  // Pinch zoom about the wheel center (the Group origin below), clamped
  // to [MIN_ZOOM, MAX_ZOOM] = 1–4× (A4 starting values). The gesture
  // end saves the scale AND commits the settled tier — the only tier
  // state transition (labels recompute once per threshold crossing).
  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          "worklet";
          scale.value = Math.min(Math.max(savedScale.value * event.scale, MIN_ZOOM), MAX_ZOOM);
        })
        .onEnd(() => {
          "worklet";
          savedScale.value = scale.value;
          runOnJS(commitTier)(scale.value);
        }),
    [scale, savedScale, commitTier]
  );

  // Composition: pan + pinch run simultaneously (Pattern 4) with the
  // tap alongside — a tap still fires when the fingers never moved
  // beyond the pan activation offsets.
  const composed = useMemo(() => Gesture.Simultaneous(tap, pan, pinch), [tap, pan, pinch]);

  return (
    <View style={styles.frame} testID="wheel-canvas">
      <GestureDetector gesture={composed}>
        <Canvas style={{ width: size, height: size }}>
          {/* Display scale about the TOP-LEFT (base 0,0 → canvas 0,0)
              wraps the zoom group: canvas px = displayScale ×
              zoom(base) — the exact chain the tap inverse above
              reverses. NO origin on this Group: an origin at the BASE
              center (360,360) would pin the wheel center at canvas
              (360,360) on any phone-sized canvas — bottom-right,
              mostly off-screen — and silently offset every tap by
              origin·(1/displayScale − 1) (04-07 on-device fix-back:
              the tap inverse and the a11y overlay frames both assume
              the top-left-anchored display mapping). */}
          <Group transform={[{ scale: displayScale }]}>
            <Group
              transform={[
                { translateX: offsetX.value },
                { translateY: offsetY.value },
                { scale: scale.value },
              ]}
              origin={{ x: geometry.cx, y: geometry.cy }}
            >
              <WheelGraphics
                geometry={geometry}
                selection={selection}
                tier={tier}
                mode={mode}
                colors={{
                  text: theme.text,
                  textSecondary: theme.textSecondary,
                  accent: theme.accent,
                }}
              />
            </Group>
          </Group>
        </Canvas>
      </GestureDetector>
      {/* Deck-exact zoom hint, once, under the canvas (D-11 affordance:
          dense regions are inspectable; tap selection stays exact). */}
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.zoomHint}
        testID="wheel-zoom-hint"
      >
        {WHEEL_ZOOM_HINT}
      </ThemedText>
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
  zoomHint: {
    marginTop: Spacing.one,
    textAlign: "center",
  },
});
