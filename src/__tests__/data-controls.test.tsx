import type { render as rtlRender } from "@testing-library/react-native/pure";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DELETE_ALL_BODY,
  DELETE_ALL_CONFIRM,
  DELETE_ALL_ERROR_COPY,
  DELETE_ALL_HEADING,
  DELETE_CANCEL,
  EXPORT_ERROR_COPY,
  EXPORT_PENDING,
  WEB_UNSUPPORTED_HEADING,
} from "@/components/workspace/copy";
import { CHARTS_QUERY_KEY } from "@/hooks/use-workspace";
import { CALCULATION_DISCLOSURE_KEY } from "@/hooks/use-disclosure";
import type { CalculateResponse } from "@/lib/api-schemas";
import type { ExportedWorkspace } from "@/lib/workspace/repository";

// Data-controls tests (03-08) — the D-15 "Your data" slice on /privacy:
// export-all (PRIV-05: ONE pretty JSON file with the complete personal
// corpus via the established file+share mechanics) and delete-all
// (PRIV-06: confirm-gated transactional wipe sparing the non-personal
// disclosure flag), with the web-disabled capability variants.
//
// Contract under test (plan behavior rows + 03-UI-SPEC §"Your data"):
// - Section: heading "Your data" (24/600), intro stating device-only
//   storage ("no account and no server copy"), export card + helper,
//   destructive delete card (error text) + helper.
// - Export-all: repository.exportAllData() → exportAllDataFile writes
//   lemastra-all-data.json under Paths.cache (2-space pretty, content
//   deep-equal to the corpus) → capability-gated share; pending shows
//   "Creating file…" (the deck's one export-pending literal); failure
//   renders "Couldn't create the export file." + Try again.
// - Delete-all: DeleteConfirm variant "all" (exact deck copy) →
//   repository.deleteAllData() → ['charts'] invalidation → the section
//   swaps to "No personal data is stored on this device."; cancel
//   removes nothing; failure renders "Couldn't delete your data." +
//   Try again.
// - The AsyncStorage disclosure acknowledgement SURVIVES delete-all
//   (D-15 / Pitfall 9 — asserted against the mocked store).
// - Web (storage unavailable): both cards render disabled with the
//   "Available in the LemAstra app on iOS or Android." helper; no
//   repository call ever fires.
//
// Test mechanics: RNTL /pure under the RN vitest shim; repository faked
// at the D-03 seam (03-05 convention, real WorkspaceError preserved).
// The REAL export module runs with expo-file-system/expo-sharing mocked
// at the module boundary (chart-export.test.ts convention) so the
// all-data file WRITE itself is captured and its content deep-equals
// the repository corpus (T-03-25). Presses go through fireEvent on the
// accessible host (03-05 act-queue law).

// expo-file-system mocked at the module boundary — every write captured
// (name + content), never performed.
const fileSystem = vi.hoisted(() => {
  const writes: Array<{ directory: unknown; name: string; content: string }> = [];
  return {
    writes,
    File: class MockFile {
      constructor(
        public directory: unknown,
        public name: string
      ) {}
      get uri(): string {
        return `file://${String(this.directory)}/${this.name}`;
      }
      write(content: string): Promise<void> {
        writes.push({ directory: this.directory, name: this.name, content });
        return Promise.resolve();
      }
    },
    Paths: { cache: "/mock-cache" },
  };
});

const sharing = vi.hoisted(() => ({
  isAvailableAsync: vi.fn<() => Promise<boolean>>(),
  shareAsync: vi.fn<(uri: string, options?: { mimeType?: string }) => Promise<void>>(),
}));

vi.mock("expo-file-system", () => fileSystem);
vi.mock("expo-sharing", () => sharing);

// AsyncStorage mocked with an in-memory Map (use-disclosure.test.tsx
// convention) — the disclosure-key survival law reads THIS store.
const asyncStore = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => Promise.resolve(asyncStore.get(key) ?? null),
    setItem: (key: string, value: string) => {
      asyncStore.set(key, value);
      return Promise.resolve();
    },
  },
}));

// D-03 seam fake: the real module keeps its types (ExportedWorkspace,
// WorkspaceError); the operations the section consumes are fakes.
const repository = vi.hoisted(() => ({
  exportAllData: vi.fn(),
  deleteAllData: vi.fn(),
  isWorkspaceStorageAvailable: vi.fn(),
}));

vi.mock("@/lib/workspace/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/workspace/repository")>();
  return {
    ...actual,
    exportAllData: repository.exportAllData,
    deleteAllData: repository.deleteAllData,
    isWorkspaceStorageAvailable: repository.isWorkspaceStorageAvailable,
  };
});

// The ids module pulls expo-crypto (native entry) — node:crypto
// stand-in, the result-screen.test.tsx convention.
vi.mock("expo-crypto", async () => {
  const nodeCrypto = await import("node:crypto");
  return { randomUUID: () => nodeCrypto.randomUUID() };
});

let render: typeof rtlRender;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let DataControls: typeof import("@/components/privacy/data-controls").DataControls;
let ALL_DATA_EXPORT_FILENAME: typeof import("@/lib/workspace/export").ALL_DATA_EXPORT_FILENAME;
let copy: typeof import("@/components/privacy/copy");

beforeAll(async () => {
  ({ render, cleanup, act, fireEvent, waitFor } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ DataControls } = await import("@/components/privacy/data-controls"));
  ({ ALL_DATA_EXPORT_FILENAME } = await import("@/lib/workspace/export"));
  copy = await import("@/components/privacy/copy");
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
  asyncStore.clear();
});

beforeEach(() => {
  repository.isWorkspaceStorageAvailable.mockReturnValue(true);
  repository.exportAllData.mockReset().mockResolvedValue(corpus());
  repository.deleteAllData.mockReset().mockResolvedValue(undefined);
  fileSystem.writes.length = 0;
  sharing.isAvailableAsync.mockReset().mockResolvedValue(true);
  sharing.shareAsync.mockReset().mockResolvedValue(undefined);
});

/** Fresh retry-off QueryClient wrapper; invalidateQueries is spyable. */
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
  const invalidateSpy = vi.spyOn(client, "invalidateQueries");
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, invalidateSpy, Wrapper };
}

async function renderControls() {
  const { invalidateSpy, Wrapper } = makeWrapper();
  const view = await render(
    <Wrapper>
      <DataControls />
    </Wrapper>
  );
  await act(async () => {});
  return { view, invalidateSpy };
}

/**
 * Act-flush for mutation-state renders: TanStack schedules observer
 * commits AND mutation execution on notifyManager's macrotask scheduler
 * (setTimeout turns), so a press's re-render chain settles over several
 * timer ticks after the act'd press returns. Draining a few timer turns
 * INSIDE act lets the whole chain commit before UI-state assertions
 * (extends the 03-05 act-queue law; external-effect waits — mock calls,
 * captured writes — need no flush).
 */
async function flushMutationRender() {
  await act(async () => {
    for (let turn = 0; turn < 5; turn++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  });
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
// Fixtures — a multi-chart corpus (2 charts, 3 revisions), full provenance
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
  input_revision: "abc123def456",
  calculator_cmd: "python tools/birth_to_chart.py --input <temp-json> --validate",
} as const;

const ENVELOPE: CalculateResponse = {
  reading_type: "natal",
  chart_data: {
    placements: [
      { body: "Sun", sign: "Gemini", degree: 0.5, absolute_degree: 60.5, motion: "direct" },
    ],
    birth_time_confidence: "Timed",
  },
  provenance: { ...PROVENANCE },
  unavailable_factors: [],
  provisional_factors: [],
};

const STORED_INPUTS = {
  date: "1990-05-21",
  time: "14:30",
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

function revision(
  revisionId: string,
  inputRevision: string,
  iso: string
): ExportedWorkspace["charts"][number]["revisions"][number] {
  return {
    revisionId,
    inputRevision,
    envelope: ENVELOPE,
    inputs: { ...STORED_INPUTS },
    identity: {
      date: "1990-05-21",
      time: "14:30",
      label: "Lisbon, Portugal",
      zone_source: "google",
    },
    createdAt: new Date(iso),
  };
}

/** The complete personal corpus — 2 charts, 3 revisions total. */
function corpus(): ExportedWorkspace {
  return {
    exportedAt: "2026-08-27T20:00:00.000Z",
    charts: [
      {
        chartId: "chart-1",
        label: "My saved chart",
        createdAt: new Date("2026-08-20T10:00:00Z"),
        updatedAt: new Date("2026-08-27T10:00:00Z"),
        revisions: [
          revision("rev-1", "fff000111222", "2026-08-20T10:00:00Z"),
          revision("rev-2", "abc123def456", "2026-08-27T10:00:00Z"),
        ],
      },
      {
        chartId: "chart-2",
        label: "Second chart",
        createdAt: new Date("2026-08-22T10:00:00Z"),
        updatedAt: new Date("2026-08-22T10:00:00Z"),
        revisions: [revision("rev-3", "111222333444", "2026-08-22T10:00:00Z")],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Copy deck — exact approved strings (03-UI-SPEC §"Your data" + web row)
// ---------------------------------------------------------------------------

describe("privacy copy deck — exact literals", () => {
  it("carries the exact section heading and intro", () => {
    expect(copy.YOUR_DATA_HEADING).toBe("Your data");
    expect(copy.YOUR_DATA_INTRO).toBe(
      "Everything you save stays on this device — there's no account and no server copy. Export it as a file, or delete it."
    );
  });

  it("carries the exact card labels and helpers", () => {
    expect(copy.EXPORT_ALL_DATA).toBe("Export all data");
    expect(copy.EXPORT_ALL_HELPER).toBe(
      "Creates one JSON file with every chart and revision saved on this device."
    );
    expect(copy.DELETE_ALL_DATA).toBe("Delete all data");
    expect(copy.DELETE_ALL_HELPER).toBe(
      "Permanently removes every chart and revision on this device."
    );
  });

  it("carries the exact completion + web-disabled helpers", () => {
    expect(copy.NO_PERSONAL_DATA).toBe("No personal data is stored on this device.");
    expect(copy.WEB_DATA_HELPER).toBe("Available in the LemAstra app on iOS or Android.");
  });
});

// ---------------------------------------------------------------------------
// Section rendering (D-15)
// ---------------------------------------------------------------------------

describe("DataControls — section rendering", () => {
  it("renders the heading as a header, the intro, and both cards with their helpers", async () => {
    const { view } = await renderControls();

    const heading = view.getByText(copy.YOUR_DATA_HEADING);
    expect(heading.props.accessibilityRole).toBe("header");
    expect(view.getByText(copy.YOUR_DATA_INTRO)).toBeTruthy();
    expect(view.getByText(copy.EXPORT_ALL_DATA)).toBeTruthy();
    expect(view.getByText(copy.EXPORT_ALL_HELPER)).toBeTruthy();
    expect(view.getByText(copy.DELETE_ALL_DATA)).toBeTruthy();
    expect(view.getByText(copy.DELETE_ALL_HELPER)).toBeTruthy();
  });

  it("renders the delete card label in the error color — the destructive trigger", async () => {
    const { view } = await renderControls();

    const deleteLabel = view.getByText(copy.DELETE_ALL_DATA);
    expect(styleEntries(deleteLabel).some((style) => style.color === "#B3261E")).toBe(true);

    // The export label stays default-toned — error is reserved for the
    // destructive trigger (03-UI-SPEC §Color).
    const exportLabel = view.getByText(copy.EXPORT_ALL_DATA);
    expect(styleEntries(exportLabel).some((style) => style.color === "#B3261E")).toBe(false);
  });

  it("opens the all-variant confirm modal from the destructive card — the only delete path", async () => {
    const { view } = await renderControls();

    await act(async () => {
      fireEvent.press(view.getByTestId("data-controls-delete"));
    });

    expect(view.getByText(DELETE_ALL_HEADING)).toBeTruthy();
    expect(view.getByText(DELETE_ALL_BODY)).toBeTruthy();
    expect(view.getByText(DELETE_ALL_CONFIRM)).toBeTruthy();
    expect(view.getByText(DELETE_CANCEL)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Export all data (PRIV-05)
// ---------------------------------------------------------------------------

describe("DataControls — export all data", () => {
  it("shows the pending state on the trigger while the corpus read is in flight", async () => {
    repository.exportAllData.mockReturnValue(new Promise(() => undefined));
    const { view } = await renderControls();

    await act(async () => {
      fireEvent.press(view.getByTestId("data-controls-export"));
    });
    await flushMutationRender();

    expect(view.getByText(EXPORT_PENDING)).toBeTruthy();
    expect(view.queryByText(copy.EXPORT_ALL_DATA)).toBeNull();
    // No write happened yet — the corpus read has not resolved.
    expect(fileSystem.writes).toHaveLength(0);
    expect(repository.exportAllData).toHaveBeenCalledTimes(1);
  });

  it("writes ONE file whose content deep-equals the repository corpus (T-03-25)", async () => {
    const seeded = corpus();
    repository.exportAllData.mockResolvedValue(seeded);
    const { view } = await renderControls();

    await act(async () => {
      fireEvent.press(view.getByTestId("data-controls-export"));
    });
    await waitFor(() => expect(fileSystem.writes).toHaveLength(1));

    const write = fileSystem.writes[0];
    expect(write.directory).toBe("/mock-cache");
    expect(write.name).toBe(ALL_DATA_EXPORT_FILENAME);
    expect(write.name).toBe("lemastra-all-data.json");
    // 2-space pretty-printed.
    expect(write.content).toContain('\n  "exportedAt"');

    // The complete corpus — every chart, every revision (JSON round-trip
    // normalizes the Date fields exactly as the write does).
    expect(JSON.parse(write.content)).toEqual(JSON.parse(JSON.stringify(seeded)));

    // Provenance travels with every revision (retention §5 evidence).
    const parsed = JSON.parse(write.content) as {
      charts: { revisions: { envelope: { provenance: Record<string, string> } }[] }[];
    };
    expect(parsed.charts).toHaveLength(2);
    expect(parsed.charts[0].revisions).toHaveLength(2);
    for (const chart of parsed.charts) {
      for (const rev of chart.revisions) {
        expect(rev.envelope.provenance.input_revision).toBeTruthy();
        expect(rev.envelope.provenance.skill_revision).toBe("660d992");
      }
    }
  });

  it("hands the cache file to the share sheet as application/json", async () => {
    const { view } = await renderControls();

    await act(async () => {
      fireEvent.press(view.getByTestId("data-controls-export"));
    });
    await waitFor(() =>
      expect(sharing.shareAsync).toHaveBeenCalledWith(
        `file:///mock-cache/${ALL_DATA_EXPORT_FILENAME}`,
        { mimeType: "application/json" }
      )
    );
  });

  it("renders the capability card when the share sheet is unavailable — never an error", async () => {
    sharing.isAvailableAsync.mockResolvedValue(false);
    const { view } = await renderControls();

    await act(async () => {
      fireEvent.press(view.getByTestId("data-controls-export"));
    });

    await waitFor(() => expect(view.getByText(WEB_UNSUPPORTED_HEADING)).toBeTruthy());
    expect(view.queryByText(EXPORT_ERROR_COPY.heading)).toBeNull();
    // The file was still written — the gate is the share capability.
    expect(fileSystem.writes).toHaveLength(1);
  });

  it("renders the exact export-failed error card with a working Try again", async () => {
    repository.exportAllData
      .mockRejectedValueOnce(new Error("corpus read failed"))
      .mockResolvedValueOnce(corpus());
    const { view } = await renderControls();

    await act(async () => {
      fireEvent.press(view.getByTestId("data-controls-export"));
    });

    await waitFor(() => expect(view.getByText(EXPORT_ERROR_COPY.heading)).toBeTruthy());
    const body = EXPORT_ERROR_COPY.body;
    if (!body) throw new Error("EXPORT_ERROR_COPY must define a body");
    expect(view.getByText(body)).toBeTruthy();

    // Try again re-runs the export from the corpus read.
    await act(async () => {
      fireEvent.press(view.getByText("Try again"));
    });
    await waitFor(() => expect(repository.exportAllData).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(fileSystem.writes).toHaveLength(1));
  });
});

// ---------------------------------------------------------------------------
// Delete all data (PRIV-06)
// ---------------------------------------------------------------------------

describe("DataControls — delete all data", () => {
  it("confirm wipes through the repository, swaps to the completion state, and invalidates ['charts']", async () => {
    const { view, invalidateSpy } = await renderControls();

    await act(async () => {
      fireEvent.press(view.getByTestId("data-controls-delete"));
    });
    await act(async () => {
      fireEvent.press(view.getByTestId("delete-confirm-confirm"));
    });

    await waitFor(() => expect(repository.deleteAllData).toHaveBeenCalledTimes(1));

    // The section swaps to the completion state: cards gone, modal closed.
    await waitFor(() => expect(view.getByText(copy.NO_PERSONAL_DATA)).toBeTruthy());
    expect(view.queryByText(copy.EXPORT_ALL_DATA)).toBeNull();
    expect(view.queryByText(copy.DELETE_ALL_DATA)).toBeNull();
    expect(view.queryByText(DELETE_ALL_HEADING)).toBeNull();

    // The Pitfall-10 invalidation map sweeps the shared ['charts'] key.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: CHARTS_QUERY_KEY });
  });

  it("the AsyncStorage disclosure acknowledgement SURVIVES delete-all (D-15 / Pitfall 9)", async () => {
    asyncStore.set(CALCULATION_DISCLOSURE_KEY, "true");
    const { view } = await renderControls();

    await act(async () => {
      fireEvent.press(view.getByTestId("data-controls-delete"));
    });
    await act(async () => {
      fireEvent.press(view.getByTestId("delete-confirm-confirm"));
    });
    await waitFor(() => expect(view.getByText(copy.NO_PERSONAL_DATA)).toBeTruthy());

    // The wipe spared the non-personal preference — it still reads "true".
    expect(asyncStore.get(CALCULATION_DISCLOSURE_KEY)).toBe("true");
  });

  it("cancel removes nothing — the modal closes and the cards stay rendered", async () => {
    const { view } = await renderControls();

    await act(async () => {
      fireEvent.press(view.getByTestId("data-controls-delete"));
    });
    await act(async () => {
      fireEvent.press(view.getByTestId("delete-confirm-cancel"));
    });

    expect(repository.deleteAllData).not.toHaveBeenCalled();
    await waitFor(() => expect(view.queryByText(DELETE_ALL_HEADING)).toBeNull());
    expect(view.getByText(copy.EXPORT_ALL_DATA)).toBeTruthy();
    expect(view.getByText(copy.DELETE_ALL_DATA)).toBeTruthy();
    expect(view.queryByText(copy.NO_PERSONAL_DATA)).toBeNull();
  });

  it("a failed delete closes the modal and renders the exact error deck with a working Try again", async () => {
    const { WorkspaceError } = await import("@/lib/workspace/repository");
    repository.deleteAllData
      .mockRejectedValueOnce(new WorkspaceError({ code: "SAVE_FAILED", message: "wipe failed" }))
      .mockResolvedValueOnce(undefined);
    const { view } = await renderControls();

    await act(async () => {
      fireEvent.press(view.getByTestId("data-controls-delete"));
    });
    await act(async () => {
      fireEvent.press(view.getByTestId("delete-confirm-confirm"));
    });

    await waitFor(() => expect(view.getByText(DELETE_ALL_ERROR_COPY.heading)).toBeTruthy());
    const body = DELETE_ALL_ERROR_COPY.body;
    if (!body) throw new Error("DELETE_ALL_ERROR_COPY must define a body");
    expect(view.getByText(body)).toBeTruthy();
    await waitFor(() => expect(view.queryByText(DELETE_ALL_HEADING)).toBeNull());

    // Try again retries the already-confirmed wipe; success lands in the
    // completion state.
    await act(async () => {
      fireEvent.press(view.getByText("Try again"));
    });
    await waitFor(() => expect(repository.deleteAllData).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(view.getByText(copy.NO_PERSONAL_DATA)).toBeTruthy());
  });
});

// ---------------------------------------------------------------------------
// Web degradation (D-03)
// ---------------------------------------------------------------------------

describe("DataControls — web degradation", () => {
  it("renders both cards disabled with the app helper and never touches the repository", async () => {
    repository.isWorkspaceStorageAvailable.mockReturnValue(false);
    const { view } = await renderControls();

    const exportCard = view.getByTestId("data-controls-export");
    expect(exportCard.props.accessibilityState.disabled).toBe(true);
    const deleteCard = view.getByTestId("data-controls-delete");
    expect(deleteCard.props.accessibilityState.disabled).toBe(true);

    // The web helper replaces each card's capability helper.
    expect(view.getAllByText(copy.WEB_DATA_HELPER)).toHaveLength(2);
    expect(view.queryByText(copy.EXPORT_ALL_HELPER)).toBeNull();
    expect(view.queryByText(copy.DELETE_ALL_HELPER)).toBeNull();

    // A press on a disabled card is a no-op — no storage code path on web.
    await act(async () => {
      fireEvent.press(exportCard);
      fireEvent.press(deleteCard);
    });
    expect(repository.exportAllData).not.toHaveBeenCalled();
    expect(repository.deleteAllData).not.toHaveBeenCalled();
  });
});
