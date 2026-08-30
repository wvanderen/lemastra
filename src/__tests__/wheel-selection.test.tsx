import { readFileSync } from "node:fs";
import type { ReactNode } from "react";

import type { render as rtlRender } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { calculateResponseSchema } from "@/lib/api-schemas";
import { ASPECT_STYLES } from "@/lib/chart-wheel/glyphs";
import {
  buildWheelGeometry,
  type FactorRef,
  type HitRegion,
} from "@/lib/chart-wheel/geometry";

// WheelCanvas tests (04-03 Task 2) — the repo's first Skia surface: the
// canvas renders buildWheelGeometry primitives, selects factors by tap
// (inverseTransform → hitTest), highlights the selection with an accent
// OUTLINE (never hue-only), styles aspect chords per family
// (pattern + weight, A11Y-02), and marks provisional bodies with the
// D-16 dashed outline.
//
// Test mechanics (facade law): @shopify/react-native-skia resolves to
// the committed no-op facade, whose components RECORD their props
// (`__getRendered`) — assertions read the recorded primitives, never a
// rasterization. react-native-gesture-handler / react-native-reanimated
// / react-native-worklets get per-file vi.mocks (precedence over the
// aliases): the Tap mock captures the onEnd handler so tests invoke it
// with pointer coordinates; runOnJS becomes an immediate call so the
// captured handler runs the real JS hit-testing path.
//
// Golden tap points reuse the values pinned by geometry.test.ts (the
// same frozen Timed fixture: anchor 254.25°, base size 720).

const gesture = vi.hoisted(() => ({
  taps: [] as Array<(event: { x: number; y: number }) => void>,
}));

vi.mock("react-native-gesture-handler", () => ({
  Gesture: {
    Tap: () => ({
      onEnd(callback: (event: { x: number; y: number }) => void) {
        gesture.taps.push(callback);
        return this;
      },
    }),
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

// Fixtures load through the same parse-then-trust contract the app uses
// (repository edge, D-02 Phase 3).
const timedEnvelope = calculateResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../test/fixtures/frozen-natal-envelope.json", import.meta.url), "utf8")
  )
);
const unknownEnvelope = calculateResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../test/fixtures/unknown-time-envelope.json", import.meta.url), "utf8")
  )
);

const timedGeometry = buildWheelGeometry(timedEnvelope, { size: 720 });
const unknownGeometry = buildWheelGeometry(unknownEnvelope, { size: 720 });

let render: typeof rtlRender;
let cleanup: () => Promise<void>;
let WheelCanvas: typeof import("@/components/chart/explore/wheel-canvas").WheelCanvas;
// Typed as the FACADE module — the vitest alias resolves the specifier
// to the recording facade (the real package types govern app code only).
type SkiaFacade = typeof import("../../scripts/vitest/skia-facade/index");
let skia: SkiaFacade;

beforeAll(async () => {
  ({ render, cleanup } = await import("@testing-library/react-native/pure"));
  ({ WheelCanvas } = await import("@/components/chart/explore/wheel-canvas"));
  skia = (await import("@shopify/react-native-skia")) as unknown as SkiaFacade;
});

afterEach(async () => {
  await cleanup();
});

beforeEach(() => {
  gesture.taps.length = 0;
  skia.__clearRendered();
});

/** The light-scheme accent — selection outlines resolve through useTheme. */
const ACCENT = "#2266CC";

/** Invoke the most recently rendered canvas's tap handler. */
function tapAt(x: number, y: number) {
  const handler = gesture.taps.at(-1);
  if (handler === undefined) throw new Error("no tap gesture was registered");
  handler({ x, y });
}

/** Render the Timed wheel at base size (displayScale = 1). */
async function renderTimed(selection: FactorRef | null = null) {
  const onSelect = vi.fn();
  const view = await render(
    <WheelCanvas
      geometry={timedGeometry}
      selection={selection}
      onSelect={onSelect}
      size={720}
    />
  );
  return { view, onSelect };
}

// ---------------------------------------------------------------------------
// Tap → onSelect(FactorRef) — WHEEL-02
// ---------------------------------------------------------------------------

describe("WheelCanvas — tap selection", () => {
  it("mounts the Skia Canvas inside a GestureDetector", async () => {
    await renderTimed();
    const types = skia.__getRendered().map((entry) => entry.type);
    expect(types).toContain("Canvas");
    expect(gesture.taps.length).toBeGreaterThan(0);
  });

  it("selects a planet whose hit region contains the tap point", async () => {
    const { onSelect } = await renderTimed();
    const sun = timedGeometry.hitRegions.find(
      (region): region is Extract<HitRegion, { kind: "planet" }> =>
        region.kind === "planet" && region.body === "Sun"
    )!;
    tapAt(sun.center.x, sun.center.y);
    expect(onSelect).toHaveBeenCalledWith({ kind: "planet", body: "Sun" });
  });

  it("selects a sign from a tap in the sign band", async () => {
    const { onSelect } = await renderTimed();
    // The geometry-pinned Aries glyph anchor sits mid-sign in the band.
    const aries = timedGeometry.signGlyphs[0]!;
    tapAt(aries.point.x, aries.point.y);
    expect(onSelect).toHaveBeenCalledWith({ kind: "sign", sign: "Aries" });
  });

  it("selects a house from a tap inside its annulus sector (Timed fixture)", async () => {
    const { onSelect } = await renderTimed();
    // Golden house-1 interior point (geometry.test.ts hitTest pin).
    tapAt(265.49084, 392.680556);
    expect(onSelect).toHaveBeenCalledWith({ kind: "house", house: 1 });
  });

  it("selects an angle from a tap within its marker's hit circle (Timed fixture)", async () => {
    const { onSelect } = await renderTimed();
    // Golden asc-label point (geometry.test.ts hitTest pin).
    tapAt(146, 360);
    expect(onSelect).toHaveBeenCalledWith({ kind: "angle", which: "asc" });
  });

  it("does not select when the tap lands outside the wheel", async () => {
    const { onSelect } = await renderTimed();
    tapAt(360, 12); // above the outer rim (330)
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("maps display-pixel taps through the responsive size scaling (size 360 = half base)", async () => {
    const onSelect = vi.fn();
    await render(
      <WheelCanvas geometry={timedGeometry} selection={null} onSelect={onSelect} size={360} />
    );
    const sun = timedGeometry.hitRegions.find(
      (region): region is Extract<HitRegion, { kind: "planet" }> =>
        region.kind === "planet" && region.body === "Sun"
    )!;
    tapAt(sun.center.x / 2, sun.center.y / 2);
    expect(onSelect).toHaveBeenCalledWith({ kind: "planet", body: "Sun" });
  });
});

// ---------------------------------------------------------------------------
// Selection highlight — accent outline, never hue-only (D-09/A11Y-02)
// ---------------------------------------------------------------------------

describe("WheelCanvas — selection highlight", () => {
  it("renders an accent stroke-outline circle over the selected planet's hit region", async () => {
    await renderTimed({ kind: "planet", body: "Sun" });
    const sun = timedGeometry.hitRegions.find(
      (region): region is Extract<HitRegion, { kind: "planet" }> =>
        region.kind === "planet" && region.body === "Sun"
    )!;

    const outline = skia.__getRendered()
      .find(
        (entry) =>
          entry.type === "Circle" &&
          entry.props.color === ACCENT &&
          entry.props.cx === sun.center.x
      );
    expect(outline).toBeDefined();
    // Outline/weight — the stroke is heavier than a hairline, not a hue swap.
    expect(outline!.props.style).toBe("stroke");
    expect(outline!.props.strokeWidth as number).toBeGreaterThanOrEqual(3);
  });

  it("renders an accent sector-outline path for the selected sign", async () => {
    await renderTimed({ kind: "sign", sign: "Aries" });
    const outline = skia.__getRendered()
      .find((entry) => entry.type === "Path" && entry.props.color === ACCENT);
    expect(outline).toBeDefined();
    expect(outline!.props.style).toBe("stroke");
    expect(outline!.props.strokeWidth as number).toBeGreaterThanOrEqual(3);
  });

  it("renders an accent outline for the selected angle marker", async () => {
    await renderTimed({ kind: "angle", which: "mc" });
    const outline = skia.__getRendered()
      .find((entry) => entry.type === "Circle" && entry.props.color === ACCENT);
    expect(outline).toBeDefined();
  });

  it("renders an accent underlay stroke on the selected aspect chord", async () => {
    await renderTimed({ kind: "aspect", index: 0 });
    const chord = timedGeometry.aspectChords[0]!;
    const outline = skia.__getRendered()
      .find(
        (entry) =>
          entry.type === "Line" &&
          entry.props.color === ACCENT &&
          (entry.props.p1 as { x: number }).x === chord.from.x
      );
    expect(outline).toBeDefined();
    expect(outline!.props.strokeWidth as number).toBeGreaterThan(
      ASPECT_STYLES.square!.strokeWidth
    );
  });

  it("renders no highlight when nothing is selected", async () => {
    await renderTimed(null);
    const accentEntries = skia.__getRendered()
      .filter((entry) => entry.props.color === ACCENT);
    expect(accentEntries).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Aspect chord styling (pattern + weight per family — A11Y-02) and the
// D-16 provisional dashed outline
// ---------------------------------------------------------------------------

describe("WheelCanvas — chord styling and provisional marking", () => {
  it("styles chords with the per-family stroke pattern + weight from ASPECT_STYLES", async () => {
    await renderTimed();
    const entries = skia.__getRendered();

    // The Timed fixture carries square (solid 1.6), sextile (dotted 1.2),
    // and trine (dashed 1.4) chords — one Line each at the family weight.
    for (const expected of [1.6, 1.2, 1.4]) {
      expect(
        entries.find(
          (entry) => entry.type === "Line" && entry.props.strokeWidth === expected
        ),
        `expected a chord Line at strokeWidth ${expected}`
      ).toBeDefined();
    }

    // Dotted/dashed families carry a DashPathEffect child right after the Line.
    const sextile = entries.findIndex(
      (entry) => entry.type === "Line" && entry.props.strokeWidth === 1.2
    );
    expect(entries[sextile + 1]!.type).toBe("DashPathEffect");
    const trine = entries.findIndex(
      (entry) => entry.type === "Line" && entry.props.strokeWidth === 1.4
    );
    expect(entries[trine + 1]!.type).toBe("DashPathEffect");
    // Solid squares carry no dash effect.
    const square = entries.findIndex(
      (entry) => entry.type === "Line" && entry.props.strokeWidth === 1.6
    );
    expect(entries[square + 1]!.type).not.toBe("DashPathEffect");
  });

  it("renders the D-16 dashed outline around the provisional body's anchor (Unknown fixture)", async () => {
    const moon = unknownGeometry.planetAnchors.find((anchor) => anchor.provisional);
    expect(moon?.body).toBe("Moon"); // fixture precondition

    await render(
      <WheelCanvas
        geometry={unknownGeometry}
        selection={null}
        onSelect={vi.fn()}
        size={720}
      />
    );
    const entries = skia.__getRendered();
    const markerIndex = entries.findIndex(
      (entry) =>
        entry.type === "Circle" &&
        entry.props.cx === moon!.point.x &&
        entry.props.cy === moon!.point.y
    );
    expect(
      markerIndex,
      "provisional outline circle at the Moon anchor"
    ).toBeGreaterThan(-1);
    // Dashed, not hue-only: the outline is immediately followed by a
    // DashPathEffect (the D-16 pattern differentiator).
    expect(entries[markerIndex + 1]!.type).toBe("DashPathEffect");
  });

  it("renders sign and planet glyphs at the geometry anchors from the vocabularies", async () => {
    await renderTimed();
    const texts = skia.__getRendered()
      .filter((entry) => entry.type === "Text")
      .map((entry) => entry.props.text as string);
    // Sign glyphs (♈..♓) and the fixture's planet glyphs both render.
    expect(texts).toContain("♈");
    expect(texts).toContain("☉"); // Sun
    expect(texts).toContain("♄"); // Saturn
  });
});
