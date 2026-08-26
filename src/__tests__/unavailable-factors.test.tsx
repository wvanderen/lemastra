import type { render as rtlRender } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  PROVISIONAL_LABEL,
  UNAVAILABLE_HEADING,
  factorCardText,
  provisionalCardText,
} from "@/components/chart/copy";
import type { FactorAvailability, ProvisionalFactor } from "@/lib/api-schemas";

// Unavailable + provisional factor tests (02-09 Task 2) — the D-10 cards.
//
// Contract under test (plan behavior rows + 02-UI-SPEC §"Trust-Boundary
// Display Rules"):
// - Unknown mode: section heading "Not available without a birth time" +
//   ONE reason-bearing card per unavailable_factors entry ("{Factor} —
//   {reason}") — never blank rows or placeholder dashes.
// - Provisional factors render as labeled cards ("Provisional" ·
//   "{factor} — {reason}") — the noon-reference Moon for Unknown, the
//   angles/houses entry for Approximate.
// - Factor ids map to display names (houses → Houses, ascendant_mc →
//   "Rising sign & Midheaven", …); reasons render VERBATIM from the
//   server payload — nothing is invented (D-10).
// - Empty/absent arrays render nothing (Timed/Rectified charts).
//
// Fixtures mirror the server contract exactly (charts.py
// derive_unavailable_factors — server-verbatim reasons).
//
// Test mechanics: RNTL v14 /pure under the RN vitest shim.

let render: typeof rtlRender;
let cleanup: () => Promise<void>;
let UnavailableFactors: typeof import("@/components/chart/unavailable-factors").UnavailableFactors;

beforeAll(async () => {
  ({ render, cleanup } = await import("@testing-library/react-native/pure"));
  ({ UnavailableFactors } = await import("@/components/chart/unavailable-factors"));
});

afterEach(async () => {
  await cleanup();
});

/** The exact Unknown-mode unavailable set the calculate endpoint derives. */
const UNKNOWN_UNAVAILABLE: FactorAvailability[] = [
  { factor: "houses", reason: "Requires a birth time" },
  { factor: "ascendant_mc", reason: "Requires a birth time" },
  { factor: "sect", reason: "Requires sunrise/sunset timing" },
  { factor: "lots", reason: "Lot of Fortune requires the Ascendant" },
];

/** The noon-reference Moon provisional entry (Unknown mode). */
const MOON_PROVISIONAL: ProvisionalFactor[] = [
  {
    factor: "moon",
    reason: "Moon moves ~13°/day; degree may shift without a known time",
  },
];

/** The Approximate angles/houses provisional entry. */
const APPROXIMATE_PROVISIONAL: ProvisionalFactor[] = [
  {
    factor: "angles_houses",
    reason: "Ascendant and house cusps are provisional when the birth time is approximate",
  },
];

describe("UnavailableFactors — D-10 unavailable section (Unknown mode)", () => {
  it("renders the heading and one reason-bearing card per entry, ids mapped to display names", async () => {
    const view = await render(
      <UnavailableFactors unavailable={UNKNOWN_UNAVAILABLE} provisional={MOON_PROVISIONAL} />
    );

    expect(view.getByText(UNAVAILABLE_HEADING)).toBeTruthy();
    expect(view.getAllByRole("listitem").length).toBeGreaterThanOrEqual(
      UNKNOWN_UNAVAILABLE.length
    );

    // One card per entry: "{Factor} — {reason}", reasons verbatim.
    for (const entry of UNKNOWN_UNAVAILABLE) {
      expect(view.getByText(factorCardText(entry.factor, entry.reason))).toBeTruthy();
    }

    // The display-name mapping (02-UI-SPEC examples) — not raw ids.
    expect(view.getByText("Houses — Requires a birth time")).toBeTruthy();
    expect(view.getByText("Rising sign & Midheaven — Requires a birth time")).toBeTruthy();
    expect(view.getByText("Sect — Requires sunrise/sunset timing")).toBeTruthy();
    expect(view.getByText("Lots — Lot of Fortune requires the Ascendant")).toBeTruthy();
  });

  it("renders no placeholder dashes or blank rows for the absent factors", async () => {
    const view = await render(
      <UnavailableFactors unavailable={UNKNOWN_UNAVAILABLE} provisional={MOON_PROVISIONAL} />
    );

    // Unavailable ≠ missing: explicit labeled cards, never dash placeholders.
    expect(view.queryByText("—")).toBeNull();
    expect(view.queryByText("–")).toBeNull();
    expect(view.queryByText("N/A")).toBeNull();
  });
});

describe("UnavailableFactors — provisional cards", () => {
  it("renders the noon-reference Moon as a Provisional-labeled card (Unknown mode)", async () => {
    const view = await render(
      <UnavailableFactors unavailable={UNKNOWN_UNAVAILABLE} provisional={MOON_PROVISIONAL} />
    );

    expect(view.getByText(PROVISIONAL_LABEL)).toBeTruthy();
    const moon = MOON_PROVISIONAL[0]!;
    expect(view.getByText(provisionalCardText(moon.factor, moon.reason))).toBeTruthy();
    expect(view.getByText("Moon — Moon moves ~13°/day; degree may shift without a known time")).toBeTruthy();
  });

  it("surfaces the angles/houses provisional entry for Approximate mode without an unavailable section", async () => {
    const view = await render(
      <UnavailableFactors unavailable={[]} provisional={APPROXIMATE_PROVISIONAL} />
    );

    expect(view.queryByText(UNAVAILABLE_HEADING)).toBeNull();
    const angles = APPROXIMATE_PROVISIONAL[0]!;
    expect(view.getByText(provisionalCardText(angles.factor, angles.reason))).toBeTruthy();
  });

  it("renders nothing when both arrays are empty or absent (Timed/Rectified)", async () => {
    const empty = await render(<UnavailableFactors unavailable={[]} provisional={[]} />);
    expect(empty.queryByText(UNAVAILABLE_HEADING)).toBeNull();
    expect(empty.queryByText(PROVISIONAL_LABEL)).toBeNull();

    const absent = await render(<UnavailableFactors />);
    expect(absent.queryByText(UNAVAILABLE_HEADING)).toBeNull();
    expect(absent.queryByText(PROVISIONAL_LABEL)).toBeNull();
  });
});

describe("UnavailableFactors — a11y sentences (T-02-36)", () => {
  it("carries a text sentence label on every factor card", async () => {
    const view = await render(
      <UnavailableFactors unavailable={UNKNOWN_UNAVAILABLE} provisional={MOON_PROVISIONAL} />
    );

    const labels = view
      .getAllByRole("listitem")
      .map((card) => card.props.accessibilityLabel as string | undefined)
      .filter((label): label is string => typeof label === "string");

    // Screen-reader users get the same factor + reason facts as the cards.
    expect(labels).toContain("Houses — Requires a birth time");
    expect(labels).toContain("Sect — Requires sunrise/sunset timing");
    expect(labels).toContain(
      "Provisional: Moon — Moon moves ~13°/day; degree may shift without a known time"
    );
  });
});
