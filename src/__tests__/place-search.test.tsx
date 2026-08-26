import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  render as rtlRender,
  userEvent as rtlUserEvent,
  within as rtlWithin,
} from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  LATITUDE_ERROR,
  LONGITUDE_ERROR,
  PLACE_APPROXIMATE_NOTE,
  PLACE_EMPTY_BODY,
  PLACE_EMPTY_HEADING,
  PLACE_LABEL,
  PLACE_MANUAL_ACTION,
  PLACE_SEARCH_INSTEAD_ACTION,
  PLACE_SEARCH_PLACEHOLDER,
  PLACE_SEARCHING,
  TIME_ZONE_ERROR,
} from "@/components/birth/copy";
import { PlaceSearch, type PlaceSelection } from "@/components/birth/place-search";
import { ApiError, fetchZones, postPlaceSearch } from "@/lib/api";

// PlaceSearch tests (02-06 Task 1) — the D-05 debounced type-ahead with the
// always-available manual fallback.
//
// Copy assertions are the EXACT copy-deck strings from 02-UI-SPEC §"Copy
// Deck" (birth form, place section): em dashes, curly quotes, and the U+2212
// minus in the coordinate errors included. Zero-results / unavailable state
// copy comes from the error-banner vocabulary (src/components/ui/copy.ts).
//
// Test mechanics (RNTL v14 /pure under the RN vitest shim):
// - The api module's two network functions are mocked; ApiError passes
//   through from the real module so error codes are constructed exactly as
//   src/lib/api.ts throws them.
// - Renders wrap the component in a fresh retry-off QueryClient per test —
//   place-search owns its queries via TanStack Query.
// - Debounce timing is asserted against REAL 300 ms timers (waitFor), not
//   fake timers — the T-02-22 mitigation is the component's actual clock.
// - Presses go through userEvent.press (act-flushed); text entry uses
//   fireEvent.changeText wrapped in act.

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    postPlaceSearch: vi.fn(),
    fetchZones: vi.fn(),
  };
});

// Acquired in beforeAll (not a static import): RNTL requires react-native
// at import time, and the RN test shim only seeds require.cache when the
// setupFile has run — which happens after collection but before hooks.
let render: typeof rtlRender;
let within: typeof rtlWithin;
let userEvent: typeof rtlUserEvent;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;

beforeAll(async () => {
  ({ render, within, userEvent, cleanup, act, fireEvent } = await import(
    "@testing-library/react-native/pure"
  ));
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
});

/** A rendered host element queryable by `within`. */
type Instance = Parameters<typeof rtlWithin>[0];

const PROVENANCE = { provider: "google-geocoding-timezone", lookup_timestamp: "2026-08-26T00:00:00Z" };

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    label: "Lisbon, Portugal",
    lat: 38.7223,
    lon: -9.1393,
    location_type: "ROOFTOP",
    place_id: "ChIJzd_XTDavLGQERCSDOciThLY",
    ...overrides,
  };
}

/** Render PlaceSearch inside a fresh retry-off QueryClient. */
async function renderPlaceSearch(props?: {
  value?: PlaceSelection | null;
  onChange?: (value: PlaceSelection | null) => void;
}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onChange = props?.onChange ?? vi.fn();
  const view = await render(
    <QueryClientProvider client={client}>
      <PlaceSearch value={props?.value ?? null} onChange={onChange} />
    </QueryClientProvider>
  );
  return { view, onChange };
}

/** The search input, located by its copy-deck placeholder. */
function searchInput(view: { getByPlaceholderText: (p: string) => Instance }) {
  return view.getByPlaceholderText(PLACE_SEARCH_PLACEHOLDER);
}

async function typeQuery(view: { getByPlaceholderText: (p: string) => Instance }, text: string) {
  await act(async () => {
    fireEvent.changeText(searchInput(view), text);
  });
}

/** Press the candidate card showing `label` (cards are role="button"). */
async function pressCandidate(view: { getAllByRole: (r: string) => Instance[] }, label: string) {
  const card = view
    .getAllByRole("button")
    .find((button) => within(button).queryByText(label));
  if (!card) throw new Error(`expected a candidate card for ${label}`);
  await userEvent.press(card);
}

describe("PlaceSearch (D-05) — debounced type-ahead", () => {
  it("debounces at ≥300 ms, guarded at 3 characters: 'br' never queries, 'bro' queries exactly once", async () => {
    const { PLACE_SEARCH_DEBOUNCE_MS } = await import("@/components/birth/place-search");
    expect(PLACE_SEARCH_DEBOUNCE_MS).toBeGreaterThanOrEqual(300);

    const { view } = await renderPlaceSearch();

    await typeQuery(view, "br");
    // Past the full debounce window with only 2 chars — guard blocks the call.
    await new Promise((resolve) => setTimeout(resolve, PLACE_SEARCH_DEBOUNCE_MS + 150));
    expect(postPlaceSearch).not.toHaveBeenCalled();

    await typeQuery(view, "bro");
    await view.waitFor(() => expect(postPlaceSearch).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(postPlaceSearch).toHaveBeenCalledWith({ query: "bro" });
  });

  it("renders the empty state before 3 characters and the searching state while pending", async () => {
    let release: () => void = () => {};
    postPlaceSearch.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({ candidates: [], provenance: PROVENANCE });
      })
    );

    const { view } = await renderPlaceSearch();
    expect(view.getByText(PLACE_EMPTY_HEADING)).toBeTruthy();
    expect(view.getByText(PLACE_EMPTY_BODY)).toBeTruthy();
    expect(view.getByText(PLACE_LABEL)).toBeTruthy();

    await typeQuery(view, "lis");
    await view.waitFor(() => expect(view.getByText(PLACE_SEARCHING)).toBeTruthy(), {
      timeout: 2000,
    });
    release();
  });

  it("renders at most five candidate cards and selecting one emits the google selection with a coords line", async () => {
    postPlaceSearch.mockResolvedValue({
      candidates: [
        candidate({ label: "Lisbon, Portugal", place_id: "p1" }),
        candidate({ label: "Lisbon, Iowa, USA", place_id: "p2" }),
        candidate({ label: "Lisbon, North Dakota, USA", place_id: "p3" }),
        candidate({ label: "Lisbon, Wisconsin, USA", place_id: "p4" }),
        candidate({ label: "Lisbon, Maine, USA", place_id: "p5" }),
        candidate({ label: "Lisbon Falls, Maine, USA", place_id: "p6" }),
      ],
      provenance: PROVENANCE,
    });

    const { view, onChange } = await renderPlaceSearch();
    await typeQuery(view, "lisbon");

    await view.waitFor(() => expect(view.getAllByRole("button")).toHaveLength(6), {
      timeout: 2000,
    }); // 5 candidate cards + the persistent manual toggle

    // The sixth candidate never renders (T-02-22 5-card cap).
    expect(view.queryByText("Lisbon Falls, Maine, USA")).toBeNull();

    await pressCandidate(view, "Lisbon, Portugal");
    expect(onChange).toHaveBeenCalledWith({
      source: "google",
      label: "Lisbon, Portugal",
      lat: 38.7223,
      lon: -9.1393,
      location_type: "ROOFTOP",
      place_id: "p1",
    });

    // Resolved card: coords line + Change action; the candidate list is hidden.
    expect(view.getByText("38.7223°, -9.1393°")).toBeTruthy();
    expect(view.getByText("Change")).toBeTruthy();
    expect(view.queryByText("Lisbon, Iowa, USA")).toBeNull();
  });

  it("shows the approximate-match note when location_type is APPROXIMATE", async () => {
    postPlaceSearch.mockResolvedValue({
      candidates: [candidate({ location_type: "APPROXIMATE" })],
      provenance: PROVENANCE,
    });
    const { view } = await renderPlaceSearch();
    await typeQuery(view, "lis");
    await view.waitFor(() => expect(view.queryByText("Lisbon, Portugal")).toBeTruthy(), {
      timeout: 2000,
    });
    await pressCandidate(view, "Lisbon, Portugal");
    expect(view.getByText(PLACE_APPROXIMATE_NOTE)).toBeTruthy();
  });

  it("shows the approximate-match note when partial_match is set", async () => {
    postPlaceSearch.mockResolvedValue({
      candidates: [candidate({ partial_match: true })],
      provenance: PROVENANCE,
    });
    const { view } = await renderPlaceSearch();
    await typeQuery(view, "lisb");
    await view.waitFor(() => expect(view.queryByText("Lisbon, Portugal")).toBeTruthy(), {
      timeout: 2000,
    });
    await pressCandidate(view, "Lisbon, Portugal");
    expect(view.getByText(PLACE_APPROXIMATE_NOTE)).toBeTruthy();
  });

  it("renders the zero-results inline state with the manual action", async () => {
    postPlaceSearch.mockRejectedValue(
      new ApiError({
        code: "PLACE_ZERO_RESULTS",
        message: "No match found for “zzz”.",
        recoverable: true,
      })
    );
    const { view } = await renderPlaceSearch();
    await typeQuery(view, "zzz");
    await view.waitFor(() => expect(view.getByText("No match found for “zzz”.")).toBeTruthy(), {
      timeout: 2000,
    });
    expect(view.getByText("Try a nearby city or a larger place name.")).toBeTruthy();
    expect(view.getByText(PLACE_MANUAL_ACTION)).toBeTruthy();
  });

  it("renders the provider-unavailable inline state with the manual action", async () => {
    postPlaceSearch.mockRejectedValue(
      new ApiError({
        code: "PLACE_PROVIDER_UNAVAILABLE",
        message: "upstream unavailable",
        recoverable: true,
      })
    );
    const { view } = await renderPlaceSearch();
    await typeQuery(view, "lis");
    await view.waitFor(
      () => expect(view.getByText("Place search is unavailable right now.")).toBeTruthy(),
      { timeout: 2000 }
    );
    expect(view.getByText("Check your connection and try again.")).toBeTruthy();
  });
});

describe("PlaceSearch (D-05) — manual fallback branch", () => {
  it("swaps branches via the persistent toggle without losing the other branch's state", async () => {
    postPlaceSearch.mockResolvedValue({
      candidates: [candidate()],
      provenance: PROVENANCE,
    });
    const { view } = await renderPlaceSearch();
    await typeQuery(view, "lis");

    // Enter the manual branch from the persistent toggle.
    const toggle = view
      .getAllByRole("button")
      .find((button) => within(button).queryByText(PLACE_MANUAL_ACTION));
    if (!toggle) throw new Error("expected the persistent manual toggle");
    await userEvent.press(toggle);

    expect(view.getByPlaceholderText("For reference on your chart")).toBeTruthy();
    expect(view.getByText(PLACE_SEARCH_INSTEAD_ACTION)).toBeTruthy();

    // Back to search — the query text (and its candidates) survive the swap.
    const back = view
      .getAllByRole("button")
      .find((button) => within(button).queryByText(PLACE_SEARCH_INSTEAD_ACTION));
    if (!back) throw new Error("expected the search-by-name toggle");
    await userEvent.press(back);
    expect(searchInput(view).props.value).toBe("lis");
    await view.waitFor(() => expect(view.getByText("Lisbon, Portugal")).toBeTruthy(), {
      timeout: 2000,
    });
  });

  it("validates latitude and longitude bounds with the exact copy-deck errors", async () => {
    const { view } = await renderPlaceSearch();
    await userEvent.press(view.getByText(PLACE_MANUAL_ACTION));

    const name = view.getByPlaceholderText("For reference on your chart");
    const latitude = view.getByTestId("manual-latitude");
    const longitude = view.getByTestId("manual-longitude");
    await act(async () => {
      fireEvent.changeText(name, "Family farm");
      fireEvent.changeText(latitude, "91");
      fireEvent.changeText(longitude, "200");
    });

    expect(view.getByText(LATITUDE_ERROR)).toBeTruthy();
    expect(view.getByText(LONGITUDE_ERROR)).toBeTruthy();
  });

  it("populates the zone picker from fetchZones, filters it, and emits a complete manual place", async () => {
    fetchZones.mockResolvedValue({
      zones: ["Africa/Cairo", "America/New_York", "Europe/Lisbon", "Europe/London"],
    });
    const { view, onChange } = await renderPlaceSearch();
    await userEvent.press(view.getByText(PLACE_MANUAL_ACTION));

    const name = view.getByPlaceholderText("For reference on your chart");
    const latitude = view.getByTestId("manual-latitude");
    const longitude = view.getByTestId("manual-longitude");
    await act(async () => {
      fireEvent.changeText(name, "Family farm");
      fireEvent.changeText(latitude, "-8.0");
      fireEvent.changeText(longitude, "12.5");
    });

    // Zone required until chosen — the picker lists every server zone.
    expect(view.getByText(TIME_ZONE_ERROR)).toBeTruthy();
    expect(view.getByText("Africa/Cairo")).toBeTruthy();
    expect(view.getByText("Europe/Lisbon")).toBeTruthy();

    // Searchable: typing narrows the list.
    await act(async () => {
      fireEvent.changeText(view.getByTestId("zone-filter"), "lisb");
    });
    expect(view.queryByText("Africa/Cairo")).toBeNull();
    expect(view.getByText("Europe/Lisbon")).toBeTruthy();

    await userEvent.press(view.getByText("Europe/Lisbon"));
    expect(onChange).toHaveBeenCalledWith({
      source: "manual",
      label: "Family farm",
      lat: -8,
      lon: 12.5,
      iana_zone: "Europe/Lisbon",
      zone_source: "manual",
    });
    expect(view.queryByText(TIME_ZONE_ERROR)).toBeNull();
  });
});
