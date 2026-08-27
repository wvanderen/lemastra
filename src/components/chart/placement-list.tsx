import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { Placement } from "@/lib/api-schemas";

import {
  PLACEMENTS_HEADING,
  housePhrase,
  motionLabel,
  placementA11yLabel,
} from "./copy";

/**
 * D-13 structured placement list — every calculated body as a row of
 * calculated facts (body, "{sign} {degree}", "House {n}", motion, dignity
 * where present). No wheel, no preview graphic, no interpretation.
 *
 * Display rules (trust-boundary):
 * - Each slot renders ONLY when the placement carries the data — absent
 *   house or dignity keys produce no column, no dash, no blank (D-10).
 * - Degrees render D°MM′ with minutes rounded (A-UI-4); the same split
 *   feeds the spoken a11y sentence so visual and spoken facts agree.
 * - Rows are cards on the secondary surface with the Phase-2 card
 *   treatment (radius 8, hairline border) and list/listitem semantics
 *   per the privacy.tsx pattern.
 */

/** Split a within-sign degree into whole degrees and rounded minutes. */
export function splitDegreeMinutes(degree: number): { degrees: number; minutes: number } {
  const degrees = Math.floor(degree);
  const minutes = Math.round((degree - degrees) * 60);
  // 59.5′+ rounds to 60′ — carry into the next whole degree.
  if (minutes === 60) return { degrees: degrees + 1, minutes: 0 };
  return { degrees, minutes };
}

/** Format a within-sign degree as D°MM′ (minutes rounded, zero-padded). */
export function formatDegreeMinutes(degree: number): string {
  const { degrees, minutes } = splitDegreeMinutes(degree);
  return `${degrees}°${String(minutes).padStart(2, "0")}′`;
}

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

export type PlacementListProps = {
  /** Calculated placements from the envelope (always present, D-10). */
  placements: readonly Placement[];
};

export function PlacementList({ placements }: PlacementListProps) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText type="default" accessibilityRole="header" style={styles.heading}>
        {PLACEMENTS_HEADING}
      </ThemedText>
      <View role="list" accessible style={styles.list}>
        {placements.map((placement) => {
          const { degrees, minutes } = splitDegreeMinutes(placement.degree);
          return (
            <View
              key={`${placement.body}-${placement.absolute_degree}`}
              style={[styles.row, { backgroundColor: theme.backgroundElement }]}
              role="listitem"
              accessible
              accessibilityLabel={placementA11yLabel({
                body: placement.body,
                sign: placement.sign,
                degrees,
                minutes,
                house: placement.house,
                motion: placement.motion,
                dignities: placement.dignity,
              })}
            >
              <ThemedText type="default" style={styles.body}>
                {placement.body}
              </ThemedText>
              <ThemedText type="default">
                {`${placement.sign} ${formatDegreeMinutes(placement.degree)}`}
              </ThemedText>
              {placement.house !== undefined ? (
                <ThemedText type="default">{housePhrase(placement.house)}</ThemedText>
              ) : null}
              <ThemedText type="default">{motionLabel(placement.motion)}</ThemedText>
              {/* Dignity renders ONLY where present — never a dash placeholder. */}
              {placement.dignity && placement.dignity.length > 0 ? (
                <ThemedText type="default">{placement.dignity.join(", ")}</ThemedText>
              ) : null}
            </View>
          );
        })}
      </View>
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
  row: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    padding: Spacing.three,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    columnGap: Spacing.two,
    rowGap: Spacing.one,
  },
  body: {
    fontWeight: "600",
  },
});
