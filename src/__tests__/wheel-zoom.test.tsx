import { readFileSync } from "node:fs";
import type { ReactNode } from "react";

import type { render as rtlRender } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { formatDegreeMinutes, splitDegreeMinutes } from "@/components/chart/placement-list";
import { WHEEL_ZOOM_HINT } from "@/components/chart/explore/copy";
import { calculateResponseSchema } from "@/lib/api-schemas";
import { buildWheelGeometry, type FactorRef, type HitRegion } from "@/lib/chart-wheel/geometry";

// WheelCanvas zoom tests (04-05 Task 2) — WHEEL-03's component half:
// pinch/pan drive shared values, the declutter TIER re-selects when the
// scale crosses tierForScale thresholds (labels recompute on tier
// transitions only — never per frame), and taps hit-test through the
// live inverse transform at zoom ≠ 1 (Pitfall 5).
//
// Test mechanics (facade law): @shopify/react-native-skia resolves to
// the committed recording facade (`__getRendered`); RNGH /
// react-native-reanimated / react-native-worklets get per-file vi.mocks
// (precedence over the aliases) — the Pinch/Pan mocks CAPTURE their
// onUpdate/onEnd handlers so tests drive gestures with numbers, and
// runOnJS collapses onto JS so the captured handlers run the real
// commit/hit-testing paths.
//
// Test-order law (04-04): at most ONE state-updating act per test, on a
// FRESH mount — the RN shim's facade swaps ScrollView identities per
// commit, so later in-file state-updating acts can be silently dropped.
// Tier drives (onUpdate + onEnd → setTier) are the only state-updating
// acts; the zoomed-tap test drives onUpdate only (no commit).

const gesture = vi.hoisted(() => ({
  taps: [] as Array<(event: { x: number; y: number }) => void>,
  pans: [] as Array<{
    onUpdate: (event: { translationX: number; translationY: number }) => void;
    onEnd: () => void;
  }>,
  pinches: [] as Array<{
    onUpdate: (event: { scale: number }) => void;
    onEnd: () => void;
  }>,
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
      const handlers: {
        onUpdate?: (event: { translationX: number; translationY: number }) => void;
        onEnd?: () => void;
      } = {};
      const builder = {
        activeOffsetX() {
          return builder;
        },
        activeOffsetY() {
          return builder;
        },
        onUpdate(callback: NonNullable<typeof handlers.onUpdate>) {
          handlers.onUpdate = callback;
          return builder;
        },
        onEnd(callback: NonNullable<typeof handlers.onEnd>) {
          handlers.onEnd = callback;
          gesture.pans.push(handlers as Required<typeof handlers>);
          return builder;
        },
      };
      return builder;
    },
    Pinch: () => {
      const handlers: {
        onUpdate?: (event: { scale: number }) => void;
        onEnd?: () => void;
      } = {};
      const builder = {
        onUpdate(callback: NonNullable<typeof handlers.onUpdate>) {
          handlers.onUpdate = callback;
          return builder;
        },
        onEnd(callback: NonNullable<typeof handlers.onEnd>) {
          handlers.onEnd = callback;
          gesture.pinches.push(handlers as Required<typeof handlers>);
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

// Fixture loads through the same parse-then-trust contract the app uses
// (repository edge, D-02 Phase 3) — the same frozen Timed golden the
// geometry and wheel-selection suites pin.
const timedEnvelope = calculateResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../test/fixtures/frozen-natal-envelope.json", import.meta.url), "utf8")
  )
);
const timedGeometry = buildWheelGeometry(timedEnvelope, { size: 720 });

/** Expected per-tier degree labels, derived from the EMITTED longitudes. */
const expectedMidLabels = timedGeometry.planetAnchors.map(
  (anchor) => `${splitDegreeMinutes(anchor.longitude % 30).degrees}°`
);
const expectedHighLabels = timedGeometry.planetAnchors.map((anchor) =>
  formatDegreeMinutes(anchor.longitude % 30)
);

let render: typeof rtlRender;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let WheelCanvas: typeof import("@/components/chart/explore/wheel-canvas").WheelCanvas;
// Typed as the FACADE module — the vitest alias resolves the specifier
// to the recording facade (the real package types govern app code only).
type SkiaFacade = typeof import("../../scripts/vitest/skia-facade/index");
let skia: SkiaFacade;

beforeAll(async () => {
  ({ render, cleanup, act } = await import("@testing-library/react-native/pure"));
  ({ WheelCanvas } = await import("@/components/chart/explore/wheel-canvas"));
  skia = (await import("@shopify/react-native-skia")) as unknown as SkiaFacade;
});

afterEach(async () => {
  await cleanup();
});

beforeEach(() => {
  gesture.taps.length = 0;
  gesture.pans.length = 0;
  gesture.pinches.length = 0;
  skia.__clearRendered();
});

/** Render the Timed wheel at base size (displayScale = 1). */
async function renderTimed() {
  const onSelect = vi.fn();
  const view = await render(
    <WheelCanvas
      geometry={timedGeometry}
      selection={null}
      onSelect={onSelect}
      size={720}
    />
  );
  return { view, onSelect };
}

/** Drive a full pinch to an absolute scale: onUpdate + onEnd (commits tier). */
async function drivePinch(scale: number) {
  const pinch = gesture.pinches.at(-1);
  if (pinch === undefined) throw new Error("no pinch gesture was registered");
  await act(async () => {
    pinch.onUpdate({ scale });
    pinch.onEnd();
  });
}

/** Degree-label texts currently rendered (the tiered layer, not glyphs). */
function degreeLabelTexts(): string[] {
  return skia.__getRendered()
    .filter((entry) => entry.type === "Text")
    .map((entry) => entry.props.text as string)
    .filter((text) => /^\d+°/.test(text));
}

// ---------------------------------------------------------------------------
// Tiered label declutter (D-11 / A4) — labels recompute on tier
// transitions only, never per gesture frame
// ---------------------------------------------------------------------------

describe("WheelCanvas — tiered label declutter", () => {
  it("base tier renders glyph labels only — no degree labels, zoom hint once", async () => {
    const { view } = await renderTimed();

    // Glyphs render (the base tier's label set)…
    const texts = skia.__getRendered()
      .filter((entry) => entry.type === "Text")
      .map((entry) => entry.props.text as string);
    expect(texts).toContain("☉"); // Sun
    // …and no degree labels exist at the base tier.
    expect(degreeLabelTexts()).toHaveLength(0);

    // The deck's zoom hint renders exactly once near the canvas.
    expect(view.getAllByText(WHEEL_ZOOM_HINT)).toHaveLength(1);
  });

  it("keeps the base label set while the scale moves within the tier (no per-frame recompute)", async () => {
    await renderTimed();
    await drivePinch(1.2); // base → base: below the mid threshold
    expect(degreeLabelTexts()).toHaveLength(0);
  });

  it("mid tier adds degree labels for every placement", async () => {
    await renderTimed();
    await drivePinch(1.6); // crosses the mid threshold
    const labels = degreeLabelTexts();
    expect(labels).toHaveLength(expectedMidLabels.length);
    expect([...labels].sort()).toEqual([...expectedMidLabels].sort());
    // Mid is degree-only — no minute detail yet.
    expect(labels.some((label) => label.includes("′"))).toBe(false);
  });

  it("high tier adds the finest label set (degree + minutes)", async () => {
    await renderTimed();
    await drivePinch(2.6); // crosses the high threshold
    const labels = degreeLabelTexts();
    expect(labels).toHaveLength(expectedHighLabels.length);
    expect([...labels].sort()).toEqual([...expectedHighLabels].sort());
    // Every label now carries minutes — the finer detail tier.
    expect(labels.every((label) => /^\d+°\d{2}′$/.test(label))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Zoom-true taps — the live inverse transform (Pitfall 5)
// ---------------------------------------------------------------------------

describe("WheelCanvas — tap hit-testing through the live zoom view", () => {
  it("selects the factor under a panned + zoomed tap point (inverse transform)", async () => {
    const { onSelect } = await renderTimed();
    const sun = timedGeometry.hitRegions.find(
      (region): region is Extract<HitRegion, { kind: "planet" }> =>
        region.kind === "planet" && region.body === "Sun"
    )!;

    // Drive the live view WITHOUT committing (onUpdate only): scale 2×
    // about the wheel center, pan +60px along x (clamps allow it).
    const pinch = gesture.pinches.at(-1)!;
    const pan = gesture.pans.at(-1)!;
    act(() => {
      pinch.onUpdate({ scale: 2 });
      pan.onUpdate({ translationX: 60, translationY: 0 });
    });

    // Forward transform of the Sun's base center (the render chain the
    // tap inverse must undo): displayPx = offset + origin + scale·(base − origin).
    const tapX = 60 + timedGeometry.cx + 2 * (sun.center.x - timedGeometry.cx);
    const tapY = 0 + timedGeometry.cy + 2 * (sun.center.y - timedGeometry.cy);
    gesture.taps.at(-1)!({ x: tapX, y: tapY });
    expect(onSelect).toHaveBeenCalledWith({ kind: "planet", body: "Sun" });

    // The RAW base point no longer selects the Sun at this zoom — proof
    // the tap routed through the live view, not the identity transform.
    gesture.taps.at(-1)!({ x: sun.center.x, y: sun.center.y });
    const sunCalls = onSelect.mock.calls.filter(
      ([factor]) => (factor as FactorRef).kind === "planet" && factor.body === "Sun"
    );
    expect(sunCalls).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Source structure — React state holds the TIER, never the per-frame
// scale (D-11 law; T-04-10 mitigation)
// ---------------------------------------------------------------------------

describe("WheelCanvas — tier state law (source)", () => {
  /** Extract brace-balanced .onUpdate callback bodies from the source. */
  function onUpdateBodies(source: string): string[] {
    const bodies: string[] = [];
    let idx = source.indexOf(".onUpdate(");
    while (idx !== -1) {
      const open = source.indexOf("{", idx);
      let depth = 0;
      let end = -1;
      for (let i = open; i < source.length; i++) {
        if (source[i] === "{") depth++;
        else if (source[i] === "}") {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      if (end === -1) break;
      bodies.push(source.slice(open, end));
      idx = source.indexOf(".onUpdate(", end);
    }
    return bodies;
  }

  it("never calls setState/setTier inside Pan/Pinch onUpdate callbacks", () => {
    const source = readFileSync(
      new URL("../components/chart/explore/wheel-canvas.tsx", import.meta.url),
      "utf8"
    );
    const bodies = onUpdateBodies(source);
    // Pan + Pinch onUpdate callbacks exist…
    expect(bodies.length).toBeGreaterThanOrEqual(2);
    // …and none of them mutates React state (gesture frames write
    // shared values only — the D-11 law).
    for (const body of bodies) {
      expect(body, `onUpdate body must not setState: ${body}`).not.toMatch(/set[A-Z]\w*\(/);
    }
  });

  it("holds the tier in React state via tierForScale (labels recompute on transitions)", () => {
    const source = readFileSync(
      new URL("../components/chart/explore/wheel-canvas.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("tierForScale");
    expect(source).toMatch(/useState<.*Tier.*>\(/);
  });
});
