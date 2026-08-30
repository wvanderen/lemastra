import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { render as rtlRender } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { calculateResponseSchema, type CalculateResponse } from "@/lib/api-schemas";

import {
  EXPLORE_CARD_HELPER,
  EXPLORE_CARD_SAVE_HINT,
  EXPLORE_CARD_TITLE,
} from "@/components/chart/explore/copy";
import { PLACEMENTS_HEADING } from "@/components/chart/copy";
import {
  SAVE_PROMPT_HEADING,
  SAVE_PROMPT_CANCEL,
} from "@/components/workspace/copy";
import type { ChartDetail } from "@/lib/workspace/repository";

// Mini-wheel entry card tests (04-03 Task 3) — the D-03 walkable entry:
// the static preview card mounts on BOTH /chart/result and /chart/saved
// above the placement list; /chart/saved pushes the explore route by
// chartId; an unsaved result opens the existing SavePrompt under the
// explore intent and pushes ONLY after a successful save (zero
// repository writes before confirm — PRIV-01 explicit-save-only).
//
// Test mechanics: RNTL /pure, expo-router mocked, repository faked at
// the D-03 seam (importOriginal spread), the export module faked
// device-free (saved-chart-detail.test.tsx conventions). The card's
// canvas renders through the skia facade alias (device-free); the
// static preview law (no GestureDetector, pointerEvents none) is
// asserted structurally on the wheel frame.

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  navigate: vi.fn(),
}));
const paramsState = vi.hoisted(() => ({ value: {} as Record<string, string | string[]> }));
const repository = vi.hoisted(() => ({
  saveChart: vi.fn(),
  getChartDetail: vi.fn(),
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

vi.mock("@/lib/workspace/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/workspace/repository")>();
  return {
    ...actual,
    saveChart: repository.saveChart,
    getChartDetail: repository.getChartDetail,
    isWorkspaceStorageAvailable: repository.isWorkspaceStorageAvailable,
  };
});

vi.mock("@/lib/workspace/export", () => ({
  buildExportPayload: (input: unknown) => input,
  exportChartRevision: vi.fn(),
}));

// Fixtures — one stored Unknown-confidence chart for the saved screen,
// one timed result-screen envelope (repository shapes, schema-parsed).
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
  return calculateResponseSchema.parse({
    reading_type: "natal",
    chart_data: {
      placements: [
        { body: "Mars", sign: "Leo", degree: 10.0, absolute_degree: 130.0, motion: "retrograde" },
      ],
      birth_time_confidence: "Unknown",
    },
    provenance: { ...PROVENANCE },
    unavailable_factors: [{ factor: "houses", reason: "Requires a birth time" }],
    provisional_factors: [
      { factor: "moon", reason: "Moon moves ~13°/day; degree may shift without a known time" },
    ],
  });
}

function timedEnvelope(): CalculateResponse {
  return calculateResponseSchema.parse({
    reading_type: "natal",
    chart_data: {
      placements: [
        { body: "Sun", sign: "Gemini", degree: 0.4375, absolute_degree: 60.4375, motion: "direct", house: 10 },
      ],
      birth_time_confidence: "Timed",
    },
    provenance: { ...PROVENANCE },
  });
}

const STORED_INPUTS = {
  date: "1990-05-21",
  time: "14:32",
  confidence: "Timed",
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
    revisionCount: 1,
    revisions: [],
  };
}

let render: typeof rtlRender;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let userEvent: typeof import("@testing-library/react-native/pure").userEvent;
let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let MiniWheelCard: typeof import("@/components/chart/explore/mini-wheel-card").MiniWheelCard;
let ResultScreen: typeof import("@/app/chart/result").default;
let SavedChartScreen: typeof import("@/app/chart/saved").default;

beforeAll(async () => {
  ({ render, cleanup, act, fireEvent, userEvent, waitFor } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ MiniWheelCard } = await import("@/components/chart/explore/mini-wheel-card"));
  ({ default: ResultScreen } = await import("@/app/chart/result"));
  ({ default: SavedChartScreen } = await import("@/app/chart/saved"));
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
  paramsState.value = {};
});

beforeEach(() => {
  repository.isWorkspaceStorageAvailable.mockReturnValue(true);
});

/** Fresh retry-off QueryClient wrapper. */
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
// The card itself — static preview law (D-03)
// ---------------------------------------------------------------------------

describe("MiniWheelCard — static preview", () => {
  it("renders the deck's title and helper with a pointerEvents-none wheel frame", async () => {
    const onPressExplore = vi.fn();
    const view = await render(
      <MiniWheelCard envelope={timedEnvelope()} onPressExplore={onPressExplore} testID="card" />
    );

    expect(view.getByText(EXPLORE_CARD_TITLE)).toBeTruthy();
    expect(view.getByText(EXPLORE_CARD_HELPER)).toBeTruthy();
    // Static preview: the canvas frame ignores touches entirely.
    expect(view.getByTestId("card-wheel").props.pointerEvents).toBe("none");
  });

  it("fires onPressExplore when the card is pressed", async () => {
    const onPressExplore = vi.fn();
    const view = await render(
      <MiniWheelCard envelope={timedEnvelope()} onPressExplore={onPressExplore} testID="card" />
    );

    await userEvent.press(view.getByTestId("card"));
    expect(onPressExplore).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// /chart/saved — card above the placement list, pushes explore by chartId
// ---------------------------------------------------------------------------

describe("MiniWheelCard on /chart/saved", () => {
  async function renderSaved() {
    repository.getChartDetail.mockResolvedValue(chartDetail());
    paramsState.value = { id: "chart-1" };
    const { Wrapper } = makeWrapper();
    const view = await render(
      <Wrapper>
        <SavedChartScreen />
      </Wrapper>
    );
    await act(async () => {});
    return view;
  }

  it("mounts the card above the placement list", async () => {
    const view = await renderSaved();
    await waitFor(() => expect(view.getByText("My saved chart")).toBeTruthy());

    expect(view.getByText(EXPLORE_CARD_TITLE)).toBeTruthy();
    // Above the list: the card appears before Placements in document order.
    const flattened = JSON.stringify(view.toJSON());
    expect(flattened.indexOf(EXPLORE_CARD_TITLE)).toBeLessThan(flattened.indexOf(PLACEMENTS_HEADING));
  });

  it("pushes /chart/explore with the chart id — never an envelope through params", async () => {
    const view = await renderSaved();
    await waitFor(() => expect(view.getByTestId("saved-explore-card")).toBeTruthy());

    // Query-mounted screen: fireEvent.press on the accessible host
    // (03-05 pressable-host law).
    fireEvent.press(view.getByTestId("saved-explore-card"));
    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: "/chart/explore",
      params: { id: "chart-1" },
    });
  });
});

// ---------------------------------------------------------------------------
// /chart/result — unsaved opens SavePrompt; pushes only after save
// ---------------------------------------------------------------------------

describe("MiniWheelCard on /chart/result", () => {
  async function renderResult(params: Record<string, string> = {}) {
    paramsState.value = {
      envelope: JSON.stringify(timedEnvelope()),
      identity: JSON.stringify({
        date: "1990-05-21",
        time: "14:32",
        label: "Lisbon, Portugal",
        zone_source: "google",
      }),
      request: JSON.stringify({ ...STORED_INPUTS }),
      ...params,
    };
    const { Wrapper } = makeWrapper();
    const view = await render(
      <Wrapper>
        <ResultScreen />
      </Wrapper>
    );
    await act(async () => {});
    return view;
  }

  it("mounts the card (native) above the placement list with the save hint while unsaved", async () => {
    const view = await renderResult();

    expect(view.getByTestId("result-explore-card")).toBeTruthy();
    expect(view.getByText(EXPLORE_CARD_SAVE_HINT)).toBeTruthy();
    const flattened = JSON.stringify(view.toJSON());
    expect(flattened.indexOf(EXPLORE_CARD_TITLE)).toBeLessThan(flattened.indexOf(PLACEMENTS_HEADING));
  });

  it("unsaved: opens the SavePrompt with ZERO repository writes, and pushes explore only after save success", async () => {
    repository.saveChart.mockResolvedValue({
      chartId: "chart-new",
      revisionId: "rev-1",
      appended: true,
    });
    const view = await renderResult();

    await userEvent.press(view.getByTestId("result-explore-card"));

    // The existing SavePrompt opens; nothing persisted, nothing pushed.
    expect(view.getByText(SAVE_PROMPT_HEADING)).toBeTruthy();
    expect(repository.saveChart).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();

    await userEvent.press(view.getByTestId("save-prompt-confirm"));

    await waitFor(() => expect(repository.saveChart).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(routerMock.push).toHaveBeenCalledWith({
        pathname: "/chart/explore",
        params: { id: "chart-new" },
      })
    );
  });

  it("unsaved: cancel stays on result — no save, no push", async () => {
    const view = await renderResult();

    await userEvent.press(view.getByTestId("result-explore-card"));
    await userEvent.press(view.getByTestId("save-prompt-cancel"));

    await waitFor(() => expect(view.queryByText(SAVE_PROMPT_HEADING)).toBeNull());
    expect(repository.saveChart).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("a dedupe save (appended: false) still pushes explore with the returned chartId", async () => {
    repository.saveChart.mockResolvedValue({
      chartId: "chart-dedup",
      revisionId: "rev-existing",
      appended: false,
    });
    const view = await renderResult();

    await userEvent.press(view.getByTestId("result-explore-card"));
    await userEvent.press(view.getByTestId("save-prompt-confirm"));

    await waitFor(() =>
      expect(routerMock.push).toHaveBeenCalledWith({
        pathname: "/chart/explore",
        params: { id: "chart-dedup" },
      })
    );
  });

  it("saved via the revise-flow chartId param: pushes explore directly, no prompt", async () => {
    const view = await renderResult({ chartId: "chart-revise" });

    await userEvent.press(view.getByTestId("result-explore-card"));

    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: "/chart/explore",
      params: { id: "chart-revise" },
    });
    expect(view.queryByText(SAVE_PROMPT_HEADING)).toBeNull();
    expect(repository.saveChart).not.toHaveBeenCalled();
  });

  it("hides the save hint once the chart has a chartId (revise flow)", async () => {
    const view = await renderResult({ chartId: "chart-revise" });
    expect(view.queryByText(EXPLORE_CARD_SAVE_HINT)).toBeNull();
  });
});
