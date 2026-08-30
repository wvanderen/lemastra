import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  EVIDENCE_KINDS,
  type EvidenceKind,
  isRenderableEvidenceKind,
  renderableEvidenceKinds,
} from "@/components/chart/evidence-vocabulary/kinds";
import {
  ASPECT_STYLE,
  CALCULATED_TOKEN,
  DEFAULT_ASPECT_STYLE,
  EVIDENCE_KIND_TOKENS,
  INTERPRETATION_TOKEN,
  JUDGMENT_TOKEN,
  PROVISIONAL_MARKER,
  UNCERTAINTY_TOKEN,
  type AspectStyleToken,
} from "@/components/chart/evidence-vocabulary/tokens";
import {
  INTERPRETATION_NOT_RENDERED,
  INTERPRETATION_SECTION_LABEL,
  JUDGMENT_SECTION_LABEL,
  UNCERTAINTY_PROVISIONAL_LABEL,
  UNCERTAINTY_UNAVAILABLE_HEADING,
  calculatedFactPhrase,
  interpretationSectionA11yLabel,
  judgmentSectionA11yLabel,
  provisionalFactorPhrase,
  provisionalMarkerA11yPhrase,
  unavailableFactorPhrase,
} from "@/components/chart/evidence-vocabulary/phrases";

// Type-level D-15 enforcement (inert at runtime; checked by tsc --noEmit
// in CI alongside this suite).
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false;
type _EvidenceKindCoversAllFour = Expect<
  Equal<EvidenceKind, "calculated" | "judgment" | "interpretation" | "uncertainty">
>;

const MODULE_FILES = [
  "src/components/chart/evidence-vocabulary/kinds.ts",
  "src/components/chart/evidence-vocabulary/tokens.ts",
  "src/components/chart/evidence-vocabulary/phrases.ts",
] as const;

const STROKE_PATTERNS = ["solid", "dashed", "dotted"] as const;

describe("evidence-vocabulary kinds (D-14/D-15)", () => {
  it("defines all four evidence kinds, interpretation included", () => {
    expect(EVIDENCE_KINDS).toEqual([
      "calculated",
      "judgment",
      "interpretation",
      "uncertainty",
    ]);
  });

  it("keeps the interpretation kind OUT of renderableEvidenceKinds (D-15 seam)", () => {
    expect(renderableEvidenceKinds).toEqual(["calculated", "judgment", "uncertainty"]);
    expect(renderableEvidenceKinds).not.toContain("interpretation");
  });

  it("guards rendering through isRenderableEvidenceKind", () => {
    expect(isRenderableEvidenceKind("calculated")).toBe(true);
    expect(isRenderableEvidenceKind("judgment")).toBe(true);
    expect(isRenderableEvidenceKind("uncertainty")).toBe(true);
    // The Phase-6 seam: interpretation is a kind but never renderable yet.
    expect(isRenderableEvidenceKind("interpretation")).toBe(false);
  });
});

describe("evidence-vocabulary tokens (A11Y-02, D-16)", () => {
  it("styles all five envelope aspect families", () => {
    for (const family of [
      "conjunction",
      "sextile",
      "square",
      "trine",
      "opposition",
    ] as const) {
      expect(ASPECT_STYLE[family]).toBeDefined();
    }
  });

  it("gives every aspect style BOTH a strokePattern and a strokeWidth — never hue alone", () => {
    const entries = Object.entries(ASPECT_STYLE);
    expect(entries.length).toBeGreaterThanOrEqual(5);
    for (const [family, style] of entries as [string, AspectStyleToken][]) {
      expect(style, `${family} must carry strokePattern`).toHaveProperty(
        "strokePattern"
      );
      expect(STROKE_PATTERNS).toContain(style.strokePattern);
      expect(style, `${family} must carry strokeWidth`).toHaveProperty(
        "strokeWidth"
      );
      expect(typeof style.strokeWidth).toBe("number");
    }
    // The default fallback obeys the same law.
    expect(STROKE_PATTERNS).toContain(DEFAULT_ASPECT_STYLE.strokePattern);
    expect(typeof DEFAULT_ASPECT_STYLE.strokeWidth).toBe("number");
  });

  it("keeps every (strokePattern, strokeWidth) pair pairwise distinct", () => {
    const styles = Object.values(ASPECT_STYLE);
    for (let i = 0; i < styles.length; i += 1) {
      for (let j = i + 1; j < styles.length; j += 1) {
        const a = styles[i]!;
        const b = styles[j]!;
        const samePattern = a.strokePattern === b.strokePattern;
        const sameWidth = a.strokeWidth === b.strokeWidth;
        expect(
          samePattern && sameWidth,
          `families at ${i}/${j} share (${a.strokePattern}, ${a.strokeWidth})`
        ).toBe(false);
      }
    }
  });

  it("marks provisional factors with a dashed outline (D-16), with text redundancy", () => {
    expect(PROVISIONAL_MARKER.outline).toBe("dashed");
    expect(PROVISIONAL_MARKER.textRedundant).toBe(true);
    expect(UNCERTAINTY_TOKEN.outline).toBe("dashed");
  });

  it("renders calculated facts plain — no badge, no marker (D-13)", () => {
    expect(CALCULATED_TOKEN.marker).toBe("none");
  });

  it("styles judgment as a labeled section and interpretation as not rendered", () => {
    expect(JUDGMENT_TOKEN.treatment).toBe("labeled-section");
    expect(INTERPRETATION_TOKEN.rendered).toBe(false);
  });

  it("carries a token object for every evidence kind exactly once", () => {
    expect(Object.keys(EVIDENCE_KIND_TOKENS).sort()).toEqual(
      [...EVIDENCE_KINDS].sort()
    );
  });
});

describe("evidence-vocabulary phrases (copy-deck law)", () => {
  it("extends the AssumptionsLine section vocabulary exactly (D-13)", () => {
    expect(JUDGMENT_SECTION_LABEL).toBe("Assumptions");
    expect(judgmentSectionA11yLabel("Placidus houses · Tropical zodiac")).toBe(
      "Assumptions: Placidus houses · Tropical zodiac"
    );
  });

  it("extends the UnavailableFactors/provisional card vocabulary exactly", () => {
    expect(UNCERTAINTY_UNAVAILABLE_HEADING).toBe(
      "Not available without a birth time"
    );
    expect(UNCERTAINTY_PROVISIONAL_LABEL).toBe("Provisional");
    expect(unavailableFactorPhrase("moon", "Noon reference only")).toBe(
      "Moon — Noon reference only"
    );
    expect(provisionalFactorPhrase("angles_houses", "Approximate birth time")).toBe(
      "Angles & houses — Approximate birth time"
    );
  });

  it("falls back to the raw server factor id — never an invented label", () => {
    expect(unavailableFactorPhrase("newfactor", "Some reason")).toBe(
      "newfactor — Some reason"
    );
  });

  it("carries the D-16 text redundancy for the on-wheel dashed marker", () => {
    expect(provisionalMarkerA11yPhrase({ factor: "moon" })).toBe(
      "Provisional: Moon"
    );
    expect(
      provisionalMarkerA11yPhrase({
        factor: "moon",
        reason: "Noon reference only",
      })
    ).toBe("Provisional: Moon — Noon reference only");
  });

  it("composes calculated facts plain — label and value, no marker (D-13)", () => {
    expect(calculatedFactPhrase("Degree", "17°42′")).toBe("Degree: 17°42′");
  });

  it("defines interpretation phrasing with an explicit not-rendered marker (D-15)", () => {
    expect(INTERPRETATION_NOT_RENDERED).toBe(
      "interpretation:not-rendered-until-phase-6"
    );
    expect(INTERPRETATION_SECTION_LABEL).toBe("Interpretation");
    expect(interpretationSectionA11yLabel("Reading plan")).toBe(
      "Interpretation: Reading plan"
    );
  });

  it("never rewords server values — placeholders render verbatim", () => {
    const tricky = "1{2} · 100% — exact";
    expect(calculatedFactPhrase("Value", tricky)).toBe(`Value: ${tricky}`);
    expect(judgmentSectionA11yLabel(tricky)).toBe(`Assumptions: ${tricky}`);
    expect(unavailableFactorPhrase("moon", tricky)).toBe(`Moon — ${tricky}`);
    expect(provisionalMarkerA11yPhrase({ factor: "moon", reason: tricky })).toBe(
      `Provisional: Moon — ${tricky}`
    );
    expect(interpretationSectionA11yLabel(tricky)).toBe(
      `Interpretation: ${tricky}`
    );
  });
});

describe("evidence-vocabulary module purity", () => {
  it("imports no React, React Native, or Skia — plain-Node testable", () => {
    for (const file of MODULE_FILES) {
      const source = readFileSync(file, "utf8");
      expect(
        source,
        `${file} must not import react/react-native/skia`
      ).not.toMatch(/from\s+["'](react|react-native|@shopify\/)/);
    }
  });
});
