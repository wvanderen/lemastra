import { readFileSync } from "node:fs";

import type { render as rtlRender, within as rtlWithin } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { PLACEMENTS_HEADING, placementA11yLabel } from "@/components/chart/copy";
import {
  ASPECTS_HEADING,
  HOUSES_HEADING,
  LOTS_HEADING,
  SECT_HEADING,
} from "@/components/chart/explore/copy";
import { calculateResponseSchema, type CalculateResponse } from "@/lib/api-schemas";

// EvidenceLists component tests (04-04 Task 1) — WHEEL-04's table half:
// the five structured evidence sections (placements / houses / aspects /
// lots / sect) rendered from the SAME stored envelope the wheel draws,
// with pressable rows feeding the shared FactorRef selection (D-10).
//
// Contract under test (plan behavior rows + 04-PATTERNS §evidence-lists):
// - Every section renders ONLY when its envelope key exists: the
//   Unknown-time fixture renders placements + aspects and NO houses/lots/
//   sect shells (Phase-2 D-10 honesty — absent keys ⇒ absent sections).
// - Rows are pressable and emit the exact FactorRef the wheel emits for
//   the same factor ({kind:'planet',body} / {kind:'house',house} /
//   {kind:'aspect',index}) — one shared selection vocabulary.
// - Present-only law: applying/separating render ONLY when the presence
//   flag exists (stationary contacts carry neither — calculator
//   contract); houses/dignities slots only when present; never a dash.
// - Lots + sect render at FULL envelope depth (formula, luminary, sect
//   mates, notes verbatim) — the D-06 Technical-only sections; 04-06
//   hides them in Simple mode.
// - Selected rows convey state through THREE channels (A11Y-02):
//   accessibilityState.selected + accent border + 600 label weight —
//   never color alone.
// - A11y sentences come from the copy decks (placementA11yLabel
//   unchanged; houseRowA11yLabel/aspectRowA11yLabel/lotRowA11yLabel/
//   sectCardA11yLabel from the explore deck) with the ONE degree split
//   feeding visual + spoken facts (A-UI-4). Exact-string pins below.
//
// Assertions derive from the frozen fixtures (envelope → rendered rows)
// per the 02-PATTERNS discipline. T-04-08: rows pin fixture values
// verbatim — no client-side recomputation of any astrological fact.
//
// Test mechanics: RNTL v14 /pure under the RN vitest shim — RNTL and
// RN-carrying components load dynamically in beforeAll (after the shim
// seeds require.cache); pure modules (decks, zod schema) import
// statically. EvidenceLists pulls no gesture/skia deps, so no facades.

let render: typeof rtlRender;
let within: typeof rtlWithin;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let cleanup: () => Promise<void>;
let EvidenceLists: typeof import("@/components/chart/explore/evidence-lists").EvidenceLists;
let Colors: typeof import("@/constants/theme").Colors;

beforeAll(async () => {
  ({ render, within, fireEvent, cleanup } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ EvidenceLists } = await import("@/components/chart/explore/evidence-lists"));
  ({ Colors } = await import("@/constants/theme"));
});

afterEach(async () => {
  await cleanup();
});

/** A rendered host element queryable by `within`. */
type Instance = Parameters<typeof rtlWithin>[0];

// ---------------------------------------------------------------------------
// Fixtures — the frozen server envelopes (repository-edge zod parse)
// ---------------------------------------------------------------------------

/** The Timed golden: every section present (houses, aspects, lots, sect). */
const timedEnvelope: CalculateResponse = calculateResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../test/fixtures/frozen-natal-envelope.json", import.meta.url), "utf8")
  )
);

/** The Unknown-time golden: placements + aspects only, absent sections. */
const unknownEnvelope: CalculateResponse = calculateResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../test/fixtures/unknown-time-envelope.json", import.meta.url), "utf8")
  )
);

/** Flatten an RN style array/plain object for property assertions. */
function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean).map((entry) => flattenStyle(entry)));
  }
  if (style !== null && typeof style === "object") return style as Record<string, unknown>;
  return {};
}

// ---------------------------------------------------------------------------
// Sections render the exact envelope fields (Timed fixture)
// ---------------------------------------------------------------------------

describe("EvidenceLists — five sections, full envelope depth", () => {
  it("renders every section heading and all pressable rows for the Timed fixture", async () => {
    const view = await render(
      <EvidenceLists envelope={timedEnvelope} selection={null} onSelect={() => undefined} />
    );

    for (const heading of [
      PLACEMENTS_HEADING,
      HOUSES_HEADING,
      ASPECTS_HEADING,
      LOTS_HEADING,
      SECT_HEADING,
    ]) {
      expect(view.getByText(heading)).toBeTruthy();
    }

    // Placements: all eight fixture bodies as rows (placement-list depth).
    expect(view.getByTestId("evidence-row-planet-Sun")).toBeTruthy();
    expect(view.getAllByTestId(/evidence-row-planet-/)).toHaveLength(8);
    const sunRow = view.getByTestId("evidence-row-planet-Sun");
    expect(within(sunRow).getByText("Sun")).toBeTruthy();
    expect(within(sunRow).getByText("Aries 26°39′")).toBeTruthy();
    expect(within(sunRow).getByText("House 4")).toBeTruthy();
    expect(within(sunRow).getByText("Direct")).toBeTruthy();
    expect(within(sunRow).getByText("Exaltation")).toBeTruthy();

    // Houses: all twelve cusps; house 1 cusp sign + D°MM′.
    expect(view.getAllByTestId(/evidence-row-house-/)).toHaveLength(12);
    const firstHouse = view.getByTestId("evidence-row-house-1");
    expect(within(firstHouse).getByText("House 1")).toBeTruthy();
    expect(within(firstHouse).getByText("Sagittarius 14°15′")).toBeTruthy();

    // Aspects: all four fixture aspects with orb + exact state.
    expect(view.getAllByTestId(/evidence-row-aspect-/)).toHaveLength(4);
    const firstAspect = view.getByTestId("evidence-row-aspect-0");
    expect(within(firstAspect).getByText("Moon square Uranus")).toBeTruthy();
    expect(within(firstAspect).getByText("Orb: 0.3°")).toBeTruthy();
    expect(within(firstAspect).getByText("Applying")).toBeTruthy();
    expect(within(firstAspect).getByText("Not exact")).toBeTruthy();
    expect(within(view.getByTestId("evidence-row-aspect-1")).getByText("Separating")).toBeTruthy();

    // Lots: full D-06 Technical depth — name, position, formula verbatim.
    const fortune = view.getByTestId("evidence-row-lot-Lot of Fortune");
    expect(within(fortune).getByText("Lot of Fortune")).toBeTruthy();
    expect(within(fortune).getByText("Aries 10°06′")).toBeTruthy();
    expect(within(fortune).getByText("Ascendant + Moon − Sun (day chart)")).toBeTruthy();

    // Sect card: every envelope field, notes verbatim.
    expect(view.getByText("day chart")).toBeTruthy();
    expect(view.getByText("Luminary of sect: Sun")).toBeTruthy();
    expect(view.getByText("Sect mates: Saturn, Jupiter")).toBeTruthy();
    expect(
      view.getByText("Sun altitude +18° above the horizon at the birth instant — day chart.")
    ).toBeTruthy();
  });

  it("keeps lot rows and the sect card non-pressable — no FactorRef exists for them", async () => {
    const view = await render(
      <EvidenceLists envelope={timedEnvelope} selection={null} onSelect={() => undefined} />
    );

    // Lots + sect render as plain listitems; only planet/house/aspect
    // rows carry onPress (the FactorRef union's three list kinds).
    expect(view.getByTestId("evidence-row-lot-Lot of Fortune").props.onPress).toBeUndefined();
    const sectCard = view.getByTestId("evidence-section-sect");
    expect(sectCard.props.onPress).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Row press → the exact FactorRef (D-10 shared selection vocabulary)
// ---------------------------------------------------------------------------

describe("EvidenceLists — pressable rows emit the wheel's FactorRef", () => {
  it("emits {kind:'planet', body} / {kind:'house', house} / {kind:'aspect', index} on press", async () => {
    const onSelect = vi.fn();
    const view = await render(
      <EvidenceLists envelope={timedEnvelope} selection={null} onSelect={onSelect} />
    );

    fireEvent.press(view.getByTestId("evidence-row-planet-Sun"));
    fireEvent.press(view.getByTestId("evidence-row-house-3"));
    fireEvent.press(view.getByTestId("evidence-row-aspect-2"));

    expect(onSelect).toHaveBeenCalledTimes(3);
    expect(onSelect).toHaveBeenNthCalledWith(1, { kind: "planet", body: "Sun" });
    expect(onSelect).toHaveBeenNthCalledWith(2, { kind: "house", house: 3 });
    expect(onSelect).toHaveBeenNthCalledWith(3, { kind: "aspect", index: 2 });
  });
});

// ---------------------------------------------------------------------------
// A11y sentence contracts (deck-exact pins, A-UI-4)
// ---------------------------------------------------------------------------

describe("EvidenceLists — a11y sentences from the copy decks", () => {
  it("exposes the unchanged placement sentence plus the new deck row sentences", async () => {
    const view = await render(
      <EvidenceLists envelope={timedEnvelope} selection={null} onSelect={() => undefined} />
    );

    // Placements keep the Phase-2 sentence contract (placementA11yLabel).
    expect(view.getByTestId("evidence-row-planet-Sun").props.accessibilityLabel).toBe(
      placementA11yLabel({
        body: "Sun",
        sign: "Aries",
        degrees: 26,
        minutes: 39,
        house: 4,
        motion: "direct",
        dignities: ["Exaltation"],
      })
    );
    expect(view.getByTestId("evidence-row-planet-Sun").props.accessibilityLabel).toBe(
      "Sun in Aries, 26 degrees 39 minutes, House 4, Direct motion, Exaltation"
    );

    // Houses: "House {n} cusp in {sign}, {degree spoken}".
    expect(view.getByTestId("evidence-row-house-1").props.accessibilityLabel).toBe(
      "House 1 cusp in Sagittarius, 14 degrees 15 minutes"
    );

    // Aspects: "{a} {aspect} {b}, Orb {n} degrees[, Applying|Separating],
    // Exact|Not exact" — applying/separating spoken only when the
    // presence flag exists.
    expect(view.getByTestId("evidence-row-aspect-0").props.accessibilityLabel).toBe(
      "Moon square Uranus, Orb 0.3 degrees, Applying, Not exact"
    );
    expect(view.getByTestId("evidence-row-aspect-1").props.accessibilityLabel).toBe(
      "Sun square Saturn, Orb 2.05 degrees, Separating, Not exact"
    );

    // Lots: name, spoken position, formula verbatim.
    expect(view.getByTestId("evidence-row-lot-Lot of Fortune").props.accessibilityLabel).toBe(
      "Lot of Fortune in Aries, 10 degrees 6 minutes, Ascendant + Moon − Sun (day chart)"
    );

    // Sect card: every field in one sentence, notes verbatim.
    expect(view.getByTestId("evidence-section-sect").props.accessibilityLabel).toBe(
      "day chart, Luminary of sect: Sun, Sect mates: Saturn, Jupiter, " +
        "Sun altitude +18° above the horizon at the birth instant — day chart."
    );
  });
});

// ---------------------------------------------------------------------------
// Present-only law — applying/separating presence flags
// ---------------------------------------------------------------------------

describe("EvidenceLists — applying/separating render ONLY when the flag exists", () => {
  it("renders neither motion state for an aspect whose flags are absent (stationary contact)", async () => {
    // Fixture-derived variant: strip the presence flags from the first
    // aspect — the calculator omits both for stationary bodies/angle
    // contacts (api-schemas aspectSchema contract). The row must render
    // NEITHER state, never a dash (D-10 present-only law).
    const stationary = structuredClone(timedEnvelope);
    delete stationary.chart_data.aspects![0]!.applying;
    delete stationary.chart_data.aspects![0]!.separating;

    const view = await render(
      <EvidenceLists envelope={stationary} selection={null} onSelect={() => undefined} />
    );

    const row = view.getByTestId("evidence-row-aspect-0");
    expect(within(row).queryByText("Applying")).toBeNull();
    expect(within(row).queryByText("Separating")).toBeNull();
    // The always-present facts still render.
    expect(within(row).getByText("Moon square Uranus")).toBeTruthy();
    expect(within(row).getByText("Orb: 0.3°")).toBeTruthy();
    expect(within(row).getByText("Not exact")).toBeTruthy();
    // The flagged sibling aspect keeps its state.
    expect(within(view.getByTestId("evidence-row-aspect-1")).getByText("Separating")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Selected state — three channels, never color alone (A11Y-02)
// ---------------------------------------------------------------------------

describe("EvidenceLists — selected row state", () => {
  it("conveys selection through accessibilityState + accent border + 600 label weight", async () => {
    const view = await render(
      <EvidenceLists
        envelope={timedEnvelope}
        selection={{ kind: "planet", body: "Sun" }}
        onSelect={() => undefined}
      />
    );

    const sunRow = view.getByTestId("evidence-row-planet-Sun");
    expect(sunRow.props.accessibilityState).toEqual({ selected: true });

    // Unselected sibling reports selected:false (state is always present).
    expect(view.getByTestId("evidence-row-planet-Moon").props.accessibilityState).toEqual({
      selected: false,
    });

    // Accent 2px border (Colors.light.accent — useTheme resolves light).
    const sunStyle = flattenStyle(sunRow.props.style);
    expect(sunStyle.borderColor).toBe(Colors.light.accent);
    expect(sunStyle.borderWidth).toBe(2);

    // 600 weight on the selected row's degree fact (the label text is
    // already 600 by the placement-list convention).
    const degreeText = within(sunRow).getByText("Aries 26°39′");
    expect(flattenStyle(degreeText.props.style).fontWeight).toBe("600");
    const moonDegree = within(view.getByTestId("evidence-row-planet-Moon")).getByText(
      "Leo 12°30′"
    );
    expect(flattenStyle(moonDegree.props.style).fontWeight).not.toBe("600");

    // Cross-section selection: an aspect selection highlights the aspect row.
    const aspectView = await render(
      <EvidenceLists
        envelope={timedEnvelope}
        selection={{ kind: "aspect", index: 0 }}
        onSelect={() => undefined}
      />
    );
    expect(
      aspectView.getByTestId("evidence-row-aspect-0").props.accessibilityState
    ).toEqual({ selected: true });
    expect(
      aspectView.getByTestId("evidence-row-planet-Sun").props.accessibilityState
    ).toEqual({ selected: false });
  });
});

// ---------------------------------------------------------------------------
// Unknown-time honesty — absent envelope keys ⇒ absent sections
// ---------------------------------------------------------------------------

describe("EvidenceLists — unknown-time envelope", () => {
  it("renders placements + aspects and NO houses/lots/sect sections (not empty shells)", async () => {
    const view = await render(
      <EvidenceLists envelope={unknownEnvelope} selection={null} onSelect={() => undefined} />
    );

    expect(view.queryByTestId("evidence-section-houses")).toBeNull();
    expect(view.queryByTestId("evidence-section-lots")).toBeNull();
    expect(view.queryByTestId("evidence-section-sect")).toBeNull();
    expect(view.queryByText(HOUSES_HEADING)).toBeNull();
    expect(view.queryByText(LOTS_HEADING)).toBeNull();
    expect(view.queryByText(SECTS_HEADING)).toBeNull();

    // Placements still render (5 fixture bodies), houseless (D-10).
    expect(view.getAllByTestId(/evidence-row-planet-/)).toHaveLength(5);
    const moonRow = view.getByTestId("evidence-row-planet-Moon");
    expect(within(moonRow).queryByText(/House/)).toBeNull();
    expect(within(moonRow).getByText("Aquarius 22°06′")).toBeTruthy();

    // Aspects still render (2 fixture aspects).
    expect(view.getAllByTestId(/evidence-row-aspect-/)).toHaveLength(2);
    expect(within(view.getByTestId("evidence-row-aspect-0")).getByText("Orb: 4.5°")).toBeTruthy();
  });
});
