import { readFileSync } from "node:fs";
import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { render as rtlRender } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { calculateResponseSchema, type CalculateResponse } from "@/lib/api-schemas";
import type { ChartDetail } from "@/lib/workspace/repository";

// Explore surface ROW-PRESS direction (04-04 Task 2, companion of
// explore-surface.test.tsx): tapping an evidence row drives the SAME
// shared selection the wheel drives (D-10) — the wheel's selection prop
// updates and the fact panel renders the row's exact envelope facts —
// while the pressed row (already visible under the finger) triggers NO
// programmatic auto-scroll.
//
// Why its own file (test-order law): the RN vitest shim's facade swaps
// ScrollView component identities per commit; only ONE state-updating
// interaction per test FILE commits reliably. One file per interaction
// direction — this file owns the row→wheel half, explore-surface owns
// the wheel→row auto-scroll half.

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  navigate: vi.fn(),
}));
// 04-06: pre-seed the explore mode to "technical" (in-memory
// AsyncStorage seam) — this suite pins the full-depth panel sentence,
// and the unmocked-graph default is now Simple (explore-mode.test.tsx
// owns the mode behavior itself).
const modeStore = vi.hoisted(
  () => new Map<string, string>([["@lemastra:explore.mode.v1", "technical"]])
);
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
/** The spied programmatic auto-scroll payload. */
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
// renders a plain RN View marker — no skia/gesture deps enter this graph.
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
// the row-press direction must NEVER invoke it.
vi.mock("@/components/chart/explore/scroll-target", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/chart/explore/scroll-target")>();
  return { ...actual, programmaticScrollTo: scrollSpy };
});

// Fixture envelope — the frozen Timed golden.
const timedEnvelope: CalculateResponse = calculateResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../test/fixtures/frozen-natal-envelope.json", import.meta.url), "utf8")
  )
);

function chartDetail(): ChartDetail {
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
      envelope: timedEnvelope,
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

describe("explore surface — row press drives the shared selection", () => {
  it("updates the wheel selection prop and the fact panel, and does NOT auto-scroll", async () => {
    repository.getChartDetail.mockResolvedValue(chartDetail());
    paramsState.value = { id: "chart-1" };
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const view = await render(
      <Wrapper>
        <ExploreScreen />
      </Wrapper>
    );
    await act(async () => {});
    await waitFor(() => expect(view.getByTestId("wheel-canvas")).toBeTruthy());

    // 03-05 law: presses on query-mounted screens go through
    // fireEvent.press on the accessible host.
    fireEvent.press(view.getByTestId("evidence-row-planet-Moon"));
    await act(async () => {});

    // D-10: the SAME selection the wheel drives.
    expect(wheelProps.value.selection).toEqual({ kind: "planet", body: "Moon" });
    expect(
      view.getByText("Moon in Leo 12°30′, House 8, Direct motion, absolute 142.5°")
    ).toBeTruthy();
    // The pressed row also reports its own selected state.
    expect(view.getByTestId("evidence-row-planet-Moon").props.accessibilityState).toEqual({
      selected: true,
    });
    // The pressed row is already visible — no programmatic scroll.
    expect(scrollSpy).not.toHaveBeenCalled();
  });
});
