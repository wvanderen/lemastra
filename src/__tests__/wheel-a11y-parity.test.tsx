import { readFileSync } from "node:fs";
import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { render as rtlRender } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { factPanelA11yLabel } from "@/components/chart/explore/copy";
import { calculateResponseSchema, type CalculateResponse } from "@/lib/api-schemas";
import { buildWheelGeometry, type FactorRef, type HitRegion } from "@/lib/chart-wheel/geometry";
import type { ChartDetail } from "@/lib/workspace/repository";

// Wheel a11y parity suite (04-07 Task 1) — WHEEL-05/A11Y-01 over D-12:
// every wheel factor exists as an invisible accessible element over its
// geometry hit region, the raw canvas is hidden from screen readers,
// and the overlay's labels ARE the fact panel's composed sentences
// (string equality — A-UI-4 law enforced by test, T-04-15).
//
// Parity matrix asserted per fixture (Timed + Unknown-time):
// - COUNT parity: one overlay element per geometry hit region —
//   planets/signs/houses/angles/aspects; the unknown fixture asserts
//   NO house/angle overlay elements (absent keys ⇒ absent geometry ⇒
//   absent overlay — Phase-2 D-10 honesty through every layer).
// - LABEL parity: for every factor, the overlay element's
//   accessibilityLabel === the panel's composed a11y label for the
//   same factor + mode (resolveFact → factPanelA11yLabel — the ONE
//   resolver, one degree split, never a second formatter).
// - SELECTED conveyance: activating an overlay element (the exact
//   screen-reader gesture) produces the identical outcome as a sighted
//   tap — selection updates, the panel announces the SAME string, and
//   the matching list row reports selected state (D-10).
// - CANVAS hiding: the wrapper around WheelCanvas carries
//   importantForAccessibility="no-hide-descendants" +
//   accessibilityElementsHidden (Pattern 6) while the overlay elements
//   stay OUTSIDE it (fully reachable).
// - POSITIONING: frames derive from the hit-region rects (planet
//   circles pinned numerically against the geometry at the host's
//   display size).
//
// Test mechanics: the explore-route pattern (04-03) — RNTL /pure,
// expo-router mocked, repository faked at the D-03 seam, fresh
// retry-off QueryClient, per-file RNGH/reanimated/worklets inert mocks
// (facade law) so the real WheelCanvas mounts device-free through the
// skia facade, and AsyncStorage pre-seeded to "technical" so the
// full-depth Technical sentences are the pinned vocabulary (the
// mode-keyed behavior itself is explore-mode.test.tsx's assignment).
//
// Test-order law (04-04): the press test runs LAST — one
// state-updating interaction per test file; nothing after it.

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  navigate: vi.fn(),
}));
const paramsState = vi.hoisted(() => ({ value: {} as Record<string, string | string[]> }));
const repository = vi.hoisted(() => ({
  getChartDetail: vi.fn(),
  getRevisionContent: vi.fn(),
  isWorkspaceStorageAvailable: vi.fn(),
}));
// 04-06 law: surface suites that pin full-depth behavior pre-seed the
// in-memory store to "technical" (an unmocked read rejects and
// useExploreMode falls back to Simple, hiding the lots/sect sections).
const modeStore = vi.hoisted(
  () => new Map<string, string>([["@lemastra:explore.mode.v1", "technical"]])
);

vi.mock("expo-router", () => ({
  router: routerMock,
  useLocalSearchParams: () => paramsState.value,
}));

vi.mock("expo-crypto", async () => {
  const nodeCrypto = await import("node:crypto");
  return { randomUUID: () => nodeCrypto.randomUUID() };
});

vi.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => Promise.resolve(modeStore.get(key) ?? null),
    setItem: (key: string, value: string) => {
      modeStore.set(key, value);
      return Promise.resolve();
    },
  },
}));

// D-03 seam fake with the real typed-error class preserved.
vi.mock("@/lib/workspace/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/workspace/repository")>();
  return {
    ...actual,
    getChartDetail: repository.getChartDetail,
    getRevisionContent: repository.getRevisionContent,
    isWorkspaceStorageAvailable: repository.isWorkspaceStorageAvailable,
  };
});

// Per-file gesture/native mocks (facade law — the wheel canvas mounts
// device-free; gesture mechanics are wheel-selection/wheel-zoom's
// assignment, not this file's).
vi.mock("react-native-gesture-handler", () => ({
  Gesture: {
    Tap: () => ({
      onEnd() {
        return this;
      },
    }),
    Pan: () => ({
      activeOffsetX() {
        return this;
      },
      activeOffsetY() {
        return this;
      },
      onUpdate() {
        return this;
      },
      onEnd() {
        return this;
      },
    }),
    Pinch: () => ({
      onUpdate() {
        return this;
      },
      onEnd() {
        return this;
      },
    }),
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

// Fixture envelopes — the frozen goldens, parsed through the same
// schema the repository edge enforces.
const timedEnvelope: CalculateResponse = calculateResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../test/fixtures/frozen-natal-envelope.json", import.meta.url), "utf8")
  )
);
const unknownEnvelope: CalculateResponse = calculateResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../test/fixtures/unknown-time-envelope.json", import.meta.url), "utf8")
  )
);

const timedGeometry = buildWheelGeometry(timedEnvelope, { size: 720 });
const unknownGeometry = buildWheelGeometry(unknownEnvelope, { size: 720 });

/** The overlay element testID for a factor (the component's contract). */
function overlayTid(factor: FactorRef): string {
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

/** The panel's composed a11y label for a factor — the parity target. */
function expectedPanelLabel(envelope: CalculateResponse, factor: FactorRef): string {
  const fact = resolveFact(factor, envelope, "technical");
  if (fact === null) throw new Error(`factor did not resolve: ${JSON.stringify(factor)}`);
  return factPanelA11yLabel(fact.sentence, fact.provisionalNote);
}

/** Flatten an element's style array into its numeric entries. */
function styleNumbers(element: { props: { style?: unknown } }): Record<string, number> {
  const flattened: Record<string, number> = {};
  const entries = element.props.style;
  for (const entry of Array.isArray(entries) ? entries : [entries]) {
    if (entry && typeof entry === "object") {
      for (const [key, value] of Object.entries(entry as Record<string, unknown>)) {
        if (typeof value === "number") flattened[key] = value;
      }
    }
  }
  return flattened;
}

/** Collect testIDs in document order under an element (order/assert law). */
function collectTestIds(node: {
  props?: { testID?: string };
  children: unknown[];
}): string[] {
  const markers: string[] = [];
  const visit = (current: { props?: { testID?: string }; children: unknown[] }) => {
    const testID = current.props?.testID;
    if (typeof testID === "string") markers.push(testID);
    for (const child of current.children) {
      if (child && typeof child === "object") visit(child as never);
    }
  };
  visit(node);
  return markers;
}

let render: typeof rtlRender;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let resolveFact: typeof import("@/components/chart/explore/fact-panel").resolveFact;
let ExploreScreen: typeof import("@/app/chart/explore").default;

beforeAll(async () => {
  ({ render, fireEvent, cleanup, act, waitFor } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ resolveFact } = await import("@/components/chart/explore/fact-panel"));
  ({ default: ExploreScreen } = await import("@/app/chart/explore"));
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
  paramsState.value = {};
  modeStore.set("@lemastra:explore.mode.v1", "technical");
});

beforeEach(() => {
  repository.isWorkspaceStorageAvailable.mockReturnValue(true);
});

/** Fresh retry-off QueryClient wrapper (saved-chart-detail.test.tsx law). */
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
}

function chartDetail(envelope: CalculateResponse): ChartDetail {
  return {
    chart: {
      chartId: "chart-1",
      label: "My saved chart",
      createdAt: new Date("2026-08-20T10:00:00Z"),
      updatedAt: new Date("2026-08-27T10:00:00Z"),
    },
    latest: {
      revisionId: "rev-2",
      inputRevision: "f40e2a1b3c4d",
      envelope,
      inputs: {} as ChartDetail["latest"]["inputs"],
      identity: {
        date: "1990-05-21",
        time: "14:32",
        label: "Lisbon, Portugal",
        zone_source: "google",
      },
      createdAt: new Date("2026-08-27T10:00:00Z"),
    },
    revisionCount: 2,
    revisions: [],
  };
}

/** Render the explore route with the given envelope (native surface). */
async function renderExplore(envelope: CalculateResponse) {
  repository.getChartDetail.mockResolvedValue(chartDetail(envelope));
  paramsState.value = { id: "chart-1" };
  const { Wrapper } = makeWrapper();
  const view = await render(
    <Wrapper>
      <ExploreScreen />
    </Wrapper>
  );
  await act(async () => {});
  await waitFor(() => expect(view.getByTestId("wheel-canvas")).toBeTruthy());
  return view;
}

// ---------------------------------------------------------------------------
// COUNT parity — one overlay element per geometry hit region
// ---------------------------------------------------------------------------

describe("wheel a11y overlay — count parity (WHEEL-05/D-12)", () => {
  it("renders exactly one overlay element per Timed hit region (8 planets, 12 signs, 12 houses, 4 angles, 4 aspects)", async () => {
    const view = await renderExplore(timedEnvelope);

    const overlayElements = view.getAllByTestId(/^wheel-a11y-/);
    expect(overlayElements.length).toBe(timedGeometry.hitRegions.length);
    expect(view.getAllByTestId(/^wheel-a11y-planet-/).length).toBe(8);
    expect(view.getAllByTestId(/^wheel-a11y-sign-/).length).toBe(12);
    expect(view.getAllByTestId(/^wheel-a11y-house-/).length).toBe(12);
    expect(view.getAllByTestId(/^wheel-a11y-angle-/).length).toBe(4);
    expect(view.getAllByTestId(/^wheel-a11y-aspect-/).length).toBe(4);
  });

  it("renders exactly one overlay element per Unknown-time hit region and NO house/angle elements (D-10 honesty)", async () => {
    const view = await renderExplore(unknownEnvelope);

    expect(view.getAllByTestId(/^wheel-a11y-/).length).toBe(unknownGeometry.hitRegions.length);
    expect(view.queryAllByTestId(/^wheel-a11y-house-/)).toEqual([]);
    expect(view.queryAllByTestId(/^wheel-a11y-angle-/)).toEqual([]);
    expect(view.getAllByTestId(/^wheel-a11y-planet-/).length).toBe(5);
    expect(view.getAllByTestId(/^wheel-a11y-aspect-/).length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// LABEL parity — overlay label === the panel's composed sentence
// ---------------------------------------------------------------------------

describe("wheel a11y overlay — label parity (A-UI-4/T-04-15)", () => {
  it("carries the panel's composed sentence for EVERY Timed factor (string equality)", async () => {
    const view = await renderExplore(timedEnvelope);

    for (const region of timedGeometry.hitRegions) {
      const element = view.getByTestId(overlayTid(region.factor));
      expect(
        element.props.accessibilityLabel,
        `overlay label for ${overlayTid(region.factor)}`
      ).toBe(expectedPanelLabel(timedEnvelope, region.factor));
    }

    // Literal pin — the deck-exact Sun sentence (the explore-surface
    // panel pin): one resolver, one degree split.
    expect(view.getByTestId("wheel-a11y-planet-Sun").props.accessibilityLabel).toBe(
      "Sun in Aries 26°39′, House 4, Direct motion, Dignities: Exaltation, absolute 26.65°"
    );
  });

  it("carries the panel's composed sentence for every Unknown-time factor, including the provisional Moon note (D-16 text redundancy)", async () => {
    const view = await renderExplore(unknownEnvelope);

    for (const region of unknownGeometry.hitRegions) {
      const element = view.getByTestId(overlayTid(region.factor));
      expect(
        element.props.accessibilityLabel,
        `overlay label for ${overlayTid(region.factor)}`
      ).toBe(expectedPanelLabel(unknownEnvelope, region.factor));
    }

    // The provisional noon-Moon's overlay label carries the reason
    // through the 04-02 uncertainty phrasing — never hue alone.
    const moonLabel = view.getByTestId("wheel-a11y-planet-Moon").props.accessibilityLabel as string;
    expect(moonLabel).toContain("Provisional");
    expect(moonLabel).toContain("Moon moves ~13°/day; position computed at the 12:00 noon reference.");
  });
});

// ---------------------------------------------------------------------------
// CANVAS hiding (Pattern 6) — decorative to screen readers, overlay reachable
// ---------------------------------------------------------------------------

describe("wheel a11y overlay — canvas hiding (A11Y-01, Pattern 6)", () => {
  it("hides the canvas wrapper with no-hide-descendants + accessibilityElementsHidden while the overlay stays outside it", async () => {
    const view = await renderExplore(timedEnvelope);

    const hidden = view.getByTestId("wheel-canvas-hidden");
    expect(hidden.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(hidden.props.accessibilityElementsHidden).toBe(true);

    // The wrapper actually contains the canvas (the hiding is real)…
    const hiddenSubtree = collectTestIds(hidden as never);
    expect(hiddenSubtree).toContain("wheel-canvas");
    // …and NOT one overlay element — the Pressables stay reachable.
    expect(hiddenSubtree.filter((id) => id.startsWith("wheel-a11y"))).toEqual([]);
    expect(view.getByTestId("wheel-a11y-overlay")).toBeTruthy();
    expect(view.getAllByTestId(/^wheel-a11y-/).length).toBe(timedGeometry.hitRegions.length);
  });
});

// ---------------------------------------------------------------------------
// POSITIONING — frames derive from the hit-region rects
// ---------------------------------------------------------------------------

describe("wheel a11y overlay — positioning from hit-region rects", () => {
  it("positions each element from its region's bounding rect scaled to the canvas square (planet circles pinned numerically)", async () => {
    const view = await renderExplore(timedEnvelope);

    const displaySize = styleNumbers(view.getByTestId("wheel-a11y-overlay")).width;
    expect(displaySize).toBeGreaterThan(0);
    const scale = displaySize / timedGeometry.size;

    const sun = timedGeometry.hitRegions.find(
      (region): region is Extract<HitRegion, { kind: "planet"; body: string }> =>
        region.kind === "planet" && region.body === "Sun"
    )!;
    // The A11Y minimum-target law: never smaller than 44px, grown
    // about the region's center.
    const side = Math.max(sun.radius * 2 * scale, 44);
    const frame = styleNumbers(view.getByTestId("wheel-a11y-planet-Sun"));
    expect(frame.width).toBeCloseTo(side, 5);
    expect(frame.height).toBeCloseTo(side, 5);
    expect(frame.left).toBeCloseTo(sun.center.x * scale - side / 2, 5);
    expect(frame.top).toBeCloseTo(sun.center.y * scale - side / 2, 5);

    // Sector regions position from their annulus bounding rects — a
    // 30° sign band sector spans a wide frame at any display size.
    const signFrame = styleNumbers(view.getByTestId("wheel-a11y-sign-Aries"));
    expect(signFrame.width).toBeGreaterThan(44);
    expect(signFrame.height).toBeGreaterThan(44);
    expect(signFrame.left).toBeGreaterThanOrEqual(-1);
    expect(signFrame.top).toBeGreaterThanOrEqual(-1);
  });
});

// ---------------------------------------------------------------------------
// SELECTED conveyance + identical outcome (runs LAST — one
// state-updating interaction per file, the 04-04 test-order law)
// ---------------------------------------------------------------------------

describe("wheel a11y overlay — selected conveyance + identical outcome", () => {
  it("activating an overlay element selects it, conveys selected state, announces the SAME sentence in the panel, and highlights the list row", async () => {
    const view = await renderExplore(timedEnvelope);

    const sun = view.getByTestId("wheel-a11y-planet-Sun");
    const pressedLabel = sun.props.accessibilityLabel as string;
    await act(async () => {
      fireEvent.press(sun);
    });

    // Selected state conveyed on the activated element (and only it).
    expect(sun.props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId("wheel-a11y-sign-Aries").props.accessibilityState).toEqual({
      selected: false,
    });

    // Identical outcome as a sighted tap: the panel announces exactly
    // the pressed element's label (string equality — A-UI-4)…
    expect(view.getByTestId("fact-panel").props.accessibilityLabel).toBe(pressedLabel);
    // …and the synchronized list row highlights (D-10).
    expect(view.getByTestId("evidence-row-planet-Sun").props.accessibilityState).toEqual({
      selected: true,
    });
  });
});
