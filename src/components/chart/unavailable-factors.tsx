import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { FactorAvailability, ProvisionalFactor } from "@/lib/api-schemas";

import {
  PROVISIONAL_LABEL,
  UNAVAILABLE_HEADING,
  factorCardText,
  provisionalCardText,
} from "./copy";

/**
 * D-10 unavailable + provisional factor cards.
 *
 * Unavailable ≠ missing: for Unknown-time charts, every time-dependent
 * factor the calculator omitted renders as an explicit labeled card with
 * its server reason — never a blank row, placeholder dash, or invented
 * value. Provisional factors (the noon-reference Moon, approximate-time
 * angles/houses) render as "Provisional"-labeled cards keyed off the
 * server `provisional_factors` array — structured caveats, not uncertain
 * prose (02-UI-SPEC §"Trust-Boundary Display Rules").
 *
 * Renders nothing when both arrays are empty/absent (Timed/Rectified).
 */

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

export type UnavailableFactorsProps = {
  /** Time-dependent factors omitted for unknown birth times (D-10). */
  unavailable?: readonly FactorAvailability[];
  /** Factors computed but flagged provisional by the server. */
  provisional?: readonly ProvisionalFactor[];
};

export function UnavailableFactors({ unavailable, provisional }: UnavailableFactorsProps) {
  const theme = useTheme();

  const hasUnavailable = (unavailable?.length ?? 0) > 0;
  const hasProvisional = (provisional?.length ?? 0) > 0;
  if (!hasUnavailable && !hasProvisional) return null;

  return (
    <View style={styles.section}>
      {hasUnavailable ? (
        <>
          <ThemedText type="default" accessibilityRole="header" style={styles.heading}>
            {UNAVAILABLE_HEADING}
          </ThemedText>
          <View role="list" accessible style={styles.list}>
            {unavailable!.map((entry) => (
              <View
                key={entry.factor}
                style={[styles.card, { backgroundColor: theme.backgroundElement }]}
                role="listitem"
                accessible
                accessibilityLabel={factorCardText(entry.factor, entry.reason)}
              >
                <ThemedText type="default">
                  {factorCardText(entry.factor, entry.reason)}
                </ThemedText>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {hasProvisional ? (
        <View role="list" accessible style={styles.list}>
          {provisional!.map((entry) => (
            <View
              key={entry.factor}
              style={[styles.card, { backgroundColor: theme.backgroundElement }]}
              role="listitem"
              accessible
              accessibilityLabel={`${PROVISIONAL_LABEL}: ${provisionalCardText(entry.factor, entry.reason)}`}
            >
              <ThemedText type="small" style={styles.provisionalLabel}>
                {PROVISIONAL_LABEL}
              </ThemedText>
              <ThemedText type="default">
                {provisionalCardText(entry.factor, entry.reason)}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  heading: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  provisionalLabel: {
    fontWeight: "600",
  },
});
