import { StyleSheet, View } from "react-native";

import { provisionalMarkerA11yPhrase } from "@/components/chart/evidence-vocabulary/phrases";
import { formatDegreeMinutes } from "@/components/chart/placement-list";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { CalculateResponse } from "@/lib/api-schemas";
import { SIGN_ORDER } from "@/lib/chart-wheel/glyphs";
import type { FactorRef } from "@/lib/chart-wheel/geometry";

import {
  FACT_PANEL_IDLE,
  FACT_PANEL_LABEL,
  angleFactSentence,
  aspectFactSentence,
  factPanelA11yLabel,
  houseFactSentence,
  planetFactSentence,
  signFactSentence,
} from "./copy";

/**
 * D-09 inline fact panel — the exact-facts half of wheel tap-selection.
 *
 * A controlled pure-render component (no queries, no gestures): the
 * explore route owns ONE shared selection (D-10) and this panel renders
 * that selection's exact envelope facts adjacent to the wheel. Degrees
 * flow through placement-list's ONE split (`formatDegreeMinutes`,
 * A-UI-4): the rendered sentence is simultaneously the visible text and
 * the accessibilityLabel, so visual and spoken facts cannot drift.
 *
 * Live region (A11Y-01): the root carries accessibilityLiveRegion
 * "polite" (Android) and aria-live "polite" (alias), so selection
 * changes announce without stealing focus.
 *
 * Present-only law (D-10): absent envelope fields produce no segment,
 * no dash — the templates filter undefined segments (deck idiom).
 * Unknown-time honesty: house/angle selections resolve to nothing when
 * the envelope carries no cusps/angles (such factors have no wheel
 * geometry either — the panel shows the idle hint, never invented
 * facts).
 *
 * Card treatment: Phase-1 law (radius 8, hairline border, Spacing.three)
 * on the secondary surface; ThemedText/theme tokens only.
 */

export type FactPanelProps = {
  /** The shared wheel selection (D-10) — null renders the idle hint. */
  selection: FactorRef | null;
  /** The already-zod-parsed envelope (repository edge — parse-then-trust). */
  envelope: CalculateResponse;
};

/** A resolved selection: the fact sentence plus its D-16 note when provisional. */
interface ResolvedFact {
  sentence: string;
  provisionalNote?: string;
}

/**
 * Map an absolute longitude to its zodiac sign + within-sign degree —
 * the same coordinate partition the wheel's sign ring draws with
 * (SIGN_ORDER at 30° boundaries). Pure positioning math over an
 * EMITTED longitude (the calculator's own sign/degree convention);
 * never a recalculated astrological fact.
 */
function signAndDegree(longitude: number): { sign: string; degree: number } {
  const wrapped = ((longitude % 360) + 360) % 360;
  const index = Math.floor(wrapped / 30) % SIGN_ORDER.length;
  const sign = SIGN_ORDER[index]!;
  return { sign, degree: wrapped - index * 30 };
}

/** Provisional match for a selection: server factor ids, never derived. */
function provisionalFor(
  selection: FactorRef,
  envelope: CalculateResponse
): { id: string; reason: string } | undefined {
  const id =
    selection.kind === "planet"
      ? selection.body.toLowerCase()
      : selection.kind === "angle" || selection.kind === "house"
        ? "angles_houses"
        : null;
  if (id === null) return undefined;
  const match = (envelope.provisional_factors ?? []).find((factor) => factor.factor === id);
  return match === undefined ? undefined : { id: match.factor, reason: match.reason };
}

/** Resolve a selection to its exact envelope facts, or null when unsupported. */
function resolveFact(selection: FactorRef, envelope: CalculateResponse): ResolvedFact | null {
  const chart = envelope.chart_data;

  let sentence: string | undefined;
  switch (selection.kind) {
    case "planet": {
      const placement = chart.placements.find((p) => p.body === selection.body);
      if (placement === undefined) return null;
      sentence = planetFactSentence({
        body: placement.body,
        sign: placement.sign,
        degreeText: formatDegreeMinutes(placement.degree),
        house: placement.house,
        motion: placement.motion,
        dignities: placement.dignity,
        absoluteDegree: placement.absolute_degree,
      });
      break;
    }
    case "angle": {
      // asc/mc render the emitted facts; dsc/ic render the same +180°
      // longitudes the wheel draws them at (geometry's angleMarkers).
      let position: { sign: string; degree: number } | undefined;
      if (selection.which === "asc" && chart.ascendant) {
        position = { sign: chart.ascendant.sign, degree: chart.ascendant.degree };
      } else if (selection.which === "mc" && chart.midheaven) {
        position = { sign: chart.midheaven.sign, degree: chart.midheaven.degree };
      } else if (selection.which === "dsc" && chart.ascendant) {
        position = signAndDegree((chart.ascendant.absolute_degree + 180) % 360);
      } else if (selection.which === "ic" && chart.midheaven) {
        position = signAndDegree((chart.midheaven.absolute_degree + 180) % 360);
      }
      if (position === undefined) return null; // unknown-time: no angle facts
      sentence = angleFactSentence({
        which: selection.which,
        sign: position.sign,
        degreeText: formatDegreeMinutes(position.degree),
      });
      break;
    }
    case "house": {
      const cusp = chart.house_cusps?.find((c) => c.house === selection.house);
      if (cusp === undefined) return null; // unknown-time: no house facts
      const bodies = chart.placements
        .filter((p) => p.house === selection.house)
        .map((p) => p.body);
      sentence = houseFactSentence({
        house: cusp.house,
        cuspSign: cusp.sign,
        cuspDegreeText: formatDegreeMinutes(cusp.degree),
        bodies,
      });
      break;
    }
    case "sign": {
      const bodies = chart.placements.filter((p) => p.sign === selection.sign).map((p) => p.body);
      sentence = signFactSentence({ sign: selection.sign, bodies });
      break;
    }
    case "aspect": {
      const aspect = chart.aspects?.[selection.index];
      if (aspect === undefined) return null;
      sentence = aspectFactSentence({
        bodyA: aspect.body_a,
        aspect: aspect.aspect,
        bodyB: aspect.body_b,
        orbDegrees: aspect.orb_degrees,
        applying: aspect.applying,
        separating: aspect.separating,
        exact: aspect.exact,
      });
      break;
    }
  }

  if (sentence === undefined) return null;

  // D-16 text redundancy: a provisional-selected factor additionally
  // renders its reason through the 04-02 uncertainty phrasing.
  const provisional = provisionalFor(selection, envelope);
  const provisionalNote =
    provisional === undefined
      ? undefined
      : provisionalMarkerA11yPhrase({ factor: provisional.id, reason: provisional.reason });

  return provisionalNote === undefined ? { sentence } : { sentence, provisionalNote };
}

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

export function FactPanel({ selection, envelope }: FactPanelProps) {
  const theme = useTheme();
  const fact = selection === null ? null : resolveFact(selection, envelope);
  const a11yLabel =
    fact === null ? FACT_PANEL_IDLE : factPanelA11yLabel(fact.sentence, fact.provisionalNote);

  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      accessibilityLiveRegion="polite"
      aria-live="polite"
      accessible
      accessibilityLabel={a11yLabel}
      testID="fact-panel"
    >
      <ThemedText type="small" style={styles.label}>
        {FACT_PANEL_LABEL}
      </ThemedText>
      {fact === null ? (
        <ThemedText type="default">{FACT_PANEL_IDLE}</ThemedText>
      ) : (
        <ThemedText type="default">{fact.sentence}</ThemedText>
      )}
      {fact?.provisionalNote !== undefined ? (
        <ThemedText type="small" themeColor="textSecondary">
          {fact.provisionalNote}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  label: {
    fontWeight: "600",
  },
});
