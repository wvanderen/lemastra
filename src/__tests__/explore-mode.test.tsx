import type { render as rtlRender, within as rtlWithin } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  GLOSSARY,
  GLOSSARY_TERM_RETROGRADE,
  MODE_LABEL_SIMPLE,
  MODE_LABEL_TECHNICAL,
  MODE_OPTIONS,
  MODE_TOGGLE_HEADING,
  angleFactSentenceSimple,
  aspectFactSentenceSimple,
  aspectRowA11yLabelSimple,
  houseFactSentenceSimple,
  houseRowA11yLabelSimple,
  planetFactSentenceSimple,
  signFactSentenceSimple,
} from "@/components/chart/explore/copy";

// Explore-mode tests (04-06) — EVID-02's dual view: the D-05 global
// Simple ↔ Technical toggle, the D-08 tap-to-explain glossary, and the
// mode-keyed copy deck (label pairs + glossary definitions + Simple
// sentence templates). Task 1 pins the components and the deck; Task 2
// adds the surface-wiring suite (one flip changes everything together,
// same envelope, persisted preference).
//
// Contract under test (plan behavior rows + threat model):
// - ModeToggle: compact horizontal segmented radiogroup, two deck
//   options, accessibilityState checked on the active one, selection
//   conveyed by fill + 2px accent border + 600 weight (never color
//   alone — the confidence-control/OptionCard law, A11Y-02).
// - Glossary: a per-term chip that expands inline to its deck
//   definition; expanded state is STRUCTURAL (accessibilityState),
//   never glyph-alone (provenance-details law); definitions are static
//   deck strings — pure content, no envelope interpolation (D-08,
//   T-04-13).
// - Deck: MODE_LABEL constants + glossary map with the eight core
//   terms; mode-keyed sentence template pairs (Simple plain-language vs
//   Technical full-precision) with exact-string pins (T-02-34 deck law:
//   tests assert deck strings exactly, never paraphrase).
//
// Test mechanics: RNTL v14 /pure under the RN vitest shim — RNTL and
// RN-carrying components load dynamically in beforeAll (after the shim
// seeds require.cache); pure modules (the deck) import statically.
// userEvent (not bare fireEvent.press) on plain components — the full
// pressability sequence (03-05 law).

let render: typeof rtlRender;
let within: typeof rtlWithin;
let userEvent: typeof import("@testing-library/react-native/pure").userEvent;
let cleanup: () => Promise<void>;
let ModeToggle: typeof import("@/components/chart/explore/mode-toggle").ModeToggle;
let Glossary: typeof import("@/components/chart/explore/glossary").Glossary;
let Colors: typeof import("@/constants/theme").Colors;

beforeAll(async () => {
  ({ render, within, userEvent, cleanup } = await import("@testing-library/react-native/pure"));
  ({ ModeToggle } = await import("@/components/chart/explore/mode-toggle"));
  ({ Glossary } = await import("@/components/chart/explore/glossary"));
  ({ Colors } = await import("@/constants/theme"));
});

afterEach(async () => {
  await cleanup();
});

/** A rendered host element queryable by `within`. */
type Instance = Parameters<typeof rtlWithin>[0];

/** Flatten an RN style array/plain object for property assertions. */
function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean).map((entry) => flattenStyle(entry)));
  }
  if (style !== null && typeof style === "object") return style as Record<string, unknown>;
  return {};
}

// ---------------------------------------------------------------------------
// Deck — mode labels, toggle options, glossary inventory (exact pins)
// ---------------------------------------------------------------------------

describe("explore copy deck — mode labels + glossary (D-05/D-07/D-08)", () => {
  it("pins the exact mode label constants, the toggle heading, and the deck-ordered option pair", () => {
    expect(MODE_TOGGLE_HEADING).toBe("View mode");
    expect(MODE_LABEL_SIMPLE).toBe("Simple");
    expect(MODE_LABEL_TECHNICAL).toBe("Technical");
    // Deck-ordered pair — Simple first (the D-07 first-run default).
    expect(MODE_OPTIONS).toEqual([
      { value: "simple", label: "Simple" },
      { value: "technical", label: "Technical" },
    ]);
  });

  it("carries glossary definitions for at least the eight core terms as pure static content (T-04-13)", () => {
    // The envelope vocabulary the surfaces actually render: the five
    // calculator aspect families + orb + retrograde + ascendant.
    for (const term of [
      "conjunction",
      "sextile",
      "square",
      "trine",
      "opposition",
      "orb",
      "retrograde",
      "ascendant",
    ]) {
      expect(GLOSSARY, `glossary must define "${term}"`).toHaveProperty(term);
    }
    // Static-content law: every definition is a non-empty string free of
    // interpolation markers — definitions are deck copy, never a
    // template over envelope values, so they can never become
    // interpretation (D-08 / T-02-34 extension).
    for (const [term, definition] of Object.entries(GLOSSARY)) {
      expect(typeof definition, `"${term}" definition is a string`).toBe("string");
      expect(definition.trim().length, `"${term}" definition is non-empty`).toBeGreaterThan(10);
      expect(definition, `"${term}" carries no interpolation markers`).not.toMatch(/\{|\}|\$\{/);
    }
    // The deck-owned term key the placement rows chip in Simple mode.
    expect(GLOSSARY_TERM_RETROGRADE).toBe("retrograde");
    expect(GLOSSARY[GLOSSARY_TERM_RETROGRADE]).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Deck — mode-keyed sentence template pairs (Simple plain language,
// same facts, D-06 hidden fields omitted)
// ---------------------------------------------------------------------------

describe("explore copy deck — Simple sentence templates (mode-keyed pairs)", () => {
  it("composes the Simple planet sentence: plain vocabulary, same degree split, no absolute longitude", () => {
    expect(
      planetFactSentenceSimple({
        body: "Sun",
        sign: "Aries",
        degreeText: "26°39′",
        house: 4,
        motion: "direct",
        dignities: ["Exaltation"],
        absoluteDegree: 26.65,
      })
    ).toBe("Sun in Aries at 26°39′, in House 4, moving direct, Exaltation");
    // House-less placement (unknown-time): the segment simply never
    // renders (present-only law — never a dash).
    expect(
      planetFactSentenceSimple({
        body: "Moon",
        sign: "Aquarius",
        degreeText: "22°06′",
        motion: "direct",
        absoluteDegree: 322.1,
      })
    ).toBe("Moon in Aquarius at 22°06′, moving direct");
    // Retrograde speaks in plain form ("moving retrograde").
    expect(
      planetFactSentenceSimple({
        body: "Mercury",
        sign: "Sagittarius",
        degreeText: "29°00′",
        house: 1,
        motion: "retrograde",
        absoluteDegree: 269.0,
      })
    ).toBe("Mercury in Sagittarius at 29°00′, in House 1, moving retrograde");
  });

  it("composes the Simple aspect sentence: bodies + verbatim aspect name + exact state, no orb / applying / separating (D-06)", () => {
    expect(
      aspectFactSentenceSimple({
        bodyA: "Moon",
        aspect: "square",
        bodyB: "Uranus",
        orbDegrees: 0.3,
        applying: true,
        exact: false,
      })
    ).toBe("Moon square Uranus, Not exact");
    expect(
      aspectFactSentenceSimple({
        bodyA: "Venus",
        aspect: "trine",
        bodyB: "Moon",
        orbDegrees: 0.4,
        applying: true,
        exact: true,
      })
    ).toBe("Venus trine Moon, Exact");
  });

  it("composes the Simple house / sign / angle panel sentences in plain vocabulary", () => {
    expect(
      houseFactSentenceSimple({
        house: 8,
        cuspSign: "Cancer",
        cuspDegreeText: "22°24′",
        bodies: ["Moon"],
      })
    ).toBe("House 8 starts in Cancer at 22°24′, In this house: Moon");
    expect(signFactSentenceSimple({ sign: "Taurus", bodies: ["Jupiter"] })).toBe(
      "Taurus — In this sign: Jupiter"
    );
    expect(signFactSentenceSimple({ sign: "Libra", bodies: [] })).toBe("Libra");
    expect(angleFactSentenceSimple({ which: "asc", sign: "Sagittarius", degreeText: "14°15′" })).toBe(
      "Ascendant in Sagittarius at 14°15′"
    );
  });

  it("composes the Simple row a11y sentences — house avoids 'cusp', aspect drops orb / applying / separating", () => {
    expect(houseRowA11yLabelSimple({ house: 1, cuspSign: "Sagittarius", degrees: 14, minutes: 15 })).toBe(
      "House 1 starts in Sagittarius, 14 degrees 15 minutes"
    );
    expect(
      aspectRowA11yLabelSimple({
        bodyA: "Moon",
        aspect: "square",
        bodyB: "Uranus",
        orbDegrees: 0.3,
        applying: true,
        exact: false,
      })
    ).toBe("Moon square Uranus, Not exact");
  });
});

// ---------------------------------------------------------------------------
// ModeToggle — the D-05 segmented radiogroup (confidence-control analog)
// ---------------------------------------------------------------------------

describe("ModeToggle — segmented radiogroup (D-05)", () => {
  it("renders both deck options in one horizontal row with radiogroup semantics and per-option checked state", async () => {
    const onChange = vi.fn();
    const view = await render(<ModeToggle mode="simple" onChange={onChange} />);

    // View-level radiogroup + the deck heading.
    const group = view.getByTestId("explore-mode-toggle");
    expect(group.props.accessibilityRole).toBe("radiogroup");
    expect(view.getByText(MODE_TOGGLE_HEADING)).toBeTruthy();

    // Both options render as radios from the deck; ONLY the active one
    // is checked (both selected-state branches, one per option).
    const simple = view.getByTestId("mode-simple");
    const technical = view.getByTestId("mode-technical");
    expect(simple.props.accessibilityRole).toBe("radio");
    expect(technical.props.accessibilityRole).toBe("radio");
    expect(simple.props.accessibilityState).toEqual({ checked: true });
    expect(technical.props.accessibilityState).toEqual({ checked: false });
    expect(view.getByText(MODE_LABEL_SIMPLE)).toBeTruthy();
    expect(view.getByText(MODE_LABEL_TECHNICAL)).toBeTruthy();

    // The complement branch: technical active → checked flips.
    const flipped = await render(<ModeToggle mode="technical" onChange={onChange} />);
    expect(flipped.getByTestId("mode-technical").props.accessibilityState).toEqual({
      checked: true,
    });
    expect(flipped.getByTestId("mode-simple").props.accessibilityState).toEqual({
      checked: false,
    });
  });

  it("conveys the selected option through fill + 2px accent border + 600 weight — never color alone (A11Y-02)", async () => {
    const view = await render(<ModeToggle mode="simple" onChange={() => undefined} />);

    const simpleStyle = flattenStyle(view.getByTestId("mode-simple").props.style);
    expect(simpleStyle.backgroundColor).toBe(Colors.light.backgroundSelected);
    expect(simpleStyle.borderWidth).toBe(2);
    expect(simpleStyle.borderColor).toBe(Colors.light.accent);
    expect(
      flattenStyle(within(view.getByTestId("mode-simple")).getByText(MODE_LABEL_SIMPLE).props.style)
        .fontWeight
    ).toBe("600");

    const technicalStyle = flattenStyle(view.getByTestId("mode-technical").props.style);
    expect(technicalStyle.backgroundColor).toBe(Colors.light.backgroundElement);
    expect(technicalStyle.borderWidth).toBe(1);
    expect(technicalStyle.borderColor).not.toBe(Colors.light.accent);
    expect(
      flattenStyle(
        within(view.getByTestId("mode-technical")).getByText(MODE_LABEL_TECHNICAL).props.style
      ).fontWeight
    ).not.toBe("600");
  });

  it("emits the pressed segment's mode value (controlled value/onChange)", async () => {
    const onChange = vi.fn();
    const view = await render(<ModeToggle mode="simple" onChange={onChange} />);

    await userEvent.press(view.getByTestId("mode-technical"));
    expect(onChange).toHaveBeenCalledWith("technical");
    await userEvent.press(view.getByTestId("mode-simple"));
    expect(onChange).toHaveBeenCalledWith("simple");
  });
});

// ---------------------------------------------------------------------------
// Glossary — the D-08 per-term disclosure (provenance-details analog)
// ---------------------------------------------------------------------------

describe("Glossary — tap-to-explain term chip (D-08)", () => {
  it("expands inline to the exact deck definition and collapses again — expanded state is structural", async () => {
    const view = await render(<Glossary term="trine" />);
    const chip = view.getByTestId("glossary-trine");

    // Collapsed by default: definition hidden, state structural.
    expect(chip.props.accessibilityRole).toBe("button");
    expect(chip.props.accessibilityState).toEqual({ expanded: false });
    expect(view.queryByText(GLOSSARY.trine!)).toBeNull();

    // Expand: the definition renders as the EXACT deck string.
    await userEvent.press(chip);
    expect(view.getByTestId("glossary-trine").props.accessibilityState).toEqual({
      expanded: true,
    });
    expect(view.getByText(GLOSSARY.trine!)).toBeTruthy();

    // Press again → collapses back.
    await userEvent.press(view.getByTestId("glossary-trine"));
    expect(view.getByTestId("glossary-trine").props.accessibilityState).toEqual({
      expanded: false,
    });
    expect(view.queryByText(GLOSSARY.trine!)).toBeNull();
  });

  it("renders nothing for a term the deck does not define — never a broken affordance", async () => {
    const view = await render(<Glossary term="quintile" />);
    expect(view.queryByTestId("glossary-quintile")).toBeNull();
  });
});
