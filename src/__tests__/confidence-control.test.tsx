import type {
  fireEvent as rtlFireEvent,
  render as rtlRender,
  within as rtlWithin,
} from "@testing-library/react-native/pure";
import { PixelRatio } from "react-native";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { CONFIDENCE_OPTIONS } from "@/components/birth/copy";
import { ConfidenceControl } from "@/components/birth/confidence-control";
import { confidenceSchema } from "@/lib/api-schemas";

// ConfidenceControl tests (02-05 Task 2) — the D-09 four-state inline control.
//
// Copy assertions are the EXACT copy-deck strings from 02-UI-SPEC §"Copy
// Deck" (birth form): em dashes and curly quotes included. The option
// vocabulary is the calculator's capitalized labels, typed against
// confidenceSchema.

// Acquired in beforeAll (not a static import): RNTL requires react-native
// at import time, and the RN test shim only seeds require.cache when the
// setupFile has run — which happens after collection but before hooks.
let render: typeof rtlRender;
let within: typeof rtlWithin;
let fireEvent: typeof rtlFireEvent;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  ({ render, within, fireEvent, cleanup } = await import(
    "@testing-library/react-native/pure"
  ));
});

// RNTL's `/pure` entry skips automatic cleanup — unmount after every test.
afterEach(async () => {
  await cleanup();
  vi.restoreAllMocks();
});

/** A rendered host element queryable by `within`. */
type Instance = Parameters<typeof rtlWithin>[0];

function checkedLabel(view: { getAllByRole(role: string): Instance[] }) {
  const radios = view.getAllByRole("radio");
  const checked = radios.find(
    (radio) => radio.props.accessibilityState?.checked === true
  );
  if (!checked) throw new Error("expected exactly one checked radio");
  return within(checked);
}

describe("ConfidenceControl (D-09)", () => {
  it("renders the copy-deck heading and exactly four options", async () => {
    const view = await render(<ConfidenceControl onChange={() => {}} />);

    expect(view.getByText("How well do you know your birth time?")).toBeTruthy();
    expect(view.getByRole("radiogroup")).toBeTruthy();
    expect(view.getAllByRole("radio")).toHaveLength(4);
  });

  it("selects Timed by default", async () => {
    const view = await render(<ConfidenceControl onChange={() => {}} />);

    expect(checkedLabel(view).getByText("Timed")).toBeTruthy();
  });

  it("renders the exact copy-deck helper text for every option", async () => {
    const view = await render(<ConfidenceControl onChange={() => {}} />);

    expect(
      view.getByText(
        "From a record — birth certificate, hospital paperwork, or a reliably remembered exact time."
      )
    ).toBeTruthy();
    expect(
      view.getByText(
        "Roughly known, like “around 7 in the morning”. Houses and angles are calculated but flagged provisional."
      )
    ).toBeTruthy();
    expect(view.getByText("Estimated by an astrologer working backward from life events.")).toBeTruthy();
    expect(
      view.getByText(
        "No time known. You'll get only what doesn't need a time — planets in signs. No houses or rising sign, and nothing is guessed."
      )
    ).toBeTruthy();
  });

  it("exposes the unknown-time helper swap copy for the form to consume", async () => {
    const { UNKNOWN_TIME_FIELD_HELPER } = await import("@/components/birth/copy");
    expect(UNKNOWN_TIME_FIELD_HELPER).toBe("Not needed when the time is unknown.");
  });

  it("calls back with the calculator label when an option is pressed", async () => {
    const onChange = vi.fn();
    const view = await render(<ConfidenceControl onChange={onChange} />);

    const radios: Instance[] = view.getAllByRole("radio");
    const unknown = radios.find((radio) => within(radio).queryByText("Unknown"));
    if (!unknown) throw new Error("expected an Unknown option");

    fireEvent.press(unknown);
    expect(onChange).toHaveBeenCalledWith("Unknown");
  });

  it("moves the checked state when the value prop changes", async () => {
    const view = await render(<ConfidenceControl value="Rectified" onChange={() => {}} />);
    expect(checkedLabel(view).getByText("Rectified")).toBeTruthy();
  });

  it("offers exactly Timed, Approximate, Rectified, Unknown — all valid confidenceSchema members", () => {
    expect(CONFIDENCE_OPTIONS.map((option) => option.value)).toEqual([
      "Timed",
      "Approximate",
      "Rectified",
      "Unknown",
    ]);
    for (const option of CONFIDENCE_OPTIONS) {
      expect(() => confidenceSchema.parse(option.value)).not.toThrow();
    }
  });

  it("renders with all content intact at a 1.3x font scale (wraps, never clips)", async () => {
    vi.spyOn(PixelRatio, "getFontScale").mockReturnValue(1.3);

    const view = await render(<ConfidenceControl value="Unknown" onChange={() => {}} />);

    expect(view.getByText("How well do you know your birth time?")).toBeTruthy();
    for (const label of ["Timed", "Approximate", "Rectified", "Unknown"]) {
      expect(view.getByText(label)).toBeTruthy();
    }
  });
});
