import type { render as rtlRender, within as rtlWithin } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ChartList } from "@/components/workspace/chart-list";
import { WebUnsupported } from "@/components/workspace/web-unsupported";
import { confidenceMarker, revisionsLabel } from "@/components/workspace/copy";
import type { ChartListItem } from "@/lib/workspace/repository";

// Chart-list + web-unsupported tests (03-05 Task 1) — the D-11 home list
// rows and the D-03 web capability card.
//
// Contract under test (plan behavior rows):
// - Each row renders label (Body/600), identity line "{date} · {place}"
//   (Label, textSecondary), a confidence chip ONLY when confidence ≠
//   Timed, and a "{n} revisions" chip ONLY when n > 1 — chips never
//   render empty placeholders (present-only slot rule, placement-list
//   precedent).
// - Row accessible label: "{label}, {date}, {place}{, confidence marker}
//   {, n revisions}. Opens the chart."
// - Rows are Pressables (≥48dp) emitting the chartId via onOpen; the
//   component renders rows in the EXACT order received — ordering is the
//   repository's job (updated_at desc), never the component's.
// - Web card renders heading "Saved charts are available in the app" +
//   body "Charts are stored only on your device. Saving, reopening, and
//   exporting work in the LemAstra app on iOS or Android." — no actions.
//
// Test mechanics: RNTL /pure with dynamic import (repo archetype); the
// repository list-row type is imported TYPE-ONLY so this component test
// never mounts storage. Presses run inside act callbacks + re-query
// after every interaction (RN-shim law, 03-04).

let render: typeof rtlRender;
let within: typeof rtlWithin;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  ({ render, within, fireEvent, act, cleanup } = await import(
    "@testing-library/react-native/pure"
  ));
});

afterEach(async () => {
  await cleanup();
});

// ---------------------------------------------------------------------------
// Fixtures — repository ChartListItem summary rows
// ---------------------------------------------------------------------------

const ROW_TIMED: ChartListItem = {
  chartId: "chart-1",
  label: "Chart One",
  date: "1990-05-21",
  placeLabel: "Lisbon, Portugal",
  confidence: "Timed",
  revisionCount: 1,
  updatedAt: new Date("2026-08-27T10:00:00Z"),
};

const ROW_APPROXIMATE: ChartListItem = {
  chartId: "chart-2",
  label: "Chart Two",
  date: "2001-12-25",
  placeLabel: "Porto, Portugal",
  confidence: "Approximate",
  revisionCount: 3,
  updatedAt: new Date("2026-08-26T09:00:00Z"),
};

const ROW_UNKNOWN: ChartListItem = {
  chartId: "chart-3",
  label: "Chart Three",
  date: "1975-03-03",
  placeLabel: "Faro, Portugal",
  confidence: "Unknown",
  revisionCount: 2,
  updatedAt: new Date("2026-08-25T09:00:00Z"),
};

// ---------------------------------------------------------------------------
// ChartList rows (D-11)
// ---------------------------------------------------------------------------

describe("ChartList rows (D-11)", () => {
  it("renders rows in the exact order received with exact a11y labels — the repository owns ordering", async () => {
    // Deliberately NOT most-recent-first: the component must not sort.
    const view = await render(
      <ChartList items={[ROW_APPROXIMATE, ROW_TIMED]} onOpen={() => undefined} />
    );

    const items = view.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]!.props.accessibilityLabel).toBe(
      "Chart Two, 2001-12-25, Porto, Portugal, Approximate, 3 revisions. Opens the chart."
    );
    expect(items[1]!.props.accessibilityLabel).toBe(
      "Chart One, 1990-05-21, Lisbon, Portugal. Opens the chart."
    );
  });

  it("renders label + identity line; chips render ONLY when present (present-only slots)", async () => {
    const view = await render(
      <ChartList
        items={[ROW_TIMED, ROW_APPROXIMATE, ROW_UNKNOWN]}
        onOpen={() => undefined}
      />
    );

    const items = view.getAllByRole("listitem");
    expect(items).toHaveLength(3);

    // Timed + single revision → no chips, never placeholders.
    const timed = within(items[0]!);
    expect(timed.getByText("Chart One")).toBeTruthy();
    expect(timed.getByText("1990-05-21 · Lisbon, Portugal")).toBeTruthy();
    expect(timed.queryByText("Timed")).toBeNull();
    expect(timed.queryByText(/revisions/)).toBeNull();

    // Approximate + 3 revisions → both chips.
    const approximate = within(items[1]!);
    expect(approximate.getByText("Chart Two")).toBeTruthy();
    expect(approximate.getByText("2001-12-25 · Porto, Portugal")).toBeTruthy();
    expect(approximate.getByText("Approximate")).toBeTruthy();
    expect(approximate.getByText("3 revisions")).toBeTruthy();

    // Unknown confidence marker is "Unknown time" (D-11 vocabulary).
    const unknown = within(items[2]!);
    expect(unknown.getByText("Chart Three")).toBeTruthy();
    expect(unknown.getByText("1975-03-03 · Faro, Portugal")).toBeTruthy();
    expect(unknown.getByText("Unknown time")).toBeTruthy();
    expect(unknown.getByText("2 revisions")).toBeTruthy();
  });

  it("presses emit the row's chartId via onOpen, in row order", async () => {
    const onOpen = vi.fn();
    const view = await render(
      <ChartList items={[ROW_TIMED, ROW_APPROXIMATE]} onOpen={onOpen} />
    );

    const items = view.getAllByRole("listitem");
    await act(async () => {
      fireEvent.press(items[0]!);
    });
    await act(async () => {
      fireEvent.press(items[1]!);
    });

    expect(onOpen).toHaveBeenNthCalledWith(1, "chart-1");
    expect(onOpen).toHaveBeenNthCalledWith(2, "chart-2");
  });
});

// ---------------------------------------------------------------------------
// Workspace copy templates (list/chip vocabulary)
// ---------------------------------------------------------------------------

describe("workspace copy deck — list/chip templates", () => {
  it("confidence marker renders only for non-Timed confidences (D-11 vocabulary)", () => {
    expect(confidenceMarker("Timed")).toBeNull();
    expect(confidenceMarker("Approximate")).toBe("Approximate");
    expect(confidenceMarker("Rectified")).toBe("Rectified");
    expect(confidenceMarker("Unknown")).toBe("Unknown time");
  });

  it("revisions template — {n} revisions", () => {
    expect(revisionsLabel(3)).toBe("3 revisions");
  });
});

// ---------------------------------------------------------------------------
// WebUnsupported card (D-03)
// ---------------------------------------------------------------------------

describe("WebUnsupported card (D-03)", () => {
  it("renders the exact capability-card strings — no actions", async () => {
    const view = await render(<WebUnsupported />);

    expect(view.getByText("Saved charts are available in the app")).toBeTruthy();
    expect(
      view.getByText(
        "Charts are stored only on your device. Saving, reopening, and exporting work in the LemAstra app on iOS or Android."
      )
    ).toBeTruthy();
    expect(view.queryAllByRole("button")).toHaveLength(0);
  });
});
