import type {
  fireEvent as rtlFireEvent,
  render as rtlRender,
  within as rtlWithin,
} from "@testing-library/react-native/pure";
import { PixelRatio } from "react-native";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { AssumptionsControl } from "@/components/birth/assumptions-control";
import { houseSystemSchema } from "@/lib/api-schemas";

// AssumptionsControl tests (02-05 Task 2) — the D-11 collapsible house-system
// selector.
//
// The ten house-system labels are asserted in the exact order of
// houseSystemSchema.options (the calculator's HOUSE_SYSTEMS vocabulary,
// imported — never a local literal list). Helper strings are the exact
// copy-deck text from 02-UI-SPEC §"Copy Deck" (birth form).

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

describe("AssumptionsControl (D-11)", () => {
  it("renders collapsed by default — header visible, list hidden", async () => {
    const view = await render(<AssumptionsControl onChange={() => {}} />);

    expect(view.getByText("Assumptions & advanced")).toBeTruthy();
    const header = view.getByRole("button");
    expect(header.props.accessibilityState).toMatchObject({ expanded: false });
    expect(view.queryByRole("radiogroup")).toBeNull();
    expect(view.queryByRole("radio")).toBeNull();
  });

  it("expands in place when the header is pressed", async () => {
    const view = await render(<AssumptionsControl onChange={() => {}} />);

    const header = view.getByRole("button");
    fireEvent.press(header);

    expect(header.props.accessibilityState).toMatchObject({ expanded: true });
    expect(view.getByRole("radiogroup")).toBeTruthy();
  });

  it("renders exactly the ten calculator house systems in schema vocabulary order", async () => {
    const view = await render(<AssumptionsControl onChange={() => {}} />);
    fireEvent.press(view.getByRole("button"));

    const radios = view.getAllByRole("radio");
    expect(radios).toHaveLength(10);
    expect(houseSystemSchema.options).toHaveLength(10);

    for (const [index, system] of houseSystemSchema.options.entries()) {
      expect(within(radios[index]!).getByText(system)).toBeTruthy();
    }
  });

  it("pre-selects Whole Sign", async () => {
    const view = await render(<AssumptionsControl onChange={() => {}} />);
    fireEvent.press(view.getByRole("button"));

    const radios: Instance[] = view.getAllByRole("radio");
    const checked = radios.filter(
      (radio) => radio.props.accessibilityState?.checked === true
    );
    expect(checked).toHaveLength(1);
    expect(within(checked[0]!).getByText("Whole Sign")).toBeTruthy();
  });

  it("renders the house-system label and quadrant-failure helper exactly", async () => {
    const view = await render(<AssumptionsControl onChange={() => {}} />);
    fireEvent.press(view.getByRole("button"));

    expect(view.getByText("House system")).toBeTruthy();
    expect(
      view.getByText(
        "Whole Sign is the default and works everywhere, including extreme latitudes. Quadrant systems like Placidus can fail near the poles."
      )
    ).toBeTruthy();
  });

  it("calls back with the selected label", async () => {
    const onChange = vi.fn();
    const view = await render(<AssumptionsControl onChange={onChange} />);
    fireEvent.press(view.getByRole("button"));

    const radios: Instance[] = view.getAllByRole("radio");
    const placidus = radios.find((radio) => within(radio).queryByText("Placidus"));
    if (!placidus) throw new Error("expected a Placidus option");

    fireEvent.press(placidus);
    expect(onChange).toHaveBeenCalledWith("Placidus");
  });

  it("supports defaultExpanded", async () => {
    const view = await render(<AssumptionsControl defaultExpanded onChange={() => {}} />);

    expect(view.getByRole("radiogroup")).toBeTruthy();
    expect(view.getByRole("button").props.accessibilityState).toMatchObject({ expanded: true });
  });

  it("renders with all content intact at a 1.3x font scale (wraps, never clips)", async () => {
    vi.spyOn(PixelRatio, "getFontScale").mockReturnValue(1.3);

    const view = await render(<AssumptionsControl defaultExpanded onChange={() => {}} />);

    expect(view.getByText("Assumptions & advanced")).toBeTruthy();
    expect(view.getAllByRole("radio")).toHaveLength(10);
    for (const system of houseSystemSchema.options) {
      expect(view.getByText(system)).toBeTruthy();
    }
  });
});
