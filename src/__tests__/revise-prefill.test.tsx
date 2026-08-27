import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  render as rtlRender,
  within as rtlWithin,
} from "@testing-library/react-native/pure";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { BIRTH_FORM_TITLE } from "@/components/birth/copy";
import {
  DEDUPE_HELPER,
  HISTORY_HEADING,
  LATEST_CHIP,
  REVISE_ACTION,
  REVISE_HELPER,
  REVISE_TITLE,
  SAVE_CTA,
  SAVE_NEW_VERSION_CTA,
  SAVED_STATE,
} from "@/components/workspace/copy";
import { CALCULATION_DISCLOSURE_KEY } from "@/hooks/use-disclosure";
import type { CalculateResponse, ResolveTimeResponse } from "@/lib/api-schemas";
import type { ChartDetail } from "@/lib/workspace/repository";

// Revise-flow tests (03-07 Task 2) — the D-08 vertical slice: stored inputs
// prefill the unchanged Phase-2 birth form, the confirm → calculate chain
// threads chartId so the revise-flow result saves under the SAME chart
// ("Save new version"), and the saved detail exposes the flow through the
// assumptions action ("Revise birth details") plus the History list.
//
// Contract under test (plan behavior rows):
// - "Revise birth details" (saved detail) navigates to /birth with a revise
//   param = JSON {chartId, inputs}; the form renders title "Revise birth
//   details" with every field prefilled from the stored inputs (date,
//   normalized time — "" for Unknown — place union via place_form,
//   confidence, house_system). A malformed revise param falls back to the
//   fresh-flow form — never a crash, never unvalidated prefill (T-03-23).
// - The revise chain threads chartId: /birth → /birth/confirm (param
//   alongside draft) → /chart/result (param alongside
//   envelope/identity/request); a fresh flow threads NOTHING (D-08: no
//   forked edit path — the chain is otherwise unchanged).
// - The result Save CTA reads "Save new version" when launched from a saved
//   chart; save calls repository.saveChart WITH chartId (appends).
//   appended:false → "Saved ✓" + "Already saved with these exact details.";
//   a fresh-flow save (no chartId) still creates a new chart with the
//   "Save chart" CTA.
// - Prior-revision immutability is visible: History rows follow the
//   repository's revisions (append → one more row), single-revision charts
//   show no History section at all.
//
// Test mechanics: RNTL /pure, expo-router mocked, repository faked at the
// D-03 seam (real classes preserved via importOriginal), export module
// seam identity-mocked (saved-chart-detail.test.tsx convention), api module
// faked, renders wrapped in a fresh retry-off QueryClient.

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

// The repository chain reaches ids → expo-crypto (native entry) —
// node:crypto UUIDv4 stand-in (result-screen.test.tsx convention).
vi.mock("expo-crypto", async () => {
  const nodeCrypto = await import("node:crypto");
  return { randomUUID: () => nodeCrypto.randomUUID() };
});

// D-03 seam fake over the real module (typed classes survive importOriginal).
vi.mock("@/lib/workspace/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/workspace/repository")>();
  return {
    ...actual,
    saveChart: repository.saveChart,
    getChartDetail: repository.getChartDetail,
    isWorkspaceStorageAvailable: repository.isWorkspaceStorageAvailable,
  };
});

// The export module pulls expo-file-system/expo-sharing (device APIs — no
// vitest alias): identity buildExportPayload passthrough, captured
// exportChartRevision (saved-chart-detail.test.tsx convention).
vi.mock("@/lib/workspace/export", () => ({
  buildExportPayload: (input: unknown) => input,
  exportChartRevision: vi.fn(),
}));

// AsyncStorage (disclosure flag) — in-memory Map mock.
const storage = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => Promise.resolve(storage.get(key) ?? null),
    setItem: (key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    },
  },
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, postResolveTime: vi.fn(), postCalculate: vi.fn() };
});

let render: typeof rtlRender;
let within: typeof rtlWithin;
let userEvent: typeof import("@testing-library/react-native/pure").userEvent;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let api: typeof import("@/lib/api");
let BirthForm: typeof import("@/app/birth").default;
let ConfirmScreen: typeof import("@/app/birth/confirm").default;
let ResultScreen: typeof import("@/app/chart/result").default;
let SavedChartScreen: typeof import("@/app/chart/saved").default;

beforeAll(async () => {
  ({ render, within, userEvent, fireEvent, cleanup, act, waitFor } = await import(
    "@testing-library/react-native/pure"
  ));
  api = await import("@/lib/api");
  ({ default: BirthForm } = await import("@/app/birth"));
  ({ default: ConfirmScreen } = await import("@/app/birth/confirm"));
  ({ default: ResultScreen } = await import("@/app/chart/result"));
  ({ default: SavedChartScreen } = await import("@/app/chart/saved"));
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
  storage.clear();
  paramsState.value = {};
});

beforeEach(() => {
  repository.isWorkspaceStorageAvailable.mockReturnValue(true);
});

/** Fresh retry-off QueryClient wrapper (confirm-screen.test.tsx law). */
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
// Fixtures — stored inputs (Timed + Unknown), resolve, envelope, detail
// ---------------------------------------------------------------------------

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

/** Unknown-confidence basis: the stored time is the 12:00 noon reference. */
const UNKNOWN_INPUTS = {
  ...STORED_INPUTS,
  time: "12:00",
  confidence: "Unknown",
} as const;

const RESOLVE_NORMAL: ResolveTimeResponse = {
  iana_zone: "Europe/Lisbon",
  zone_source: "google",
  google: {
    timeZoneId: "Europe/Lisbon",
    rawOffset: 0,
    dstOffset: 3600,
    timeZoneName: "Western European Summer Time",
  },
  resolved: {
    offset_seconds: 3600,
    offset_label: "+01:00",
    classification: "normal",
    options: [],
  },
  drift: false,
};

function timedEnvelope(): CalculateResponse {
  return {
    reading_type: "natal",
    chart_data: {
      house_system: "Whole Sign",
      placements: [
        {
          body: "Sun",
          sign: "Gemini",
          degree: 0.4375,
          absolute_degree: 60.4375,
          motion: "direct",
          house: 10,
        },
      ],
      birth_time_confidence: "Timed",
    },
    provenance: {
      skill_revision: "660d992",
      swisseph_version: "2.10.03",
      tzdata_version: "2026.3",
      schema_version: "chart-input v1",
      ephemeris_mode: "Moshier (built-in)",
      house_system: "Whole Sign",
      zodiac_mode: "tropical",
      orb_policy: "standard",
      input_revision: "abc123def456",
      calculator_cmd: "python tools/birth_to_chart.py --input <tmp>",
    },
  };
}

/** Two-revision chart detail: rev-1 original basis, rev-2 revised basis. */
function chartDetail(revisionCount: 1 | 2 | 3): ChartDetail {
  const createdAt = new Date("2026-08-20T10:00:00Z");
  const revisedAt = new Date("2026-08-27T10:00:00Z");
  const thirdAt = new Date("2026-08-28T10:00:00Z");
  const latestInputs = { ...STORED_INPUTS, date: "1991-06-01" };
  const thirdInputs = { ...latestInputs, time: "09:07" };
  const latestAt = revisionCount === 3 ? thirdAt : revisedAt;
  const finalInputs = revisionCount === 3 ? thirdInputs : latestInputs;
  const revisions = [
    {
      revisionId: "rev-1",
      createdAt,
      inputRevision: "fff000111222",
      inputs: { ...STORED_INPUTS },
    },
    ...(revisionCount >= 2
      ? [
          {
            revisionId: "rev-2",
            createdAt: revisedAt,
            inputRevision: "abc123def456",
            inputs: { ...latestInputs },
          },
        ]
      : []),
    ...(revisionCount === 3
      ? [
          {
            revisionId: "rev-3",
            createdAt: thirdAt,
            inputRevision: "bbb333ccc444",
            inputs: { ...thirdInputs },
          },
        ]
      : []),
  ];
  const latestRevisionId = revisionCount === 3 ? "rev-3" : `rev-${revisionCount}`;
  return {
    chart: {
      chartId: "chart-1",
      label: "My saved chart",
      createdAt,
      updatedAt: latestAt,
    },
    latest: {
      revisionId: latestRevisionId,
      inputRevision: "abc123def456",
      envelope: timedEnvelope(),
      inputs: { ...finalInputs },
      identity: {
        date: finalInputs.date,
        time: finalInputs.time,
        label: "Lisbon, Portugal",
        zone_source: "google",
      },
      createdAt: latestAt,
    },
    revisionCount,
    revisions,
  };
}

/** The revise router param: JSON {chartId, inputs} (id-style, never an envelope). */
function reviseParam(inputs: Record<string, unknown> = { ...STORED_INPUTS }): string {
  return JSON.stringify({ chartId: "chart-1", inputs });
}

async function renderBirth(params: Record<string, string>) {
  paramsState.value = params;
  const { Wrapper } = makeWrapper();
  const view = await render(
    <Wrapper>
      <BirthForm />
    </Wrapper>
  );
  await act(async () => {});
  return view;
}

async function renderScreen(
  Component: typeof ConfirmScreen | typeof ResultScreen | typeof SavedChartScreen,
  params: Record<string, string>
) {
  paramsState.value = params;
  const { Wrapper } = makeWrapper();
  const view = await render(
    <Wrapper>
      <Component />
    </Wrapper>
  );
  await act(async () => {});
  return view;
}

// ---------------------------------------------------------------------------
// /birth revise mode — prefilled defaults + title (D-08, Pattern 5)
// ---------------------------------------------------------------------------

describe("/birth — revise mode prefill", () => {
  it("renders the 'Revise birth details' title with every field prefilled from the stored inputs", async () => {
    const view = await renderBirth({ revise: reviseParam() });

    expect(view.getByText(REVISE_TITLE)).toBeTruthy();
    expect(view.queryByText(BIRTH_FORM_TITLE)).toBeNull();

    // Date + time prefilled as stored (display form).
    expect(view.getByTestId("birth-date-input").props.value).toBe("1990-05-21");
    expect(view.getByTestId("birth-time-input").props.value).toBe("14:32");

    // Place prefilled via the place_form union branch — the selected
    // candidate card renders (PlaceSearch selected state).
    expect(view.getByText("Lisbon, Portugal")).toBeTruthy();
    expect(view.getByText(`${STORED_INPUTS.place_form.lat}°, ${STORED_INPUTS.place_form.lon}°`)).toBeTruthy();
  });

  it("prefills an empty time field for Unknown confidence (the stored 12:00 noon reference is display-stripped)", async () => {
    const view = await renderBirth({ revise: reviseParam({ ...UNKNOWN_INPUTS }) });

    expect(view.getByTestId("birth-time-input").props.value).toBe("");
    // The Unknown field is disabled with its helper (D-09 behavior intact).
    expect(view.getByTestId("birth-time-input").props.editable).toBe(false);
  });

  it("falls back to the fresh-flow form for a malformed revise param — never a crash, never unvalidated prefill (T-03-23)", async () => {
    const view = await renderBirth({ revise: '{"chartId":"chart-1","inputs":{"date":' });

    expect(view.getByText(BIRTH_FORM_TITLE)).toBeTruthy();
    expect(view.queryByText(REVISE_TITLE)).toBeNull();
    expect(view.getByTestId("birth-date-input").props.value).toBe("");
    expect(view.getByTestId("birth-time-input").props.value).toBe("");
  });

  it("a complete prefilled form is valid: the CTA runs the normal resolve chain", async () => {
    vi.mocked(api.postResolveTime).mockResolvedValue(RESOLVE_NORMAL);
    const view = await renderBirth({ revise: reviseParam() });

    await userEvent.press(view.getByText("Review birth details"));

    await waitFor(() => expect(api.postResolveTime).toHaveBeenCalledTimes(1));
  });
});

// ---------------------------------------------------------------------------
// chartId threading — birth → confirm → result (D-08)
// ---------------------------------------------------------------------------

describe("revise chain — chartId threading", () => {
  it("/birth hands the chartId to /birth/confirm alongside the draft", async () => {
    vi.mocked(api.postResolveTime).mockResolvedValue(RESOLVE_NORMAL);
    const view = await renderBirth({ revise: reviseParam() });

    await userEvent.press(view.getByText("Review birth details"));
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledTimes(1));

    const push = routerMock.push.mock.calls[0]![0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(push.pathname).toBe("/birth/confirm");
    expect(push.params.chartId).toBe("chart-1");
    const draft = JSON.parse(push.params.draft!);
    expect(draft.date).toBe("1990-05-21");
    expect(draft.time).toBe("14:32");
    expect(draft.place.source).toBe("google");
    expect(draft.confidence).toBe("Timed");
    expect(draft.house_system).toBe("Whole Sign");
  });

  it("/birth/confirm re-emits the chartId on the /chart/result push", async () => {
    vi.mocked(api.postCalculate).mockResolvedValue(timedEnvelope());
    storage.set(CALCULATION_DISCLOSURE_KEY, "true");
    const view = await renderScreen(ConfirmScreen, {
      draft: JSON.stringify({
        date: "1990-05-21",
        time: "14:32",
        place: { ...STORED_INPUTS.place_form },
        confidence: "Timed",
        house_system: "Whole Sign",
        resolve: RESOLVE_NORMAL,
      }),
      chartId: "chart-1",
    });

    await userEvent.press(view.getByTestId("confirm-calculate-cta"));
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledTimes(1));

    const push = routerMock.push.mock.calls[0]![0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(push.pathname).toBe("/chart/result");
    expect(push.params.chartId).toBe("chart-1");
    expect(push.params.envelope).toBeDefined();
    expect(push.params.identity).toBeDefined();
    expect(push.params.request).toBeDefined();
  });

  it("the fresh chain threads NO chartId (no forked edit path)", async () => {
    vi.mocked(api.postCalculate).mockResolvedValue(timedEnvelope());
    storage.set(CALCULATION_DISCLOSURE_KEY, "true");
    const view = await renderScreen(ConfirmScreen, {
      draft: JSON.stringify({
        date: "1990-05-21",
        time: "14:32",
        place: { ...STORED_INPUTS.place_form },
        confidence: "Timed",
        house_system: "Whole Sign",
        resolve: RESOLVE_NORMAL,
      }),
    });

    await userEvent.press(view.getByTestId("confirm-calculate-cta"));
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledTimes(1));

    const push = routerMock.push.mock.calls[0]![0] as {
      params: Record<string, string>;
    };
    expect(push.params.chartId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// /chart/result — "Save new version" + append under the same chart
// ---------------------------------------------------------------------------

type ResultParams = {
  envelope?: string;
  identity?: string;
  request?: string;
  chartId?: string;
};

async function renderResult(params: ResultParams = {}) {
  return renderScreen(ResultScreen, {
    envelope: params.envelope ?? JSON.stringify(timedEnvelope()),
    identity:
      params.identity ??
      JSON.stringify({
        date: "1990-05-21",
        time: "14:32",
        label: "Lisbon, Portugal",
        zone_source: "google",
      }),
    ...(params.request !== undefined ? { request: params.request } : {}),
    ...(params.chartId !== undefined ? { chartId: params.chartId } : {}),
  });
}

describe("/chart/result — revise-flow save", () => {
  it("reads 'Save new version' when launched from a saved chart; the save appends under the same chart", async () => {
    repository.saveChart.mockResolvedValue({
      chartId: "chart-1",
      revisionId: "rev-3",
      appended: true,
    });
    const view = await renderResult({
      request: JSON.stringify({ ...STORED_INPUTS }),
      chartId: "chart-1",
    });

    expect(view.getByText(SAVE_NEW_VERSION_CTA)).toBeTruthy();
    expect(view.queryByText(SAVE_CTA)).toBeNull();

    await userEvent.press(view.getByTestId("result-save-cta"));
    await userEvent.press(view.getByTestId("save-prompt-confirm"));

    await waitFor(() => expect(repository.saveChart).toHaveBeenCalledTimes(1));
    const call = repository.saveChart.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.chartId).toBe("chart-1"); // append under the SAME chart (D-06)

    await waitFor(() => expect(view.getByText(SAVED_STATE)).toBeTruthy());
    expect(view.queryByText(DEDUPE_HELPER)).toBeNull(); // appended: true
  });

  it("identical inputs stay honest: appended:false renders Saved ✓ plus the dedupe helper and appends nothing", async () => {
    repository.saveChart.mockResolvedValue({
      chartId: "chart-1",
      revisionId: "rev-2",
      appended: false,
    });
    const view = await renderResult({
      request: JSON.stringify({ ...STORED_INPUTS, date: "1991-06-01" }),
      chartId: "chart-1",
    });

    await userEvent.press(view.getByTestId("result-save-cta"));
    await userEvent.press(view.getByTestId("save-prompt-confirm"));

    await waitFor(() => expect(view.getByText(SAVED_STATE)).toBeTruthy());
    expect(view.getByText(DEDUPE_HELPER)).toBeTruthy();
    const call = repository.saveChart.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.chartId).toBe("chart-1");
  });

  it("the fresh flow keeps the 'Save chart' CTA and creates a new chart (no chartId)", async () => {
    repository.saveChart.mockResolvedValue({
      chartId: "chart-new",
      revisionId: "rev-1",
      appended: true,
    });
    const view = await renderResult({ request: JSON.stringify({ ...STORED_INPUTS }) });

    expect(view.getByText(SAVE_CTA)).toBeTruthy();
    expect(view.queryByText(SAVE_NEW_VERSION_CTA)).toBeNull();

    await userEvent.press(view.getByTestId("result-save-cta"));
    await userEvent.press(view.getByTestId("save-prompt-confirm"));

    await waitFor(() => expect(repository.saveChart).toHaveBeenCalledTimes(1));
    const call = repository.saveChart.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.chartId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// /chart/saved — the revise entry point + truthful History (WORK-04)
// ---------------------------------------------------------------------------

async function renderSaved(id: string = "chart-1") {
  return renderScreen(SavedChartScreen, { id });
}

describe("/chart/saved — revise entry point", () => {
  it("renders 'Revise birth details' with the stays-in-History helper on the assumptions card", async () => {
    repository.getChartDetail.mockResolvedValue(chartDetail(2));
    const view = await renderSaved();

    await waitFor(() => expect(view.getByText(REVISE_ACTION)).toBeTruthy());
    expect(view.getByText(REVISE_HELPER)).toBeTruthy();
    expect(view.queryByText("Adjust & recalculate")).toBeNull();
  });

  it("navigates to /birth with the revise param = {chartId, latest stored inputs}", async () => {
    repository.getChartDetail.mockResolvedValue(chartDetail(2));
    const view = await renderSaved();
    await waitFor(() => expect(view.getByText(REVISE_ACTION)).toBeTruthy());

    await act(async () => {
      fireEvent.press(view.getByText(REVISE_ACTION));
    });

    expect(routerMock.push).toHaveBeenCalledTimes(1);
    const push = routerMock.push.mock.calls[0]![0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(push.pathname).toBe("/birth");
    const revise = JSON.parse(push.params.revise!);
    expect(revise.chartId).toBe("chart-1");
    expect(revise.inputs).toEqual(chartDetail(2).latest.inputs);
  });
});

describe("/chart/saved — History follows the repository (visible immutability)", () => {
  it("renders the History section with one row per revision, newest first with the Latest chip", async () => {
    repository.getChartDetail.mockResolvedValue(chartDetail(2));
    const view = await renderSaved();

    await waitFor(() => expect(view.getByText(HISTORY_HEADING)).toBeTruthy());
    // Scope to the History section — PlacementList rows are listitems too.
    const history = within(view.getByTestId("saved-chart-history"));
    expect(history.getAllByRole("listitem")).toHaveLength(2);
    expect(view.getByText("2026-08-27 · Birth date changed")).toBeTruthy();
    expect(view.getByText("2026-08-20 · Original details")).toBeTruthy();
    expect(history.getByText(LATEST_CHIP)).toBeTruthy();
  });

  it("an appended revision shows as one more row — the History count follows the repository data", async () => {
    repository.getChartDetail.mockResolvedValue(chartDetail(3));
    const view = await renderSaved();

    await waitFor(() => expect(view.getByText(HISTORY_HEADING)).toBeTruthy());
    const history = within(view.getByTestId("saved-chart-history"));
    expect(history.getAllByRole("listitem")).toHaveLength(3);
    expect(view.getByText("2026-08-28 · Birth time changed")).toBeTruthy();
    expect(view.getByText("2026-08-27 · Birth date changed")).toBeTruthy();
    expect(view.getByText("2026-08-20 · Original details")).toBeTruthy();
  });

  it("renders no History section for a single-revision chart", async () => {
    repository.getChartDetail.mockResolvedValue(chartDetail(1));
    const view = await renderSaved();

    await waitFor(() => expect(view.getByText("My saved chart")).toBeTruthy());
    expect(view.queryByText(HISTORY_HEADING)).toBeNull();
  });
});
