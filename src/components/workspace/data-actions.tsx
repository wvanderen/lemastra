import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import {
  DELETE_CHART_CONFIRM,
  deleteChartActionHelper,
  EXPORT_CHART_DATA,
  EXPORT_CHART_HELPER,
  EXPORT_PENDING,
} from "./copy";

/**
 * Data-actions card (03-UI-SPEC §"/chart/saved" — the secondary card
 * at the END of the saved-chart detail): one row per chart-level
 * action — export (default-toned) and delete (error-toned).
 *
 * Destructive meaning never rides on color alone (a11y contract): the
 * delete row carries the word "Delete" AND its helper names the
 * cascade scope ("its {n} revision(s)"); the export helper names the
 * artifact ("full data and provenance"). Deletion itself is NEVER
 * triggered here — the row opens the shared DeleteConfirm modal
 * (D-14); no swipe-to-delete, no long-press shortcuts.
 *
 * Controlled component: the parent owns the export flow (pending +
 * capability/error states render beside this card) and the delete
 * confirmation lifecycle.
 */

export type DataActionsProps = {
  /** The chart's revision count — named in the delete helper (cascade scope). */
  revisionCount: number;
  /** Fired when the export row is pressed (not while pending). */
  onExport: () => void;
  /** True while the parent's export is in flight — disables the row, shows the pending state. */
  exportPending: boolean;
  /** Fired when the delete row is pressed — the parent opens DeleteConfirm. */
  onDelete: () => void;
  testID?: string;
};

export function DataActions({
  revisionCount,
  onExport,
  exportPending,
  onDelete,
  testID,
}: DataActionsProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      testID={testID}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: exportPending }}
        disabled={exportPending}
        onPress={onExport}
        style={styles.row}
        testID="data-actions-export"
      >
        <ThemedText type="default" style={styles.rowLabel}>
          {exportPending ? EXPORT_PENDING : EXPORT_CHART_DATA}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {EXPORT_CHART_HELPER}
        </ThemedText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onDelete}
        style={styles.row}
        testID="data-actions-delete"
      >
        <ThemedText type="default" style={[styles.rowLabel, { color: theme.error }]}>
          {DELETE_CHART_CONFIRM}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {deleteChartActionHelper(revisionCount)}
        </ThemedText>
      </Pressable>
    </View>
  );
}

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = 'rgba(128, 128, 128, 0.4)';

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    padding: Spacing.three,
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  row: {
    gap: Spacing.one,
    minHeight: 48,
    justifyContent: "center",
  },
  rowLabel: {
    fontWeight: '600',
  },
});
