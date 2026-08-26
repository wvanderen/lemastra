import type { render as rtlRender, within as rtlWithin } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  TRICKY_TIME_AMBIGUOUS_HEADING,
  TRICKY_TIME_CHOICE_REQUIRED,
  TRICKY_TIME_FOOTNOTE,
  TRICKY_TIME_NONEXISTENT_HEADING,
  trickyTimeAmbiguousBody,
  trickyTimeNonexistentBody,
} from "@/components/birth/copy";
import type { ResolveTimeResponse } from "@/lib/api-schemas";

// Tricky-time picker tests (02-08 Task 1) — the D-08 explicit-resolution
// component (BIRTH-03 client behavior).
//
// Contract under test (plan behavior rows + T-02-31):
// - Option labels are the SERVER's option.label strings, rendered verbatim —
//   the UI never re-derives offsets, so the assertions compare against the
//   fixture payload exactly (labels copied from the verified resolve-time
//   response shapes in 02-RESEARCH.md §"Resolve payload for the D-08 picker").
// - Ambiguous → heading + both option cards + footnote; selecting emits the
//   option's mode. Nonexistent → heading + exactly one shifted card.
// - classification "normal" renders nothing.
// - With no selection, the required-choice helper is visible.
//
// Test mechanics: RNTL v14 /pure under the RN vitest shim (same conventions
// as privacy-screen.test.tsx). No router or storage — the picker is pure.

// Acquired in beforeAll (not a static import): RNTL requires react-native
// at import time, and the RN test shim only seeds require.cache when the
// setupFile has run — which happens after collection but before hooks.
let render: typeof rtlRender;
let within: typeof rtlWithin;
let userEvent: typeof import("@testing-library/react-native/pure").userEvent;
let cleanup: () => Promise<void>;
let TrickyTimePicker: typeof import("@/components/birth/tricky-time-picker").TrickyTimePicker;

beforeAll(async () => {
  ({ render, within, userEvent, cleanup } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ TrickyTimePicker } = await import("@/components/birth/tricky-time-picker"));
});

afterEach(async () => {
  await cleanup();
});

const AMBIGUOUS_DATE = "2024-11-03";
const AMBIGUOUS_TIME = "01:30";
const NONEXISTENT_DATE = "2024-03-10";
const NONEXISTENT_TIME = "02:30";
const NY_ZONE = "America/New_York";

/** Verified ambiguous resolve payload (NY 2024 fall-back) — server labels verbatim. */
const AMBIGUOUS_RESOLVE: ResolveTimeResponse = {
  iana_zone: NY_ZONE,
  zone_source: "google",
  google: {
    timeZoneId: NY_ZONE,
    rawOffset: -18000,
    dstOffset: -14400,
    timeZoneName: "Eastern Daylight Time",
  },
  resolved: {
    offset_seconds: -14400,
    offset_label: "-04:00",
    classification: "ambiguous",
    options: [
      {
        mode: "first_pass",
        label: "01:30 EDT (−04:00) — first occurrence before the clocks fell back",
        utc: "2024-11-03T05:30:00Z",
      },
      {
        mode: "second_pass",
        label: "01:30 EST (−05:00) — second occurrence after the clocks fell back",
        utc: "2024-11-03T06:30:00Z",
      },
    ],
  },
  drift: false,
};

/** Verified nonexistent resolve payload (NY 2024 spring-forward gap). */
const NONEXISTENT_RESOLVE: ResolveTimeResponse = {
  ...AMBIGUOUS_RESOLVE,
  resolved: {
    offset_seconds: -18000,
    offset_label: "-05:00",
    classification: "nonexistent",
    options: [
      {
        mode: "shifted",
        label: "02:30 did not exist (clocks jumped 02:00→03:00). Using 03:30 EDT (−04:00).",
        utc: "2024-03-10T07:30:00Z",
      },
    ],
  },
};

/** The normal resolve payload — no picker may render. */
const NORMAL_RESOLVE: ResolveTimeResponse = {
  ...AMBIGUOUS_RESOLVE,
  resolved: {
    offset_seconds: 3600,
    offset_label: "+01:00",
    classification: "normal",
    options: [],
  },
};

describe("TrickyTimePicker — ambiguous (D-08 fall-back overlap)", () => {
  it("renders the heading, body, both server-labelled option cards, and the footnote", async () => {
    const view = await render(
      <TrickyTimePicker
        resolved={AMBIGUOUS_RESOLVE}
        date={AMBIGUOUS_DATE}
        time={AMBIGUOUS_TIME}
        value={null}
        onChange={() => undefined}
      />
    );

    expect(view.getByText(TRICKY_TIME_AMBIGUOUS_HEADING)).toBeTruthy();
    expect(
      view.getByText(
        trickyTimeAmbiguousBody(AMBIGUOUS_DATE, NY_ZONE, AMBIGUOUS_TIME)
      )
    ).toBeTruthy();
    expect(view.getByText(TRICKY_TIME_FOOTNOTE)).toBeTruthy();

    // Option labels are the SERVER's strings, consumed verbatim (T-02-31).
    for (const option of AMBIGUOUS_RESOLVE.resolved.options) {
      expect(view.getByText(option.label)).toBeTruthy();
    }
  });

  it("emits the pressed option's mode — first_pass and second_pass", async () => {
    const onChange = vi.fn();
    const view = await render(
      <TrickyTimePicker
        resolved={AMBIGUOUS_RESOLVE}
        date={AMBIGUOUS_DATE}
        time={AMBIGUOUS_TIME}
        value={null}
        onChange={onChange}
      />
    );

    await userEvent.press(
      view.getByText(AMBIGUOUS_RESOLVE.resolved.options[0]!.label)
    );
    expect(onChange).toHaveBeenCalledWith("first_pass");

    await userEvent.press(
      view.getByText(AMBIGUOUS_RESOLVE.resolved.options[1]!.label)
    );
    expect(onChange).toHaveBeenCalledWith("second_pass");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("shows the required-choice helper with no selection and hides it once a value exists", async () => {
    const first = await render(
      <TrickyTimePicker
        resolved={AMBIGUOUS_RESOLVE}
        date={AMBIGUOUS_DATE}
        time={AMBIGUOUS_TIME}
        value={null}
        onChange={() => undefined}
      />
    );
    expect(first.getByText(TRICKY_TIME_CHOICE_REQUIRED)).toBeTruthy();

    const second = await render(
      <TrickyTimePicker
        resolved={AMBIGUOUS_RESOLVE}
        date={AMBIGUOUS_DATE}
        time={AMBIGUOUS_TIME}
        value="first_pass"
        onChange={() => undefined}
      />
    );
    expect(second.queryByText(TRICKY_TIME_CHOICE_REQUIRED)).toBeNull();
    // The checked option carries radio semantics (option-card contract).
    const radios = second.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    const checked = radios.find(
      (radio) => radio.props.accessibilityState?.checked === true
    );
    expect(checked).toBeTruthy();
    expect(
      within(checked!).getByText(AMBIGUOUS_RESOLVE.resolved.options[0]!.label)
    ).toBeTruthy();
  });
});

describe("TrickyTimePicker — nonexistent (D-08 spring-forward gap)", () => {
  it("renders the heading, body, and exactly one shifted option card; pressing emits shifted", async () => {
    const onChange = vi.fn();
    const view = await render(
      <TrickyTimePicker
        resolved={NONEXISTENT_RESOLVE}
        date={NONEXISTENT_DATE}
        time={NONEXISTENT_TIME}
        value={null}
        onChange={onChange}
      />
    );

    expect(view.getByText(TRICKY_TIME_NONEXISTENT_HEADING)).toBeTruthy();
    expect(
      view.getByText(
        trickyTimeNonexistentBody(NONEXISTENT_DATE, NY_ZONE, NONEXISTENT_TIME)
      )
    ).toBeTruthy();

    // Exactly ONE option card — the shifted instant (server label verbatim).
    expect(view.getAllByRole("radio")).toHaveLength(1);
    const shifted = NONEXISTENT_RESOLVE.resolved.options[0]!;
    expect(view.getByText(shifted.label)).toBeTruthy();

    await userEvent.press(view.getByText(shifted.label));
    expect(onChange).toHaveBeenCalledWith("shifted");
  });
});

describe("TrickyTimePicker — normal classification", () => {
  it("renders nothing (no picker for normal civil times)", async () => {
    const view = await render(
      <TrickyTimePicker
        resolved={NORMAL_RESOLVE}
        date={AMBIGUOUS_DATE}
        time={AMBIGUOUS_TIME}
        value={null}
        onChange={() => undefined}
      />
    );
    expect(view.queryByText(TRICKY_TIME_AMBIGUOUS_HEADING)).toBeNull();
    expect(view.queryByText(TRICKY_TIME_NONEXISTENT_HEADING)).toBeNull();
    expect(view.queryByRole("radiogroup")).toBeNull();
  });
});
