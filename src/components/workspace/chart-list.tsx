import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { ChartListItem } from "@/lib/workspace/repository";

import {
  chartRowA11yLabel,
  chartRowIdentity,
  confidenceMarker,
  revisionsLabel,
} from "./copy";

/**
 * D-11 home list rows — one row per saved chart: label (Body/600),
 * identity line "{date} · {place}" (Label, textSecondary), and
 * present-only chips — a confidence marker only when confidence ≠
 * "Timed", a "{n} revisions" badge only when n > 1. Absent slots render
 * nothing at all: no dash, no blank placeholder (placement-list
 * present-only slot rule).
 *
 * Ordering is NOT this component's job: rows render in the exact order
 * received — the repository query owns updated_at-desc ordering (D-11).
 *
 * Rows are single-tap navigation Pressables (≥48dp) emitting the chartId
 * through `onOpen`; chips are decorative text inside the row's one
 * accessible label (a11y contract — no nested ambiguous targets). The
 * repository type is imported TYPE-ONLY: this component never touches
 * storage (D-03 seam).
 */

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

export type ChartListProps = {
  /** Saved-chart summary rows, most-recently-updated first (repository order). */
  items: readonly ChartListItem[];
  /** Fired with the tapped row's chartId — the parent navigates to /chart/saved. */
  onOpen: (chartId: string) => void;
};

export function ChartList({ items, onOpen }: ChartListProps) {
  const theme = useTheme();

  return (
    <View role="list" accessible style={styles.list}>
      {items.map((item) => {
        const marker = confidenceMarker(item.confidence);
        const revisions = item.revisionCount > 1 ? revisionsLabel(item.revisionCount) : null;
        return (
          <Pressable
            key={item.chartId}
            role="listitem"
            accessible
            accessibilityLabel={chartRowA11yLabel(item)}
            onPress={() => onOpen(item.chartId)}
            style={[styles.row, { backgroundColor: theme.backgroundElement }]}
          >
            <ThemedText type="default" style={styles.label}>
              {item.label}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {chartRowIdentity(item.date, item.placeLabel)}
            </ThemedText>
            {marker !== null || revisions !== null ? (
              <View style={styles.chips}>
                {marker !== null ? (
                  <View
                    style={[
                      styles.chip,
                      { backgroundColor: theme.backgroundElement, borderColor: HAIRLINE_BORDER_COLOR },
                    ]}
                  >
                    <ThemedText type="small" themeColor="textSecondary">
                      {marker}
                    </ThemedText>
                  </View>
                ) : null}
                {revisions !== null ? (
                  <View
                    style={[
                      styles.chip,
                      { backgroundColor: theme.backgroundElement, borderColor: HAIRLINE_BORDER_COLOR },
                    ]}
                  >
                    <ThemedText type="small" themeColor="textSecondary">
                      {revisions}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    padding: Spacing.three,
    minHeight: 48,
    gap: Spacing.one,
  },
  label: {
    fontWeight: "600",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: Spacing.two,
    rowGap: Spacing.one,
    marginTop: Spacing.one,
  },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.one,
    alignSelf: "flex-start",
  },
});
