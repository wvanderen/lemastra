import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { CalculateProvenance, Confidence } from "@/lib/api-schemas";

import {
  ASSUMPTIONS_ADJUST_ACTION,
  ASSUMPTIONS_APPROXIMATE_CAVEAT,
  ASSUMPTIONS_LABEL,
  assumptionsValue,
} from "./copy";

/**
 * D-12 compact assumptions card — the always-visible one-line summary of
 * what the calculation assumed (house system, zodiac, ephemeris, orb
 * policy), with the "Adjust & recalculate" action back to /birth's
 * advanced control. Full provenance stays one expansion away
 * (ProvenanceDetails) — progressive disclosure per the audience
 * constraint.
 *
 * Approximate confidence appends the provisional angles/houses caveat
 * (server `provisional_factors` marks the same fact; this is the
 * copy-deck phrasing keyed off the envelope's confidence).
 */

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

export type AssumptionsLineProps = {
  /** CALC-03 provenance block (house/zodiac/ephemeris/orb fields). */
  provenance: CalculateProvenance;
  /** Envelope confidence — drives the Approximate caveat. */
  confidence: Confidence;
  /** Invoked by "Adjust & recalculate" (result screen wires the /birth deep-link). */
  onAdjust: () => void;
};

export function AssumptionsLine({ provenance, confidence, onAdjust }: AssumptionsLineProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      accessible
      accessibilityLabel={`${ASSUMPTIONS_LABEL}: ${assumptionsValue(
        provenance.house_system,
        provenance.zodiac_mode,
        provenance.ephemeris_mode,
        provenance.orb_policy
      )}`}
    >
      <ThemedText type="small" style={styles.label}>
        {ASSUMPTIONS_LABEL}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {assumptionsValue(
          provenance.house_system,
          provenance.zodiac_mode,
          provenance.ephemeris_mode,
          provenance.orb_policy
        )}
      </ThemedText>
      {confidence === "Approximate" ? (
        <ThemedText type="small" themeColor="textSecondary">
          {ASSUMPTIONS_APPROXIMATE_CAVEAT}
        </ThemedText>
      ) : null}
      <Pressable
        accessibilityRole="link"
        hitSlop={Spacing.two}
        onPress={onAdjust}
        style={styles.adjustAction}
      >
        <ThemedText type="linkPrimary">{ASSUMPTIONS_ADJUST_ACTION}</ThemedText>
      </Pressable>
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
  adjustAction: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
});
