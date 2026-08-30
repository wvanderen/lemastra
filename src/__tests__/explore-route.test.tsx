import { readFileSync } from "node:fs";
import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { render as rtlRender } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { FACT_PANEL_IDLE } from "@/components/chart/explore/copy";
import { LOADING_CHART, OPEN_FAILED_ERROR_COPY, WEB_UNSUPPORTED_HEADING } from "@/components/workspace/copy";
import { calculateResponseSchema, type CalculateResponse } from "@/lib/api-schemas";
import type { ChartDetail, RevisionRead } from "@/lib/workspace/repository";

// /chart/explore route tests (04-03 Task 3) — the D-01 exploration
// surface: id/revision params ONLY (repository lookup keys, never an
// envelope through router params — T-03-16), the saved.tsx state-screen
// law (loading → typed OPEN_FAILED card → never-partial content), the
// D-02 native composition (wheel hero + fact panel, one shared
// selection), and the D-04 web posture (capability card, ZERO canvas).
//
// Test mechanics: RNTL /pure, expo-router mocked, repository faked at
// the D-03 seam (importOriginal spread — the real WorkspaceError class
// preserved), renders wrapped in a fresh retry-off QueryClient. The
// wheel's native deps (RNGH/reanimated/worklets) get per-file mocks
// (facade law) so the canvas mounts device-free through the skia
// facade; the web case swaps Platform.OS and restores it.

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

// Per-file gesture/native mocks (facade law — the wheel canvas mounts
// device-free; the tap handler itself is covered by
// wheel-selection.test.tsx).
vi.mock("react-native-gesture-handler", () => ({
  Gesture: {
    Tap: () => ({
      onEnd() {
        return this;
      },
    }),
    // 04-05: the canvas composes Pan + Pinch with the Tap — inert
    // surface only (the zoom shell is covered by wheel-zoom.test.tsx).
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

// Fixture envelope — the frozen Timed golden (houses, angles, aspects),
// parsed through the same schema the repository edge enforces.
const frozenEnvelope: CalculateResponse = calculateResponseSchema.parse(
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
      envelope: frozenEnvelope,
      inputs: {} as ChartDetail["latest"]["inputs"],
      identity: { date: "1990-05-21", time: "14:32", label: "Lisbon, Portugal", zone_source: "google" },
      createdAt: new Date("2026-08-27T10:00:00Z"),
    },
    revisionCount: 2,
    revisions: [],
  };
}

function revisionRead(): RevisionRead {
  return {
    chartId: "chart-1",
    label: "My saved chart",
    revision: {
      revisionId: "rev-1",
      inputRevision: "f40e2a1b3c4d",
      envelope: frozenEnvelope,
      inputs: {} as RevisionRead["revision"]["inputs"],
      identity: { date: "1990-05-21", time: "14:32", label: "Lisbon, Portugal", zone_source: "google" },
      createdAt: new Date("2026-08-20T10:00:00Z"),
    },
    createdAt: new Date("2026-08-20T10:00:00Z"),
  };
}

let render: typeof rtlRender;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let Platform: typeof import("react-native").Platform;
let WorkspaceError: typeof import("@/lib/workspace/repository").WorkspaceError;
let ExploreScreen: typeof import("@/app/chart/explore").default;

beforeAll(async () => {
  ({ render, cleanup, act, waitFor } = await import("@testing-library/react-native/pure"));
  ({ Platform } = await import("react-native"));
  ({ WorkspaceError } = await import("@/lib/workspace/repository"));
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

async function renderExplore(params: Record<string, string> = {}) {
  paramsState.value = params;
  const { Wrapper } = makeWrapper();
  const view = await render(
    <Wrapper>
      <ExploreScreen />
    </Wrapper>
  );
  await act(async () => {});
  return view;
}

// ---------------------------------------------------------------------------
// State screens — the saved.tsx law, mirrored exactly
// ---------------------------------------------------------------------------

describe("explore route — state screens", () => {
  it("renders centered 'Loading chart…' and nothing else while the repository read is pending", async () => {
    repository.getChartDetail.mockReturnValue(new Promise(() => undefined));
    const view = await renderExplore({ id: "chart-1" });

    expect(view.getByText(LOADING_CHART)).toBeTruthy();
    expect(view.queryByTestId("wheel-canvas")).toBeNull();
    expect(view.queryByTestId("fact-panel")).toBeNull();
    expect(repository.getChartDetail).toHaveBeenCalledWith("chart-1");
  });

  it("renders the typed open-failed error card on a WorkspaceError read — never a partial render", async () => {
    repository.getChartDetail.mockRejectedValue(
      new WorkspaceError({ code: "OPEN_FAILED", message: "storage engine failed" })
    );
    const view = await renderExplore({ id: "chart-1" });

    await waitFor(() => expect(view.getByTestId("explore-error")).toBeTruthy());
    expect(view.getByText(OPEN_FAILED_ERROR_COPY.heading)).toBeTruthy();
    expect(view.queryByTestId("wheel-canvas")).toBeNull();
  });

  it("redirects home when the repository returns null (unknown chart id)", async () => {
    repository.getChartDetail.mockResolvedValue(null);
    const view = await renderExplore({ id: "chart-404" });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/"));
    expect(view.queryByTestId("wheel-canvas")).toBeNull();
  });

  it("redirects home when the id param is missing and never reaches the repository", async () => {
    const view = await renderExplore({});

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/"));
    expect(repository.getChartDetail).not.toHaveBeenCalled();
    expect(repository.getRevisionContent).not.toHaveBeenCalled();
  });

  it("redirects home for an unknown revision id (repository null)", async () => {
    repository.getRevisionContent.mockResolvedValue(null);
    await renderExplore({ id: "chart-1", revision: "rev-404" });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/"));
    expect(repository.getRevisionContent).toHaveBeenCalledWith("rev-404");
  });
});

// ---------------------------------------------------------------------------
// Native content — the D-02 composition (wheel hero + panel, D-09/D-10)
// ---------------------------------------------------------------------------

describe("explore route — native content", () => {
  it("mounts the wheel hero at the top with the fact panel below, fed by one shared selection", async () => {
    repository.getChartDetail.mockResolvedValue(chartDetail());
    const view = await renderExplore({ id: "chart-1" });

    // 04-07: the canvas lives under the Pattern-6 a11y-hiding wrapper,
    // so RNTL excludes it from default queries — the visible fact
    // panel is the content-mounted marker.
    await waitFor(() => expect(view.getByTestId("fact-panel")).toBeTruthy());
    // Idle panel until a factor is selected (D-09).
    expect(view.getByText(FACT_PANEL_IDLE)).toBeTruthy();
  });

  it("reads the latest revision envelope through useWorkspaceChart — zero network", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    repository.getChartDetail.mockResolvedValue(chartDetail());

    const view = await renderExplore({ id: "chart-1" });
    await waitFor(() => expect(view.getByTestId("fact-panel")).toBeTruthy());
    await act(async () => {});

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(repository.getChartDetail).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("reads the specified revision through useRevisionContent when ?revision= is present", async () => {
    repository.getRevisionContent.mockResolvedValue(revisionRead());
    const view = await renderExplore({ id: "chart-1", revision: "rev-1" });

    await waitFor(() => expect(view.getByTestId("fact-panel")).toBeTruthy());
    expect(repository.getRevisionContent).toHaveBeenCalledWith("rev-1");
    expect(repository.getChartDetail).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Web posture (D-04) — capability card, ZERO canvas
// ---------------------------------------------------------------------------

describe("explore route — web branch", () => {
  it("renders the WebUnsupported capability card and mounts no wheel canvas on web", async () => {
    repository.getChartDetail.mockReturnValue(new Promise(() => undefined));
    const originalOS = Platform.OS;
    Platform.OS = "web";
    try {
      const view = await renderExplore({ id: "chart-1" });
      await act(async () => {});

      expect(view.getByText(WEB_UNSUPPORTED_HEADING)).toBeTruthy();
      expect(view.queryByTestId("wheel-canvas")).toBeNull();
      expect(view.queryByTestId("fact-panel")).toBeNull();
    } finally {
      Platform.OS = originalOS;
    }
  });
});
