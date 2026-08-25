import type {
  fireEvent as rtlFireEvent,
  render as rtlRender,
  within as rtlWithin,
} from "@testing-library/react-native/pure";
import { StyleSheet } from "react-native";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ThemedText } from "@/components/themed-text";
import { OptionCard } from "@/components/ui/option-card";
import { Colors } from "@/constants/theme";

// OptionCard + semantic-token tests (02-05 Task 1).
//
// Assertions pin the 02-UI-SPEC §"Color" contract: accent/error token values
// for both schemes, the linkPrimary → accent migration, and the option-card
// selected/unselected treatment (fill + border + weight — three channels,
// never color alone — with radio semantics and a ≥48dp press target).

// Acquired in beforeAll (not a static import): RNTL requires react-native
// at import time, and the RN test shim only seeds require.cache when the
// setupFile has run — which happens after collection but before hooks.
type RenderResult = Awaited<ReturnType<typeof rtlRender>>;
let render: typeof rtlRender;
let within: typeof rtlWithin;
let fireEvent: typeof rtlFireEvent;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  ({ render, within, cleanup, fireEvent } = await import(
    "@testing-library/react-native/pure"
  ));
});

// RNTL's `/pure` entry skips automatic cleanup — unmount after every test
// so repeated renders don't leak into later text queries.
afterEach(async () => {
  await cleanup();
});

describe("semantic theme tokens (02-UI-SPEC §Color)", () => {
  it("defines the accent token for both schemes", () => {
    expect(Colors.light.accent).toBe("#2266CC");
    expect(Colors.dark.accent).toBe("#7AB0FF");
  });

  it("defines the error token for both schemes", () => {
    expect(Colors.light.error).toBe("#B3261E");
    expect(Colors.dark.error).toBe("#F2B8B5");
  });

  it("migrates linkPrimary from the hard-coded hex to the accent token", async () => {
    const view = await render(<ThemedText type="linkPrimary">Privacy details</ThemedText>);

    const text = view.getByText("Privacy details");
    const flattened = StyleSheet.flatten(text.props.style);
    expect(flattened.color).toBe(Colors.light.accent);
  });
});

describe("OptionCard", () => {
  it("renders its label and helper text", async () => {
    const view = await render(
      <OptionCard label="Timed" helper="From a record." selected={false} onPress={() => {}} />
    );

    expect(view.getByText("Timed")).toBeTruthy();
    expect(view.getByText("From a record.")).toBeTruthy();
  });

  it("exposes radio semantics with an unchecked state when unselected", async () => {
    const view = await render(
      <OptionCard label="Timed" helper="From a record." selected={false} onPress={() => {}} />
    );

    const radio = view.getByRole("radio");
    expect(radio.props.accessibilityState).toMatchObject({ checked: false });
  });

  it("conveys selection by fill + accent border + 600-weight label, never color alone", async () => {
    const selected = await render(
      <OptionCard label="Timed" helper="From a record." selected onPress={() => {}} />
    );
    const unselected = await render(
      <OptionCard label="Timed" helper="From a record." selected={false} onPress={() => {}} />
    );

    const selectedRadio = selected.getByRole("radio");
    expect(selectedRadio.props.accessibilityState).toMatchObject({ checked: true });

    const selectedStyle = StyleSheet.flatten(selectedRadio.props.style);
    expect(selectedStyle.backgroundColor).toBe(Colors.light.backgroundSelected);
    expect(selectedStyle.borderWidth).toBe(2);
    expect(selectedStyle.borderColor).toBe(Colors.light.accent);
    expect(StyleSheet.flatten(within(selectedRadio).getByText("Timed").props.style).fontWeight).toBe(
      "600"
    );

    const unselectedStyle = StyleSheet.flatten(unselected.getByRole("radio").props.style);
    expect(unselectedStyle.backgroundColor).toBe(Colors.light.backgroundElement);
    expect(unselectedStyle.borderWidth).toBe(1);
    expect(unselectedStyle.borderColor).not.toBe(Colors.light.accent);
    expect(
      StyleSheet.flatten(within(unselected.getByRole("radio")).getByText("Timed").props.style)
        .fontWeight
    ).not.toBe("600");
  });

  it("keeps a press target of at least 48dp", async () => {
    const view = await render(
      <OptionCard label="Timed" helper="From a record." selected={false} onPress={() => {}} />
    );

    const style = StyleSheet.flatten(view.getByRole("radio").props.style);
    const minHeight = style.minHeight ?? Number.NaN;
    expect(minHeight).toBeGreaterThanOrEqual(48);
  });

  it("calls onPress when pressed", async () => {
    const onPress = vi.fn();
    const view = await render(
      <OptionCard label="Timed" helper="From a record." selected={false} onPress={onPress} />
    );

    fireEvent.press(view.getByRole("radio"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
