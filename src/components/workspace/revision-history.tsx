import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { ChartRevisionSummary } from "@/lib/workspace/repository";
import { revisionHistoryEntries } from "@/lib/workspace/revision-diff";

import { HISTORY_HEADING, LATEST_CHIP, historyLine, historyRowA11yLabel } from "./copy";

/**
 * D-07 History list — prior revisions of a saved chart, one row per
 * revision: "{date} · {what changed}" (Label), the newest row alone
 * carrying the "Latest" chip. The newest row is marked and
 * NON-navigational (it is the version the saved detail already shows);
 * older rows are single-tap links emitting their revisionId through
 * `onOpenRevision` — navigation into the read-only /chart/revision view
 * only (prior revisions are visibly immutable, WORK-04).
 *
 * Renders ONLY when more than one revision exists — a single-revision
 * chart has no History to show (present-only section rule).
 *
 * Ordering and phrases arrive pre-derived from revisionHistoryEntries
 * (pure diff over stored inputs — this component never diffs, never
 * invents copy). Rows are ≥48dp with the Phase-2 card treatment; the chip
 * is decorative text inside the row's one accessible label (a11y
 * contract — no nested ambiguous targets).
 */

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

export type RevisionHistoryProps = {
  /** Revision summaries from the chart detail (any order — entries sort). */
  revisions: readonly ChartRevisionSummary[];
  /** Fired with the tapped older row's revisionId — the parent routes to /chart/revision. */
  onOpenRevision: (revisionId: string) => void;
  testID?: string;
};

export function RevisionHistory({ revisions, onOpenRevision, testID }: RevisionHistoryProps) {
  const theme = useTheme();

  if (revisions.length <= 1) return null;
  const entries = revisionHistoryEntries(revisions);

  return (
    <View style={styles.section} testID={testID}>
      <ThemedText type="default" accessibilityRole="header" style={styles.heading}>
        {HISTORY_HEADING}
      </ThemedText>
      <View role="list" accessible style={styles.list}>
        {entries.map((entry, index) => {
          const latest = index === 0;
          const label = historyRowA11yLabel(entry.date, entry.phrase, latest);
          return latest ? (
            // The newest row: marked, never a link (it IS the shown version).
            <View
              key={entry.revisionId}
              role="listitem"
              accessible
              accessibilityLabel={label}
              style={[styles.row, { backgroundColor: theme.backgroundElement }]}
            >
              <ThemedText type="small">{historyLine(entry.date, entry.phrase)}</ThemedText>
              <View
                style={[
                  styles.chip,
                  { backgroundColor: theme.backgroundElement, borderColor: HAIRLINE_BORDER_COLOR },
                ]}
              >
                <ThemedText type="small" themeColor="textSecondary">
                  {LATEST_CHIP}
                </ThemedText>
              </View>
            </View>
          ) : (
            // Older rows open the read-only earlier-version view.
            <Pressable
              key={entry.revisionId}
              role="listitem"
              accessible
              accessibilityLabel={label}
              onPress={() => onOpenRevision(entry.revisionId)}
              style={[styles.row, { backgroundColor: theme.backgroundElement }]}
            >
              <ThemedText type="small">{historyLine(entry.date, entry.phrase)}</ThemedText>
            </Pressable>
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
    minHeight: 48,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: Spacing.two,
    rowGap: Spacing.one,
  },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.one,
    alignSelf: "flex-start",
  },
});
