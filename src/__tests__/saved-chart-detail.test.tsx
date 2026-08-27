import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { render as rtlRender } from "@testing-library/react-native/pure";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resultIdentityLine } from "@/components/birth/copy";
import {
  ASSUMPTIONS_LABEL,
  CALCULATION_DETAILS_HEADER,
  PLACEMENTS_HEADING,
  UNAVAILABLE_HEADING,
} from "@/components/chart/copy";
import {
  EXPORT_CHART_DATA,
  EXPORT_CHART_HELPER,
  EXPORT_ERROR_COPY,
  EXPORT_PENDING,
  LOADING_CHART,
  OPEN_FAILED_ERROR_COPY,
  WEB_UNSUPPORTED_HEADING,
} from "@/components/workspace/copy";
import type { ChartDetail, ChartListItem } from "@/lib/workspace/repository";
import type { CalculateResponse } from "@/lib/api-schemas";

// Saved-chart detail tests (03-05 Task 3) — the WORK-03 reopen route:
// /chart/saved?id= reads the chart from the repository by id, re-parses
// the stored envelope (parse-then-trust already enforced at the
// repository edge), and renders the Phase-2 composition from stored
// evidence ONLY.
//
// Contract under test (plan behavior rows):
// - The route takes the chartId (id param) ONLY; while the repository
//   read is pending it renders centered "Loading chart…" and nothing
//   else (T-03-17: no first-render race content).
// - Success: Display title = chart label, identity line from stored
//   identity + confidence, then PlacementList → AssumptionsLine →
//   ProvenanceDetails → validation status → UnavailableFactors — the
//   result-screen composition, all from the latest revision's stored
//   envelope.
// - Reopen makes ZERO network calls (D-02/T-03-15) — global fetch is
//   stubbed and asserted never called through a full render.
// - Repository null (unknown id) → back to home; a missing id param
//   never reaches the repository.
// - WorkspaceError OPEN_FAILED → the typed "Couldn't open this saved
//   chart." error card — never a partial render, never a redirect to
//   /birth.
// - Back from detail returns home with the list intact (query cache —
//   the home list is served without a second repository call).
//
// Test mechanics: RNTL /pure, expo-router mocked, repository faked at
// the D-03 seam with the REAL WorkspaceError class preserved
// (importOriginal spread — the result-screen expo-crypto stand-in keeps
// the ids module loadable). Renders wrap in a fresh retry-off
// QueryClient; staleTime mirrors the provider floor (30s) so the
// cache test reflects production behavior.

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  navigate: vi.fn(),
}));
const paramsState = vi.hoisted(() => ({ value: {} as Record<string, string | string[]> }));
const repository = vi.hoisted(() => ({
  saveChart: vi.fn(),
  listCharts: vi.fn(),
  getChartDetail: vi.fn(),
  isWorkspaceStorageAvailable: vi.fn(),
}));

vi.mock("expo-router", () => ({
  router: routerMock,
  useLocalSearchParams: () => paramsState.value,
}));

// The ids module pulls expo-crypto (native entry) — node:crypto UUIDv4
// stand-in, the result-screen.test.tsx convention.
vi.mock("expo-crypto", async () => {
  const nodeCrypto = await import("node:crypto");
  return { randomUUID: () => nodeCrypto.randomUUID() };
});

// D-03 seam fake with the real typed-error class preserved so error
// fixtures construct exactly as the repository throws them.
vi.mock("@/lib/workspace/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/workspace/repository")>();
  return {
    ...actual,
    saveChart: repository.saveChart,
    listCharts: repository.listCharts,
    getChartDetail: repository.getChartDetail,
    isWorkspaceStorageAvailable: repository.isWorkspaceStorageAvailable,
  };
});

// The export module pulls expo-file-system/expo-sharing (device APIs —
// no vitest alias); the screen imports it for the D-13 flow, so the
// seam is mocked here. buildExportPayload stays the real pure builder
// so the captured payload reflects the true export document.
const exportModule = vi.hoisted(() => ({
  exportChartRevision: vi.fn(),
}));
vi.mock("@/lib/workspace/export", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/workspace/export")>();
  return {
    ...actual,
    exportChartRevision: exportModule.exportChartRevision,
  };
});

let render: typeof rtlRender;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let WorkspaceError: typeof import("@/lib/workspace/repository").WorkspaceError;
let Home: typeof import("@/app/index").default;
let SavedChartScreen: typeof import("@/app/chart/saved").default;

beforeAll(async () => {
  ({ render, cleanup, act, fireEvent, waitFor } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ WorkspaceError } = await import("@/lib/workspace/repository"));
  ({ default: Home } = await import("@/app/index"));
  ({ default: SavedChartScreen } = await import("@/app/chart/saved"));
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  paramsState.value = {};
});

beforeEach(() => {
  repository.isWorkspaceStorageAvailable.mockReturnValue(true);
});

/** Fresh retry-off QueryClient wrapper; staleTime mirrors the provider floor. */
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

// ---------------------------------------------------------------------------
// Fixtures — stored-chart detail (Unknown-confidence envelope so the
// full Phase-2 composition, including UnavailableFactors, renders)
// ---------------------------------------------------------------------------

const PROVENANCE = {
  skill_revision: "660d992",
  swisseph_version: "2.10.03",
  tzdata_version: "2026.3",
  schema_version: "chart-input v1",
  ephemeris_mode: "Moshier (built-in)",
  house_system: "Whole Sign",
  zodiac_mode: "tropical",
  orb_policy: "standard",
  input_revision: "abc123def456",
  calculator_cmd: "python tools/birth_to_chart.py --input <temp-json> --validate",
} as const;

function unknownEnvelope(): CalculateResponse {
  return {
    reading_type: "natal",
    chart_data: {
      placements: [
        { body: "Mars", sign: "Leo", degree: 10.0, absolute_degree: 130.0, motion: "retrograde" },
      ],
      birth_time_confidence: "Unknown",
    },
    provenance: { ...PROVENANCE },
    unavailable_factors: [
      { factor: "houses", reason: "Requires a birth time" },
      { factor: "ascendant_mc", reason: "Requires a birth time" },
      { factor: "sect", reason: "Requires sunrise/sunset timing" },
      { factor: "lots", reason: "Lot of Fortune requires the Ascendant" },
    ],
    provisional_factors: [
      { factor: "moon", reason: "Moon moves ~13°/day; degree may shift without a known time" },
    ],
  };
}

const STORED_INPUTS = {
  date: "1990-05-21",
  time: "",
  confidence: "Unknown",
  house_system: "Whole Sign",
  place: { label: "Lisbon, Portugal", lat: 38.7223, lon: -9.1393 },
  place_form: {
    source: "google",
    label: "Lisbon, Portugal",
    lat: 38.7223,
    lon: -9.1393,
    location_type: "ROOFTOP",
    place_id: "p1",
  },
  iana_zone: "Europe/Lisbon",
  zone_source: "google",
} as const;

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
      inputRevision: "abc123def456",
      envelope: unknownEnvelope(),
      inputs: { ...STORED_INPUTS },
      identity: { date: "1990-05-21", time: "", label: "Lisbon, Portugal", zone_source: "google" },
      createdAt: new Date("2026-08-27T10:00:00Z"),
    },
    revisionCount: 2,
    revisions: [
      {
        revisionId: "rev-1",
        createdAt: new Date("2026-08-20T10:00:00Z"),
        inputRevision: "fff000111222",
        inputs: { ...STORED_INPUTS },
      },
      {
        revisionId: "rev-2",
        createdAt: new Date("2026-08-27T10:00:00Z"),
        inputRevision: "abc123def456",
        inputs: { ...STORED_INPUTS },
      },
    ],
  };
}

const LIST_ROWS: ChartListItem[] = [
  {
    chartId: "chart-1",
    label: "My saved chart",
    date: "1990-05-21",
    placeLabel: "Lisbon, Portugal",
    confidence: "Unknown",
    revisionCount: 2,
    updatedAt: new Date("2026-08-27T10:00:00Z"),
  },
];

/** Flatten the rendered JSON tree into document-order text nodes. */
type JsonNode = string | { children?: JsonNode[] } | JsonNode[] | null | undefined;

function collectTexts(node: JsonNode): string[] {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(collectTexts);
  if (node && typeof node === "object") return collectTexts(node.children ?? []);
  return [];
}

/** Assert each text appears, in strictly increasing document order. */
function expectInOrder(view: Awaited<ReturnType<typeof render>>, texts: string[]): void {
  const flattened = collectTexts(view.toJSON());
  let previous = -1;
  for (const text of texts) {
    const index = flattened.indexOf(text);
    expect(index, `expected "${text}" to render (order pass)`).toBeGreaterThan(-1);
    expect(index, `expected "${text}" after the previous section`).toBeGreaterThan(previous);
    previous = index;
  }
}

async function renderSaved(id?: string) {
  paramsState.value = id === undefined ? {} : { id };
  const { Wrapper } = makeWrapper();
  const view = await render(
    <Wrapper>
      <SavedChartScreen />
    </Wrapper>
  );
  await act(async () => {});
  return view;
}

// ---------------------------------------------------------------------------
// Loading state (T-03-17)
// ---------------------------------------------------------------------------

describe("saved-chart detail — loading", () => {
  it("renders centered 'Loading chart…' and nothing else while the repository read is pending", async () => {
    repository.getChartDetail.mockReturnValue(new Promise(() => undefined));
    const view = await renderSaved("chart-1");

    expect(view.getByText(LOADING_CHART)).toBeTruthy();
    expect(view.queryByText("My saved chart")).toBeNull();
    expect(view.queryByText(PLACEMENTS_HEADING)).toBeNull();
    expect(repository.getChartDetail).toHaveBeenCalledWith("chart-1");
  });
});

// ---------------------------------------------------------------------------
// Success — the Phase-2 composition from stored evidence (WORK-03)
// ---------------------------------------------------------------------------

describe("saved-chart detail — reopen from the repository", () => {
  it("renders label title, stored identity line, then the full Phase-2 composition in order", async () => {
    repository.getChartDetail.mockResolvedValue(chartDetail());
    const view = await renderSaved("chart-1");

    await waitFor(() => expect(view.getByText("My saved chart")).toBeTruthy());

    expectInOrder(view, [
      "My saved chart", // Display title = chart label
      resultIdentityLine(
        { date: "1990-05-21", time: "", label: "Lisbon, Portugal" },
        "Unknown"
      ),
      PLACEMENTS_HEADING,
      ASSUMPTIONS_LABEL,
      CALCULATION_DETAILS_HEADER,
      `Validated — passed chart schema ${PROVENANCE.schema_version}`,
      UNAVAILABLE_HEADING,
    ]);
  });

  it("makes ZERO network calls while reopening (D-02 — stored envelope is the evidence)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    repository.getChartDetail.mockResolvedValue(chartDetail());

    const view = await renderSaved("chart-1");
    await waitFor(() => expect(view.getByText(UNAVAILABLE_HEADING)).toBeTruthy());
    await act(async () => {});

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(repository.getChartDetail).toHaveBeenCalledTimes(1);
    expect(repository.getChartDetail).toHaveBeenCalledWith("chart-1");
  });
});

// ---------------------------------------------------------------------------
// Failure surfaces — typed, never partial, never a /birth redirect
// ---------------------------------------------------------------------------

describe("saved-chart detail — failure surfaces", () => {
  it("redirects home when the repository returns null (unknown chart id)", async () => {
    repository.getChartDetail.mockResolvedValue(null);
    const view = await renderSaved("chart-404");

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/"));
    expect(view.queryByText("My saved chart")).toBeNull();
    expect(view.queryByText(LOADING_CHART)).toBeNull();
  });

  it("redirects home for a missing id param without touching the repository", async () => {
    const view = await renderSaved(undefined);

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/"));
    expect(repository.getChartDetail).not.toHaveBeenCalled();
    expect(view.toJSON()).toBeNull();
  });

  it("renders the typed open-failed error card for a stored envelope that fails parse — never a partial render, never a /birth redirect", async () => {
    repository.getChartDetail.mockRejectedValue(
      new WorkspaceError({
        code: "OPEN_FAILED",
        message: "A saved revision failed its stored contract on read.",
      })
    );
    const view = await renderSaved("chart-1");

    await waitFor(() =>
      expect(view.getByText(OPEN_FAILED_ERROR_COPY.heading)).toBeTruthy()
    );
    const body = OPEN_FAILED_ERROR_COPY.body;
    if (!body) throw new Error("OPEN_FAILED_ERROR_COPY must define a body");
    expect(view.getByText(body)).toBeTruthy();

    // Never partial: no chart content rendered beside the error card.
    expect(view.queryByText(PLACEMENTS_HEADING)).toBeNull();
    expect(view.queryByText("My saved chart")).toBeNull();
    // Never a redirect into the birth flow for a saved chart.
    expect(routerMock.replace).not.toHaveBeenCalledWith("/birth");
  });
});

// ---------------------------------------------------------------------------
// Back-navigation cache — home list survives the detail round-trip
// ---------------------------------------------------------------------------

describe("back from detail returns home with the list intact (query cache)", () => {
  it("serves the home list from cache after a detail round-trip on one client", async () => {
    repository.listCharts.mockResolvedValue(LIST_ROWS);
    repository.getChartDetail.mockResolvedValue(chartDetail());

    // 1. Home with a populated list.
    const { Wrapper } = makeWrapper();
    paramsState.value = {};
    const home1 = await render(
      <Wrapper>
        <Home />
      </Wrapper>
    );
    await waitFor(() => expect(home1.getByText("My saved chart")).toBeTruthy());
    await cleanup();

    // 2. Detail by id.
    paramsState.value = { id: "chart-1" };
    const detail = await render(
      <Wrapper>
        <SavedChartScreen />
      </Wrapper>
    );
    await waitFor(() => expect(detail.getByText(UNAVAILABLE_HEADING)).toBeTruthy());
    await cleanup();

    // 3. Home again — the cached list renders without a second fetch.
    paramsState.value = {};
    const home2 = await render(
      <Wrapper>
        <Home />
      </Wrapper>
    );
    await waitFor(() => expect(home2.getByText("My saved chart")).toBeTruthy());

    expect(repository.listCharts).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Data actions — export wiring (WORK-07, D-13)
// ---------------------------------------------------------------------------

describe("saved-chart detail — export chart data", () => {
  beforeEach(() => {
    repository.isWorkspaceStorageAvailable.mockReturnValue(true);
    exportModule.exportChartRevision.mockReset().mockResolvedValue({ status: "shared" });
  });

  it("renders the data-actions card with the export row and its helper", async () => {
    repository.getChartDetail.mockResolvedValue(chartDetail());
    const view = await renderSaved("chart-1");
    await waitFor(() => expect(view.getByText(UNAVAILABLE_HEADING)).toBeTruthy());

    expect(view.getByText(EXPORT_CHART_DATA)).toBeTruthy();
    expect(view.getByText(EXPORT_CHART_HELPER)).toBeTruthy();
  });

  it("exports the latest revision with a pending state on the trigger", async () => {
    repository.getChartDetail.mockResolvedValue(chartDetail());
    exportModule.exportChartRevision.mockReturnValue(new Promise(() => undefined));
    const view = await renderSaved("chart-1");
    await waitFor(() => expect(view.getByText(EXPORT_CHART_DATA)).toBeTruthy());

    await act(async () => {
      fireEvent.press(view.getByTestId("data-actions-export"));
    });

    // Pending label replaces the row label while the export is in flight.
    expect(view.getByText(EXPORT_PENDING)).toBeTruthy();
    expect(view.queryByText(EXPORT_CHART_DATA)).toBeNull();

    // The export payload carries the LATEST revision with full provenance.
    expect(exportModule.exportChartRevision).toHaveBeenCalledTimes(1);
    const payload = exportModule.exportChartRevision.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.chartId).toBe("chart-1");
    expect(payload.revisionId).toBe("rev-2");
    expect(payload.label).toBe("My saved chart");
    expect(payload.identity).toEqual(chartDetail().latest.identity);
    expect(payload.envelope).toEqual(chartDetail().latest.envelope);
  });

  it("renders the capability state when the share sheet is unavailable", async () => {
    repository.getChartDetail.mockResolvedValue(chartDetail());
    exportModule.exportChartRevision.mockResolvedValue({ status: "unavailable" });
    const view = await renderSaved("chart-1");
    await waitFor(() => expect(view.getByText(EXPORT_CHART_DATA)).toBeTruthy());

    await act(async () => {
      fireEvent.press(view.getByTestId("data-actions-export"));
    });

    await waitFor(() => expect(view.getByText(WEB_UNSUPPORTED_HEADING)).toBeTruthy());
  });

  it("renders the exact export-failed error card with a working Try again", async () => {
    repository.getChartDetail.mockResolvedValue(chartDetail());
    exportModule.exportChartRevision
      .mockRejectedValueOnce(new Error("write failed"))
      .mockResolvedValueOnce({ status: "shared" });
    const view = await renderSaved("chart-1");
    await waitFor(() => expect(view.getByText(EXPORT_CHART_DATA)).toBeTruthy());

    await act(async () => {
      fireEvent.press(view.getByTestId("data-actions-export"));
    });

    await waitFor(() => expect(view.getByText(EXPORT_ERROR_COPY.heading)).toBeTruthy());
    const body = EXPORT_ERROR_COPY.body;
    if (!body) throw new Error("EXPORT_ERROR_COPY must define a body");
    expect(view.getByText(body)).toBeTruthy();

    // Try again re-invokes the export.
    await act(async () => {
      fireEvent.press(view.getByText("Try again"));
    });
    await waitFor(() => expect(exportModule.exportChartRevision).toHaveBeenCalledTimes(2));
  });
});
