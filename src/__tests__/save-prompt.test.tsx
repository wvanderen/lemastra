import type { render as rtlRender } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  CHART_NAME_LABEL,
  DEDUPE_HELPER,
  DELETE_ALL_ERROR_COPY,
  DELETE_ERROR_COPY,
  EXPORT_ERROR_COPY,
  LABEL_FIELD_ERROR,
  OPEN_FAILED_ERROR_COPY,
  SAVE_CTA,
  SAVE_ERROR_COPY,
  SAVE_PROMPT_CANCEL,
  SAVE_PROMPT_CONFIRM,
  SAVE_PROMPT_HEADING,
  SAVE_PROMPT_HELPER,
  SAVED_STATE,
} from "@/components/workspace/copy";

// Save-prompt + error-card tests (03-04 Task 1) — the D-10 label-prompt
// modal and the workspace error card.
//
// Contract under test (plan behavior rows + 03-UI-SPEC §"Save flow"):
// - The prompt renders the exact copy-deck strings with the TextInput
//   PREFILLED with the smart default ("1990-05-21 · Lisbon, Portugal").
// - Empty/whitespace or >60-character input disables the confirm button
//   and shows the field error in a polite live region (A-3-UI-4 bounds).
// - Confirm emits the TRIMMED label via onSave; Cancel emits onCancel;
//   both buttons disable while pending.
// - The error card mirrors the Phase-2 error-banner structure (1px error
//   border, heading, body, optional action) fed entirely by props.
// - Every copy-deck constant equals its exact approved UI-SPEC literal.
//
// Test mechanics: RNTL v14 /pure under the RN vitest shim (same
// conventions as result-screen.test.tsx).

const DEFAULT_LABEL = "1990-05-21 · Lisbon, Portugal";

let render: typeof rtlRender;
let userEvent: typeof import("@testing-library/react-native/pure").userEvent;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let SavePrompt: typeof import("@/components/workspace/save-prompt").SavePrompt;
let ErrorCard: typeof import("@/components/workspace/error-card").ErrorCard;

beforeAll(async () => {
  ({ render, userEvent, cleanup, act } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ SavePrompt } = await import("@/components/workspace/save-prompt"));
  ({ ErrorCard } = await import("@/components/workspace/error-card"));
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
});

type PromptOverrides = Partial<{
  visible: boolean;
  defaultLabel: string;
  pending: boolean;
  onSave: ReturnType<typeof vi.fn>;
  onCancel: ReturnType<typeof vi.fn>;
}>;

async function renderPrompt(overrides: PromptOverrides = {}) {
  const props = {
    visible: true,
    defaultLabel: DEFAULT_LABEL,
    pending: false,
    onSave: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  const view = await render(<SavePrompt {...props} />);
  await act(async () => {});
  return { view, props };
}

// ---------------------------------------------------------------------------
// Copy deck — exact approved strings (03-UI-SPEC §"Save flow" + §"Error states")
// ---------------------------------------------------------------------------

describe("workspace copy deck — exact literals", () => {
  it("carries the exact save-flow strings", () => {
    expect(SAVE_CTA).toBe("Save chart");
    expect(SAVE_PROMPT_HEADING).toBe("Save this chart");
    expect(CHART_NAME_LABEL).toBe("Chart name");
    expect(SAVE_PROMPT_HELPER).toBe("Saved charts stay on this device. Nothing is sent anywhere.");
    expect(LABEL_FIELD_ERROR).toBe("Enter a name (up to 60 characters).");
    expect(SAVE_PROMPT_CONFIRM).toBe("Save chart");
    expect(SAVE_PROMPT_CANCEL).toBe("Cancel");
    // Checkmark-word rule: the saved state always carries the word "Saved".
    expect(SAVED_STATE).toBe("Saved ✓");
    expect(DEDUPE_HELPER).toBe("Already saved with these exact details.");
  });

  it("carries the exact workspace error-deck classes", () => {
    expect(SAVE_ERROR_COPY).toEqual({
      heading: "Couldn't save the chart.",
      body: "Your chart is still open on this screen — nothing was lost. Try saving again.",
      action: "Try again",
    });
    expect(OPEN_FAILED_ERROR_COPY).toEqual({
      heading: "Couldn't open this saved chart.",
      body: "It was saved in a format this app version can't read. Your other charts are unaffected — try updating the app.",
    });
    expect(EXPORT_ERROR_COPY).toEqual({
      heading: "Couldn't create the export file.",
      body: "Try again. Your saved charts are unaffected.",
      action: "Try again",
    });
    expect(DELETE_ERROR_COPY).toEqual({
      heading: "Couldn't delete this chart.",
      body: "Nothing was removed. Try again.",
      action: "Try again",
    });
    expect(DELETE_ALL_ERROR_COPY).toEqual({
      heading: "Couldn't delete your data.",
      body: "Nothing was removed. Try again.",
      action: "Try again",
    });
  });
});

// ---------------------------------------------------------------------------
// SavePrompt — rendering + prefill (D-10)
// ---------------------------------------------------------------------------

describe("SavePrompt — render", () => {
  it("renders the heading, field label, prefilled input, and helper when visible", async () => {
    const { view } = await renderPrompt();

    expect(view.getByText(SAVE_PROMPT_HEADING)).toBeTruthy();
    expect(view.getByText(CHART_NAME_LABEL)).toBeTruthy();
    expect(view.getByText(SAVE_PROMPT_HELPER)).toBeTruthy();
    // Prefilled with the provided smart default (D-10).
    expect(view.getByDisplayValue(DEFAULT_LABEL)).toBeTruthy();
  });

  it("renders nothing while not visible", async () => {
    const { view } = await renderPrompt({ visible: false });
    expect(view.queryByText(SAVE_PROMPT_HEADING)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SavePrompt — validation gating (A-3-UI-4: trimmed 1–60)
// ---------------------------------------------------------------------------

describe("SavePrompt — validation", () => {
  it("shows the field error in a polite live region and disables confirm for empty input", async () => {
    const { view } = await renderPrompt();
    const input = view.getByTestId("save-prompt-input");

    await userEvent.clear(input);
    await act(async () => {});

    const error = view.getByText(LABEL_FIELD_ERROR);
    expect(error.props.accessibilityLiveRegion).toBe("polite");
    expect(view.getByTestId("save-prompt-confirm").props.accessibilityState.disabled).toBe(
      true
    );
  });

  it("disables confirm for whitespace-only input", async () => {
    const { view } = await renderPrompt();
    const input = view.getByTestId("save-prompt-input");

    await userEvent.clear(input);
    await userEvent.type(input, "   ");
    await act(async () => {});

    expect(view.getByText(LABEL_FIELD_ERROR)).toBeTruthy();
    expect(view.getByTestId("save-prompt-confirm").props.accessibilityState.disabled).toBe(
      true
    );
  });

  it("disables confirm and shows the error for a 61-character label, but accepts 60", async () => {
    const { view } = await renderPrompt();
    const input = view.getByTestId("save-prompt-input");

    await userEvent.clear(input);
    await userEvent.type(input, "a".repeat(61));
    await act(async () => {});

    expect(view.getByText(LABEL_FIELD_ERROR)).toBeTruthy();
    expect(view.getByTestId("save-prompt-confirm").props.accessibilityState.disabled).toBe(
      true
    );

    await userEvent.clear(input);
    await userEvent.type(input, "a".repeat(60));
    await act(async () => {});

    expect(view.queryByText(LABEL_FIELD_ERROR)).toBeNull();
    expect(view.getByTestId("save-prompt-confirm").props.accessibilityState.disabled).toBe(
      false
    );
  });

  it("keeps the confirm enabled with no error for the valid prefilled default", async () => {
    const { view } = await renderPrompt();

    expect(view.queryByText(LABEL_FIELD_ERROR)).toBeNull();
    expect(view.getByTestId("save-prompt-confirm").props.accessibilityState.disabled).toBe(
      false
    );
  });
});

// ---------------------------------------------------------------------------
// SavePrompt — emissions + pending (D-10 interaction contract)
// ---------------------------------------------------------------------------

describe("SavePrompt — confirm/cancel/pending", () => {
  it("emits the trimmed label via onSave on confirm", async () => {
    const onSave = vi.fn();
    const { view } = await renderPrompt({ onSave });
    const input = view.getByTestId("save-prompt-input");

    await userEvent.clear(input);
    await userEvent.type(input, "  Sunset chart  ");
    await act(async () => {});

    await userEvent.press(view.getByTestId("save-prompt-confirm"));

    expect(onSave).toHaveBeenCalledWith("Sunset chart");
  });

  it("emits onCancel on cancel", async () => {
    const onCancel = vi.fn();
    const { view } = await renderPrompt({ onCancel });

    await userEvent.press(view.getByTestId("save-prompt-cancel"));

    expect(onCancel).toHaveBeenCalled();
  });

  it("disables both buttons while pending", async () => {
    const { view } = await renderPrompt({ pending: true });

    expect(view.getByTestId("save-prompt-confirm").props.accessibilityState.disabled).toBe(
      true
    );
    expect(view.getByTestId("save-prompt-cancel").props.accessibilityState.disabled).toBe(
      true
    );
  });
});

// ---------------------------------------------------------------------------
// ErrorCard — error-banner structure fed by props
// ---------------------------------------------------------------------------

describe("ErrorCard", () => {
  it("renders an alert card with the heading, body, and action from props; the action fires", async () => {
    const onAction = vi.fn();
    const view = await render(
      <ErrorCard
        heading={SAVE_ERROR_COPY.heading}
        body={SAVE_ERROR_COPY.body}
        actionLabel={SAVE_ERROR_COPY.action}
        onAction={onAction}
        testID="save-error-card"
      />
    );
    await act(async () => {});

    const card = view.getByTestId("save-error-card");
    expect(card.props.accessibilityRole).toBe("alert");
    expect(card.props.accessibilityLiveRegion).toBe("polite");

    // Error-bordered card (1px error border — the token, resolved light).
    const styles = [].concat(card.props.style ?? []);
    expect(
      styles.some(
        (style) =>
          style && typeof style === "object" && style.borderColor === "#B3261E"
      )
    ).toBe(true);

    expect(view.getByText(SAVE_ERROR_COPY.heading)).toBeTruthy();
    expect(view.getByText(SAVE_ERROR_COPY.body)).toBeTruthy();

    await userEvent.press(view.getByText(SAVE_ERROR_COPY.action!));
    expect(onAction).toHaveBeenCalled();
  });

  it("renders no action control when actionLabel is absent", async () => {
    const view = await render(
      <ErrorCard
        heading={OPEN_FAILED_ERROR_COPY.heading}
        body={OPEN_FAILED_ERROR_COPY.body}
      />
    );
    await act(async () => {});

    expect(view.getByText(OPEN_FAILED_ERROR_COPY.heading)).toBeTruthy();
    expect(view.getByText(OPEN_FAILED_ERROR_COPY.body)).toBeTruthy();
    expect(view.queryByText("Try again")).toBeNull();
  });
});
