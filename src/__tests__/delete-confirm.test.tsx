import type { render as rtlRender } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  DELETING,
  DELETE_ALL_BODY,
  DELETE_ALL_CONFIRM,
  DELETE_ALL_HEADING,
  DELETE_CANCEL,
  DELETE_CHART_CONFIRM,
  deleteChartBody,
  deleteChartHeading,
} from "@/components/workspace/copy";

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

/** Style arrays on RN hosts may arrive flattened or not — normalize. */
function styleEntries(node: { props: { style?: unknown } }): Record<string, unknown>[] {
  const style = node.props.style;
  const list = Array.isArray(style) ? style : [style];
  return list.filter(
    (entry): entry is Record<string, unknown> =>
      typeof entry === "object" && entry !== null
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
