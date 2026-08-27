import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { labelSchema } from "@/lib/workspace/label";

import { CHART_NAME_LABEL, LABEL_FIELD_ERROR, RENAME_ACTION, RENAME_CANCEL, RENAME_SAVE } from "./copy";

/**
 * D-12 inline title rename — the Display title on /chart/saved swaps
 * to a validated TextInput (no modal; the birth.tsx validated-input
 * idiom, 03-PATTERNS analog).
 *
 * Validation (A-3-UI-4): the SAME trimmed 1–60 bound as the save
 * prompt, gated per keystroke via labelSchema.safeParse; the inline
 * error renders in a polite live region (Phase-2 field-error
 * precedent — never ErrorBanner, which is CALC-04-only). The
 * repository revalidates on write.
 *
 * The component owns ONLY the edit interaction; the parent performs
 * the rename (onCommit receives the TRIMMED validated label —
 * parse-then-emit) and refreshes the title + list via query
 * invalidation. Cancel restores the title and touches nothing.
 *
 * A-3-UI-8: trigger and confirm render in default text colors with
 * 600 weight — accent stays reserved for the primary CTA.
 */

export type RenameControlProps = {
  /** The chart's current label (the title while idle; the prefill when editing). */
  label: string;
  /** Fired with the trimmed validated label when "Save name" commits. */
  onCommit: (label: string) => void;
};

export function RenameControl({ label, onCommit }: RenameControlProps) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  if (!editing) {
    return (
      <View style={styles.titleRow}>
        <ThemedText type="subtitle" accessibilityRole="header" style={styles.title}>
          {label}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            // Prefill from the CURRENT label on every open — a
            // discarded draft never leaks into the next session.
            setDraft(label);
            setEditing(true);
          }}
          hitSlop={Spacing.two}
          style={styles.trigger}
          testID="rename-trigger"
        >
          <ThemedText type="small" style={styles.actionLabel}>
            {RENAME_ACTION}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  // Validation gates the save per keystroke (repository revalidates).
  const parsed = labelSchema.safeParse(draft);
  const saveDisabled = !parsed.success;

  return (
    <View style={styles.editBlock}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        accessibilityLabel={CHART_NAME_LABEL}
        autoFocus
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
        testID="rename-input"
      />
      {parsed.success ? null : (
        <ThemedText
          type="small"
          style={{ color: theme.error, fontWeight: "600" }}
          accessibilityLiveRegion="polite"
        >
          {LABEL_FIELD_ERROR}
        </ThemedText>
      )}
      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: saveDisabled }}
          disabled={saveDisabled}
          onPress={() => {
            // Emit the trimmed label the schema normalized; the parent
            // renames + invalidates (title refresh comes from the query).
            onCommit(labelSchema.parse(draft));
            setEditing(false);
          }}
          hitSlop={Spacing.two}
          style={styles.action}
          testID="rename-save"
        >
          <ThemedText type="small" style={styles.actionLabel}>
            {RENAME_SAVE}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setEditing(false)}
          hitSlop={Spacing.two}
          style={styles.action}
          testID="rename-cancel"
        >
          <ThemedText type="small" themeColor="textSecondary" style={styles.cancelLabel}>
            {RENAME_CANCEL}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    flexWrap: "wrap",
  },
  title: {
    flexShrink: 1,
  },
  // A-3-UI-8: default text color + 600 weight — never accent.
  actionLabel: {
    fontWeight: "600",
  },
  cancelLabel: {
    fontWeight: "600",
  },
  editBlock: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.four,
  },
  action: {
    minHeight: 44,
    justifyContent: "center",
  },
});
