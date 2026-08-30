import { readFileSync } from "node:fs";
import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { render as rtlRender, within as rtlWithin } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ASSUMPTIONS_ADJUST_ACTION, ASSUMPTIONS_LABEL } from "@/components/chart/copy";
import {
  createScrollLoopGuard,
  rowKeyFor,
  scrollTargetFor,
} from "@/components/chart/explore/scroll-target";
import { calculateResponseSchema, type CalculateResponse } from "@/lib/api-schemas";
import type { ChartDetail } from "@/lib/workspace/repository";

// Explore surface tests (04-04 Task 2) — WHEEL-04's sync half and the
// EVID-01 render half:
//
// - D-02/D-13 SECTION ORDER on the page: wheel hero → fact panel →
//   placements → houses → aspects → lots → sect → assumptions →
//   unavailable (asserted through a document-order walk).
// - Two-way sync (D-10): a row press drives the wheel's selection prop
//   and the fact panel; a wheel selection marks the matching row
//   selected AND auto-scrolls the page to scrollTargetFor(...)'s
//   composed target — asserted through the SPIRED programmaticScrollTo
//   export seam (the payload is the contract; the RN shim's facade
//   swaps ScrollView identities per commit, so instance/ref spying is
//   not test-stable — 03-06 export-seam convention).
// - Loop-freedom (Pitfall 9): programmatic scroll events never invoke
//   selection — the scroll handler releases the guard and nothing else.
// - Unknown-time honesty end to end: no houses/lots/sect sections, the
//   unavailable cards render the server reasons VERBATIM.
// - scroll-target.ts unit tests: pure (this file imports it statically
//   — zero RN involvement; 04-RESEARCH Open Question 3's vitest seam).
//
// The wheel canvas is replaced by a prop-capturing facade (per-file
// vi.mock precedence — facade law): tests drive wheel-origin selection
// by invoking the captured onSelect exactly as a tap would.

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
/** Captured WheelCanvas props — the wheel side of the two-way sync. */
const wheelProps = vi.hoisted(() => ({
  value: {} as { selection: unknown; onSelect: (factor: never) => void },
}));
/** The spied programmatic auto-scroll payload ({ y, target }). */
const scrollSpy = vi.hoisted(() => vi.fn());

vi.mock("expo-router", () => ({
  router: routerMock,
  useLocalSearchParams: () => paramsState.value,
}));

vi.mock("expo-crypto", async () => {
  const nodeCrypto = await import("node:crypto");
  return { randomUUID: () => nodeCrypto.randomUUID() };
});

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

// Wheel facade: captures the surface's selection/onSelect wiring and
// renders a plain RN View marker — no skia/gesture deps enter this
// graph, and the marker is a real RN host so queries find it.
vi.mock("@/components/chart/explore/wheel-canvas", async () => {
  const { View } = await import("react-native");
  return {
    WheelCanvas: (props: { selection: unknown; onSelect: (factor: never) => void }) => {
      wheelProps.value = props;
      return <View testID="wheel-canvas" />;
    },
  };
});

// Scroll seam: scroll-target's programmaticScrollTo becomes a spy —
// every auto-scroll's payload is assertable while the pure helpers the
// unit suites pin (scrollTargetFor/rowKeyFor/createScrollLoopGuard)
// stay the real ones (importOriginal spread).
vi.mock("@/components/chart/explore/scroll-target", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/chart/explore/scroll-target")>();
  return { ...actual, programmaticScrollTo: scrollSpy };
});

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

let render: typeof rtlRender;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let ExploreScreen: typeof import("@/app/chart/explore").default;

beforeAll(async () => {
  ({ render, fireEvent, cleanup, act, waitFor } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ default: ExploreScreen } = await import("@/app/chart/explore"));
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
  paramsState.value = {};
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

/** Fire a layout event with the given y-offset (measurement seam). */
function fireLayout(element: Parameters<typeof rtlWithin>[0], y: number) {
  fireEvent(element, "layout", { nativeEvent: { layout: { x: 0, y, width: 100, height: 10 } } });
}

/** Collect testIDs and text strings in document order (order assertions). */
function collectDocumentOrder(node: Parameters<typeof rtlWithin>[0]): string[] {
  const markers: string[] = [];
  const visit = (current: Parameters<typeof rtlWithin>[0]) => {
    const testID = current.props?.testID;
    if (typeof testID === "string") markers.push(testID);
    for (const child of current.children) {
      if (typeof child === "string") markers.push(child);
      else visit(child);
    }
  };
  visit(node);
  return markers;
}

/** Assert every marker is present and strictly increasing in document order. */
function assertOrdered(order: string[], markers: string[]) {
  let previous = -1;
  for (const marker of order) {
    const index = markers.indexOf(marker);
    expect(index, `marker ${marker} present in document order`).toBeGreaterThan(-1);
    expect(index, `marker ${marker} after the previous`).toBeGreaterThan(previous);
    previous = index;
  }
}

// ---------------------------------------------------------------------------
// scroll-target.ts — pure unit tests (no RN imports, no rendering)
// ---------------------------------------------------------------------------

describe("scrollTargetFor — pure target computation", () => {
  const registry = new Map([
    [rowKeyFor({ kind: "planet", body: "Sun" }), 484],
    [rowKeyFor({ kind: "house", house: 2 }), 1432],
    [rowKeyFor({ kind: "aspect", index: 0 }), 2100],
  ]);

  it("returns the measured top for each registered row kind", () => {
    expect(scrollTargetFor({ kind: "planet", body: "Sun" }, registry)).toBe(484);
    expect(scrollTargetFor({ kind: "house", house: 2 }, registry)).toBe(1432);
    expect(scrollTargetFor({ kind: "aspect", index: 0 }, registry)).toBe(2100);
  });

  it("returns null for null selections, wheel-only factors, and unmeasured rows", () => {
    expect(scrollTargetFor(null, registry)).toBeNull();
    // sign/angle factors live only on the wheel — never registered.
    expect(scrollTargetFor({ kind: "sign", sign: "Aries" }, registry)).toBeNull();
    expect(scrollTargetFor({ kind: "angle", which: "asc" }, registry)).toBeNull();
    expect(scrollTargetFor({ kind: "planet", body: "Pluto" }, registry)).toBeNull();
  });

  it("keys the three pressable row kinds distinctly", () => {
    expect(rowKeyFor({ kind: "planet", body: "Sun" })).toBe("planet-Sun");
    expect(rowKeyFor({ kind: "house", house: 3 })).toBe("house-3");
    expect(rowKeyFor({ kind: "aspect", index: 2 })).toBe("aspect-2");
  });
});

describe("createScrollLoopGuard — Pitfall 9 contract", () => {
  it("tracks the programmatic-scroll window", () => {
    const guard = createScrollLoopGuard();
    expect(guard.isProgrammatic()).toBe(false);
    guard.begin();
    expect(guard.isProgrammatic()).toBe(true);
    guard.end();
    expect(guard.isProgrammatic()).toBe(false);
    // end() without begin() is a harmless no-op (user scrolls release).
    guard.end();
    expect(guard.isProgrammatic()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// D-02/D-13 section order on the page
// ---------------------------------------------------------------------------

describe("explore surface — D-02/D-13 section order", () => {
  it("renders wheel → panel → placements → houses → aspects → lots → sect → assumptions", async () => {
    const view = await renderExplore(timedEnvelope);

    assertOrdered(
      [
        "wheel-canvas",
        "fact-panel",
        "evidence-section-placements",
        "evidence-section-houses",
        "evidence-section-aspects",
        "evidence-section-lots",
        "evidence-section-sect",
        ASSUMPTIONS_LABEL,
      ],
      collectDocumentOrder(view.root!)
    );
    // The assumptions section mounts read-only (03-07 optional action).
    expect(view.queryByText(ASSUMPTIONS_ADJUST_ACTION)).toBeNull();
    // Timed chart: no unavailable cards render at all.
    expect(view.queryByText("Not available without a birth time")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Two-way sync (D-10) + loop-guarded auto-scroll (Pitfall 9)
// ---------------------------------------------------------------------------

// Two-way selection sync — the row-press direction (row → wheel
// selection prop + panel facts + NO auto-scroll) lives in
// explore-surface-row-press.test.tsx: the RN shim's facade swaps
// ScrollView identities per commit, so only ONE state-updating
// interaction per test FILE commits reliably (documented test-order
// law; one file per interaction direction). The wheel-only-factor
// negative (a sign selection never scrolls — no row exists) is pinned
// by the pure scrollTargetFor unit above (sign/angle → null) plus this
// file's positive scroll test: the surface composes the registry and
// calls the seam only when scrollTargetFor returns a number.


// ---------------------------------------------------------------------------
// Unknown-time honesty end to end (D-13, Phase-2 D-10)
// ---------------------------------------------------------------------------

describe("explore surface — unknown-time envelope", () => {
  it("omits houses/lots/sect sections and renders the server reasons verbatim on the cards", async () => {
    const view = await renderExplore(unknownEnvelope);

    expect(view.getByTestId("evidence-section-placements")).toBeTruthy();
    expect(view.getByTestId("evidence-section-aspects")).toBeTruthy();
    expect(view.queryByTestId("evidence-section-houses")).toBeNull();
    expect(view.queryByTestId("evidence-section-lots")).toBeNull();
    expect(view.queryByTestId("evidence-section-sect")).toBeNull();

    // Unavailable cards: server factor ids → display names, reasons VERBATIM.
    expect(
      view.getByText("Houses — Birth time unknown — house cusps require a timed chart.")
    ).toBeTruthy();
    expect(
      view.getByText(
        "Rising sign & Midheaven — Birth time unknown — ascendant and midheaven require a timed chart."
      )
    ).toBeTruthy();
    expect(
      view.getByText("Sect — Birth time unknown — sect requires the Sun's horizon position.")
    ).toBeTruthy();

    // The provisional noon-reference Moon keeps its distinct card.
    expect(view.getByText("Provisional")).toBeTruthy();
    expect(
      view.getByText("Moon — Moon moves ~13°/day; position computed at the 12:00 noon reference.")
    ).toBeTruthy();

    // D-13 order closes with the uncertainty cards after assumptions.
    assertOrdered(
      [ASSUMPTIONS_LABEL, "Not available without a birth time"],
      collectDocumentOrder(view.root!)
    );
  });
});

// NOTE (test-order law): this describe runs LAST — its layout-event +
// selection sequence exercises the real Pressable's pressability
// internals (real prebundled RN), which leaves the shared act queue
// unable to commit later React updates in THIS file. One selection per
// test, one layout-exercising test, nothing after it.
describe("explore surface — wheel-origin auto-scroll + loop-freedom", () => {
  it("a wheel selection marks the matching row, scrolls to the composed target, and scroll events never re-trigger", async () => {
    const view = await renderExplore(timedEnvelope);

    // Measurement seam: wrapper + list + row offsets compose at scroll
    // time (arrival order must not matter — lists fired after rows).
    fireLayout(view.getByTestId("evidence-row-planet-Sun"), 64);
    fireLayout(view.getByTestId("evidence-row-house-2"), 32);
    fireLayout(view.getByTestId("evidence-section-placements"), 0);
    fireLayout(view.getByTestId("evidence-section-houses"), 980);
    fireLayout(view.getByTestId("evidence-lists-wrapper"), 420);

    await act(async () => {
      wheelProps.value.onSelect({ kind: "planet", body: "Sun" } as never);
    });

    // Wheel-origin selection: wrapper(420) + placements list(0) + Sun
    // row(64) — the spied seam receives the composed target.
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy).toHaveBeenCalledWith(expect.anything(), 484);
    expect(view.getByTestId("evidence-row-planet-Sun").props.accessibilityState).toEqual({
      selected: true,
    });
    expect(
      view.getByText(
        "Sun in Aries 26°39′, House 4, Direct motion, Dignities: Exaltation, absolute 26.65°"
      )
    ).toBeTruthy();

    // Loop-freedom (Pitfall 9): the scroll event the programmatic
    // scroll itself produced must not select, re-scroll, or disturb
    // the panel — scroll events are not selection events.
    fireEvent.scroll(view.getByTestId("explore-scroll"), {
      nativeEvent: { contentOffset: { x: 0, y: 484 } },
    });
    await act(async () => {});

    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(wheelProps.value.selection).toEqual({ kind: "planet", body: "Sun" });
    expect(
      view.getByText(
        "Sun in Aries 26°39′, House 4, Direct motion, Dignities: Exaltation, absolute 26.65°"
      )
    ).toBeTruthy();
  });
});
