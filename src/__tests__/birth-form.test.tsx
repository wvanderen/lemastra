import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  render as rtlRender,
  userEvent as rtlUserEvent,
  within as rtlWithin,
} from "@testing-library/react-native/pure";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  BIRTH_DATE_ERROR,
  BIRTH_FORM_CTA,
  BIRTH_TIME_ERROR,
  HOME_CTA,
  HOME_HEADING,
  HOME_SUBLINE,
  PLACE_MANUAL_ACTION,
  PRIVACY_LINK,
  UNKNOWN_TIME_FIELD_HELPER,
} from "@/components/birth/copy";
import { ApiError } from "@/lib/api";
import type { PlaceCandidate, PlaceSearchResponse, ResolveTimeResponse } from "@/lib/api-schemas";

// Birth form tests (02-06 Task 2) — the /birth screen (RHF + zod over the
// discriminated place union + the unknown-time interdependency), the home
// CTA contract, and the _layout QueryProvider wiring.
//
// Copy assertions are the EXACT copy-deck strings from 02-UI-SPEC §"Copy
// Deck" (birth form + home sections). Error-banner strings come from the
// error-banner vocabulary (src/components/ui/copy.ts).
//
// Test mechanics (RNTL v14 /pure under the RN vitest shim — same
// conventions as place-search.test.tsx):
// - The api module's network functions are mocked; ApiError passes through
//   from the real module so error codes construct exactly as src/lib/api.ts
//   throws them. expo-router is mocked (router.push spy + inert Stack /
//   ThemeProvider); a context probe inside the mocked Stack records whether
//   a QueryClient is in scope, proving _layout mounts QueryProvider.
// - Renders wrap the form in a fresh retry-off QueryClient per test.
// - Presses go through userEvent.press (act-flushed); text entry uses
//   fireEvent.changeText wrapped in act. The place type-ahead debounce is
//   awaited against REAL 300 ms timers via waitFor.

const routerMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("expo-router", async () => {
  const { useQueryClient } = await import("@tanstack/react-query");
  let probeQueryClient: unknown = null;
  /** Renders inside <Stack>; records the QueryClient visible there (or throws without a provider). */
  function QueryContextProbe() {
    probeQueryClient = useQueryClient();
    return null;
  }
  /** Inert Stack: renders its screens plus the provider probe. */
  function Stack({ children }: { children?: ReactNode }) {
    return (
      <>
        {children}
        <QueryContextProbe key="gsd-query-probe" />
      </>
    );
  }
  Stack.Screen = () => null;
  return {
    router: routerMock,
    Stack,
    ThemeProvider: ({ children }: { children?: ReactNode }) => <>{children ?? null}</>,
    DarkTheme: {},
    DefaultTheme: {},
    /** Exposes the probe's captured QueryClient to the test (null until the layout renders). */
    __probeQueryClient: () => probeQueryClient,
  };
});

vi.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/components/animated-icon", () => ({
  AnimatedSplashOverlay: () => null,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    postPlaceSearch: vi.fn(),
    postResolveTime: vi.fn(),
    fetchZones: vi.fn(),
  };
});

// Acquired in beforeAll (not static imports): RNTL and every module that
// (transitively) requires react-native must load after the RN test shim has
// seeded require.cache — see src/test/setup.ts and place-search.test.tsx.
let render: typeof rtlRender;
let within: typeof rtlWithin;
let userEvent: typeof rtlUserEvent;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let createElement: typeof import("react").createElement;
/** The mocked api module — network fns are vi.fn()s (see vi.mock above). */
let api: typeof import("@/lib/api");
let BirthForm: typeof import("@/app/birth").default;
let Home: typeof import("@/app/index").default;
let RootLayout: typeof import("@/app/_layout").default;

beforeAll(async () => {
  ({ render, within, userEvent, cleanup, act, fireEvent, waitFor } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ createElement } = await import("react"));
  api = await import("@/lib/api");
  ({ default: BirthForm } = await import("@/app/birth"));
  ({ default: Home } = await import("@/app/index"));
  ({ default: RootLayout } = await import("@/app/_layout"));
});

/** The mocked resolve-time endpoint (typed via vi.mocked for tsc). */
function resolveMock() {
  return vi.mocked(api.postResolveTime);
}

/** The mocked type-ahead endpoint. */
function placeSearchMock() {
  return vi.mocked(api.postPlaceSearch);
}

/** The mocked zones endpoint. */
function zonesMock() {
  return vi.mocked(api.fetchZones);
}

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
});

/** A rendered host element queryable by `within`. */
type Instance = Parameters<typeof rtlWithin>[0];

const PROVENANCE: PlaceSearchResponse["provenance"] = {
  provider: "google-geocoding-timezone",
  lookup_timestamp: "2026-08-26T00:00:00Z",
};

const CANDIDATE: PlaceCandidate = {
  label: "Lisbon, Portugal",
  lat: 38.7223,
  lon: -9.1393,
  location_type: "ROOFTOP",
  place_id: "p1",
};

const RESOLVE_RESPONSE: ResolveTimeResponse = {
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

/** Render the /birth screen inside a fresh retry-off QueryClient. */
async function renderBirthForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = await render(
    <QueryClientProvider client={client}>
      <BirthForm />
    </QueryClientProvider>
  );
  return { view };
}

/** Press the primary CTA ("Review birth details"). */
async function pressReview(view: { getByText: (text: string) => Instance }) {
  await userEvent.press(view.getByText(BIRTH_FORM_CTA));
}

/** Select the Lisbon candidate through the debounced search branch. */
async function selectLisbon(view: {
  getByTestId: (id: string) => Instance;
  getAllByRole: (role: string) => Instance[];
}) {
  await act(async () => {
    fireEvent.changeText(view.getByTestId("place-search-input"), "lisbon");
  });
  await waitFor(() => expect(view.getByText("Lisbon, Portugal")).toBeTruthy(), { timeout: 2000 });
  const card = view
    .getAllByRole("button")
    .find((button) => within(button).queryByText("Lisbon, Portugal"));
  if (!card) throw new Error("expected a candidate card for Lisbon, Portugal");
  await userEvent.press(card);
}

/** Fill date + time and select the google candidate — a fully valid Timed form. */
async function fillValidTimedForm(view: {
  getByTestId: (id: string) => Instance;
  getByText: (text: string) => Instance;
  getAllByRole: (role: string) => Instance[];
}) {
  await act(async () => {
    fireEvent.changeText(view.getByTestId("birth-date-input"), "1990-05-21");
    fireEvent.changeText(view.getByTestId("birth-time-input"), "14:32");
  });
  await selectLisbon(view);
}

describe("Birth form (/birth) — validation", () => {
  it("shows the copy-deck inline errors for an empty submit and does not navigate", async () => {
    const { view } = await renderBirthForm();
    await pressReview(view);
    await waitFor(() => expect(view.getByText(BIRTH_DATE_ERROR)).toBeTruthy());
    expect(view.getByText(BIRTH_TIME_ERROR)).toBeTruthy();
    expect(resolveMock()).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("rejects malformed date/time formats with the same inline errors", async () => {
    const { view } = await renderBirthForm();
    await act(async () => {
      fireEvent.changeText(view.getByTestId("birth-date-input"), "21-05-1990");
      fireEvent.changeText(view.getByTestId("birth-time-input"), "25:99");
    });
    await pressReview(view);
    await waitFor(() => expect(view.getByText(BIRTH_DATE_ERROR)).toBeTruthy());
    expect(view.getByText(BIRTH_TIME_ERROR)).toBeTruthy();
    expect(resolveMock()).not.toHaveBeenCalled();
  });

  it("rejects a syntactically well-formed but nonexistent calendar date", async () => {
    const { view } = await renderBirthForm();
    await act(async () => {
      fireEvent.changeText(view.getByTestId("birth-date-input"), "1990-02-31");
    });
    await pressReview(view);
    await waitFor(() => expect(view.getByText(BIRTH_DATE_ERROR)).toBeTruthy());
    expect(resolveMock()).not.toHaveBeenCalled();
  });
});

describe("Birth form (/birth) — unknown-time interdependency (BIRTH-04)", () => {
  it("Unknown disables and clears the time field and swaps its helper; other confidences still require a time", async () => {
    const { view } = await renderBirthForm();
    const time = view.getByTestId("birth-time-input");
    expect(time.props.editable).toBe(true);

    await act(async () => {
      fireEvent.changeText(time, "14:32");
    });
    await userEvent.press(view.getByTestId("confidence-unknown"));

    expect(time.props.editable).toBe(false);
    expect(time.props.value).toBe("");
    expect(view.getByText(UNKNOWN_TIME_FIELD_HELPER)).toBeTruthy();

    // Switching back to a time-requiring confidence re-enables the field,
    // removes the helper, and re-requires a time (the clear is not undone).
    await userEvent.press(view.getByTestId("confidence-approximate"));
    expect(time.props.editable).toBe(true);
    expect(view.queryByText(UNKNOWN_TIME_FIELD_HELPER)).toBeNull();

    await pressReview(view);
    await waitFor(() => expect(view.getByText(BIRTH_TIME_ERROR)).toBeTruthy());
    expect(resolveMock()).not.toHaveBeenCalled();
  });
});

describe("Birth form (/birth) — resolve-then-navigate (BIRTH-02 client half)", () => {
  it("calls postResolveTime with the selected google place and navigates to /birth/confirm with the draft", async () => {
    resolveMock().mockResolvedValue(RESOLVE_RESPONSE);
    placeSearchMock().mockResolvedValue({ candidates: [CANDIDATE], provenance: PROVENANCE });

    const { view } = await renderBirthForm();
    await fillValidTimedForm(view);
    await pressReview(view);

    await waitFor(() => expect(resolveMock()).toHaveBeenCalledTimes(1));
    expect(resolveMock()).toHaveBeenCalledWith({
      lat: 38.7223,
      lon: -9.1393,
      local_date: "1990-05-21",
      local_time: "14:32",
    });

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledTimes(1));
    const pushed = routerMock.mock.calls[0][0] as { pathname: string; params: { draft: string } };
    expect(pushed.pathname).toBe("/birth/confirm");
    const draft = JSON.parse(pushed.params.draft) as Record<string, unknown>;
    expect(draft.date).toBe("1990-05-21");
    expect(draft.time).toBe("14:32");
    expect(draft.confidence).toBe("Timed");
    expect(draft.house_system).toBe("Whole Sign");
    expect(draft.place).toMatchObject({
      source: "google",
      label: "Lisbon, Portugal",
      lat: 38.7223,
      lon: -9.1393,
    });
    expect(draft.resolve).toEqual(RESOLVE_RESPONSE);
  });

  it("normalizes a colon-less 24-hour time (1430) to HH:MM for the resolve call", async () => {
    resolveMock().mockResolvedValue(RESOLVE_RESPONSE);
    placeSearchMock().mockResolvedValue({ candidates: [CANDIDATE], provenance: PROVENANCE });

    const { view } = await renderBirthForm();
    await act(async () => {
      fireEvent.changeText(view.getByTestId("birth-date-input"), "1990-05-21");
      fireEvent.changeText(view.getByTestId("birth-time-input"), "1430");
    });
    await selectLisbon(view);
    await pressReview(view);

    await waitFor(() => expect(resolveMock()).toHaveBeenCalledTimes(1));
    expect(resolveMock().mock.calls[0][0]).toMatchObject({ local_time: "14:30" });
  });

  it("resolves Unknown confidence at the documented noon reference time", async () => {
    resolveMock().mockResolvedValue(RESOLVE_RESPONSE);
    placeSearchMock().mockResolvedValue({ candidates: [CANDIDATE], provenance: PROVENANCE });

    const { view } = await renderBirthForm();
    await act(async () => {
      fireEvent.changeText(view.getByTestId("birth-date-input"), "1990-05-21");
    });
    await userEvent.press(view.getByTestId("confidence-unknown"));
    await selectLisbon(view);
    await pressReview(view);

    await waitFor(() => expect(resolveMock()).toHaveBeenCalledTimes(1));
    expect(resolveMock().mock.calls[0][0]).toMatchObject({ local_time: "12:00" });
  });

  it("passes tz_override only on the manual branch", async () => {
    resolveMock().mockResolvedValue(RESOLVE_RESPONSE);
    zonesMock().mockResolvedValue({ zones: ["Europe/Lisbon"] });

    const { view } = await renderBirthForm();
    await act(async () => {
      fireEvent.changeText(view.getByTestId("birth-date-input"), "1990-05-21");
      fireEvent.changeText(view.getByTestId("birth-time-input"), "14:32");
    });
    await userEvent.press(view.getByText(PLACE_MANUAL_ACTION));
    await act(async () => {
      fireEvent.changeText(view.getByTestId("manual-place-name"), "Family farm");
      fireEvent.changeText(view.getByTestId("manual-latitude"), "-8.0");
      fireEvent.changeText(view.getByTestId("manual-longitude"), "12.5");
    });
    await userEvent.press(view.getByText("Europe/Lisbon"));
    await pressReview(view);

    await waitFor(() =>
      expect(resolveMock()).toHaveBeenCalledWith({
        lat: -8,
        lon: 12.5,
        local_date: "1990-05-21",
        local_time: "14:32",
        tz_override: "Europe/Lisbon",
      })
    );
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledTimes(1));
  });

  it("renders the error banner in place on resolve failure; PLACE_* codes deep-link the manual branch", async () => {
    resolveMock().mockRejectedValue(
      new ApiError({
        code: "PLACE_PROVIDER_UNAVAILABLE",
        message: "upstream unavailable",
        recoverable: true,
      })
    );
    placeSearchMock().mockResolvedValue({ candidates: [CANDIDATE], provenance: PROVENANCE });

    const { view } = await renderBirthForm();
    await fillValidTimedForm(view);
    await pressReview(view);

    await waitFor(() =>
      expect(view.getByText("Place search is unavailable right now.")).toBeTruthy()
    );
    expect(view.getByText("Check your connection and try again.")).toBeTruthy();
    expect(routerMock.push).not.toHaveBeenCalled();

    // The banner's "Enter coordinates manually" action switches PlaceSearch
    // to its manual branch (the form drives the controlled branch prop).
    const banner = view.getByRole("alert");
    await userEvent.press(within(banner).getByText(PLACE_MANUAL_ACTION));
    expect(view.getByTestId("manual-place-name")).toBeTruthy();
  });
});

describe("Home screen (/)", () => {
  it("renders the home contract and links to /birth and /privacy", async () => {
    const view = await render(<Home />);
    expect(view.getByText(HOME_HEADING)).toBeTruthy();
    expect(view.getByText(HOME_SUBLINE)).toBeTruthy();
    expect(view.getByText(PRIVACY_LINK)).toBeTruthy();

    await userEvent.press(view.getByText(HOME_CTA));
    expect(routerMock.push).toHaveBeenCalledWith("/birth");

    await userEvent.press(view.getByText(PRIVACY_LINK));
    expect(routerMock.push).toHaveBeenCalledWith("/privacy");
  });
});

describe("Root layout wiring", () => {
  it("mounts the app inside the QueryProvider from 02-02", async () => {
    await render(createElement(RootLayout));
    const expoRouter = (await import("expo-router")) as unknown as {
      __probeQueryClient: () => unknown;
    };
    // The probe renders inside <Stack>; useQueryClient throws ("No
    // QueryClient set") when _layout does not wrap the tree in QueryProvider,
    // so reaching this assertion with a client proves the wiring.
    expect(expoRouter.__probeQueryClient()).toBeTruthy();
  });
});
