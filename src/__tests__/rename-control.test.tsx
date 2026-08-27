import type { render as rtlRender } from "@testing-library/react-native/pure";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LABEL_FIELD_ERROR, RENAME_ACTION, RENAME_CANCEL, RENAME_SAVE } from "@/components/workspace/copy";
import type { ChartDetail } from "@/lib/workspace/repository";
import type { CalculateResponse } from "@/lib/api-schemas";

// RenameControl tests (03-06 Task 1) — the D-12 inline title rename:
// the Display title swaps to a validated TextInput (birth.tsx
// validated-input idiom), "Save name" gates on labelSchema, and cancel
// restores the title untouched.
//
// Contract under test (plan behavior rows + 03-UI-SPEC §"Rename"):
// - Idle: the chart label renders as the title with a "Rename" action
//   beside it (Label/600 default text — A-3-UI-8, never accent).
// - Edit: the title is REPLACED by a TextInput prefilled with the
//   current label, with "Save name" and "Cancel" beside it.
// - Validation (A-3-UI-4): trimmed 1–60; invalid input shows the exact
//   copy-deck error in a POLITE live region and disables "Save name".
// - Commit emits the TRIMMED label; cancel restores the title and
//   emits nothing.
//
// Test mechanics: RNTL v14 /pure under the RN vitest shim; changeText
// runs INSIDE act (birth-form.test.tsx law — 03-04 act-queue note).

let render: typeof rtlRender;
let userEvent: typeof import("@testing-library/react-native/pure").userEvent;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let RenameControl: typeof import("@/components/workspace/rename-control").RenameControl;

beforeAll(async () => {
  ({ render, userEvent, fireEvent, cleanup, act } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ RenameControl } = await import("@/components/workspace/rename-control"));
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
});

const CURRENT_LABEL = "My saved chart";

async function renderControl(overrides: Partial<{ label: string; onCommit: (label: string) => void }> = {}) {
  const props = {
    label: CURRENT_LABEL,
    onCommit: vi.fn<(label: string) => void>(),
    ...overrides,
  };
  const view = await render(<RenameControl {...props} />);
  await act(async () => {});
  return { view, props };
}

// ---------------------------------------------------------------------------
// Copy deck — exact approved strings (03-UI-SPEC §"Rename" D-12)
// ---------------------------------------------------------------------------

describe("rename copy deck — exact literals", () => {
  it("carries the exact trigger/action strings", () => {
    expect(RENAME_ACTION).toBe("Rename");
    expect(RENAME_SAVE).toBe("Save name");
    expect(RENAME_CANCEL).toBe("Cancel");
    expect(LABEL_FIELD_ERROR).toBe("Enter a name (up to 60 characters).");
  });
});

// ---------------------------------------------------------------------------
// Idle state — title + trigger
// ---------------------------------------------------------------------------

describe("RenameControl — idle", () => {
  it("renders the current label as the title with a 'Rename' action beside it", async () => {
    const { view } = await renderControl();

    const title = view.getByText(CURRENT_LABEL);
    expect(title.props.accessibilityRole).toBe("header");

    const trigger = view.getByTestId("rename-trigger");
    expect(trigger.props.accessibilityRole).toBe("button");
    expect(view.getByText(RENAME_ACTION)).toBeTruthy();

    // No edit chrome while idle.
    expect(view.queryByTestId("rename-input")).toBeNull();
    expect(view.queryByText(RENAME_SAVE)).toBeNull();
  });

  it("renders the trigger in default text color, never accent (A-3-UI-8)", async () => {
    const { view } = await renderControl();

    const triggerLabel = view.getByText(RENAME_ACTION);
    const styles = [].concat(triggerLabel.props.style ?? []) as Record<string, unknown>[];
    const colors = styles.map((style) => style.color);
    expect(colors).not.toContain("#2266CC"); // light-scheme accent literal
  });
});

// ---------------------------------------------------------------------------
// Edit state — validated TextInput + actions
// ---------------------------------------------------------------------------

describe("RenameControl — edit", () => {
  it("pressing Rename swaps the title for a TextInput prefilled with the current label", async () => {
    const { view } = await renderControl();

    await userEvent.press(view.getByTestId("rename-trigger"));

    // The title is replaced by the input, prefilled with the label.
    const input = view.getByTestId("rename-input");
    expect(input.props.value).toBe(CURRENT_LABEL);
    expect(view.queryByText(CURRENT_LABEL)).toBeNull();

    expect(view.getByText(RENAME_SAVE)).toBeTruthy();
    expect(view.getByText(RENAME_CANCEL)).toBeTruthy();
    // Save starts ENABLED — the prefill is a valid label.
    expect(view.getByTestId("rename-save").props.accessibilityState.disabled).toBe(false);
  });

  it("disables 'Save name' and shows the exact field error for invalid input in a polite live region", async () => {
    const { view } = await renderControl();

    await userEvent.press(view.getByTestId("rename-trigger"));
    await act(async () => {
      fireEvent.changeText(view.getByTestId("rename-input"), "   ");
    });

    const error = view.getByText(LABEL_FIELD_ERROR);
    expect(error.props.accessibilityLiveRegion).toBe("polite");
    expect(view.getByTestId("rename-save").props.accessibilityState.disabled).toBe(true);
  });

  it("accepts a 60-character label but rejects 61 (A-3-UI-4 bound)", async () => {
    const { view } = await renderControl();

    await userEvent.press(view.getByTestId("rename-trigger"));
    await act(async () => {
      fireEvent.changeText(view.getByTestId("rename-input"), "a".repeat(61));
    });

    expect(view.getByText(LABEL_FIELD_ERROR)).toBeTruthy();
    expect(view.getByTestId("rename-save").props.accessibilityState.disabled).toBe(true);

    await act(async () => {
      fireEvent.changeText(view.getByTestId("rename-input"), "a".repeat(60));
    });

    expect(view.queryByText(LABEL_FIELD_ERROR)).toBeNull();
    expect(view.getByTestId("rename-save").props.accessibilityState.disabled).toBe(false);
  });

  it("pressing the disabled 'Save name' never emits", async () => {
    const onCommit = vi.fn();
    const { view } = await renderControl({ onCommit });

    await userEvent.press(view.getByTestId("rename-trigger"));
    await act(async () => {
      fireEvent.changeText(view.getByTestId("rename-input"), "");
    });

    await fireEvent.press(view.getByTestId("rename-save"));
    expect(onCommit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Commit + cancel
// ---------------------------------------------------------------------------

describe("RenameControl — commit/cancel", () => {
  it("commit emits the TRIMMED label and returns to the idle title", async () => {
    const onCommit = vi.fn();
    const { view } = await renderControl({ onCommit });

    await userEvent.press(view.getByTestId("rename-trigger"));
    await act(async () => {
      fireEvent.changeText(view.getByTestId("rename-input"), "  Renamed chart  ");
    });
    await userEvent.press(view.getByTestId("rename-save"));

    expect(onCommit).toHaveBeenCalledWith("Renamed chart");

    // Back to idle: the title renders the (still-current) label.
    expect(view.queryByTestId("rename-input")).toBeNull();
    expect(view.getByText(CURRENT_LABEL)).toBeTruthy();
  });

  it("cancel restores the title and emits nothing", async () => {
    const onCommit = vi.fn();
    const { view } = await renderControl({ onCommit });

    await userEvent.press(view.getByTestId("rename-trigger"));
    await act(async () => {
      fireEvent.changeText(view.getByTestId("rename-input"), "Thrown away");
    });
    await userEvent.press(view.getByTestId("rename-cancel"));

    expect(onCommit).not.toHaveBeenCalled();
    expect(view.getByText(CURRENT_LABEL)).toBeTruthy();
    expect(view.queryByTestId("rename-input")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Wired flow on /chart/saved (03-06 Task 3) — rename through the seam
// ---------------------------------------------------------------------------
//
// Repository faked at the D-03 seam (the 03-05 convention); the export
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

function wiredDetail(label = CURRENT_LABEL): ChartDetail {
  const envelope: CalculateResponse = {
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
  };
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
  };
  return {
    chart: {
      chartId: "chart-1",
      label,
      createdAt: new Date("2026-08-20T10:00:00Z"),
      updatedAt: new Date("2026-08-27T10:00:00Z"),
    },
    latest: {
      revisionId: "rev-2",
      inputRevision: "abc123def456",
      envelope,
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

describe("rename — wired on /chart/saved (WORK-05)", () => {
  beforeEach(() => {
    paramsState.value = { id: "chart-1" };
    repository.isWorkspaceStorageAvailable.mockReturnValue(true);
    repository.getChartDetail.mockReset().mockResolvedValue(wiredDetail());
    repository.renameChart.mockReset().mockResolvedValue(undefined);
    repository.deleteChart.mockReset().mockResolvedValue(undefined);
  });

  it("renders 'Rename' beside the title and commits through repository.renameChart, refreshing title + detail cache", async () => {
    // First read: original label; post-invalidation read: renamed label.
    repository.getChartDetail
      .mockResolvedValueOnce(wiredDetail("My saved chart"))
      .mockResolvedValueOnce(wiredDetail("Renamed chart"));

    const { Wrapper } = wiredWrapper();
    const view = await render(
      <Wrapper>
        <SavedChartScreen />
      </Wrapper>
    );
    await waitFor(() => expect(view.getByText("My saved chart")).toBeTruthy());

    // Rename → edit → commit (fireEvent law for query-mounted screens).
    await act(async () => {
      fireEvent.press(view.getByTestId("rename-trigger"));
    });
    await act(async () => {
      fireEvent.changeText(view.getByTestId("rename-input"), "  Renamed chart  ");
    });
    await act(async () => {
      fireEvent.press(view.getByTestId("rename-save"));
    });

    await waitFor(() =>
      expect(repository.renameChart).toHaveBeenCalledWith("chart-1", "Renamed chart")
    );
    // Pitfall 10 invalidation: the detail query refetches under ['charts'].
    await waitFor(() => expect(repository.getChartDetail).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(view.getByText("Renamed chart")).toBeTruthy());

    // Rename never deletes or appends — revisions untouched.
    expect(repository.deleteChart).not.toHaveBeenCalled();
  });
});
