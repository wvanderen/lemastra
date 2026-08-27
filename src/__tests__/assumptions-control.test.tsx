import type {
  render as rtlRender,
  userEvent as rtlUserEvent,
  within as rtlWithin,
} from "@testing-library/react-native/pure";
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
//
// Test mechanics (RNTL v14 /pure under the RN vitest shim):
// - Presses go through `userEvent.press` — act-wrapped, so the disclosure
//   toggle's state update flushes before assertions.
// - Radiogroup semantics are asserted structurally via props: RNTL v14 has
//   no role mapping for RN's `radiogroup` accessibilityRole.

// Acquired in beforeAll (not a static import): RNTL requires react-native
// at import time, and the RN test shim only seeds require.cache when the
// setupFile has run — which happens after collection but before hooks.
let render: typeof rtlRender;
let within: typeof rtlWithin;
let userEvent: typeof rtlUserEvent;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  ({ render, within, userEvent, cleanup } = await import(
    "@testing-library/react-native/pure"
  ));
});

// RNTL's `/pure` entry skips automatic cleanup — unmount after every test.
afterEach(async () => {
  await cleanup();
});

/** A rendered host element queryable by `within`. */
type Instance = Parameters<typeof rtlWithin>[0];

function radiogroups(view: { container: { queryAll: Function } }) {
  return view.container.queryAll(
    (node: { props: { accessibilityRole?: string } }) =>
      node.props.accessibilityRole === "radiogroup"
  );
}

/** Every rendered Text must wrap rather than clip at large font scales. */
function assertNoClippingTexts(view: { container: { queryAll: Function } }) {
  const texts = view.container.queryAll((node: { type: unknown }) => node.type === "Text");
  expect(texts.length).toBeGreaterThan(0);
  for (const text of texts) {
    expect(text.props.allowFontScaling).not.toBe(false);
    expect(text.props.numberOfLines).toBeUndefined();
    expect(text.props.ellipsizeMode).toBeUndefined();
    expect(text.props.adjustsFontSizeToFit).not.toBe(true);
  }
}

describe("AssumptionsControl (D-11)", () => {
  it("renders collapsed by default — header visible, list hidden", async () => {
    const view = await render(<AssumptionsControl onChange={() => {}} />);

    expect(view.getByText("Assumptions & advanced")).toBeTruthy();
    const header = view.getByRole("button");
    expect(header.props.accessibilityState).toMatchObject({ expanded: false });
    expect(view.queryAllByRole("radio")).toHaveLength(0);
    expect(radiogroups(view)).toHaveLength(0);
  });

  it("expands in place when the header is pressed", async () => {
    const user = userEvent.setup();
    const view = await render(<AssumptionsControl onChange={() => {}} />);

    await user.press(view.getByRole("button"));

    expect(view.getByRole("button").props.accessibilityState).toMatchObject({
      expanded: true,
    });
    expect(radiogroups(view)).toHaveLength(1);
  });

  it("renders exactly the ten calculator house systems in schema vocabulary order", async () => {
    const user = userEvent.setup();
    const view = await render(<AssumptionsControl onChange={() => {}} />);
    await user.press(view.getByRole("button"));

    const radios: Instance[] = view.getAllByRole("radio");
    expect(radios).toHaveLength(10);
    expect(houseSystemSchema.options).toHaveLength(10);

    for (const [index, system] of houseSystemSchema.options.entries()) {
      expect(within(radios[index]!).getByText(system)).toBeTruthy();
    }
  });

  it("pre-selects Whole Sign", async () => {
    const user = userEvent.setup();
    const view = await render(<AssumptionsControl onChange={() => {}} />);
    await user.press(view.getByRole("button"));

    const radios: Instance[] = view.getAllByRole("radio");
    const checked = radios.filter(
      (radio) => radio.props.accessibilityState?.checked === true
    );
    expect(checked).toHaveLength(1);
    expect(within(checked[0]!).getByText("Whole Sign")).toBeTruthy();
  });

  it("renders the house-system label and quadrant-failure helper exactly", async () => {
    const user = userEvent.setup();
    const view = await render(<AssumptionsControl onChange={() => {}} />);
    await user.press(view.getByRole("button"));

    expect(view.getByText("House system")).toBeTruthy();
    expect(
      view.getByText(
        "Whole Sign is the default and works everywhere, including extreme latitudes. Quadrant systems like Placidus can fail near the poles."
      )
    ).toBeTruthy();
  });

  it("calls back with the selected label", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = await render(<AssumptionsControl onChange={onChange} />);
    await user.press(view.getByRole("button"));

    const radios: Instance[] = view.getAllByRole("radio");
    const placidus = radios.find((radio) => within(radio).queryByText("Placidus"));
    if (!placidus) throw new Error("expected a Placidus option");

    await user.press(placidus);
    expect(onChange).toHaveBeenCalledWith("Placidus");
  });

  it("supports defaultExpanded", async () => {
    const view = await render(<AssumptionsControl defaultExpanded onChange={() => {}} />);

    expect(view.getAllByRole("radio")).toHaveLength(10);
    expect(radiogroups(view)).toHaveLength(1);
    expect(view.getByRole("button").props.accessibilityState).toMatchObject({
      expanded: true,
    });
  });

  it("keeps every string wrappable at large font scales (1.3x smoke, no clipping props)", async () => {
    const view = await render(<AssumptionsControl defaultExpanded onChange={() => {}} />);

    assertNoClippingTexts(view);

    expect(view.getByText("Assumptions & advanced")).toBeTruthy();
    for (const system of houseSystemSchema.options) {
      expect(view.getByText(system)).toBeTruthy();
    }
  });
});
