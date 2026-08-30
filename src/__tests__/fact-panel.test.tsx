import { readFileSync } from "node:fs";

import type { render as rtlRender } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  FACT_PANEL_IDLE,
  FACT_PANEL_LABEL,
} from "@/components/chart/explore/copy";
import { calculateResponseSchema } from "@/lib/api-schemas";
import type { FactorRef } from "@/lib/chart-wheel/geometry";

// FactPanel tests (04-03 Task 1) — the D-09 panel half of tap-selection:
// every FactorRef kind resolves to its EXACT envelope facts through the
// explore copy deck's sentence templates, with live-region a11y and the
// A-UI-4 law (accessibilityLabel equals the composed visible sentence —
// one degree split feeds both).
//
// Contract under test (plan behavior rows):
// - Planet: body, sign, D°MM′ via formatDegreeMinutes, house phrase when
//   present, motion, dignities when present, absolute degrees — every
//   field present-only (never a dash).
// - Angle: the deck's display names (Ascendant/Descendant/Midheaven/IC),
//   sign, D°MM′ — asc/mc from the envelope, dsc/ic from the same +180°
//   longitude the wheel draws them at.
// - House: number, cusp sign + degree, bodies placed in that house
//   (filtered from the same envelope placements).
// - Sign: sign name and the bodies in that sign.
// - Aspect: body_a, aspect name, body_b, orb value, applying/separating
//   when the flag is present, exact state.
// - Provisional-selected factor additionally renders its reason with the
//   04-02 uncertainty phrasing (D-16 text redundancy).
// - accessibilityLiveRegion="polite" (Android) + aria-live="polite" on the
//   panel root; unknown-time envelopes never render house/angle facts.
//
// Exact strings are LITERALS derived from the frozen fixtures (the deck
// pins; sentences never asserted through the templates that build them).
//
// Test mechanics: RNTL /pure dynamic-import law — the panel imports
// placement-list (react-native), so the component loads in beforeAll
// after the RN shim seeds require.cache (placement-list.test.tsx law).

// Fixtures load through the same parse-then-trust contract the app uses
// (repository edge, D-02 Phase 3).
const frozenEnvelope = calculateResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../test/fixtures/frozen-natal-envelope.json", import.meta.url), "utf8")
  )
);
const unknownEnvelope = calculateResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../test/fixtures/unknown-time-envelope.json", import.meta.url), "utf8")
  )
);

let render: typeof rtlRender;
let cleanup: () => Promise<void>;
let FactPanel: typeof import("@/components/chart/explore/fact-panel").FactPanel;

beforeAll(async () => {
  ({ render, cleanup } = await import("@testing-library/react-native/pure"));
  ({ FactPanel } = await import("@/components/chart/explore/fact-panel"));
});

afterEach(async () => {
  await cleanup();
});

/** The panel root (live region + a11y label live here). */
function panelRoot(view: Awaited<ReturnType<typeof render>>) {
  return view.getByTestId("fact-panel");
}

// ---------------------------------------------------------------------------
// Planet facts — every present field, present-only
// ---------------------------------------------------------------------------

describe("FactPanel — planet selection", () => {
  it("renders every present field exactly: body, sign + D°MM′, house, motion, dignities, absolute degrees", async () => {
    const selection: FactorRef = { kind: "planet", body: "Sun" };
    const view = await render(<FactPanel mode="technical" selection={selection} envelope={frozenEnvelope} />);

    expect(
      view.getByText("Sun in Aries 26°39′, House 4, Direct motion, Dignities: Exaltation, absolute 26.65°")
    ).toBeTruthy();
  });

  it("omits absent fields with no dash placeholder (no dignity segment when the placement carries none)", async () => {
    const selection: FactorRef = { kind: "planet", body: "Moon" };
    const view = await render(<FactPanel mode="technical" selection={selection} envelope={frozenEnvelope} />);

    expect(
      view.getByText("Moon in Leo 12°30′, House 8, Direct motion, absolute 142.5°")
    ).toBeTruthy();
    expect(view.queryByText(/Dignities/)).toBeNull();
    expect(view.queryByText("—")).toBeNull();
  });

  it("renders a house-less placement (unknown-time) with no house segment", async () => {
    const selection: FactorRef = { kind: "planet", body: "Moon" };
    const view = await render(<FactPanel mode="technical" selection={selection} envelope={unknownEnvelope} />);

    expect(
      view.getByText("Moon in Aquarius 22°06′, Direct motion, absolute 322.1°")
    ).toBeTruthy();
    expect(view.queryByText(/House/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Angle facts — deck display names; dsc/ic derived at the drawn longitude
// ---------------------------------------------------------------------------

describe("FactPanel — angle selection", () => {
  it("renders asc and mc from the envelope with the deck's display names", async () => {
    const asc = await render(
      <FactPanel mode="technical" selection={{ kind: "angle", which: "asc" }} envelope={frozenEnvelope} />
    );
    expect(asc.getByText("Ascendant in Sagittarius 14°15′")).toBeTruthy();

    const mc = await render(
      <FactPanel mode="technical" selection={{ kind: "angle", which: "mc" }} envelope={frozenEnvelope} />
    );
    expect(mc.getByText("Midheaven in Libra 0°30′")).toBeTruthy();
  });

  it("derives dsc and ic at the same +180° longitudes the wheel draws them at", async () => {
    const dsc = await render(
      <FactPanel mode="technical" selection={{ kind: "angle", which: "dsc" }} envelope={frozenEnvelope} />
    );
    expect(dsc.getByText("Descendant in Gemini 14°15′")).toBeTruthy();

    const ic = await render(
      <FactPanel mode="technical" selection={{ kind: "angle", which: "ic" }} envelope={frozenEnvelope} />
    );
    expect(ic.getByText("IC in Aries 0°30′")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// House + sign facts — bodies filtered from the same envelope placements
// ---------------------------------------------------------------------------

describe("FactPanel — house and sign selection", () => {
  it("renders house number, cusp sign + degree, and the bodies placed in that house", async () => {
    const house8 = await render(
      <FactPanel mode="technical" selection={{ kind: "house", house: 8 }} envelope={frozenEnvelope} />
    );
    expect(house8.getByText("House 8 — cusp Cancer 22°24′, Bodies: Moon")).toBeTruthy();

    const house4 = await render(
      <FactPanel mode="technical" selection={{ kind: "house", house: 4 }} envelope={frozenEnvelope} />
    );
    expect(house4.getByText("House 4 — cusp Aries 0°30′, Bodies: Sun")).toBeTruthy();
  });

  it("renders the sign name and the bodies in that sign", async () => {
    const taurus = await render(
      <FactPanel mode="technical" selection={{ kind: "sign", sign: "Taurus" }} envelope={frozenEnvelope} />
    );
    expect(taurus.getByText("Taurus — Bodies: Jupiter")).toBeTruthy();

    const emptySign = await render(
      <FactPanel mode="technical" selection={{ kind: "sign", sign: "Libra" }} envelope={frozenEnvelope} />
    );
    expect(emptySign.getByText("Libra")).toBeTruthy();
    expect(emptySign.queryByText(/Bodies/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Aspect facts — orb value, presence-flag motion state, exact state
// ---------------------------------------------------------------------------

describe("FactPanel — aspect selection", () => {
  it("renders body_a, aspect name, body_b, orb, applying when the flag is present, and the exact state", async () => {
    const applying = await render(
      <FactPanel mode="technical" selection={{ kind: "aspect", index: 0 }} envelope={frozenEnvelope} />
    );
    expect(applying.getByText("Moon square Uranus, Orb: 0.3°, Applying, Not exact")).toBeTruthy();
  });

  it("renders separating when that flag is present instead", async () => {
    const separating = await render(
      <FactPanel mode="technical" selection={{ kind: "aspect", index: 1 }} envelope={frozenEnvelope} />
    );
    expect(separating.getByText("Sun square Saturn, Orb: 2.05°, Separating, Not exact")).toBeTruthy();
    expect(separating.queryByText(/Applying/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// D-16 provisional text redundancy
// ---------------------------------------------------------------------------

describe("FactPanel — provisional factor (D-16 text redundancy)", () => {
  it("additionally renders the provisional reason with the uncertainty phrasing and composes it into the a11y label", async () => {
    const selection: FactorRef = { kind: "planet", body: "Moon" };
    const view = await render(<FactPanel mode="technical" selection={selection} envelope={unknownEnvelope} />);

    const sentence = "Moon in Aquarius 22°06′, Direct motion, absolute 322.1°";
    const note = "Provisional: Moon — Moon moves ~13°/day; position computed at the 12:00 noon reference.";
    expect(view.getByText(sentence)).toBeTruthy();
    expect(view.getByText(note)).toBeTruthy();

    // One composed label carries both the facts and the caveat.
    expect(panelRoot(view).props.accessibilityLabel).toBe(`${sentence} — ${note}`);
  });
});

// ---------------------------------------------------------------------------
// Live region + idle state + unknown-time honesty
// ---------------------------------------------------------------------------

describe("FactPanel — live region and idle state", () => {
  it("carries accessibilityLiveRegion polite and aria-live polite on the root; the a11y label equals the visible sentence", async () => {
    const view = await render(
      <FactPanel mode="technical" selection={{ kind: "planet", body: "Sun" }} envelope={frozenEnvelope} />
    );
    const root = panelRoot(view);
    expect(root.props.accessibilityLiveRegion).toBe("polite");
    expect(root.props["aria-live"]).toBe("polite");
    expect(root.props.accessibilityLabel).toBe(
      "Sun in Aries 26°39′, House 4, Direct motion, Dignities: Exaltation, absolute 26.65°"
    );
  });

  it("renders the deck's idle hint when nothing is selected", async () => {
    const view = await render(<FactPanel mode="technical" selection={null} envelope={frozenEnvelope} />);
    expect(view.getByText(FACT_PANEL_IDLE)).toBeTruthy();
    expect(view.getByText(FACT_PANEL_LABEL)).toBeTruthy();
  });

  it("never renders house or angle facts for an unknown-time envelope (unsupported kinds fall back to the idle hint)", async () => {
    const house = await render(
      <FactPanel mode="technical" selection={{ kind: "house", house: 1 }} envelope={unknownEnvelope} />
    );
    expect(house.getByText(FACT_PANEL_IDLE)).toBeTruthy();
    expect(house.queryByText(/House \d/)).toBeNull();

    const angle = await render(
      <FactPanel mode="technical" selection={{ kind: "angle", which: "asc" }} envelope={unknownEnvelope} />
    );
    expect(angle.queryByText(/Ascendant/)).toBeNull();
  });
});
