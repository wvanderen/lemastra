import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { CalculateProvenance } from "@/lib/api-schemas";

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
} from "./copy";

/**
 * D-12/CALC-03 expandable "Calculation details" disclosure — the complete
 * version chain one expansion away from the always-visible assumptions
 * card (progressive disclosure per the audience constraint).
 *
 * Collapsed by default. Expanding reveals the seven Data-mono key–value
 * rows: skill revision, Swiss Ephemeris version, timezone database,
 * schema, input revision, place resolution (zone source + provider), and
 * the calculator command. Every value renders verbatim from the
 * provenance block — version/revision identifiers are non-secret by
 * construction (T-02-35) and are the facts that make a chart auditable.
 */

/** Zone-resolution facts the result screen carries for this row. */
export interface PlaceResolution {
  /** How the birth zone was resolved (resolve-time payload). */
  zone_source: "google" | "manual";
}

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

export type ProvenanceDetailsProps = {
  /** CALC-03 provenance block from the calculate envelope. */
  provenance: CalculateProvenance;
  /** Zone source (+ provider) for the place-resolution row. */
  placeResolution: PlaceResolution;
};

export function ProvenanceDetails({ provenance, placeResolution }: ProvenanceDetailsProps) {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();

  const rows: ReadonlyArray<{ label: string; value: string }> = [
    { label: PROVENANCE_LABEL_SKILL_REVISION, value: provenance.skill_revision },
    { label: PROVENANCE_LABEL_SWISSEPH, value: provenance.swisseph_version },
    { label: PROVENANCE_LABEL_TZDATA, value: provenance.tzdata_version },
    { label: PROVENANCE_LABEL_SCHEMA, value: provenance.schema_version },
    { label: PROVENANCE_LABEL_INPUT_REVISION, value: provenance.input_revision },
    {
      label: PROVENANCE_LABEL_PLACE_RESOLUTION,
      value: placeResolutionValue(placeResolution.zone_source),
    },
    { label: PROVENANCE_LABEL_CALCULATOR_CMD, value: provenance.calculator_cmd },
  ];

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={styles.header}
        testID="provenance-details-toggle"
      >
        <ThemedText type="default" style={styles.headerLabel}>
          {CALCULATION_DETAILS_HEADER}
        </ThemedText>
        {/* Status-marker glyph only — state is conveyed structurally by
            accessibilityState.expanded, never by the glyph alone. */}
        <ThemedText type="default" themeColor="textSecondary">
          {expanded ? "▴" : "▾"}
        </ThemedText>
      </Pressable>

      {expanded ? (
        <View
          style={[styles.card, { backgroundColor: theme.backgroundElement }]}
          testID="provenance-details-rows"
        >
          {rows.map((row) => (
            <View key={row.label} style={styles.row}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.rowLabel}>
                {row.label}
              </ThemedText>
              <ThemedText type="code">{row.value}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
    minHeight: 48,
  },
  headerLabel: {
    fontWeight: "600",
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    gap: Spacing.one,
  },
  rowLabel: {
    fontWeight: "600",
  },
});
