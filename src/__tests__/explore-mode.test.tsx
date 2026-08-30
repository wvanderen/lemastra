import { readFileSync } from "node:fs";
import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  render as rtlRender,
  renderHook as rtlRenderHook,
  within as rtlWithin,
} from "@testing-library/react-native/pure";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { useExploreMode, EXPLORE_MODE_KEY } from "@/hooks/use-explore-mode";
import { calculateResponseSchema, type CalculateResponse } from "@/lib/api-schemas";
import { buildWheelGeometry, type WheelGeometry } from "@/lib/chart-wheel/geometry";
import type { ChartDetail } from "@/lib/workspace/repository";

import {
  APPLYING_LABEL,
  GLOSSARY,
  GLOSSARY_TERM_RETROGRADE,
  LOTS_HEADING,
  MODE_LABEL_SIMPLE,
  MODE_LABEL_TECHNICAL,
  MODE_OPTIONS,
  MODE_TOGGLE_HEADING,
  NOT_EXACT_ASPECT_LABEL,
  SECT_HEADING,
  SEPARATING_LABEL,
  angleFactSentenceSimple,
  aspectFactSentenceSimple,
  aspectRowA11yLabelSimple,
  houseFactSentenceSimple,
  houseRowA11yLabelSimple,
  planetFactSentenceSimple,
  signFactSentenceSimple,
} from "@/components/chart/explore/copy";

// Explore-mode tests (04-06) — EVID-02's dual view: the D-05 global
// Simple ↔ Technical toggle, the D-08 tap-to-explain glossary, the
// mode-keyed copy deck, and the surface wiring (one flip changes
// everything together, same envelope, persisted preference).
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
// - Surface (Task 2): useExploreMode wires ONE mode state passed as a
//   plain prop to WheelCanvas, EvidenceLists, and FactPanel (D-06);
//   Simple hides exactly the D-06 list (lots, sect, orb,
//   applying/separating) and swaps vocabulary; both modes render the
//   SAME fixture values (T-04-12 same-data-path); the preference
//   persists (D-07) and first-run defaults to Simple.
//
// Test mechanics: RNTL v14 /pure under the RN vitest shim — RNTL and
// RN-carrying components load dynamically in beforeAll (after the shim
// seeds require.cache); pure modules (the deck, geometry, schema)
// import statically. userEvent (not bare fireEvent.press) on PLAIN
// components — the full pressability sequence (03-05 law) — while the
// ROUTE-mounted toggle press uses fireEvent.press on the accessible
// host (the query-mounted-screen law).
//
// Test-order law (04-04): at most ONE state-updating interaction on a
// query-mounted screen per test FILE — the RN shim's facade swaps
// ScrollView identities per commit and drops later in-file acts. The
// flip test (the file's only route press) therefore runs LAST;
// component-level mode assertions render props-driven (no acts), and
// the hydration case pre-seeds storage instead of pressing.

// ---------------------------------------------------------------------------
// Per-file mocks (facade law — precedence over the config aliases)
// ---------------------------------------------------------------------------

// AsyncStorage is native-module-backed — in-memory Map (the
// use-explore-mode.test.ts seam); the surface's persistence assertions
// read this store directly.
const store = vi.hoisted(() => new Map<string, string>());

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  navigate: vi.fn(),
}));
const paramsState = vi.hoisted(() => ({ value: {} as Record<string, string | string[]> }));
const repository = vi.hoisted(() => ({
  getChartDetail: vi.fn(),
  getRevisionContent: vi.fn(),
  isWorkspaceStorageAvailable: vi.fn(),
}));
/** Captured WheelCanvas props — the wheel side of the mode wiring. */
const wheelProps = vi.hoisted(() => ({
  value: {} as { selection: unknown; mode?: unknown; onSelect: (factor: never) => void },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => Promise.resolve(store.get(key) ?? null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    },
  },
}));

vi.mock("expo-router", () => ({
  router: routerMock,
  useLocalSearchParams: () => paramsState.value,
}));

// The repository seam fake keeps the real typed-error class (03-05 law).
vi.mock("@/lib/workspace/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/workspace/repository")>();
  return {
    ...actual,
    getChartDetail: repository.getChartDetail,
    getRevisionContent: repository.getRevisionContent,
    isWorkspaceStorageAvailable: repository.isWorkspaceStorageAvailable,
  };
});

// Wheel facade (04-04 seam): captures the surface's mode/selection/
// onSelect wiring and renders a plain RN View marker — no skia/gesture
// DEPENDS on this file's assertions. The REAL module still loads
// (importOriginal spread) so WheelGraphics — the pure primitive tree —
// stays importable for the mode-label test below; its native imports
// resolve through the config facades (RNGH/reanimated/worklets/skia).
vi.mock("@/components/chart/explore/wheel-canvas", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/chart/explore/wheel-canvas")>();
  const { View } = await import("react-native");
  return {
    ...actual,
    WheelCanvas: (props: {
      selection: unknown;
      mode?: unknown;
      onSelect: (factor: never) => void;
    }) => {
      wheelProps.value = props;
      return <View testID="wheel-canvas" />;
    },
  };
});

// ---------------------------------------------------------------------------
// Fixtures + dynamic imports (RN shim law)
// ---------------------------------------------------------------------------

/** The Timed golden: every section present (houses, aspects, lots, sect). */
const timedEnvelope: CalculateResponse = calculateResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../test/fixtures/frozen-natal-envelope.json", import.meta.url), "utf8")
  )
);
const timedGeometry: WheelGeometry = buildWheelGeometry(timedEnvelope, { size: 720 });

function chartDetail(envelope: CalculateResponse): ChartDetail {
  return {
    chart: {
      chartId: "chart-1",
      label: "My saved chart",
      createdAt: new Date("2026-08-20T10:00:00Z"),
      updatedAt: new Date("2026-08-27T10:00:00Z"),
    },
    latest: {
      revisionId: "rev-2",
      inputRevision: "f40e2a1b3c4d",
      envelope,
      inputs: {} as ChartDetail["latest"]["inputs"],
      identity: {
        date: "1990-05-21",
        time: "14:32",
        label: "Lisbon, Portugal",
        zone_source: "google",
      },
      createdAt: new Date("2026-08-27T10:00:00Z"),
    },
    revisionCount: 2,
    revisions: [],
  };
}

let render: typeof rtlRender;
let renderHook: typeof rtlRenderHook;
let within: typeof rtlWithin;
let userEvent: typeof import("@testing-library/react-native/pure").userEvent;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let ModeToggle: typeof import("@/components/chart/explore/mode-toggle").ModeToggle;
let Glossary: typeof import("@/components/chart/explore/glossary").Glossary;
let FactPanel: typeof import("@/components/chart/explore/fact-panel").FactPanel;
let WheelGraphics: typeof import("@/components/chart/explore/wheel-canvas").WheelGraphics;
let ExploreScreen: typeof import("@/app/chart/explore").default;
let Colors: typeof import("@/constants/theme").Colors;
// Typed as the FACADE module — the vitest alias resolves the specifier
// to the recording facade (the real package types govern app code only).
type SkiaFacade = typeof import("../../scripts/vitest/skia-facade/index");
let skia: SkiaFacade;

beforeAll(async () => {
  ({ render, renderHook, within, userEvent, fireEvent, cleanup, act, waitFor } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ ModeToggle } = await import("@/components/chart/explore/mode-toggle"));
  ({ Glossary } = await import("@/components/chart/explore/glossary"));
  ({ FactPanel } = await import("@/components/chart/explore/fact-panel"));
  ({ WheelGraphics } = await import("@/components/chart/explore/wheel-canvas"));
  ({ default: ExploreScreen } = await import("@/app/chart/explore"));
  ({ Colors } = await import("@/constants/theme"));
  skia = (await import("@shopify/react-native-skia")) as unknown as SkiaFacade;
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
  paramsState.value = {};
  store.clear();
});

beforeEach(() => {
  repository.isWorkspaceStorageAvailable.mockReturnValue(true);
  skia.__clearRendered();
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

/** Fresh retry-off QueryClient wrapper (saved-chart-detail.test.tsx law). */
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
}

/** Render the explore route over the Timed fixture (repository faked). */
async function renderExploreRoute() {
  repository.getChartDetail.mockResolvedValue(chartDetail(timedEnvelope));
  paramsState.value = { id: "chart-1" };
  const { Wrapper } = makeWrapper();
  const view = await render(
    <Wrapper>
      <ExploreScreen />
    </Wrapper>
  );
  await act(async () => {});
  await waitFor(() => expect(view.getByTestId("wheel-canvas")).toBeTruthy());
  return view;
}

/** Degree-label texts currently rendered (the tiered layer, not glyphs). */
function degreeLabelTexts(): string[] {
  return skia
    .__getRendered()
    .filter((entry) => entry.type === "Text")
    .map((entry) => entry.props.text as string)
    .filter((text) => /^\d+°/.test(text));
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
    expect(
      angleFactSentenceSimple({ which: "asc", sign: "Sagittarius", degreeText: "14°15′" })
    ).toBe("Ascendant in Sagittarius at 14°15′");
  });

  it("composes the Simple row a11y sentences — house avoids 'cusp', aspect drops orb / applying / separating", () => {
    expect(
      houseRowA11yLabelSimple({ house: 1, cuspSign: "Sagittarius", degrees: 14, minutes: 15 })
    ).toBe("House 1 starts in Sagittarius, 14 degrees 15 minutes");
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

// ---------------------------------------------------------------------------
// FactPanel — mode-keyed sentences from the SAME envelope (D-06)
// ---------------------------------------------------------------------------

describe("FactPanel — mode-keyed sentences (D-06)", () => {
  it("Simple renders the plain-language templates: same facts, same degree split, no absolute/orb/flags", async () => {
    const sun = await render(
      <FactPanel
        mode="simple"
        selection={{ kind: "planet", body: "Sun" }}
        envelope={timedEnvelope}
      />
    );
    expect(
      sun.getByText("Sun in Aries at 26°39′, in House 4, moving direct, Exaltation")
    ).toBeTruthy();
    // A-UI-4: the a11y label equals the visible Simple sentence.
    expect(sun.getByTestId("fact-panel").props.accessibilityLabel).toBe(
      "Sun in Aries at 26°39′, in House 4, moving direct, Exaltation"
    );
    // The Simple-hidden precision fields never render.
    expect(sun.queryByText(/absolute/)).toBeNull();

    const aspect = await render(
      <FactPanel
        mode="simple"
        selection={{ kind: "aspect", index: 0 }}
        envelope={timedEnvelope}
      />
    );
    expect(aspect.getByText("Moon square Uranus, Not exact")).toBeTruthy();
    expect(aspect.queryByText(/Orb/)).toBeNull();
    expect(aspect.queryByText(/Applying/)).toBeNull();
  });

  it("Technical keeps full precision — D°MM′, absolute degrees, orb, presence flags", async () => {
    const sun = await render(
      <FactPanel
        mode="technical"
        selection={{ kind: "planet", body: "Sun" }}
        envelope={timedEnvelope}
      />
    );
    expect(
      sun.getByText(
        "Sun in Aries 26°39′, House 4, Direct motion, Dignities: Exaltation, absolute 26.65°"
      )
    ).toBeTruthy();

    const aspect = await render(
      <FactPanel
        mode="technical"
        selection={{ kind: "aspect", index: 0 }}
        envelope={timedEnvelope}
      />
    );
    expect(aspect.getByText("Moon square Uranus, Orb: 0.3°, Applying, Not exact")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// WheelGraphics — mode filters the label set; tier governs density (D-06)
// ---------------------------------------------------------------------------

describe("WheelGraphics — mode filters the tiered label set (D-06)", () => {
  const colors = { text: "#111111", textSecondary: "#666666", accent: "#aa0000" };

  it("Simple renders glyphs only even at the high tier — degree labels are Technical-only", async () => {
    await render(
      <WheelGraphics
        geometry={timedGeometry}
        selection={null}
        tier="high"
        mode="simple"
        colors={colors}
      />
    );
    expect(degreeLabelTexts()).toHaveLength(0);
    // The glyph label set still renders (the wheel keeps its identity).
    const texts = skia
      .__getRendered()
      .filter((entry) => entry.type === "Text")
      .map((entry) => entry.props.text as string);
    expect(texts).toContain("☉"); // Sun

    await cleanup();
    skia.__clearRendered();
    await render(
      <WheelGraphics
        geometry={timedGeometry}
        selection={null}
        tier="high"
        mode="technical"
        colors={colors}
      />
    );
    // The same high tier renders the full D°MM′ set in Technical mode —
    // the mode filters, the tier governs density (they compose).
    expect(degreeLabelTexts()).toHaveLength(timedGeometry.planetAnchors.length);
    expect(degreeLabelTexts().every((label) => /^\d+°\d{2}′$/.test(label))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useExploreMode — the D-07 persistence seam the surface consumes
// ---------------------------------------------------------------------------

describe("useExploreMode — persistence round-trip (D-07)", () => {
  it("first render is Simple; set technical → a fresh render hydrates technical", async () => {
    const first = await renderHook(() => useExploreMode());
    expect(first.result.current.mode).toBe("simple");

    await act(async () => {
      first.result.current.setMode("technical");
    });
    expect(first.result.current.mode).toBe("technical");
    expect(store.get(EXPLORE_MODE_KEY)).toBe("technical");
    await cleanup();

    // A fresh instance reads the PERSISTED preference, not memory.
    const second = await renderHook(() => useExploreMode());
    await act(async () => {});
    expect(second.result.current.mode).toBe("technical");
  });
});

// ---------------------------------------------------------------------------
// Surface source wiring — ONE state, three prop consumers (D-06)
// ---------------------------------------------------------------------------

describe("explore surface — source wiring (D-06: one state, prop-passed)", () => {
  it("threads useExploreMode's mode into WheelCanvas, EvidenceLists, and FactPanel (one flip, three consumers)", () => {
    const source = readFileSync(new URL("../app/chart/explore.tsx", import.meta.url), "utf8");
    expect(source).toContain("useExploreMode()");
    expect(source).toContain("<ModeToggle mode={mode}");
    const modePropConsumers = source.match(/mode=\{mode\}/g) ?? [];
    expect(modePropConsumers.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Route — first-run default is Simple (D-07) + D-06 hidden list
// ---------------------------------------------------------------------------

describe("explore surface — first-run default Simple", () => {
  it("hides lots/sect sections and orb/applying/separating fields; Simple row vocabulary + glossary chips", async () => {
    const view = await renderExploreRoute();

    // The toggle reports Simple checked, Technical not.
    expect(view.getByTestId("mode-simple").props.accessibilityState).toEqual({ checked: true });
    expect(view.getByTestId("mode-technical").props.accessibilityState).toEqual({ checked: false });

    // D-06 hidden sections: absent, never empty shells.
    expect(view.queryByTestId("evidence-section-lots")).toBeNull();
    expect(view.queryByTestId("evidence-section-sect")).toBeNull();
    expect(view.queryByText(LOTS_HEADING)).toBeNull();
    expect(view.queryByText(SECT_HEADING)).toBeNull();

    // D-06 hidden fields on the aspect rows.
    expect(view.queryByText("Orb: 0.3°")).toBeNull();
    expect(view.queryByText(APPLYING_LABEL)).toBeNull();
    expect(view.queryByText(SEPARATING_LABEL)).toBeNull();
    // The exact state stays (not in the D-06 hidden list).
    expect(view.getAllByText(NOT_EXACT_ASPECT_LABEL).length).toBeGreaterThan(0);

    // Simple row vocabulary: the deck's plain-language sentences.
    expect(view.getByTestId("evidence-row-aspect-0").props.accessibilityLabel).toBe(
      "Moon square Uranus, Not exact"
    );
    expect(view.getByTestId("evidence-row-house-1").props.accessibilityLabel).toBe(
      "House 1 starts in Sagittarius, 14 degrees 15 minutes"
    );

    // D-08 glossary chips: the aspect term (fixture carries TWO square
    // aspects) + retrograde motion (Mercury AND Uranus) — one chip per
    // covered row, all rendered from the deck.
    expect(view.getAllByTestId("glossary-square")).toHaveLength(2);
    expect(view.getAllByTestId("glossary-retrograde")).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Route — stored technical hydrates (D-07)
// ---------------------------------------------------------------------------

describe("explore surface — stored technical preference hydrates", () => {
  it("renders every section and field at full depth with the Technical row sentences", async () => {
    store.set(EXPLORE_MODE_KEY, "technical");
    const view = await renderExploreRoute();

    await waitFor(() =>
      expect(view.getByTestId("mode-technical").props.accessibilityState).toEqual({
        checked: true,
      })
    );

    // The D-06 hidden list is revealed at full envelope depth.
    expect(view.getByTestId("evidence-section-lots")).toBeTruthy();
    expect(view.getByTestId("evidence-section-sect")).toBeTruthy();
    expect(view.getByText("Orb: 0.3°")).toBeTruthy();
    expect(within(view.getByTestId("evidence-row-aspect-0")).getByText(APPLYING_LABEL)).toBeTruthy();
    expect(view.getByTestId("evidence-row-aspect-0").props.accessibilityLabel).toBe(
      "Moon square Uranus, Orb 0.3 degrees, Applying, Not exact"
    );
    // Glossary chips are a Simple-only affordance.
    expect(view.queryByTestId("glossary-square")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Route — ONE flip changes everything together (D-05). Runs LAST: the
// file's single state-updating interaction on a query-mounted screen
// (the 04-04 test-order law — the RN shim's ScrollView identity churn
// drops later in-file acts after a press).
// ---------------------------------------------------------------------------

describe("explore surface — one flip changes everything together (D-05/D-06/D-07)", () => {
  it("reveals the hidden sections/fields, swaps row vocabulary, persists — same envelope throughout (T-04-12)", async () => {
    const view = await renderExploreRoute();

    // Before (Simple): the same-data-path anchors render.
    expect(view.getByText("Moon square Uranus")).toBeTruthy();
    expect(view.getByText("Sagittarius 14°15′")).toBeTruthy();
    expect(view.getAllByTestId(/evidence-row-planet-/)).toHaveLength(8);

    // THE flip — fireEvent on the accessible host (query-mounted law),
    // then flush the act queue (row-press precedent: the persist write
    // resolves on a microtask after the commit).
    fireEvent.press(view.getByTestId("mode-technical"));
    await act(async () => {});

    // After (Technical): toggle state, revealed sections + fields.
    expect(view.getByTestId("mode-technical").props.accessibilityState).toEqual({
      checked: true,
    });
    expect(view.getByTestId("mode-simple").props.accessibilityState).toEqual({ checked: false });
    expect(view.getByTestId("evidence-section-lots")).toBeTruthy();
    expect(view.getByTestId("evidence-section-sect")).toBeTruthy();
    expect(view.getByText("Orb: 0.3°")).toBeTruthy();
    expect(within(view.getByTestId("evidence-row-aspect-0")).getByText(APPLYING_LABEL)).toBeTruthy();
    // Row vocabulary swapped to the Technical sentences.
    expect(view.getByTestId("evidence-row-aspect-0").props.accessibilityLabel).toBe(
      "Moon square Uranus, Orb 0.3 degrees, Applying, Not exact"
    );
    expect(view.getByTestId("evidence-row-house-1").props.accessibilityLabel).toBe(
      "House 1 cusp in Sagittarius, 14 degrees 15 minutes"
    );
    // Glossary chips are gone in Technical.
    expect(view.queryByTestId("glossary-square")).toBeNull();

    // T-04-12 same-data-path: the underlying fixture values are
    // IDENTICAL across the flip — only vocabulary and field visibility
    // changed; no mode branch introduced new astrological content.
    expect(view.getByText("Moon square Uranus")).toBeTruthy();
    expect(view.getByText("Sagittarius 14°15′")).toBeTruthy();
    expect(view.getAllByTestId(/evidence-row-planet-/)).toHaveLength(8);

    // The wheel consumer received the same mode state (facade capture).
    expect(wheelProps.value.mode).toBe("technical");

    // D-07: the flip persisted to the versioned key.
    expect(store.get(EXPLORE_MODE_KEY)).toBe("technical");
  });
});
