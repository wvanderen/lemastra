import type {
  fireEvent as rtlFireEvent,
  render as rtlRender,
  within as rtlWithin,
} from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ErrorBanner } from "@/components/ui/error-banner";
import { errorCodeSchema } from "@/lib/api-schemas";

// ErrorBanner tests (02-05 Task 1) — the CALC-04 client rendering vocabulary.
//
// Every heading/body/hint/action string below is the EXACT copy-deck text
// from 02-UI-SPEC §"Error banners" (curly quotes and em dashes included):
// copy lives in src/components/ui/copy.ts keyed by the validated
// error_code, and only the CALC_INVALID_INPUT server message is ever
// passed through (T-02-18 — never raw stderr or tracebacks).

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
});

describe("ErrorBanner", () => {
  it("renders the CALC_UNSUITABLE_HOUSE_SYSTEM heading naming the house system, body, and Open Assumptions action", async () => {
    const onAction = vi.fn();
    const view = await render(
      <ErrorBanner code="CALC_UNSUITABLE_HOUSE_SYSTEM" houseSystem="Placidus" onAction={onAction} />
    );

    expect(view.getByText("Placidus houses can't be calculated for this location.")).toBeTruthy();
    expect(
      view.getByText("Switch to Whole Sign or Equal houses under Assumptions, then calculate again.")
    ).toBeTruthy();

    const action = view.getByRole("button");
    expect(within(action).getByText("Open Assumptions")).toBeTruthy();
    fireEvent.press(action);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("renders the CALC_TIMEOUT banner with a Try again action", async () => {
    const view = await render(<ErrorBanner code="CALC_TIMEOUT" onAction={() => {}} />);

    expect(view.getByText("Calculation timed out.")).toBeTruthy();
    expect(view.getByText("Try again — this is usually temporary.")).toBeTruthy();
    expect(within(view.getByRole("button")).getByText("Try again")).toBeTruthy();
  });

  it("renders the PLACE_ZERO_RESULTS banner with the user's query in the heading", async () => {
    const view = await render(
      <ErrorBanner code="PLACE_ZERO_RESULTS" query="Lissabon" onAction={() => {}} />
    );

    expect(view.getByText("No match found for “Lissabon”.")).toBeTruthy();
    expect(view.getByText("Try a nearby city or a larger place name.")).toBeTruthy();
    expect(within(view.getByRole("button")).getByText("Enter coordinates manually")).toBeTruthy();
  });

  it("falls back to the network copy when the error carries no recognized code", async () => {
    const view = await render(<ErrorBanner />);

    expect(view.getByText("Can't reach the calculation service.")).toBeTruthy();
    expect(view.getByText("Check your connection and try again.")).toBeTruthy();
    // The network fallback has no recovery action — no button renders.
    expect(view.queryByRole("button")).toBeNull();
  });

  it("passes the server field message through only for CALC_INVALID_INPUT", async () => {
    const invalidInput = await render(
      <ErrorBanner code="CALC_INVALID_INPUT" message="Birth time is required for confidence 'Timed'." />
    );
    expect(invalidInput.getByText("Birth details couldn't be processed.")).toBeTruthy();
    expect(
      invalidInput.getByText(
        "Birth time is required for confidence 'Timed'. Fix the highlighted field and try again."
      )
    ).toBeTruthy();

    // Any other code must NOT render server-provided text (T-02-18).
    const timeout = await render(
      <ErrorBanner code="CALC_TIMEOUT" message="Traceback (most recent call last): swe.houses()" />
    );
    expect(timeout.queryByText(/Traceback/)).toBeNull();
    expect(timeout.queryByText(/swe\.houses/)).toBeNull();
  });

  it("exposes the banner text via accessibilityLabel so meaning never rides on color", async () => {
    const view = await render(
      <ErrorBanner code="CALC_UNSUITABLE_HOUSE_SYSTEM" houseSystem="Placidus" />
    );

    expect(
      view.getByLabelText(/Placidus houses can't be calculated for this location/)
    ).toBeTruthy();
  });

  it("maps every code in the shared errorCodeSchema vocabulary to copy", async () => {
    const { errorBannerCopy, NETWORK_ERROR_COPY } = await import("@/components/ui/copy");

    for (const code of errorCodeSchema.options) {
      const copy = errorBannerCopy(code, { houseSystem: "Placidus", query: "X" });
      expect(copy.heading.length).toBeGreaterThan(0);
      expect(copy.heading).not.toContain("{");
      expect(copy).not.toEqual(NETWORK_ERROR_COPY);
    }
  });
});
