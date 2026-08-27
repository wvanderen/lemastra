import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { render as rtlRender } from "@testing-library/react-native/pure";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { RESULT_TITLE, resultIdentityLine } from "@/components/birth/copy";
import { PLACEMENTS_HEADING } from "@/components/chart/copy";
import {
  DEDUPE_HELPER,
  SAVE_CTA,
  SAVE_ERROR_COPY,
  SAVE_PROMPT_HEADING,
  SAVED_STATE,
} from "@/components/workspace/copy";
import { CALCULATION_DISCLOSURE_KEY } from "@/hooks/use-disclosure";
import type { CalculateResponse, ResolveTimeResponse } from "@/lib/api-schemas";

// Save-flow tests (03-04 Task 2) — the D-10 vertical slice: request-param
// threading (Pattern 5 / A6), the result-screen Save CTA, and the
// explicit-save law (PRIV-01).
//
// Contract under test (plan behavior rows):
// - Confirm pushes a THIRD param `request` — JSON of the built
//   CalculateRequest PLUS the draft's place-union branch (flat stored
//   inputs; time_resolution is the chosen D-08 resolve option; time is
//   "" for Unknown).
// - The result screen parses `request` through
//   storedCalculationInputsSchema beside the existing guards; a
//   present-but-malformed request param does NOT redirect (save is
//   disabled instead — T-03-12), and neither does an absent one.
// - The Save chart CTA sits directly below the identity line, above
//   Placements; tapping opens the prompt prefilled with
//   smartDefaultLabel(identity.date, identity.label).
// - NOTHING persists before the Save tap (PRIV-01 explicit-save-only).
// - Confirming calls repository.saveChart({label, envelope, inputs,
//   identity}) — the persisted envelope deep-equals the parsed screen
//   envelope; fresh-flow saves carry no chartId.
// - Success → prompt closes, CTA becomes the Saved ✓ chip
//   (backgroundSelected); appended:false renders the chip PLUS the
//   dedupe helper; failure renders the error card ("Couldn't save the
//   chart." + Try again re-saving the same label); CTA disabled while
//   pending (double-tap protection, T-03-14).
//
// Test mechanics: RNTL /pure, expo-router mocked, repository module
// faked at the D-03 seam, api module faked (postCalculate), renders
// wrapped in a fresh retry-off QueryClient (confirm-screen.test.tsx
// conventions).

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  navigate: vi.fn(),
}));
const paramsState = vi.hoisted(() => ({ value: {} as Record<string, string | string[]> }));
const repository = vi.hoisted(() => ({ saveChart: vi.fn() }));

vi.mock("expo-router", () => ({
  router: routerMock,
  useLocalSearchParams: () => paramsState.value,
}));

// D-03 seam fake: the hook imports the repository module; tests swap
// saveChart per case (dedupe / failure / controlled pending).
vi.mock("@/lib/workspace/repository", () => ({
  saveChart: repository.saveChart,
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
  return { ...actual, postCalculate: vi.fn() };
});

let render: typeof rtlRender;
let userEvent: typeof import("@testing-library/react-native/pure").userEvent;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let api: typeof import("@/lib/api");
let ConfirmScreen: typeof import("@/app/birth/confirm").default;
let ResultScreen: typeof import("@/app/chart/result").default;

beforeAll(async () => {
  ({ render, userEvent, fireEvent, cleanup, act, waitFor } = await import(
    "@testing-library/react-native/pure"
  ));
  api = await import("@/lib/api");
  ({ default: ConfirmScreen } = await import("@/app/birth/confirm"));
  ({ default: ResultScreen } = await import("@/app/chart/result"));
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
  storage.clear();
  paramsState.value = {};
});

beforeEach(() => {
  vi.mocked(api.postCalculate).mockReset();
  repository.saveChart.mockReset();
});

/** Fresh retry-off QueryClient wrapper (confirm-screen.test.tsx law). */
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
}

// ---------------------------------------------------------------------------
// Fixtures — result-screen envelope + stored inputs (single source shapes)
// ---------------------------------------------------------------------------

const ORB_POLICY = "standard";

const PROVENANCE = {
  skill_revision: "660d992",
  swisseph_version: "2.10.03",
  tzdata_version: "2026.3",
  schema_version: "chart-input v1",
  ephemeris_mode: "Moshier (built-in)",
  house_system: "Whole Sign",
  zodiac_mode: "tropical",
  orb_policy: ORB_POLICY,
  input_revision: "abc123def456",
  calculator_cmd: "python tools/birth_to_chart.py --input <temp-json> --validate",
} as const;

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
    provenance: { ...PROVENANCE },
  };
}

const TIMED_IDENTITY = {
  date: "1990-05-21",
  time: "14:32",
  label: "Lisbon, Portugal",
  zone_source: "google",
} as const;

/** The stored-inputs contract shape (storedCalculationInputsSchema). */
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

// smartDefaultLabel(date, place) — exact output for the fixture identity
// (the function itself is unit-tested in workspace-label.test.ts).
const DEFAULT_LABEL = "1990-05-21 · Lisbon, Portugal";

type ResultParams = {
  envelope?: string;
  identity?: string;
  request?: string;
};

async function renderResult(params: ResultParams = {}) {
  paramsState.value = {
    envelope: params.envelope ?? JSON.stringify(timedEnvelope()),
    identity: params.identity ?? JSON.stringify({ ...TIMED_IDENTITY }),
    ...(params.request !== undefined ? { request: params.request } : {}),
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

/** Drive the full save: CTA → (optional label edit) → modal confirm. */
async function saveThroughPrompt(
  view: Awaited<ReturnType<typeof render>>,
  label?: string
) {
  await userEvent.press(view.getByTestId("result-save-cta"));
  const input = view.getByTestId("save-prompt-input");
  if (label !== undefined) {
    await act(async () => {
      fireEvent.changeText(input, label);
    });
  }
  await userEvent.press(view.getByTestId("save-prompt-confirm"));
}

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

// ---------------------------------------------------------------------------
// Confirm screen — request param threading (Pattern 5 / A6)
// ---------------------------------------------------------------------------

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

const GOOGLE_PLACE = {
  source: "google",
  label: "Lisbon, Portugal",
  lat: 38.7223,
  lon: -9.1393,
  location_type: "ROOFTOP",
  place_id: "p1",
};

async function renderConfirmAndCalculate(draft: Record<string, unknown>) {
  paramsState.value = { draft: JSON.stringify(draft) };
  storage.set(CALCULATION_DISCLOSURE_KEY, "true");
  vi.mocked(api.postCalculate).mockResolvedValue(timedEnvelope());
  const { Wrapper } = makeWrapper();
  const view = await render(
    <Wrapper>
      <ConfirmScreen />
    </Wrapper>
  );
  await act(async () => {});
  await userEvent.press(view.getByTestId("confirm-calculate-cta"));
  await waitFor(() => expect(routerMock.push).toHaveBeenCalledTimes(1));
  return view;
}

describe("confirm screen — request param threading", () => {
  it("pushes request = built CalculateRequest + place-union branch beside envelope/identity (Timed)", async () => {
    await renderConfirmAndCalculate({
      date: "1990-05-21",
      time: "1432", // raw colon-less form — normalized in the request
      place: { ...GOOGLE_PLACE },
      confidence: "Timed",
      house_system: "Whole Sign",
      resolve: RESOLVE_NORMAL,
    });

    const push = routerMock.push.mock.calls[0]![0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(push.pathname).toBe("/chart/result");
    expect(push.params.envelope).toBeDefined();
    expect(push.params.identity).toBeDefined();

    const request = JSON.parse(push.params.request!);
    expect(request).toEqual({ ...STORED_INPUTS });
  });

  it("threads an empty-string time for Unknown confidence", async () => {
    await renderConfirmAndCalculate({
      date: "1990-05-21",
      time: "",
      place: { ...GOOGLE_PLACE },
      confidence: "Unknown",
      house_system: "Whole Sign",
      resolve: RESOLVE_NORMAL,
    });

    const push = routerMock.push.mock.calls[0]![0] as {
      params: Record<string, string>;
    };
    const request = JSON.parse(push.params.request!);
    expect(request.time).toBe("");
    expect(request.confidence).toBe("Unknown");
  });
});

// ---------------------------------------------------------------------------
// Result screen — request parsing (T-03-12)
// ---------------------------------------------------------------------------

describe("result screen — request param parsing", () => {
  it("enables the Save CTA when the request param parses", async () => {
    const view = await renderResult({ request: JSON.stringify({ ...STORED_INPUTS }) });
    expect(view.getByTestId("result-save-cta").props.accessibilityState.disabled).toBe(false);
  });

  it("does NOT redirect for a malformed request param — save is disabled instead", async () => {
    const view = await renderResult({ request: '{"date": "1990-05-21"' });
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(view.getByText(RESULT_TITLE)).toBeTruthy();
    expect(view.getByTestId("result-save-cta").props.accessibilityState.disabled).toBe(true);
  });

  it("stays usable with save disabled when no request param is present", async () => {
    const view = await renderResult();
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(view.getByTestId("result-save-cta").props.accessibilityState.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Result screen — the save vertical slice (D-10 / PRIV-01)
// ---------------------------------------------------------------------------

describe("result screen — save flow", () => {
  it("renders the Save CTA directly below the identity line, above Placements", async () => {
    const view = await renderResult({ request: JSON.stringify({ ...STORED_INPUTS }) });
    expectInOrder(view, [
      RESULT_TITLE,
      resultIdentityLine({ ...TIMED_IDENTITY }, "Timed"),
      SAVE_CTA,
      PLACEMENTS_HEADING,
    ]);
  });

  it("persists NOTHING before the Save CTA is tapped (explicit-save-only, PRIV-01)", async () => {
    await renderResult({ request: JSON.stringify({ ...STORED_INPUTS }) });
    await act(async () => {});
    expect(repository.saveChart).not.toHaveBeenCalled();
  });

  it("opens the prompt prefilled with the smart default; confirming persists label+envelope+inputs+identity, then shows the Saved ✓ chip", async () => {
    repository.saveChart.mockResolvedValue({
      chartId: "chart-1",
      revisionId: "rev-1",
      appended: true,
    });
    const envelope = timedEnvelope();
    const view = await renderResult({ request: JSON.stringify({ ...STORED_INPUTS }) });

    await userEvent.press(view.getByTestId("result-save-cta"));

    expect(view.getByText(SAVE_PROMPT_HEADING)).toBeTruthy();
    expect(view.getByTestId("save-prompt-input").props.value).toBe(DEFAULT_LABEL);

    await userEvent.press(view.getByTestId("save-prompt-confirm"));

    await waitFor(() => expect(repository.saveChart).toHaveBeenCalledTimes(1));
    const call = repository.saveChart.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.label).toBe(DEFAULT_LABEL);
    expect(call.envelope).toEqual(envelope);
    expect(call.inputs).toEqual({ ...STORED_INPUTS });
    expect(call.identity).toEqual({ ...TIMED_IDENTITY });
    expect(call.chartId).toBeUndefined(); // fresh-flow save creates a new chart

    // Prompt closed; CTA replaced by the neutral Saved ✓ chip.
    await waitFor(() => expect(view.queryByText(SAVE_PROMPT_HEADING)).toBeNull());
    expect(view.queryByTestId("result-save-cta")).toBeNull();
    const chip = view.getByText(SAVED_STATE);
    expect(chip).toBeTruthy();
    const styles = [].concat(
      (chip.parent as { props: { style?: unknown } } | null)?.props.style ?? []
    ) as ReadonlyArray<Record<string, unknown> | number | undefined | null>;
    expect(
      styles.some(
        (style) => typeof style === "object" && style !== null && style.backgroundColor === "#E0E1E6"
      )
    ).toBe(true);
  });

  it("renders Saved ✓ plus the dedupe helper when the repository reports appended: false", async () => {
    repository.saveChart.mockResolvedValue({
      chartId: "chart-1",
      revisionId: "rev-1",
      appended: false,
    });
    const view = await renderResult({ request: JSON.stringify({ ...STORED_INPUTS }) });

    await saveThroughPrompt(view);

    await waitFor(() => expect(view.getByText(SAVED_STATE)).toBeTruthy());
    expect(view.getByText(DEDUPE_HELPER)).toBeTruthy();
    expect(repository.saveChart).toHaveBeenCalledTimes(1);
  });

  it("renders the error card on failure; Try again re-saves the same label", async () => {
    repository.saveChart
      .mockRejectedValueOnce(new Error("disk full"))
      .mockResolvedValueOnce({ chartId: "chart-1", revisionId: "rev-1", appended: true });
    const view = await renderResult({ request: JSON.stringify({ ...STORED_INPUTS }) });

    await saveThroughPrompt(view);

    await waitFor(() =>
      expect(view.getByText(SAVE_ERROR_COPY.heading)).toBeTruthy()
    );
    const saveBody = SAVE_ERROR_COPY.body;
    if (!saveBody) throw new Error("SAVE_ERROR_COPY must define a body");
    expect(view.getByText(saveBody)).toBeTruthy();

    await userEvent.press(view.getByText("Try again"));

    await waitFor(() => expect(repository.saveChart).toHaveBeenCalledTimes(2));
    const retryCall = repository.saveChart.mock.calls[1]![0] as Record<string, unknown>;
    expect(retryCall.label).toBe(DEFAULT_LABEL);
    await waitFor(() => expect(view.getByText(SAVED_STATE)).toBeTruthy());
  });

  it("double-tap protection: the CTA and modal confirm disable while the save is pending", async () => {
    let resolveSave: (value: unknown) => void = () => undefined;
    repository.saveChart.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        })
    );
    const view = await renderResult({ request: JSON.stringify({ ...STORED_INPUTS }) });

    await userEvent.press(view.getByTestId("result-save-cta"));
    await userEvent.press(view.getByTestId("save-prompt-confirm"));
    await act(async () => {});

    expect(view.getByTestId("result-save-cta").props.accessibilityState.disabled).toBe(true);
    expect(view.getByTestId("save-prompt-confirm").props.accessibilityState.disabled).toBe(true);

    resolveSave({ chartId: "chart-1", revisionId: "rev-1", appended: true });
    await waitFor(() => expect(view.getByText(SAVED_STATE)).toBeTruthy());
  });
});
