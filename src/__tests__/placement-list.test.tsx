import type { render as rtlRender, within as rtlWithin } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  ASSUMPTIONS_ADJUST_ACTION,
  ASSUMPTIONS_APPROXIMATE_CAVEAT,
  ASSUMPTIONS_LABEL,
  PLACEMENTS_HEADING,
  assumptionsValue,
  placementA11yLabel,
} from "@/components/chart/copy";
import type { Placement } from "@/lib/api-schemas";

// Placement list + assumptions card tests (02-09 Task 1) — the D-13
// structured placement rows and the D-12 compact assumptions card.
//
// Contract under test (plan behavior rows + 02-UI-SPEC §"/chart/result"):
// - Degree formatting D°MM′ with minutes ROUNDED (0.4375 → "0°26′",
//   24.5496 → "24°33′") and the 60-minute carry edge.
// - Rows render ONLY present fields: house slot and dignity column appear
//   when the data has them, never as dash placeholders (D-10 display rule).
// - Every row exposes the copy-deck a11y sentence (T-02-36) — same facts
//   as the visual layout, spoken.
// - Assumptions card: "{house_system} houses · {zodiac_mode} zodiac ·
//   {ephemeris_mode} ephemeris · {orb_policy}" + Adjust action; the
//   Approximate caveat appends only for Approximate confidence.
//
// Assertions derive from fixture data (envelope → rendered rows) per the
// 02-PATTERNS discipline; exact-string pins cover the copy templates.
//
// Test mechanics: RNTL v14 /pure under the RN vitest shim (same conventions
// as tricky-time-picker.test.tsx). chart/copy.ts is pure TS (static import);
// the components load dynamically in beforeAll after the shim seeds RN.

// Acquired in beforeAll (not static imports): RNTL requires react-native
// at import time, and the RN test shim only seeds require.cache when the
// setupFile has run — which happens after collection but before hooks.
let render: typeof rtlRender;
let within: typeof rtlWithin;
let userEvent: typeof import("@testing-library/react-native/pure").userEvent;
let cleanup: () => Promise<void>;
let PlacementList: typeof import("@/components/chart/placement-list").PlacementList;
let formatDegreeMinutes: typeof import("@/components/chart/placement-list").formatDegreeMinutes;
let AssumptionsLine: typeof import("@/components/chart/assumptions-line").AssumptionsLine;

beforeAll(async () => {
  ({ render, within, userEvent, cleanup } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ PlacementList, formatDegreeMinutes } = await import(
    "@/components/chart/placement-list"
  ));
  ({ AssumptionsLine } = await import("@/components/chart/assumptions-line"));
});

afterEach(async () => {
  await cleanup();
});

/** A rendered host element queryable by `within`. */
type Instance = Parameters<typeof rtlWithin>[0];

// ---------------------------------------------------------------------------
// Fixtures (server envelope shapes — 02-RESEARCH §"Output envelope")
// ---------------------------------------------------------------------------

/** Sun in Gemini 0°26′ — the UI-SPEC's exact worked example. */
const SUN_GEMINI: Placement = {
  body: "Sun",
  sign: "Gemini",
  degree: 0.4375,
  absolute_degree: 60.4375,
  motion: "direct",
  house: 10,
};

/** Moon in Cancer with an essential dignity (rendered only where present). */
const MOON_CANCER: Placement = {
  body: "Moon",
  sign: "Cancer",
  degree: 14.05,
  absolute_degree: 104.05,
  motion: "direct",
  house: 11,
  dignity: ["Domicile"],
};

/** Unknown-time placement — no house key at all (D-10). */
const MARS_LEO_NO_HOUSE: Placement = {
  body: "Mars",
  sign: "Leo",
  degree: 10.0,
  absolute_degree: 130.0,
  motion: "retrograde",
};

/** The server's documented orb policy (charts.py ORB_POLICY, verbatim). */
const ORB_POLICY =
  "birth_to_chart.py default orb table (luminaries 10°, personal 7°, Jupiter–Pluto 8°, Node 5°, angles 8°; sextile capped 6°)";

/** Full CALC-03 provenance block (fields the assumptions card consumes + the rest of the chain). */
const PROVENANCE = {
  skill_revision: "660d992",
  swisseph_version: "2.10.03",
  tzdata_version: "2026.3",
  schema_version: "chart-input v1",
  ephemeris_mode: "Moshier (built-in)",
  house_system: "Whole Sign",
  zodiac_mode: "tropical",
  orb_policy: ORB_POLICY,
  input_revision: "abc123def456",
  calculator_cmd: "python tools/birth_to_chart.py --input <temp-json> --validate",
} as const;

// ---------------------------------------------------------------------------
// formatDegreeMinutes — pure formatting table
// ---------------------------------------------------------------------------

describe("formatDegreeMinutes", () => {
  it.each([
    [0.4375, "0°26′"],
    [24.5496, "24°33′"],
    [5.09, "5°05′"],
    [10.0, "10°00′"],
    [0, "0°00′"],
    // 59.994 minutes rounds to 60 → carries into the next degree.
    [29.999, "30°00′"],
  ])("formats %s as %s", (degree, expected) => {
    expect(formatDegreeMinutes(degree)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// PlacementList — D-13 structured rows
// ---------------------------------------------------------------------------

describe("PlacementList — rows honor present-only fields", () => {
  it("renders the heading and every placement as a listitem with body, sign+degree, house phrase, and capitalized motion", async () => {
    const view = await render(
      <PlacementList placements={[SUN_GEMINI, MOON_CANCER]} />
    );

    expect(view.getByText(PLACEMENTS_HEADING)).toBeTruthy();
    expect(view.getAllByRole("listitem")).toHaveLength(2);

    const rows = view.getAllByRole("listitem");
    const sunRow = rows.find((row) => within(row).queryByText("Sun") !== null)!;
    const moonRow = rows.find((row) => within(row).queryByText("Moon") !== null)!;

    // The UI-SPEC worked example: Sun in Gemini 0°26′, House 10, Direct.
    expect(within(sunRow).getByText("Sun")).toBeTruthy();
    expect(within(sunRow).getByText("Gemini 0°26′")).toBeTruthy();
    expect(within(sunRow).getByText("House 10")).toBeTruthy();
    expect(within(sunRow).getByText("Direct")).toBeTruthy();

    // Second row carries its dignity (only where present).
    expect(within(moonRow).getByText("Cancer 14°03′")).toBeTruthy();
    expect(within(moonRow).getByText("Domicile")).toBeTruthy();
  });

  it("renders no dignity column or dash placeholder when dignities are absent", async () => {
    const view = await render(<PlacementList placements={[SUN_GEMINI]} />);

    const row = view.getByRole("listitem");
    expect(within(row).queryByText("Domicile")).toBeNull();
    // Never a placeholder dash (D-10 trust-boundary display rule).
    expect(within(row).queryByText("—")).toBeNull();
    expect(within(row).queryByText("–")).toBeNull();
    expect(within(row).queryByText("-")).toBeNull();
  });

  it("renders Unknown-mode placements (no house key) without a house slot and without crashing", async () => {
    const view = await render(<PlacementList placements={[MARS_LEO_NO_HOUSE]} />);

    const row = view.getByRole("listitem");
    expect(within(row).getByText("Mars")).toBeTruthy();
    expect(within(row).getByText("Leo 10°00′")).toBeTruthy();
    expect(within(row).getByText("Retrograde")).toBeTruthy();
    expect(within(row).queryByText(/House/)).toBeNull();
  });
});

describe("PlacementList — a11y sentences (T-02-36)", () => {
  it("exposes the copy-deck sentence per row, with the dignities suffix when present", async () => {
    const view = await render(
      <PlacementList placements={[SUN_GEMINI, MOON_CANCER, MARS_LEO_NO_HOUSE]} />
    );

    const labels = view
      .getAllByRole("listitem")
      .map((row) => row.props.accessibilityLabel as string);

    // "{body} in {sign}, {degree spoken}, {house phrase}, {motion} motion"
    expect(labels).toContain(
      placementA11yLabel({
        body: "Sun",
        sign: "Gemini",
        degrees: 0,
        minutes: 26,
        house: 10,
        motion: "direct",
      })
    );
    expect(labels).toContain("Sun in Gemini, 0 degrees 26 minutes, House 10, Direct motion");

    // (+ ", {dignities}" when present)
    expect(labels).toContain(
      "Moon in Cancer, 14 degrees 3 minutes, House 11, Direct motion, Domicile"
    );

    // Unknown mode: the house phrase is omitted, not spoken as a blank.
    expect(labels).toContain("Mars in Leo, 10 degrees 0 minutes, Retrograde motion");
  });
});

// ---------------------------------------------------------------------------
// AssumptionsLine — D-12 compact assumptions card
// ---------------------------------------------------------------------------

describe("AssumptionsLine — compact assumptions card", () => {
  it("renders the label and the composed value line (derived from the provenance fixture)", async () => {
    const view = await render(
      <AssumptionsLine provenance={PROVENANCE} confidence="Timed" onAdjust={() => undefined} />
    );

    expect(view.getByText(ASSUMPTIONS_LABEL)).toBeTruthy();
    // The value line derives from the same copy-deck template the exact-
    // string test pins below (derivation discipline: fixture → rendered).
    expect(
      view.getByText(
        assumptionsValue(
          PROVENANCE.house_system,
          PROVENANCE.zodiac_mode,
          PROVENANCE.ephemeris_mode,
          PROVENANCE.orb_policy
        )
      )
    ).toBeTruthy();
  });

  it("renders the exact assumptions value line for the documented provenance", async () => {
    const view = await render(
      <AssumptionsLine provenance={PROVENANCE} confidence="Timed" onAdjust={() => undefined} />
    );

    expect(
      view.getByText(
        `Whole Sign houses · tropical zodiac · Moshier (built-in) ephemeris · ${ORB_POLICY}`
      )
    ).toBeTruthy();
  });

  it("fires the Adjust & recalculate action", async () => {
    const onAdjust = vi.fn();
    const view = await render(
      <AssumptionsLine provenance={PROVENANCE} confidence="Timed" onAdjust={onAdjust} />
    );

    await userEvent.press(view.getByText(ASSUMPTIONS_ADJUST_ACTION));
    expect(onAdjust).toHaveBeenCalledTimes(1);
  });

  it("appends the provisional angles/houses caveat only for Approximate confidence", async () => {
    const approximate = await render(
      <AssumptionsLine provenance={PROVENANCE} confidence="Approximate" onAdjust={() => undefined} />
    );
    expect(approximate.getByText(ASSUMPTIONS_APPROXIMATE_CAVEAT)).toBeTruthy();

    const timed = await render(
      <AssumptionsLine provenance={PROVENANCE} confidence="Timed" onAdjust={() => undefined} />
    );
    expect(timed.queryByText(ASSUMPTIONS_APPROXIMATE_CAVEAT)).toBeNull();
  });
});
