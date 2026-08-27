import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  render as rtlRender,
  within as rtlWithin,
} from "@testing-library/react-native/pure";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ASSUMPTIONS_LABEL,
  CALCULATION_DETAILS_HEADER,
  PLACEMENTS_HEADING,
  UNAVAILABLE_HEADING,
} from "@/components/chart/copy";
import {
  BACK_TO_HISTORY,
  EXPORT_CHART_DATA,
  HISTORY_HEADING,
  LATEST_CHIP,
  LOADING_CHART,
  OPEN_FAILED_ERROR_COPY,
  READ_ONLY_MARKER_HEADING,
  RENAME_ACTION,
  REVISE_ACTION,
} from "@/components/workspace/copy";
import type { CalculateResponse } from "@/lib/api-schemas";
import type { ChartDetail, RevisionRead } from "@/lib/workspace/repository";

// Revision-history + read-only revision view tests (03-07 Task 1) — the
// D-07 surfaces: the History list on the saved detail and the /chart/revision
// route.
//
// Contract under test (plan behavior rows):
// - RevisionHistory renders ONLY when >1 revision exists; rows read
//   "{date} · {what changed}" NEWEST-first, the newest row alone carries the
//   "Latest" chip and is NON-navigational, older rows are links emitting
//   their revisionId. Row a11y labels follow the copy-deck template
//   "{date}, {what changed}{, Latest}. Opens a read-only version."
// - /chart/revision?id= renders the "Earlier version — read-only" marker
//   card ("{date} · {what changed}"), the full Phase-2 composition for that
//   revision's STORED envelope (PlacementList, AssumptionsLine without any
//   action, ProvenanceDetails, validation status, UnavailableFactors), and
//   the "Back to History" link — with ZERO mutating controls (no rename, no
//   data actions, no revise, no adjust-and-recalculate) (T-03-22).
// - Missing id or unknown revision redirects home.
// - A typed open failure (WorkspaceError OPEN_FAILED) renders the
//   open-failed error card — never a partial render.
//
// Test mechanics: RNTL /pure, expo-router mocked, repository faked at the
// D-03 seam (real WorkspaceError preserved via importOriginal), expo-crypto
// node stand-in. Renders wrap in a fresh retry-off QueryClient
// (saved-chart-detail.test.tsx conventions).

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  navigate: vi.fn(),
}));
const paramsState = vi.hoisted(() => ({ value: {} as Record<string, string | string[]> }));
const repository = vi.hoisted(() => ({
  getRevisionContent: vi.fn(),
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

// D-03 seam fake with the real typed-error class preserved so error
// fixtures construct exactly as the repository throws them.
vi.mock("@/lib/workspace/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/workspace/repository")>();
  return {
    ...actual,
    getRevisionContent: repository.getRevisionContent,
    getChartDetail: repository.getChartDetail,
    isWorkspaceStorageAvailable: repository.isWorkspaceStorageAvailable,
  };
});

let render: typeof rtlRender;
let within: typeof rtlWithin;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let WorkspaceError: typeof import("@/lib/workspace/repository").WorkspaceError;
let RevisionHistory: typeof import("@/components/workspace/revision-history").RevisionHistory;
let RevisionScreen: typeof import("@/app/chart/revision").default;

beforeAll(async () => {
  ({ render, within, cleanup, act, fireEvent, waitFor } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ WorkspaceError } = await import("@/lib/workspace/repository"));
  ({ RevisionHistory } = await import("@/components/workspace/revision-history"));
  ({ default: RevisionScreen } = await import("@/app/chart/revision"));
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

// ---------------------------------------------------------------------------
// Fixtures — stored inputs evolving across two revisions + envelope
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
  input_revision: "fff000111222",
  calculator_cmd: "python tools/birth_to_chart.py --input <temp-json> --validate",
} as const;

function storedEnvelope(): CalculateResponse {
  return {
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
  };
}

/** The ORIGINAL basis (rev-1, 2026-08-20). */
const ORIGINAL_INPUTS = {
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

/** The revised basis (rev-2, 2026-08-27) — birth date changed. */
const REVISED_INPUTS = { ...ORIGINAL_INPUTS, date: "1991-06-01" } as const;

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
      envelope: storedEnvelope(),
      inputs: { ...REVISED_INPUTS },
      identity: {
        date: "1991-06-01",
        time: "",
        label: "Lisbon, Portugal",
        zone_source: "google",
      },
      createdAt: new Date("2026-08-27T10:00:00Z"),
    },
    revisionCount: 2,
    revisions: [
      {
        revisionId: "rev-1",
        createdAt: new Date("2026-08-20T10:00:00Z"),
        inputRevision: "fff000111222",
        inputs: { ...ORIGINAL_INPUTS },
      },
      {
        revisionId: "rev-2",
        createdAt: new Date("2026-08-27T10:00:00Z"),
        inputRevision: "abc123def456",
        inputs: { ...REVISED_INPUTS },
      },
    ],
  };
}

function revisionRead(): RevisionRead {
  return {
    chartId: "chart-1",
    label: "My saved chart",
    revision: {
      revisionId: "rev-1",
      inputRevision: "fff000111222",
      envelope: storedEnvelope(),
      inputs: { ...ORIGINAL_INPUTS },
      identity: {
        date: "1990-05-21",
        time: "",
        label: "Lisbon, Portugal",
        zone_source: "google",
      },
      createdAt: new Date("2026-08-20T10:00:00Z"),
    },
    createdAt: new Date("2026-08-20T10:00:00Z"),
  };
}

/** History rows as the saved detail passes them (repository order, desc). */
function historyRevisions() {
  return chartDetail().revisions;
}

// ---------------------------------------------------------------------------
// RevisionHistory component (D-07)
// ---------------------------------------------------------------------------

describe("RevisionHistory — render rules", () => {
  it("renders nothing when the chart has zero or one revision", async () => {
    const single = historyRevisions().slice(0, 1);
    const empty = await render(
      <RevisionHistory revisions={single} onOpenRevision={() => undefined} />
    );
    expect(empty.queryByText(HISTORY_HEADING)).toBeNull();
    expect(empty.toJSON()).toBeNull();

    const none = await render(<RevisionHistory revisions={[]} onOpenRevision={() => undefined} />);
    expect(none.toJSON()).toBeNull();
  });

  it("renders rows newest-first with the Latest chip on the newest row only", async () => {
    const view = await render(
      <RevisionHistory revisions={historyRevisions()} onOpenRevision={() => undefined} />
    );

    expect(view.getByText(HISTORY_HEADING)).toBeTruthy();
    const rows = view.getAllByRole("listitem");
    expect(rows).toHaveLength(2);

    // Newest first: rev-2's row ("Birth date changed") above rev-1's
    // ("Original details"); the chip lives on the newest row alone.
    const newest = within(rows[0]!);
    const oldest = within(rows[1]!);
    expect(newest.getByText("2026-08-27 · Birth date changed")).toBeTruthy();
    expect(newest.getByText(LATEST_CHIP)).toBeTruthy();
    expect(oldest.getByText("2026-08-20 · Original details")).toBeTruthy();
    expect(oldest.queryByText(LATEST_CHIP)).toBeNull();
  });

  it("labels rows with the exact copy-deck a11y template", async () => {
    const view = await render(
      <RevisionHistory revisions={historyRevisions()} onOpenRevision={() => undefined} />
    );

    const rows = view.getAllByRole("listitem");
    expect(rows[0]!.props.accessibilityLabel).toBe(
      "2026-08-27, Birth date changed, Latest. Opens a read-only version."
    );
    expect(rows[1]!.props.accessibilityLabel).toBe(
      "2026-08-20, Original details. Opens a read-only version."
    );
  });

  it("older rows are links emitting their revisionId; the Latest row is not navigational", async () => {
    const onOpenRevision = vi.fn();
    const view = await render(
      <RevisionHistory revisions={historyRevisions()} onOpenRevision={onOpenRevision} />
    );

    const rows = view.getAllByRole("listitem");
    await act(async () => {
      fireEvent.press(rows[1]!); // older row — a link
      fireEvent.press(rows[0]!); // Latest row — plain View, no press handler
    });

    expect(onOpenRevision).toHaveBeenCalledTimes(1);
    expect(onOpenRevision).toHaveBeenCalledWith("rev-1");
  });
});

// ---------------------------------------------------------------------------
// /chart/revision — the read-only earlier-version route (WORK-04 / T-03-22)
// ---------------------------------------------------------------------------

async function renderRevision(id?: string) {
  paramsState.value = id === undefined ? {} : { id };
  const { Wrapper } = makeWrapper();
  const view = await render(
    <Wrapper>
      <RevisionScreen />
    </Wrapper>
  );
  await act(async () => {});
  return view;
}

describe("/chart/revision — read-only earlier version", () => {
  it("renders the marker card, the stored-evidence composition, and Back to History", async () => {
    repository.getRevisionContent.mockResolvedValue(revisionRead());
    repository.getChartDetail.mockResolvedValue(chartDetail());
    const view = await renderRevision("rev-1");

    // The detail query chains off the revision read (chartId) — wait for
    // the composed content, then assert document facts.
    await waitFor(() => expect(view.getByText(READ_ONLY_MARKER_HEADING)).toBeTruthy());
    // Marker body: "{date} · {what changed}" for the OPENED revision.
    expect(view.getByText("2026-08-20 · Original details")).toBeTruthy();

    // The Phase-2 composition renders from the stored envelope.
    expect(view.getByText(PLACEMENTS_HEADING)).toBeTruthy();
    expect(view.getByText(ASSUMPTIONS_LABEL)).toBeTruthy();
    expect(view.getByText(CALCULATION_DETAILS_HEADER)).toBeTruthy();
    expect(view.getByText(UNAVAILABLE_HEADING)).toBeTruthy();

    expect(view.getByText(BACK_TO_HISTORY)).toBeTruthy();
  });

  it("carries ZERO mutating controls — no rename, no data actions, no revise, no adjust", async () => {
    repository.getRevisionContent.mockResolvedValue(revisionRead());
    repository.getChartDetail.mockResolvedValue(chartDetail());
    const view = await renderRevision("rev-1");

    expect(view.queryByText(RENAME_ACTION)).toBeNull();
    expect(view.queryByText(EXPORT_CHART_DATA)).toBeNull();
    expect(view.queryByText("Delete chart")).toBeNull();
    expect(view.queryByText(REVISE_ACTION)).toBeNull();
    expect(view.queryByText("Adjust & recalculate")).toBeNull();
  });

  it("Back to History navigates back", async () => {
    repository.getRevisionContent.mockResolvedValue(revisionRead());
    repository.getChartDetail.mockResolvedValue(chartDetail());
    const view = await renderRevision("rev-1");

    await waitFor(() => expect(view.getByText(BACK_TO_HISTORY)).toBeTruthy());
    await act(async () => {
      fireEvent.press(view.getByText(BACK_TO_HISTORY));
    });
    expect(routerMock.back).toHaveBeenCalledTimes(1);
  });

  it("shows the loading state while the stored revision resolves", async () => {
    repository.getRevisionContent.mockReturnValue(new Promise(() => undefined));
    const view = await renderRevision("rev-1");

    expect(view.getByText(LOADING_CHART)).toBeTruthy();
    expect(view.queryByText(READ_ONLY_MARKER_HEADING)).toBeNull();
  });

  it("redirects home for a missing id param without touching the repository", async () => {
    const view = await renderRevision(undefined);

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/"));
    expect(repository.getRevisionContent).not.toHaveBeenCalled();
    expect(view.toJSON()).toBeNull();
  });

  it("redirects home when the repository returns null (unknown revision id)", async () => {
    repository.getRevisionContent.mockResolvedValue(null);
    const view = await renderRevision("rev-404");

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/"));
    expect(view.queryByText(READ_ONLY_MARKER_HEADING)).toBeNull();
  });

  it("renders the typed open-failed error card for a stored envelope that fails parse — never a partial render", async () => {
    repository.getRevisionContent.mockRejectedValue(
      new WorkspaceError({
        code: "OPEN_FAILED",
        message: "A saved revision failed its stored contract on read.",
      })
    );
    const view = await renderRevision("rev-1");

    await waitFor(() => expect(view.getByText(OPEN_FAILED_ERROR_COPY.heading)).toBeTruthy());
    const body = OPEN_FAILED_ERROR_COPY.body;
    if (!body) throw new Error("OPEN_FAILED_ERROR_COPY must define a body");
    expect(view.getByText(body)).toBeTruthy();
    expect(view.queryByText(PLACEMENTS_HEADING)).toBeNull();
    expect(view.queryByText(READ_ONLY_MARKER_HEADING)).toBeNull();
  });
});
