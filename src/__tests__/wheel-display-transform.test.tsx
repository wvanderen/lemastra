import { readFileSync } from "node:fs";
import type { ReactNode } from "react";

import type { render as rtlRender } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { calculateResponseSchema } from "@/lib/api-schemas";
import { buildWheelGeometry, type HitRegion, type Point } from "@/lib/chart-wheel/geometry";

// Wheel display-transform tests (04-07 Task 3 fix-back, on-device
// checkpoint feedback: "chart wheel opens uncentered — far in bottom
// right, most off screen until panned" + "the click/go to info seems
// to be misaligned with the actual glyph" on BOTH iOS and Android).
//
// Root cause these tests pin: the display-scale <Group> must map the
// BASE wheel square onto the CANVAS square about the top-left (base
// 0,0 → canvas 0,0), so the wheel center lands at canvas (size/2,
// size/2). An `origin` on that outer Group (e.g. the BASE center
// 360,360) keeps the center at canvas (360,360) regardless of the
// scale — bottom-right and mostly off-screen on any phone-sized
// canvas — and silently offsets every tap by
// origin·(1/displayScale − 1) because the tap inverse (÷displayScale,
// then inverseTransform) already assumes the top-left-anchored
// mapping. One wrong prop, both symptoms.
//
// Test mechanics (facade law, wheel-zoom.test.tsx conventions): the
// skia alias records every rendered primitive WITH its props, so the
// tests project the base wheel through the CAPTURED Group transform
// chain (CSS semantics — the same math the tap inverse must undo)
// and assert where the wheel actually renders on the canvas square.
// The tap test feeds the projected (rendered) position of a planet to
// the captured Tap handler — wherever the wheel DRAWS a factor is
// where tapping it must select it. Zero state-updating acts beyond
// the initial mount (identity zoom throughout — no gesture drives).

const gesture = vi.hoisted(() => ({
  taps: [] as Array<(event: { x: number; y: number }) => void>,
}));

vi.mock("react-native-gesture-handler", () => ({
  Gesture: {
    Tap: () => {
      const builder = {
        onEnd(callback: (event: { x: number; y: number }) => void) {
          gesture.taps.push(callback);
          return builder;
        },
      };
      return builder;
    },
    Pan: () => {
      const builder = {
        activeOffsetX() {
          return builder;
        },
        activeOffsetY() {
          return builder;
        },
        onUpdate() {
          return builder;
        },
        onEnd() {
          return builder;
        },
      };
      return builder;
    },
    Pinch: () => {
      const builder = {
        onUpdate() {
          return builder;
        },
        onEnd() {
          return builder;
        },
      };
      return builder;
    },
    Simultaneous: (...gestures: unknown[]) => gestures,
  },
  GestureDetector: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock("react-native-reanimated", () => ({
  useSharedValue: (initial: unknown) => ({ value: initial }),
}));

vi.mock("react-native-worklets", () => ({
  runOnJS:
    (fn: (...args: unknown[]) => unknown) =>
    (...args: unknown[]) =>
      fn(...args),
}));

// The frozen Timed golden (parse-then-trust, repository-edge law).
const timedEnvelope = calculateResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../test/fixtures/frozen-natal-envelope.json", import.meta.url), "utf8")
  )
);
const timedGeometry = buildWheelGeometry(timedEnvelope, { size: 720 });

/** A phone-sized canvas — deliberately ≠ the 720 base (displayScale < 1). */
const PHONE_CANVAS_SIZE = 390;

/** One CSS transform-list entry as the Skia Group receives it. */
interface TransformEntry {
  scale?: number;
  translateX?: number;
  translateY?: number;
}

/** A recorded Group entry from the facade (props kept as passed). */
interface RecordedGroup {
  transform?: TransformEntry[];
  origin?: Point;
}

/** The recorded Group props in render (parent-before-child) order. */
function recordedGroups(): RecordedGroup[] {
  return skia
    .__getRendered()
    .filter((entry) => entry.type === "Group")
    .map((entry) => entry.props as RecordedGroup);
}

/**
 * Project a BASE point through one recorded Group (CSS semantics:
 * the transform list multiplies left-to-right = the LAST entry
 * touches the point FIRST; `origin` wraps the list as
 * T(origin)·M·T(−origin) — exactly how Skia documents Group).
 */
function applyGroup(point: Point, group: RecordedGroup): Point {
  const origin: Point = group.origin ?? { x: 0, y: 0 };
  let p: Point = { x: point.x - origin.x, y: point.y - origin.y };
  const entries = [...(group.transform ?? [])].reverse();
  for (const entry of entries) {
    if (entry.scale !== undefined) p = { x: p.x * entry.scale, y: p.y * entry.scale };
    if (entry.translateX !== undefined) p = { x: p.x + entry.translateX, y: p.y };
    if (entry.translateY !== undefined) p = { x: p.x, y: p.y + entry.translateY };
  }
  return { x: p.x + origin.x, y: p.y + origin.y };
}

/** Project a BASE point through the FULL recorded Group chain (outer→inner). */
function projectThroughRenderChain(base: Point): Point {
  const chain = recordedGroups();
  expect(chain.length).toBeGreaterThanOrEqual(2);
  // Parent-before-child order: [0] = display-scale group, [1] = zoom group.
  return applyGroup(applyGroup(base, chain[0]!), chain[1]!);
}

let render: typeof rtlRender;
let cleanup: () => Promise<void>;
let WheelCanvas: typeof import("@/components/chart/explore/wheel-canvas").WheelCanvas;
let MiniWheelCard: typeof import("@/components/chart/explore/mini-wheel-card").MiniWheelCard;
type SkiaFacade = typeof import("../../scripts/vitest/skia-facade/index");
let skia: SkiaFacade;

beforeAll(async () => {
  ({ render, cleanup } = await import("@testing-library/react-native/pure"));
  ({ WheelCanvas } = await import("@/components/chart/explore/wheel-canvas"));
  ({ MiniWheelCard } = await import("@/components/chart/explore/mini-wheel-card"));
  skia = (await import("@shopify/react-native-skia")) as unknown as SkiaFacade;
});

afterEach(async () => {
  await cleanup();
});

beforeEach(() => {
  gesture.taps.length = 0;
  skia.__clearRendered();
});

// ---------------------------------------------------------------------------
// The interactive wheel — centered on the canvas at mount, taps aligned
// with what is rendered (identity zoom; the zoom shell's own suite
// covers scale ≠ 1)
// ---------------------------------------------------------------------------

describe("WheelCanvas — display transform (centered at mount, tap↔render alignment)", () => {
  it("renders the wheel centered on the canvas square at mount (size ≠ base)", async () => {
    await render(
      <WheelCanvas
        mode="technical"
        geometry={timedGeometry}
        selection={null}
        onSelect={vi.fn()}
        size={PHONE_CANVAS_SIZE}
      />
    );

    const center = projectThroughRenderChain({
      x: timedGeometry.cx,
      y: timedGeometry.cy,
    });
    expect(center.x).toBeCloseTo(PHONE_CANVAS_SIZE / 2, 1);
    expect(center.y).toBeCloseTo(PHONE_CANVAS_SIZE / 2, 1);
  });

  it("maps the full base square onto the canvas square (base 0,0 → canvas 0,0; base 720 → canvas 390)", async () => {
    await render(
      <WheelCanvas
        mode="technical"
        geometry={timedGeometry}
        selection={null}
        onSelect={vi.fn()}
        size={PHONE_CANVAS_SIZE}
      />
    );

    const topLeft = projectThroughRenderChain({ x: 0, y: 0 });
    expect(topLeft.x).toBeCloseTo(0, 1);
    expect(topLeft.y).toBeCloseTo(0, 1);

    const outerRim = projectThroughRenderChain({
      x: timedGeometry.size,
      y: timedGeometry.size,
    });
    expect(outerRim.x).toBeCloseTo(PHONE_CANVAS_SIZE, 1);
    expect(outerRim.y).toBeCloseTo(PHONE_CANVAS_SIZE, 1);
  });

  it("selects the factor where it is DRAWN: a tap at the rendered position of a glyph selects that factor", async () => {
    const onSelect = vi.fn();
    await render(
      <WheelCanvas
        mode="technical"
        geometry={timedGeometry}
        selection={null}
        onSelect={onSelect}
        size={PHONE_CANVAS_SIZE}
      />
    );

    const sun = timedGeometry.hitRegions.find(
      (region): region is Extract<HitRegion, { kind: "planet" }> =>
        region.kind === "planet" && region.body === "Sun"
    )!;

    // Wherever the render chain DRAWS the Sun is where the user sees
    // it — and where tapping must select it. The projection reads the
    // captured chain, so a render/inverse mismatch fails HERE.
    const renderedSun = projectThroughRenderChain(sun.center);
    gesture.taps.at(-1)!({ x: renderedSun.x, y: renderedSun.y });
    expect(onSelect).toHaveBeenCalledWith({ kind: "planet", body: "Sun" });
  });
});

// ---------------------------------------------------------------------------
// The D-03 mini-wheel card — same display-transform law at 288px
// ---------------------------------------------------------------------------

describe("MiniWheelCard — display transform (centered static preview)", () => {
  it("renders the static preview centered on the card's canvas square", async () => {
    await render(
      <MiniWheelCard envelope={timedEnvelope} onPressExplore={vi.fn()} testID="card" />
    );

    // The card mounts a single display-scale Group around WheelGraphics.
    const chain = await recordedGroups();
    expect(chain.length).toBeGreaterThanOrEqual(1);
    const center = applyGroup({ x: timedGeometry.cx, y: timedGeometry.cy }, chain[0]!);
    expect(center.x).toBeCloseTo(144, 1); // MINI_WHEEL_SIZE (288) / 2
    expect(center.y).toBeCloseTo(144, 1);
  });
});
