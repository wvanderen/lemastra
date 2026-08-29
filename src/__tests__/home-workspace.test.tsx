import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { render as rtlRender } from "@testing-library/react-native/pure";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { HOME_CTA, HOME_HEADING, HOME_SUBLINE, PRIVACY_LINK } from "@/components/birth/copy";
import {
  HOME_CTA_WITH_CHARTS,
  HOME_LIST_ERROR_COPY,
  SAVED_CHARTS_HEADING,
} from "@/components/workspace/copy";
import type { ChartListItem } from "@/lib/workspace/repository";

// Home workspace tests (03-05 Task 2) — home becomes the D-09 workspace:
// hero stays on top, the saved-charts list mounts beneath the CTA, and
// web degrades honestly.
//
// Contract under test (plan behavior rows):
// - Zero charts: EXACTLY the current hero renders (heading, sub-line,
//   CTA "Calculate your first chart", privacy link) — no "Saved charts"
//   heading, no rows.
// - ≥1 chart: the CTA reads "Calculate a chart"; the "Saved charts"
//   heading + rows render beneath the CTA, above the footer; a row tap
//   routes to /chart/saved with the id param (id-param law — never an
//   envelope).
// - Web (repository unavailable): the capability card replaces the list
//   and the storage query NEVER runs (D-03 — no storage code path
//   mounts); the CTA remains.
// - WORK-01: no sign-in/account/register surface anywhere on home —
//   asserted by exact-render scans over the whole rendered tree.
//
// Test mechanics: RNTL /pure, expo-router mocked, repository faked at
// the D-03 seam (listCharts + isWorkspaceStorageAvailable), renders
// wrapped in a fresh retry-off QueryClient (confirm-screen.test.tsx law).

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  navigate: vi.fn(),
}));
const repository = vi.hoisted(() => ({
  saveChart: vi.fn(),
  listCharts: vi.fn(),
  isWorkspaceStorageAvailable: vi.fn(),
}));

vi.mock("expo-router", () => ({
  router: routerMock,
  useLocalSearchParams: () => ({}),
}));

// D-03 seam fake: home's only data source is the list query; tests swap
// listCharts/availability per case.
vi.mock("@/lib/workspace/repository", () => ({
  saveChart: repository.saveChart,
  listCharts: repository.listCharts,
  isWorkspaceStorageAvailable: repository.isWorkspaceStorageAvailable,
}));

let render: typeof rtlRender;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let Home: typeof import("@/app/index").default;

beforeAll(async () => {
  ({ render, cleanup, act, waitFor } = await import("@testing-library/react-native/pure"));
  ({ default: Home } = await import("@/app/index"));
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  repository.listCharts.mockReset();
  repository.isWorkspaceStorageAvailable.mockReset();
  // Native default: storage available; individual cases flip it.
  repository.isWorkspaceStorageAvailable.mockReturnValue(true);
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

async function renderHome() {
  const { Wrapper } = makeWrapper();
  const view = await render(
    <Wrapper>
      <Home />
    </Wrapper>
  );
  await act(async () => {});
  return view;
}

// ---------------------------------------------------------------------------
// Fixtures — repository summary rows
// ---------------------------------------------------------------------------

const ROW_ONE: ChartListItem = {
  chartId: "chart-1",
  label: "Chart One",
  date: "1990-05-21",
  placeLabel: "Lisbon, Portugal",
  confidence: "Timed",
  revisionCount: 1,
  updatedAt: new Date("2026-08-27T10:00:00Z"),
};

const ROW_TWO: ChartListItem = {
  chartId: "chart-2",
  label: "Chart Two",
  date: "2001-12-25",
  placeLabel: "Porto, Portugal",
  confidence: "Unknown",
  revisionCount: 4,
  updatedAt: new Date("2026-08-26T09:00:00Z"),
};

/** Flatten the rendered JSON tree into document-order text nodes. */
type JsonNode = string | { children?: JsonNode[] } | JsonNode[] | null | undefined;

function collectTexts(node: JsonNode): string[] {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(collectTexts);
  if (node && typeof node === "object") return collectTexts(node.children ?? []);
  return [];
}

/** WORK-01 vocabulary that must NEVER render on home (no account surface). */
const FORBIDDEN_ACCOUNT_PATTERN = /sign\s?in|log\s?in|sign\s?up|register|password|create account|account/i;

// ---------------------------------------------------------------------------
// Empty workspace — the hero IS the empty state
// ---------------------------------------------------------------------------

describe("home workspace — zero charts (D-09 empty state)", () => {
  it("renders exactly the current hero: heading, sub-line, first-chart CTA, privacy link — no Saved charts section", async () => {
    repository.listCharts.mockResolvedValue([]);
    const view = await renderHome();

    expect(view.getByText(HOME_HEADING)).toBeTruthy();
    expect(view.getByText(HOME_SUBLINE)).toBeTruthy();
    expect(view.getByText(HOME_CTA)).toBeTruthy();
    expect(view.getByText("Calculate your first chart")).toBeTruthy();
    expect(view.getByText(PRIVACY_LINK)).toBeTruthy();

    expect(view.queryByText(SAVED_CHARTS_HEADING)).toBeNull();
    expect(view.queryAllByRole("listitem")).toHaveLength(0);
    expect(repository.listCharts).toHaveBeenCalledTimes(1);
  });

  it("renders no account/sign-in surface anywhere in the tree (WORK-01)", async () => {
    repository.listCharts.mockResolvedValue([]);
    const view = await renderHome();
    const texts = collectTexts(view.toJSON());
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text, `home must not render account surface text (got "${text}")`).not.toMatch(
        FORBIDDEN_ACCOUNT_PATTERN
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Workspace with saved charts — list beneath the CTA
// ---------------------------------------------------------------------------

describe("home workspace — saved charts (D-09/D-11)", () => {
  it("switches the CTA to 'Calculate a chart' and renders heading + rows beneath the CTA, above the footer", async () => {
    repository.listCharts.mockResolvedValue([ROW_ONE, ROW_TWO]);
    const view = await renderHome();

    await waitFor(() => expect(view.getByText("Chart One")).toBeTruthy());

    // Document-order layout law: hero → CTA → Saved charts → rows → footer.
    const texts = collectTexts(view.toJSON());
    const order = [
      HOME_HEADING,
      HOME_CTA_WITH_CHARTS,
      SAVED_CHARTS_HEADING,
      "Chart One",
      "Chart Two",
      PRIVACY_LINK,
    ];
    let previous = -1;
    for (const text of order) {
      const index = texts.indexOf(text);
      expect(index, `expected "${text}" to render`).toBeGreaterThan(-1);
      expect(index, `expected "${text}" after the previous section`).toBeGreaterThan(previous);
      previous = index;
    }

    // Empty-workspace CTA label must be gone.
    expect(view.queryByText("Calculate your first chart")).toBeNull();
    // No account surface with charts either (WORK-01).
    for (const text of texts) {
      expect(text).not.toMatch(FORBIDDEN_ACCOUNT_PATTERN);
    }
  });

  it("routes a row tap to /chart/saved with the id param — never an envelope", async () => {
    repository.listCharts.mockResolvedValue([ROW_ONE]);
    const view = await renderHome();

    await waitFor(() => expect(view.getByText("Chart One")).toBeTruthy());
    const row = view.getAllByRole("listitem")[0]!;
    await act(async () => {
      // fireEvent.press keeps this dependency-free of userEvent typing.
      const { fireEvent } = await import("@testing-library/react-native/pure");
      fireEvent.press(row);
    });

    expect(routerMock.push).toHaveBeenCalledTimes(1);
    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: "/chart/saved",
      params: { id: "chart-1" },
    });
  });
});

// ---------------------------------------------------------------------------
// Failed list query — a dead DB never reads as "no charts"
// ---------------------------------------------------------------------------

describe("home workspace — failed list query (distinct error state)", () => {
  it("renders the couldn't-load card with exact deck copy — no saved-charts heading, hero and CTA remain", async () => {
    repository.listCharts.mockRejectedValue(new Error("sqlite: no such table"));
    const view = await renderHome();

    await waitFor(() => expect(view.getByTestId("home-list-error")).toBeTruthy());
    expect(view.getByText(HOME_LIST_ERROR_COPY.heading)).toBeTruthy();
    const body = HOME_LIST_ERROR_COPY.body;
    if (!body) throw new Error("HOME_LIST_ERROR_COPY must define a body");
    expect(view.getByText(body)).toBeTruthy();
    const action = HOME_LIST_ERROR_COPY.action;
    if (!action) throw new Error("HOME_LIST_ERROR_COPY must define an action");
    expect(view.getByText(action)).toBeTruthy();

    // No half-rendered list while errored — the card is what carries the
    // state, never a heading over zero rows.
    expect(view.queryByText(SAVED_CHARTS_HEADING)).toBeNull();
    expect(view.queryAllByRole("listitem")).toHaveLength(0);

    // Calculation needs no DB: the hero and the CTA stay.
    expect(view.getByText(HOME_HEADING)).toBeTruthy();
    expect(view.getByText(HOME_CTA)).toBeTruthy();
  });

  it("Try again refetches the query — recovery dismisses the card and renders the rows", async () => {
    repository.listCharts
      .mockRejectedValueOnce(new Error("sqlite: no such table"))
      .mockResolvedValueOnce([ROW_ONE]);
    const view = await renderHome();

    await waitFor(() => expect(view.getByTestId("home-list-error")).toBeTruthy());

    // 03-05 law: fireEvent.press on the accessible host (query-mounted
    // screen — userEvent's pressability is torn down by re-renders).
    const { fireEvent } = await import("@testing-library/react-native/pure");
    await act(async () => {
      fireEvent.press(view.getByText("Try again"));
    });

    await waitFor(() => expect(repository.listCharts).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(view.getByText("Chart One")).toBeTruthy());
    expect(view.queryByTestId("home-list-error")).toBeNull();
    expect(view.getByText(SAVED_CHARTS_HEADING)).toBeTruthy();
  });

  it("an empty workspace renders NO error card — empty and error states stay mutually distinct", async () => {
    repository.listCharts.mockResolvedValue([]);
    const view = await renderHome();

    await waitFor(() => expect(repository.listCharts).toHaveBeenCalledTimes(1));
    expect(view.queryByTestId("home-list-error")).toBeNull();
    expect(view.getByText("Calculate your first chart")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Web degradation (D-03)
// ---------------------------------------------------------------------------

describe("home workspace — web degradation (D-03)", () => {
  it("replaces the list with the capability card and never runs the storage query; the CTA remains", async () => {
    repository.isWorkspaceStorageAvailable.mockReturnValue(false);
    const view = await renderHome();

    expect(view.getByText("Saved charts are available in the app")).toBeTruthy();
    expect(view.getByText(HOME_CTA)).toBeTruthy(); // CTA stays
    expect(view.queryByText(SAVED_CHARTS_HEADING)).toBeNull();
    expect(view.queryAllByRole("listitem")).toHaveLength(0);
    // No storage code path mounts on web — the query never fires.
    expect(repository.listCharts).not.toHaveBeenCalled();
  });
});
