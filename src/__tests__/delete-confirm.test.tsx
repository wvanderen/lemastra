import type { render as rtlRender } from "@testing-library/react-native/pure";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DELETING,
  DELETE_ALL_BODY,
  DELETE_ALL_CONFIRM,
  DELETE_ALL_HEADING,
  DELETE_CANCEL,
  DELETE_CHART_CONFIRM,
  DELETE_ERROR_COPY,
  deleteChartBody,
  deleteChartHeading,
} from "@/components/workspace/copy";
import type { ChartDetail } from "@/lib/workspace/repository";

// DeleteConfirm tests (03-06 Task 1) — the ONE shared destructive
// confirm dialog (03-UI-SPEC A-3-UI-2): a variant-driven RN Modal
// serving both the single-chart delete (D-14) and the 03-08 delete-all
// (D-15) flows.
//
// Contract under test (plan behavior rows + 03-UI-SPEC §"Deletion"):
// - chart variant: heading 'Delete “{label}”?' (Body/600, ERROR text),
//   body naming the revision count + permanence + can't-undo, confirm
//   "Delete chart" (the ONLY error-filled element), cancel "Cancel"
//   (default-toned).
// - Pending: confirm disabled and shows "Deleting…".
// - all variant: its 03-08 copy via props (variant strings from the
//   deck — "Delete all your data?" / body / "Delete everything").
// - Cancel emits onCancel and removes nothing; confirm emits onConfirm
//   only while enabled.
// - Dialog laws: accessibilityViewIsModal, full-action confirm labels.
//
// Test mechanics: RNTL v14 /pure under the RN vitest shim (the shim
// mocks RN Modal — 03-04 decision; same conventions as
// save-prompt.test.tsx).

let render: typeof rtlRender;
let userEvent: typeof import("@testing-library/react-native/pure").userEvent;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let DeleteConfirm: typeof import("@/components/workspace/delete-confirm").DeleteConfirm;

beforeAll(async () => {
  ({ render, userEvent, fireEvent, cleanup, act } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ DeleteConfirm } = await import("@/components/workspace/delete-confirm"));
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
});

type ConfirmOverrides = Partial<{
  visible: boolean;
  variant: "chart" | "all";
  label: string;
  revisionCount: number;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}>;

async function renderConfirm(overrides: ConfirmOverrides = {}) {
  const props = {
    visible: true,
    variant: "chart" as const,
    label: "My saved chart",
    revisionCount: 2,
    pending: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  const view = await render(<DeleteConfirm {...props} />);
  await act(async () => {});
  return { view, props };
}

/** Style arrays on RN hosts may arrive nested — flatten to plain objects. */
function styleEntries(node: { props: { style?: unknown } }): Record<string, unknown>[] {
  const flatten = (value: unknown): unknown[] =>
    Array.isArray(value) ? value.flatMap(flatten) : [value];
  return flatten(node.props.style).filter(
    (entry): entry is Record<string, unknown> =>
      typeof entry === "object" && entry !== null && !Array.isArray(entry)
  );
}

// ---------------------------------------------------------------------------
// Copy deck — exact approved strings (03-UI-SPEC §"Deletion" blocks)
// ---------------------------------------------------------------------------

describe("delete copy deck — exact literals", () => {
  it("interpolates the chart heading with curly quotes around the label", () => {
    expect(deleteChartHeading("My saved chart")).toBe("Delete “My saved chart”?");
  });

  it("interpolates the chart body with the revision count, permanence, and can't-undo", () => {
    expect(deleteChartBody(2)).toBe(
      "This permanently removes this chart and its 2 saved revision(s) from this device. This can't be undone."
    );
    expect(deleteChartBody(1)).toBe(
      "This permanently removes this chart and its 1 saved revision(s) from this device. This can't be undone."
    );
  });

  it("carries the exact button + pending strings", () => {
    expect(DELETE_CHART_CONFIRM).toBe("Delete chart");
    expect(DELETE_CANCEL).toBe("Cancel");
    expect(DELETING).toBe("Deleting…");
  });

  it("carries the exact 03-08 delete-all strings (rendered via the all variant)", () => {
    expect(DELETE_ALL_HEADING).toBe("Delete all your data?");
    expect(DELETE_ALL_BODY).toBe(
      "This permanently removes every saved chart and revision stored on this device by LemAstra. This can't be undone. Your privacy acknowledgement preference stays."
    );
    expect(DELETE_ALL_CONFIRM).toBe("Delete everything");
  });
});

// ---------------------------------------------------------------------------
// Chart variant (D-14)
// ---------------------------------------------------------------------------

describe("DeleteConfirm — chart variant", () => {
  it("renders the heading naming the chart, the permanence body, error-filled confirm, and default cancel", async () => {
    const { view } = await renderConfirm();

    const heading = view.getByText("Delete “My saved chart”?");
    expect(heading.props.accessibilityRole).toBe("header");

    // Heading is Body/600 ERROR text — the token resolved per scheme
    // (error-card test convention: light-scheme literal #B3261E).
    expect(
      styleEntries(heading).some((style) => style.color === "#B3261E")
    ).toBe(true);

    expect(
      view.getByText(
        "This permanently removes this chart and its 2 saved revision(s) from this device. This can't be undone."
      )
    ).toBeTruthy();
    expect(view.getByText("Delete chart")).toBeTruthy();
    expect(view.getByText("Cancel")).toBeTruthy();
  });

  it("confirm is the ONLY error-filled element; cancel is default-toned", async () => {
    const { view } = await renderConfirm();

    const confirm = view.getByTestId("delete-confirm-confirm");
    expect(
      styleEntries(confirm).some((style) => style.backgroundColor === "#B3261E")
    ).toBe(true);

    const cancel = view.getByTestId("delete-confirm-cancel");
    const cancelStyles = styleEntries(cancel);
    expect(
      cancelStyles.some((style) => style.backgroundColor === "#B3261E")
    ).toBe(false);
    expect(
      cancelStyles.some((style) => style.backgroundColor === "#F0F0F3")
    ).toBe(true); // backgroundElement — the default-toned fill
  });

  it("traps focus on the modal surface (accessibilityViewIsModal)", async () => {
    const { view } = await renderConfirm();
    const modal = view.getByTestId("delete-confirm-modal");
    expect(modal.props.accessibilityViewIsModal).toBe(true);
  });

  it("renders nothing while not visible", async () => {
    const { view } = await renderConfirm({ visible: false });
    expect(view.queryByText("Delete chart")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Pending (D-14: confirm disabled + "Deleting…")
// ---------------------------------------------------------------------------

describe("DeleteConfirm — pending", () => {
  it("disables confirm and swaps its label to 'Deleting…'", async () => {
    const onConfirm = vi.fn();
    const { view } = await renderConfirm({ pending: true, onConfirm });

    const confirm = view.getByTestId("delete-confirm-confirm");
    expect(confirm.props.accessibilityState.disabled).toBe(true);
    expect(view.getByText(DELETING)).toBeTruthy();
    // The full-action label is swapped, not duplicated.
    expect(view.queryByText("Delete chart")).toBeNull();

    // A press on the disabled confirm must not emit.
    await fireEvent.press(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// All variant (D-15 copy, reused by 03-08)
// ---------------------------------------------------------------------------

describe("DeleteConfirm — all variant", () => {
  it("renders its 03-08 copy via props, ignoring label/revisionCount", async () => {
    const { view } = await renderConfirm({
      variant: "all",
      label: "irrelevant",
      revisionCount: 99,
    });

    expect(view.getByText("Delete all your data?")).toBeTruthy();
    expect(
      view.getByText(
        "This permanently removes every saved chart and revision stored on this device by LemAstra. This can't be undone. Your privacy acknowledgement preference stays."
      )
    ).toBeTruthy();
    expect(view.getByText("Delete everything")).toBeTruthy();
    expect(view.getByText("Cancel")).toBeTruthy();

    // The chart variant's interpolated strings never leak in.
    expect(view.queryByText(/My saved chart/)).toBeNull();
    expect(view.queryByText(/revision\(s\)/)).toBeNull();
  });

  it("disables confirm and shows 'Deleting…' while pending in the all variant too", async () => {
    const { view } = await renderConfirm({ variant: "all", pending: true });

    expect(view.getByTestId("delete-confirm-confirm").props.accessibilityState.disabled).toBe(
      true
    );
    expect(view.getByText(DELETING)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Emissions — cancel removes nothing, confirm fires only when enabled
// ---------------------------------------------------------------------------

describe("DeleteConfirm — emissions", () => {
  it("cancel emits onCancel and never onConfirm (cancel is always a no-op on data)", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { view } = await renderConfirm({ onConfirm, onCancel });

    await userEvent.press(view.getByTestId("delete-confirm-cancel"));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirm emits onConfirm while enabled", async () => {
    const onConfirm = vi.fn();
    const { view } = await renderConfirm({ onConfirm });

    await userEvent.press(view.getByTestId("delete-confirm-confirm"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Wired flow on /chart/saved (03-06 Task 3) — delete through the seam
// ---------------------------------------------------------------------------
//
// Repository faked at the D-03 seam (03-05 convention); the export
// module is mocked so the screen's import graph stays off the device
// APIs. Presses go through fireEvent on the accessible host — the
// 03-05 act-queue law for query-mounted screens.

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  navigate: vi.fn(),
}));
const paramsState = vi.hoisted(() => ({ value: {} as Record<string, string | string[]> }));
const repository = vi.hoisted(() => ({
  getChartDetail: vi.fn(),
  renameChart: vi.fn(),
  deleteChart: vi.fn(),
  isWorkspaceStorageAvailable: vi.fn(),
}));
const exportModule = vi.hoisted(() => ({
  exportChartRevision: vi.fn(),
}));

vi.mock("expo-router", () => ({
  router: routerMock,
  useLocalSearchParams: () => paramsState.value,
}));

// The ids module pulls expo-crypto (native entry) — node:crypto
// stand-in, the result-screen.test.tsx convention.
vi.mock("expo-crypto", async () => {
  const nodeCrypto = await import("node:crypto");
  return { randomUUID: () => nodeCrypto.randomUUID() };
});

vi.mock("@/lib/workspace/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/workspace/repository")>();
  return {
    ...actual,
    getChartDetail: repository.getChartDetail,
    renameChart: repository.renameChart,
    deleteChart: repository.deleteChart,
    isWorkspaceStorageAvailable: repository.isWorkspaceStorageAvailable,
  };
});

vi.mock("@/lib/workspace/export", () => ({
  buildExportPayload: (input: unknown) => input,
  exportChartRevision: exportModule.exportChartRevision,
}));

let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let SavedChartScreen: typeof import("@/app/chart/saved").default;

beforeAll(async () => {
  ({ waitFor } = await import("@testing-library/react-native/pure"));
  ({ default: SavedChartScreen } = await import("@/app/chart/saved"));
});

function wiredWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { Wrapper };
}

function wiredDetail(): ChartDetail {
  const inputs = {
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
      envelope: {
        reading_type: "natal",
        chart_data: {
          placements: [
            { body: "Mars", sign: "Leo", degree: 10.0, absolute_degree: 130.0, motion: "retrograde" },
          ],
          birth_time_confidence: "Unknown",
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
          calculator_cmd: "python tools/birth_to_chart.py --input <temp-json> --validate",
        },
        unavailable_factors: [{ factor: "houses", reason: "Requires a birth time" }],
        provisional_factors: [],
      },
      inputs,
      identity: { date: "1990-05-21", time: "", label: "Lisbon, Portugal", zone_source: "google" },
      createdAt: new Date("2026-08-27T10:00:00Z"),
    },
    revisionCount: 2,
    revisions: [
      { revisionId: "rev-1", createdAt: new Date("2026-08-20T10:00:00Z"), inputRevision: "fff000111222", inputs },
      { revisionId: "rev-2", createdAt: new Date("2026-08-27T10:00:00Z"), inputRevision: "abc123def456", inputs },
    ],
  };
}

async function renderWired() {
  paramsState.value = { id: "chart-1" };
  const { Wrapper } = wiredWrapper();
  const view = await render(
    <Wrapper>
      <SavedChartScreen />
    </Wrapper>
  );
  await waitFor(() => expect(view.getByText("My saved chart")).toBeTruthy());
  return view;
}

describe("delete — wired on /chart/saved (WORK-06)", () => {
  beforeEach(() => {
    paramsState.value = { id: "chart-1" };
    repository.isWorkspaceStorageAvailable.mockReturnValue(true);
    repository.getChartDetail.mockReset().mockResolvedValue(wiredDetail());
    repository.renameChart.mockReset().mockResolvedValue(undefined);
    repository.deleteChart.mockReset().mockResolvedValue(undefined);
    exportModule.exportChartRevision.mockReset().mockResolvedValue({ status: "shared" });
  });

  it("opens the confirm modal from the data-actions row, deletes on confirm, and dismisses the detail home", async () => {
    const view = await renderWired();

    // The data-actions row opens the modal (the only delete path — no swipe).
    await act(async () => {
      fireEvent.press(view.getByText(DELETE_CHART_CONFIRM));
    });
    await waitFor(() =>
      expect(view.getByText(deleteChartHeading("My saved chart"))).toBeTruthy()
    );

    await act(async () => {
      fireEvent.press(view.getByTestId("delete-confirm-confirm"));
    });

    await waitFor(() => expect(repository.deleteChart).toHaveBeenCalledWith("chart-1"));
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/"));
  });

  it("cancel removes nothing — the modal closes and the chart stays rendered", async () => {
    const view = await renderWired();

    await act(async () => {
      fireEvent.press(view.getByText(DELETE_CHART_CONFIRM));
    });
    await waitFor(() =>
      expect(view.getByText(deleteChartHeading("My saved chart"))).toBeTruthy()
    );

    await act(async () => {
      fireEvent.press(view.getByTestId("delete-confirm-cancel"));
    });

    expect(repository.deleteChart).not.toHaveBeenCalled();
    expect(routerMock.replace).not.toHaveBeenCalled();
    // Modal gone, screen content intact.
    await waitFor(() =>
      expect(view.queryByText(deleteChartHeading("My saved chart"))).toBeNull()
    );
    expect(view.getByText("My saved chart")).toBeTruthy();
  });

  it("a failed delete closes the modal, renders the error card, and 'Try again' retries the confirmed delete", async () => {
    repository.deleteChart
      .mockRejectedValueOnce(
        new (await import("@/lib/workspace/repository")).WorkspaceError({
          code: "SAVE_FAILED",
          message: "delete failed",
        })
      )
      .mockResolvedValueOnce(undefined);
    const view = await renderWired();

    await act(async () => {
      fireEvent.press(view.getByText(DELETE_CHART_CONFIRM));
    });
    await act(async () => {
      fireEvent.press(view.getByTestId("delete-confirm-confirm"));
    });

    // Modal closes; the exact error-deck state renders; nothing removed.
    await waitFor(() => expect(view.getByText(DELETE_ERROR_COPY.heading)).toBeTruthy());
    const body = DELETE_ERROR_COPY.body;
    if (!body) throw new Error("DELETE_ERROR_COPY must define a body");
    expect(view.getByText(body)).toBeTruthy();
    await waitFor(() =>
      expect(view.queryByText(deleteChartHeading("My saved chart"))).toBeNull()
    );

    // Try again retries the already-confirmed delete.
    await act(async () => {
      fireEvent.press(view.getByText("Try again"));
    });
    await waitFor(() => expect(repository.deleteChart).toHaveBeenCalledTimes(2));
  });
});
