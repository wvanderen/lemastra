import type { render as rtlRender } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  CALCULATION_DETAILS_HEADER,
  PROVENANCE_LABEL_CALCULATOR_CMD,
  PROVENANCE_LABEL_INPUT_REVISION,
  PROVENANCE_LABEL_PLACE_RESOLUTION,
  PROVENANCE_LABEL_SCHEMA,
  PROVENANCE_LABEL_SKILL_REVISION,
  PROVENANCE_LABEL_SWISSEPH,
  PROVENANCE_LABEL_TZDATA,
  placeResolutionValue,
} from "@/components/chart/copy";
import type { CalculateProvenance } from "@/lib/api-schemas";

// Provenance details tests (02-09 Task 2) — the D-12/CALC-03 expandable
// "Calculation details" disclosure.
//
// Contract under test (plan behavior rows + 02-UI-SPEC §"/chart/result"):
// - Collapsed by default — no mono rows render until the header is pressed
//   (progressive disclosure; the compact assumptions line is the always-
//   visible surface).
// - Expanding reveals ALL SEVEN key–value rows: Skill revision, Swiss
//   Ephemeris version, Timezone database, Schema, Input revision, Place
//   resolution (zone source + provider), Calculator command — the complete
//   version chain (CALC-03).
// - Values render verbatim from the provenance block (server data, mono).
//
// Test mechanics: RNTL v14 /pure under the RN vitest shim (same
// conventions as placement-list.test.tsx).

let render: typeof rtlRender;
let userEvent: typeof import("@testing-library/react-native/pure").userEvent;
let cleanup: () => Promise<void>;
let ProvenanceDetails: typeof import("@/components/chart/provenance-details").ProvenanceDetails;

beforeAll(async () => {
  ({ render, userEvent, cleanup } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ ProvenanceDetails } = await import("@/components/chart/provenance-details"));
});

afterEach(async () => {
  await cleanup();
});

/** Full CALC-03 provenance block — server field values verbatim (charts.py). */
const PROVENANCE: CalculateProvenance = {
  skill_revision: "660d992",
  swisseph_version: "2.10.03",
  tzdata_version: "2026.3",
  schema_version: "chart-input v1",
  ephemeris_mode: "Moshier (built-in)",
  house_system: "Whole Sign",
  zodiac_mode: "tropical",
  orb_policy:
    "birth_to_chart.py default orb table (luminaries 10°, personal 7°, Jupiter–Pluto 8°, Node 5°, angles 8°; sextile capped 6°)",
  input_revision: "abc123def456",
  calculator_cmd: "python tools/birth_to_chart.py --input <temp-json> --validate",
};

const PLACE_RESOLUTION = { zone_source: "google" } as const;

describe("ProvenanceDetails — collapsed by default (progressive disclosure)", () => {
  it("renders only the header before expanding — every row stays hidden", async () => {
    const view = await render(
      <ProvenanceDetails provenance={PROVENANCE} placeResolution={PLACE_RESOLUTION} />
    );

    expect(view.getByText(CALCULATION_DETAILS_HEADER)).toBeTruthy();
    // Collapsed: none of the seven values (nor their labels) render.
    expect(view.queryByText(PROVENANCE.skill_revision)).toBeNull();
    expect(view.queryByText(PROVENANCE.input_revision)).toBeNull();
    expect(view.queryByText(PROVENANCE.calculator_cmd)).toBeNull();
    expect(view.queryByText(PROVENANCE_LABEL_SKILL_REVISION)).toBeNull();
  });

  it("carries button semantics with the expanded state", async () => {
    const view = await render(
      <ProvenanceDetails provenance={PROVENANCE} placeResolution={PLACE_RESOLUTION} />
    );

    const toggle = view.getByTestId("provenance-details-toggle");
    expect(toggle.props.accessibilityRole).toBe("button");
    expect(toggle.props.accessibilityState?.expanded).toBe(false);
  });
});

describe("ProvenanceDetails — expanding reveals the full CALC-03 chain", () => {
  it("renders all seven mono key–value rows including skill_revision, input_revision, and place resolution", async () => {
    const view = await render(
      <ProvenanceDetails provenance={PROVENANCE} placeResolution={PLACE_RESOLUTION} />
    );

    await userEvent.press(view.getByTestId("provenance-details-toggle"));

    // All seven labels.
    for (const label of [
      PROVENANCE_LABEL_SKILL_REVISION,
      PROVENANCE_LABEL_SWISSEPH,
      PROVENANCE_LABEL_TZDATA,
      PROVENANCE_LABEL_SCHEMA,
      PROVENANCE_LABEL_INPUT_REVISION,
      PROVENANCE_LABEL_PLACE_RESOLUTION,
      PROVENANCE_LABEL_CALCULATOR_CMD,
    ]) {
      expect(view.getByText(label)).toBeTruthy();
    }

    // Every value verbatim from the provenance block (server data, mono).
    expect(view.getByText(PROVENANCE.skill_revision)).toBeTruthy();
    expect(view.getByText(PROVENANCE.swisseph_version)).toBeTruthy();
    expect(view.getByText(PROVENANCE.tzdata_version)).toBeTruthy();
    expect(view.getByText(PROVENANCE.schema_version)).toBeTruthy();
    expect(view.getByText(PROVENANCE.input_revision)).toBeTruthy();
    expect(view.getByText(PROVENANCE.calculator_cmd)).toBeTruthy();
    // Place resolution composes zone source + provider.
    expect(
      view.getByText(placeResolutionValue(PLACE_RESOLUTION.zone_source))
    ).toBeTruthy();
  });

  it("composes the place-resolution row from the manual zone source too", async () => {
    const view = await render(
      <ProvenanceDetails provenance={PROVENANCE} placeResolution={{ zone_source: "manual" }} />
    );

    await userEvent.press(view.getByTestId("provenance-details-toggle"));

    expect(view.getByText(placeResolutionValue("manual"))).toBeTruthy();
  });

  it("collapses again on a second press", async () => {
    const view = await render(
      <ProvenanceDetails provenance={PROVENANCE} placeResolution={PLACE_RESOLUTION} />
    );

    await userEvent.press(view.getByTestId("provenance-details-toggle"));
    await userEvent.press(view.getByTestId("provenance-details-toggle"));

    expect(view.queryByText(PROVENANCE.skill_revision)).toBeNull();
    expect(view.getByTestId("provenance-details-toggle").props.accessibilityState?.expanded).toBe(
      false
    );
  });
});
