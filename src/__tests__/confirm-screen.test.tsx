import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  render as rtlRender,
  within as rtlWithin,
} from "@testing-library/react-native/pure";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CONFIRM_BACK_LINK,
  CONFIRM_BIRTHPLACE_LABEL,
  CONFIRM_CALCULATING,
  CONFIRM_COORDINATES_LABEL,
  CONFIRM_CTA,
  CONFIRM_OFFSET_LABEL_LABEL,
  CONFIRM_TIME_ZONE_LABEL,
  CONFIRM_TITLE,
  DRIFT_NOTE,
  RESULT_TITLE,
  TRICKY_TIME_CHOICE_REQUIRED,
  ZONE_SOURCE_GOOGLE,
  ZONE_SOURCE_MANUAL,
  confirmBirthSummary,
  confirmCoordinates,
  resultIdentityLine,
  resultValidationStatus,
} from "@/components/birth/copy";
import { CALCULATION_DISCLOSURE_KEY } from "@/hooks/use-disclosure";
import { ApiError } from "@/lib/api";
import type { CalculateResponse, ResolveTimeResponse } from "@/lib/api-schemas";

// Confirm + result screen tests (02-08 Task 2) — the BIRTH-02 confirmation
// screen (resolved card, D-08 gating, D-04 intercept, calculate mutation,
// CALC-04 banners) and the minimal /chart/result guard/identity contract.
//
// Copy assertions are the EXACT copy-deck strings (02-UI-SPEC §"Copy Deck",
// confirm/result sections). Payload assertions cover the time_resolution
// translation: second_pass derives offset_seconds from the SERVER option's
// utc instant vs the entered wall time; shifted derives wall_time by
// rendering the server instant in the server-resolved IANA zone — the UI
// never re-derives offsets from its own DST rules (T-02-31).
//
// Test mechanics (RNTL v14 /pure under the RN vitest shim — same
// conventions as birth-form.test.tsx): expo-router mocked (router spies +
// configurable useLocalSearchParams), api module mocked (postCalculate),
// AsyncStorage mocked with an in-memory Map, renders wrapped in a fresh
// retry-off QueryClient.

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

// AsyncStorage is native-module-backed with no store under the RN shim —
// in-memory Map mock (same pattern as use-disclosure.test.tsx).
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
  return {
    ...actual,
    postCalculate: vi.fn(),
  };
});

// Acquired in beforeAll (not static imports): RNTL and every module that
// (transitively) requires react-native must load after the RN test shim
// has seeded require.cache — see src/test/setup.ts.
let render: typeof rtlRender;
let userEvent: typeof import("@testing-library/react-native/pure").userEvent;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let api: typeof import("@/lib/api");
let copy: typeof import("@/components/birth/copy");
let ConfirmScreen: typeof import("@/app/birth/confirm").default;
let ResultScreen: typeof import("@/app/chart/result").default;

beforeAll(async () => {
  ({ render, userEvent, cleanup, act, waitFor } = await import(
    "@testing-library/react-native/pure"
  ));
  api = await import("@/lib/api");
  copy = await import("@/components/birth/copy");
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
});

/** A rendered host element queryable by `within`. */
type Instance = Parameters<typeof rtlWithin>[0];

// ---------------------------------------------------------------------------
// Fixtures
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

const RESOLVE_AMBIGUOUS: ResolveTimeResponse = {
  iana_zone: "America/New_York",
  zone_source: "google",
  google: {
    timeZoneId: "America/New_York",
    rawOffset: -18000,
    dstOffset: -14400,
    timeZoneName: "Eastern Daylight Time",
  },
  resolved: {
    offset_seconds: -14400,
    offset_label: "-04:00",
    classification: "ambiguous",
    options: [
      {
        mode: "first_pass",
        label: "01:30 EDT (−04:00) — first occurrence before the clocks fell back",
        utc: "2024-11-03T05:30:00Z",
      },
      {
        mode: "second_pass",
        label: "01:30 EST (−05:00) — second occurrence after the clocks fell back",
        utc: "2024-11-03T06:30:00Z",
      },
    ],
  },
  drift: false,
};

const RESOLVE_NONEXISTENT: ResolveTimeResponse = {
  ...RESOLVE_AMBIGUOUS,
  resolved: {
    offset_seconds: -18000,
    offset_label: "-05:00",
    classification: "nonexistent",
    options: [
      {
        mode: "shifted",
        label: "02:30 did not exist (clocks jumped 02:00→03:00). Using 03:30 EDT (−04:00).",
        utc: "2024-03-10T07:30:00Z",
      },
    ],
  },
};

const GOOGLE_PLACE = {
  source: "google",
  label: "Lisbon, Portugal",
  lat: 38.7223,
  lon: -9.1393,
};

/** Base Timed draft with a google place and a normal resolve (raw "1432" time — colon-less form). */
function baseDraft(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    date: "1990-05-21",
    time: "1432",
    place: { ...GOOGLE_PLACE, location_type: "ROOFTOP", place_id: "p1" },
    confidence: "Timed",
    house_system: "Whole Sign",
    resolve: RESOLVE_NORMAL,
    ...overrides,
  };
}

/** Point paramsState at a draft and render the confirm screen. */
async function renderConfirm(draft: Record<string, unknown> = baseDraft()) {
  paramsState.value = { draft: JSON.stringify(draft) };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = await render(
    <QueryClientProvider client={client}>
      <ConfirmScreen />
    </QueryClientProvider>
  );
  // Flush the useDisclosure AsyncStorage read so `acknowledged` is settled
  // before any Calculate press.
  await act(async () => {});
  return view;
}

/** Pre-acknowledge the D-04 flag so Calculate fires the mutation directly. */
async function preAcknowledge() {
  storage.set(CALCULATION_DISCLOSURE_KEY, "true");
  await act(async () => {});
}

/** The mocked calculate endpoint (typed via vi.mocked for tsc). */
function calculateMock() {
  return vi.mocked(api.postCalculate);
}

const PLACEMENT = {
  body: "Sun",
  sign: "Gemini",
  degree: 0.44,
  absolute_degree: 60.44,
  motion: "direct",
  house: 11,
};

function envelopeFixture(confidence: "Timed" | "Unknown" = "Timed"): CalculateResponse {
  return {
    reading_type: "natal",
    chart_data: {
      ...(confidence === "Timed" ? { house_system: "Whole Sign" as const } : {}),
      placements: [PLACEMENT],
      birth_time_confidence: confidence,
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

// ---------------------------------------------------------------------------
// Confirm screen — resolved card + summary (BIRTH-02)
// ---------------------------------------------------------------------------

describe("Confirm screen (/birth/confirm) — resolved card", () => {
  it("renders the title, resolved card fields, summary line, and Google zone-source note", async () => {
    const view = await renderConfirm();

    expect(view.getByText(CONFIRM_TITLE)).toBeTruthy();

    expect(view.getByText(CONFIRM_BIRTHPLACE_LABEL)).toBeTruthy();
    expect(view.getByText("Lisbon, Portugal")).toBeTruthy();
    expect(view.getByText(CONFIRM_COORDINATES_LABEL)).toBeTruthy();
    expect(view.getByText(confirmCoordinates(38.7223, -9.1393))).toBeTruthy();
    expect(view.getByText(CONFIRM_TIME_ZONE_LABEL)).toBeTruthy();
    expect(view.getByText("Europe/Lisbon")).toBeTruthy();
    expect(view.getByText(CONFIRM_OFFSET_LABEL_LABEL)).toBeTruthy();
    expect(view.getByText("+01:00 (Western European Summer Time)")).toBeTruthy();

    // Summary line normalizes the colon-less draft time ("1432" → "14:32").
    expect(view.getByText(confirmBirthSummary("1990-05-21", "14:32", "Timed"))).toBeTruthy();
    expect(view.getByText(ZONE_SOURCE_GOOGLE)).toBeTruthy();
  });

  it("renders the drift note only when drift is true", async () => {
    const clean = await renderConfirm();
    expect(clean.queryByText(DRIFT_NOTE)).toBeNull();

    const drifting = await renderConfirm(
      baseDraft({ resolve: { ...RESOLVE_NORMAL, drift: true } })
    );
    expect(drifting.getByText(DRIFT_NOTE)).toBeTruthy();
  });

  it("shows the manual zone-source note and bare offset when the zone was entered manually", async () => {
    const view = await renderConfirm(
      baseDraft({
        place: {
          source: "manual",
          label: "Family farm",
          lat: -8,
          lon: 12.5,
          iana_zone: "Europe/Lisbon",
          zone_source: "manual",
        },
        resolve: { ...RESOLVE_NORMAL, zone_source: "manual", google: null },
      })
    );
    expect(view.getByText(ZONE_SOURCE_MANUAL)).toBeTruthy();
    expect(view.getByText("+01:00")).toBeTruthy();
    expect(view.queryByText("+01:00 (Western European Summer Time)")).toBeNull();
  });

  it("omits the time slot from the summary line for Unknown confidence", async () => {
    const view = await renderConfirm(baseDraft({ confidence: "Unknown", time: "" }));
    expect(view.getByText(confirmBirthSummary("1990-05-21", "", "Unknown"))).toBeTruthy();
  });

  it("renders the confidence summary from the copy-deck option helpers", async () => {
    const view = await renderConfirm();
    const helper = copy.CONFIDENCE_OPTIONS.find((option) => option.value === "Timed")!.helper;
    expect(view.getByText("Timed")).toBeTruthy();
    expect(view.getByText(helper)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Confirm screen — D-08 gating (BIRTH-03)
// ---------------------------------------------------------------------------

describe("Confirm screen — tricky-time gating", () => {
  it("disables Calculate with the helper until a picker selection exists; selecting enables it", async () => {
    await preAcknowledge();
    const view = await renderConfirm(baseDraft({ resolve: RESOLVE_AMBIGUOUS, time: "01:30", date: "2024-11-03" }));

    const cta = () => view.getByTestId("confirm-calculate-cta");
    // Pressable consumes `disabled` and forwards it as accessibilityState
    // on the host element (probe-verified under the RN shim).
    expect(cta().props.accessibilityState?.disabled).toBe(true);
    expect(view.getByText(TRICKY_TIME_CHOICE_REQUIRED)).toBeTruthy();

    await userEvent.press(view.getByTestId("tricky-time-second_pass"));

    expect(cta().props.accessibilityState?.disabled).toBe(false);
    expect(view.queryByText(TRICKY_TIME_CHOICE_REQUIRED)).toBeNull();
  });

  it("keeps Calculate enabled without a picker for a normal classification", async () => {
    await preAcknowledge();
    const view = await renderConfirm();
    expect(view.getByTestId("confirm-calculate-cta").props.accessibilityState?.disabled).toBe(false);
    expect(view.queryByText(TRICKY_TIME_CHOICE_REQUIRED)).toBeNull();
    expect(view.queryByTestId("tricky-time-picker")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Confirm screen — D-04 disclosure intercept
// ---------------------------------------------------------------------------

describe("Confirm screen — first-run disclosure intercept", () => {
  it("first run: Calculate opens the disclosure instead of mutating; 'Got it' persists the flag and fires", async () => {
    calculateMock().mockResolvedValue(envelopeFixture());
    const view = await renderConfirm();

    await userEvent.press(view.getByTestId("confirm-calculate-cta"));

    expect(view.getByText(copy.DISCLOSURE_HEADING)).toBeTruthy();
    expect(calculateMock()).not.toHaveBeenCalled();

    await userEvent.press(view.getByText(copy.DISCLOSURE_CTA));

    expect(storage.get(CALCULATION_DISCLOSURE_KEY)).toBe("true");
    await waitFor(() => expect(calculateMock()).toHaveBeenCalledTimes(1));
  });

  it("second run (flag already acknowledged): Calculate fires the mutation directly", async () => {
    calculateMock().mockResolvedValue(envelopeFixture());
    await preAcknowledge();
    const view = await renderConfirm();

    await userEvent.press(view.getByTestId("confirm-calculate-cta"));

    expect(view.queryByText(copy.DISCLOSURE_HEADING)).toBeNull();
    await waitFor(() => expect(calculateMock()).toHaveBeenCalledTimes(1));
  });
});

// ---------------------------------------------------------------------------
// Confirm screen — calculate request payload (T-02-31 translation)
// ---------------------------------------------------------------------------

describe("Confirm screen — calculate request", () => {
  it("normal draft: normalized time, no time_resolution, confirmed place/zone", async () => {
    calculateMock().mockResolvedValue(envelopeFixture());
    await preAcknowledge();
    const view = await renderConfirm();

    await userEvent.press(view.getByTestId("confirm-calculate-cta"));

    await waitFor(() => expect(calculateMock()).toHaveBeenCalledTimes(1));
    expect(calculateMock().mock.calls[0][0]).toEqual({
      date: "1990-05-21",
      time: "14:32",
      confidence: "Timed",
      house_system: "Whole Sign",
      place: { label: "Lisbon, Portugal", lat: 38.7223, lon: -9.1393 },
      iana_zone: "Europe/Lisbon",
      zone_source: "google",
    });
  });

  it("Unknown confidence: omits the time field entirely", async () => {
    calculateMock().mockResolvedValue(envelopeFixture("Unknown"));
    await preAcknowledge();
    const view = await renderConfirm(baseDraft({ confidence: "Unknown", time: "" }));

    await userEvent.press(view.getByTestId("confirm-calculate-cta"));

    await waitFor(() => expect(calculateMock()).toHaveBeenCalledTimes(1));
    const request = calculateMock().mock.calls[0][0];
    expect(request.time).toBeUndefined();
    expect(request.time_resolution).toBeUndefined();
  });

  it("second_pass selection carries the server-derived offset in seconds", async () => {
    calculateMock().mockResolvedValue(envelopeFixture());
    await preAcknowledge();
    const view = await renderConfirm(
      baseDraft({ resolve: RESOLVE_AMBIGUOUS, time: "01:30", date: "2024-11-03" })
    );

    await userEvent.press(view.getByTestId("tricky-time-second_pass"));
    await userEvent.press(view.getByTestId("confirm-calculate-cta"));

    await waitFor(() => expect(calculateMock()).toHaveBeenCalledTimes(1));
    // 01:30 wall vs 06:30Z UTC instant → EST −05:00 → −18000 s (server data arithmetic).
    expect(calculateMock().mock.calls[0][0].time_resolution).toEqual({
      mode: "second_pass",
      offset_seconds: -18000,
    });
  });

  it("shifted selection carries the shifted wall time rendered in the server zone", async () => {
    calculateMock().mockResolvedValue(envelopeFixture());
    await preAcknowledge();
    const view = await renderConfirm(
      baseDraft({ resolve: RESOLVE_NONEXISTENT, time: "02:30", date: "2024-03-10" })
    );

    await userEvent.press(view.getByTestId("tricky-time-shifted"));
    await userEvent.press(view.getByTestId("confirm-calculate-cta"));

    await waitFor(() => expect(calculateMock()).toHaveBeenCalledTimes(1));
    // 07:30Z rendered in America/New_York → 03:30 (the adjacent valid time).
    expect(calculateMock().mock.calls[0][0].time_resolution).toEqual({
      mode: "shifted",
      wall_time: "03:30",
    });
  });
});

// ---------------------------------------------------------------------------
// Confirm screen — mutation states + navigation
// ---------------------------------------------------------------------------

describe("Confirm screen — calculating state and navigation", () => {
  it("in-flight: CTA disabled with 'Calculating chart…' and an activity indicator", async () => {
    await preAcknowledge();
    let resolveCalculation: (value: CalculateResponse) => void = () => undefined;
    calculateMock().mockReturnValue(
      new Promise<CalculateResponse>((resolve) => {
        resolveCalculation = resolve;
      })
    );
    const view = await renderConfirm();

    await userEvent.press(view.getByTestId("confirm-calculate-cta"));

    expect(view.getByText(CONFIRM_CALCULATING)).toBeTruthy();
    expect(view.getByTestId("confirm-calculate-cta").props.accessibilityState?.disabled).toBe(true);
    expect(view.getByTestId("confirm-calculating-indicator")).toBeTruthy();

    resolveCalculation(envelopeFixture());
    await act(async () => {});
  });

  it("success navigates to /chart/result carrying the envelope and identity", async () => {
    const envelope = envelopeFixture();
    calculateMock().mockResolvedValue(envelope);
    await preAcknowledge();
    const view = await renderConfirm();

    await userEvent.press(view.getByTestId("confirm-calculate-cta"));

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledTimes(1));
    const pushed = routerMock.push.mock.calls[0][0] as {
      pathname: string;
      params: { envelope: string; identity: string };
    };
    expect(pushed.pathname).toBe("/chart/result");
    expect(JSON.parse(pushed.params.envelope)).toEqual(envelope);
    expect(JSON.parse(pushed.params.identity)).toEqual({
      date: "1990-05-21",
      time: "14:32",
      label: "Lisbon, Portugal",
    });
  });

  it("renders the recovery banner on a CALC-04 ApiError with the unsuitable-house-system action deep-linking /birth", async () => {
    calculateMock().mockRejectedValue(
      new ApiError({
        code: "CALC_UNSUITABLE_HOUSE_SYSTEM",
        message: "swisseph.houses: error",
        recoverable: true,
      })
    );
    await preAcknowledge();
    const view = await renderConfirm(baseDraft({ house_system: "Placidus" }));

    await userEvent.press(view.getByTestId("confirm-calculate-cta"));

    await waitFor(() =>
      expect(view.getByText("Placidus houses can't be calculated for this location.")).toBeTruthy()
    );
    expect(view.getByText("Switch to Whole Sign or Equal houses under Assumptions, then calculate again.")).toBeTruthy();

    await userEvent.press(view.getByText("Open Assumptions"));
    expect(routerMock.navigate).toHaveBeenCalledWith({
      pathname: "/birth",
      params: { openAssumptions: "1" },
    });
  });

  it("passes the server field message through for CALC_INVALID_INPUT", async () => {
    calculateMock().mockRejectedValue(
      new ApiError({
        code: "CALC_INVALID_INPUT",
        message: "No birth time supplied. Pass --time HH:MM, or --noon-for-unknown.",
        recoverable: true,
      })
    );
    await preAcknowledge();
    const view = await renderConfirm();

    await userEvent.press(view.getByTestId("confirm-calculate-cta"));

    await waitFor(() =>
      expect(view.getByText("Birth details couldn't be processed.")).toBeTruthy()
    );
    expect(
      view.getByText(
        "No birth time supplied. Pass --time HH:MM, or --noon-for-unknown. Fix the highlighted field and try again."
      )
    ).toBeTruthy();
  });

  it("back link returns via router.back (draft preserved on the /birth instance)", async () => {
    const view = await renderConfirm();
    await userEvent.press(view.getByText(CONFIRM_BACK_LINK));
    expect(routerMock.back).toHaveBeenCalledTimes(1);
  });

  it("redirects to /birth when the draft param is missing or malformed", async () => {
    paramsState.value = { draft: "{not json" };
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    await render(
      <QueryClientProvider client={client}>
        <ConfirmScreen />
      </QueryClientProvider>
    );
    await act(async () => {});
    expect(routerMock.replace).toHaveBeenCalledWith("/birth");
  });
});

// ---------------------------------------------------------------------------
// Result screen (minimal — deepened by 02-09)
// ---------------------------------------------------------------------------

describe("Result screen (/chart/result) — minimal contract", () => {
  it("redirects to /birth without a payload", async () => {
    paramsState.value = {};
    const view = await render(<ResultScreen />);
    await act(async () => {});
    expect(routerMock.replace).toHaveBeenCalledWith("/birth");
    expect(view.queryByText(RESULT_TITLE)).toBeNull();
  });

  it("redirects to /birth with a malformed envelope", async () => {
    paramsState.value = {
      envelope: '{"chart_data": {}}',
      identity: JSON.stringify({ date: "1990-05-21", time: "14:32", label: "Lisbon, Portugal" }),
    };
    await render(<ResultScreen />);
    await act(async () => {});
    expect(routerMock.replace).toHaveBeenCalledWith("/birth");
  });

  it("renders the title, identity line, and validation status from the envelope", async () => {
    const envelope = envelopeFixture();
    paramsState.value = {
      envelope: JSON.stringify(envelope),
      identity: JSON.stringify({ date: "1990-05-21", time: "14:32", label: "Lisbon, Portugal" }),
    };
    const view = await render(<ResultScreen />);
    await act(async () => {});

    expect(view.getByText(RESULT_TITLE)).toBeTruthy();
    expect(
      view.getByText(resultIdentityLine({ date: "1990-05-21", time: "14:32", label: "Lisbon, Portugal" }, "Timed"))
    ).toBeTruthy();
    expect(
      view.getByText(resultValidationStatus(envelope.provenance.schema_version))
    ).toBeTruthy();
  });

  it("omits the time slot from the identity line for Unknown confidence", async () => {
    const envelope = envelopeFixture("Unknown");
    paramsState.value = {
      envelope: JSON.stringify(envelope),
      identity: JSON.stringify({ date: "1990-05-21", time: "", label: "Lisbon, Portugal" }),
    };
    const view = await render(<ResultScreen />);
    await act(async () => {});

    expect(
      view.getByText(resultIdentityLine({ date: "1990-05-21", time: "", label: "Lisbon, Portugal" }, "Unknown"))
    ).toBeTruthy();
    expect(view.queryByText(/14:32/)).toBeNull();
  });
});
