import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { render as rtlRender } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  RESULT_TITLE,
  resultIdentityLine,
  resultValidationStatus,
} from "@/components/birth/copy";
import {
  ASSUMPTIONS_ADJUST_ACTION,
  ASSUMPTIONS_APPROXIMATE_CAVEAT,
  CALCULATION_DETAILS_HEADER,
  PLACEMENTS_HEADING,
  PROVISIONAL_LABEL,
  UNAVAILABLE_HEADING,
} from "@/components/chart/copy";
import type { CalculateResponse } from "@/lib/api-schemas";

// Result screen tests (02-09 Task 2) — the deepened /chart/result: the
// full D-12/D-13/D-10 trust surface composed in UI-SPEC order.
//
// Contract under test (plan behavior rows):
// - Parse-then-trust: the envelope param goes through
//   calculateResponseSchema (plus the identity schema incl. zone_source)
//   BEFORE render; malformed payloads redirect to /birth instead of
//   partially rendering (T-02-33).
// - Timed order: title → identity → Placements → assumptions card →
//   Calculation details (collapsed) → validation status.
// - Unknown order: identity omits the time; the unavailable section
//   appears AFTER the status; the provisional Moon card renders.
// - The screen renders zero interpretation strings and no wheel/preview
//   graphic (D-13); validation status is neutral text.
// - Adjust & recalculate returns to /birth with the advanced control open.
//
// Test mechanics: RNTL v14 /pure under the RN vitest shim; expo-router
// mocked (router spies + configurable useLocalSearchParams) — same
// conventions as confirm-screen.test.tsx. Since 03-04 the screen
// consumes useSaveChart, so renders wrap in a fresh retry-off
// QueryClient (the repository stays unmocked — no save is triggered).

/** Render the result screen inside a fresh retry-off QueryClient. */
async function renderScreen(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = await render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
  await act(async () => {});
  return view;
}

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  navigate: vi.fn(),
}));
const paramsState = vi.hoisted(() => ({ value: {} as Record<string, string | string[]> }));

vi.mock("expo-router", () => ({
  router: routerMock,
  useLocalSearchParams: () => paramsState.value,
}));

// The save hook wraps the repository, whose ids module pulls expo-crypto
// (native entry) — node:crypto UUIDv4 stand-in, the
// workspace-repository.test.ts convention. No save runs in this file.
vi.mock("expo-crypto", async () => {
  const nodeCrypto = await import("node:crypto");
  return { randomUUID: () => nodeCrypto.randomUUID() };
});

let render: typeof rtlRender;
let userEvent: typeof import("@testing-library/react-native/pure").userEvent;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let ResultScreen: typeof import("@/app/chart/result").default;

beforeAll(async () => {
  ({ render, userEvent, cleanup, act } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ default: ResultScreen } = await import("@/app/chart/result"));
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
  paramsState.value = {};
});

// ---------------------------------------------------------------------------
// Fixtures — server envelope shapes (02-RESEARCH + charts.py verbatim)
// ---------------------------------------------------------------------------

const ORB_POLICY =
  "birth_to_chart.py default orb table (luminaries 10°, personal 7°, Jupiter–Pluto 8°, Node 5°, angles 8°; sextile capped 6°)";

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
        {
          body: "Moon",
          sign: "Cancer",
          degree: 14.05,
          absolute_degree: 104.05,
          motion: "direct",
          house: 11,
          dignity: ["Domicile"],
        },
      ],
      birth_time_confidence: "Timed",
    },
    provenance: { ...PROVENANCE },
  };
}

function unknownEnvelope(): CalculateResponse {
  return {
    reading_type: "natal",
    chart_data: {
      placements: [
        {
          body: "Mars",
          sign: "Leo",
          degree: 10.0,
          absolute_degree: 130.0,
          motion: "retrograde",
        },
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
      {
        factor: "moon",
        reason: "Moon moves ~13°/day; degree may shift without a known time",
      },
    ],
  };
}

const TIMED_IDENTITY = {
  date: "1990-05-21",
  time: "14:32",
  label: "Lisbon, Portugal",
  zone_source: "google",
} as const;

const UNKNOWN_IDENTITY = { ...TIMED_IDENTITY, time: "" };

/** Point paramsState at an envelope + identity and render the screen. */
async function renderResult(
  envelope: CalculateResponse,
  identity: Record<string, string>
) {
  paramsState.value = {
    envelope: JSON.stringify(envelope),
    identity: JSON.stringify(identity),
  };
  return renderScreen(<ResultScreen />);
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
// Guard — parse-then-trust (T-02-33)
// ---------------------------------------------------------------------------

describe("Result screen — guard", () => {
  it("redirects to /birth with a malformed envelope instead of partially rendering", async () => {
    paramsState.value = {
      envelope: '{"chart_data": {}}',
      identity: JSON.stringify(TIMED_IDENTITY),
    };
    const view = await renderScreen(<ResultScreen />);
    expect(routerMock.replace).toHaveBeenCalledWith("/birth");
    expect(view.queryByText(RESULT_TITLE)).toBeNull();
  });

  it("redirects to /birth when the identity lacks the zone source (contract requires it)", async () => {
    const { zone_source: _omitted, ...identityWithoutZone } = TIMED_IDENTITY;
    paramsState.value = {
      envelope: JSON.stringify(timedEnvelope()),
      identity: JSON.stringify(identityWithoutZone),
    };
    await renderScreen(<ResultScreen />);
    expect(routerMock.replace).toHaveBeenCalledWith("/birth");
  });
});

// ---------------------------------------------------------------------------
// Full screen — Timed envelope
// ---------------------------------------------------------------------------

describe("Result screen — Timed envelope composition (D-12/D-13)", () => {
  it("renders title → identity → Placements → assumptions card → Calculation details (collapsed) → validation status, in order", async () => {
    const envelope = timedEnvelope();
    const view = await renderResult(envelope, { ...TIMED_IDENTITY });

    const identity = resultIdentityLine(TIMED_IDENTITY, "Timed");
    const status = resultValidationStatus(envelope.provenance.schema_version);

    expectInOrder(view, [
      RESULT_TITLE,
      identity,
      PLACEMENTS_HEADING,
      "Assumptions",
      CALCULATION_DETAILS_HEADER,
      status,
    ]);

    // Placement rows render from the envelope (present-only slots).
    expect(view.getByText("Gemini 0°26′")).toBeTruthy();
    expect(view.getByText("House 10")).toBeTruthy();
    expect(view.getByText("Domicile")).toBeTruthy();

    // Assumptions value derives from the provenance block.
    expect(
      view.getByText(
        `Whole Sign houses · tropical zodiac · Moshier (built-in) ephemeris · ${ORB_POLICY}`
      )
    ).toBeTruthy();

    // No approximate caveat for a Timed chart.
    expect(view.queryByText(ASSUMPTIONS_APPROXIMATE_CAVEAT)).toBeNull();
  });

  it("keeps the provenance chain collapsed by default on the composed screen", async () => {
    const view = await renderResult(timedEnvelope(), { ...TIMED_IDENTITY });

    expect(view.queryByText(PROVENANCE.skill_revision)).toBeNull();
    expect(view.queryByText(PROVENANCE.input_revision)).toBeNull();

    await userEvent.press(view.getByTestId("provenance-details-toggle"));
    expect(view.getByText(PROVENANCE.skill_revision)).toBeTruthy();
  });

  it("renders no unavailable/provisional sections for a Timed chart", async () => {
    const view = await renderResult(timedEnvelope(), { ...TIMED_IDENTITY });
    expect(view.queryByText(UNAVAILABLE_HEADING)).toBeNull();
    expect(view.queryByText(PROVISIONAL_LABEL)).toBeNull();
  });

  it("navigates back to /birth with the advanced control open from Adjust & recalculate", async () => {
    const view = await renderResult(timedEnvelope(), { ...TIMED_IDENTITY });

    await userEvent.press(view.getByText(ASSUMPTIONS_ADJUST_ACTION));

    expect(routerMock.navigate).toHaveBeenCalledWith({
      pathname: "/birth",
      params: { openAssumptions: "1" },
    });
  });
});

// ---------------------------------------------------------------------------
// Full screen — Unknown envelope (D-10)
// ---------------------------------------------------------------------------

describe("Result screen — Unknown envelope composition (D-10)", () => {
  it("omits the time from the identity line and renders the unavailable section AFTER the status", async () => {
    const envelope = unknownEnvelope();
    const view = await renderResult(envelope, { ...UNKNOWN_IDENTITY });

    const identity = resultIdentityLine(UNKNOWN_IDENTITY, "Unknown");
    expect(view.getByText(identity)).toBeTruthy();
    expect(view.queryByText(/14:32/)).toBeNull();

    expectInOrder(view, [
      RESULT_TITLE,
      identity,
      PLACEMENTS_HEADING,
      CALCULATION_DETAILS_HEADER,
      resultValidationStatus(envelope.provenance.schema_version),
      UNAVAILABLE_HEADING,
    ]);

    // One reason-bearing card per unavailable factor (server-verbatim).
    expect(view.getByText("Houses — Requires a birth time")).toBeTruthy();
    expect(view.getByText("Rising sign & Midheaven — Requires a birth time")).toBeTruthy();
  });

  it("renders placements without a house slot and the provisional Moon card", async () => {
    const view = await renderResult(unknownEnvelope(), { ...UNKNOWN_IDENTITY });

    expect(view.getByText("Leo 10°00′")).toBeTruthy();
    // No house SLOT on the placement rows — "House {n}" never renders
    // (the word "Houses" in the unavailable cards below is expected).
    expect(view.queryByText(/^House \d+$/)).toBeNull();

    expect(view.getByText(PROVISIONAL_LABEL)).toBeTruthy();
    expect(
      view.getByText("Moon — Moon moves ~13°/day; degree may shift without a known time")
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Trust boundary — no wheel, no interpretation (D-13 / T-02-34)
// ---------------------------------------------------------------------------

describe("Result screen — trust boundary", () => {
  it("renders zero interpretation strings and no wheel or preview graphic", async () => {
    const view = await renderResult(timedEnvelope(), { ...TIMED_IDENTITY });

    expect(view.queryByText(/wheel/i)).toBeNull();
    expect(view.queryByText(/interpretation/i)).toBeNull();
    expect(view.queryByText(/meaning/i)).toBeNull();
    expect(view.queryByTestId("chart-wheel")).toBeNull();
  });
});
