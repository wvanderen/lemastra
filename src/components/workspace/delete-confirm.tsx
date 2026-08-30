import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import {
  DELETING,
  DELETE_ALL_BODY,
  DELETE_ALL_CONFIRM,
  DELETE_ALL_HEADING,
  DELETE_CANCEL,
  DELETE_CHART_CONFIRM,
  deleteChartBody,
  deleteChartHeading,
} from "./copy";

/**
 * Shared destructive-confirm dialog (03-UI-SPEC A-3-UI-2) — the ONE
 * dialog pattern behind both destructive flows:
 * - variant "chart" (D-14): 'Delete "{label}"?' + revision-count body,
 *   confirmed via the saved detail's delete action.
 * - variant "all" (D-15, 03-08): the delete-all copy, no interpolation.
 *
 * Destructive-dialog laws (03-UI-SPEC §"Interaction Contract"):
 * the confirm is the ONLY error-filled element and carries its full
 * action label; cancel is default-toned and always available; the
 * scope and permanence are restated in plain text so deletion is never
 * accidental (T-03-19). No swipe-to-delete or long-press shortcuts
 * exist anywhere — this modal is the only path.
 *
 * The component owns NO persistence: it is fully controlled
 * (visible/pending/onConfirm/onCancel — the calculation-disclosure
 * controlled-props law); the parent performs the repository delete and
 * drives `pending` (confirm disabled + "Deleting…" while in flight).
 */

export type DeleteConfirmVariant = "chart" | "all";

export type DeleteConfirmProps = {
  /** Modal visibility — the parent opens on the destructive action and closes on confirm/cancel. */
  visible: boolean;
  /** Which destructive flow's copy to render (variant strings from the deck). */
  variant: DeleteConfirmVariant;
  /** Chart variant only: the chart label named in the heading. */
  label: string;
  /** Chart variant only: the revision count named in the body (cascade scope). */
  revisionCount: number;
  /** True while the parent's delete is in flight — confirm disables and shows "Deleting…". */
  pending: boolean;
  /** Fired when the error-filled confirm is pressed while enabled. */
  onConfirm: () => void;
  /** Fired when cancel (or the Android back button) dismisses the dialog — removes nothing. */
  onCancel: () => void;
};

export function DeleteConfirm({
  visible,
  variant,
  label,
  revisionCount,
  pending,
  onConfirm,
  onCancel,
}: DeleteConfirmProps) {
  const theme = useTheme();

  const heading = variant === "chart" ? deleteChartHeading(label) : DELETE_ALL_HEADING;
  const body = variant === "chart" ? deleteChartBody(revisionCount) : DELETE_ALL_BODY;
  const confirmLabel = variant === "chart" ? DELETE_CHART_CONFIRM : DELETE_ALL_CONFIRM;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={pending ? undefined : onCancel}
      accessibilityViewIsModal
      testID="delete-confirm-modal"
    >
      <View style={styles.backdrop}>
        <View
          style={[styles.card, { backgroundColor: theme.background }]}
          accessibilityViewIsModal
        >
          {/* Heading: Body/600 error text — destructive scope up front (A-3-UI-6). */}
          <ThemedText
            type="default"
            accessibilityRole="header"
            style={[styles.heading, { color: theme.error }]}
          >
            {heading}
          </ThemedText>

          <ThemedText type="default">{body}</ThemedText>

          {/* Confirm: the ONLY error-filled element; full action label. */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: pending }}
            disabled={pending}
            onPress={onConfirm}
            style={[styles.confirmButton, { backgroundColor: theme.error }]}
            testID="delete-confirm-confirm"
          >
            <ThemedText
              type="default"
              style={[styles.buttonLabel, { color: theme.background }]}
            >
              {/* Pending swaps to the in-flight state text (D-14). */}
              {pending ? DELETING : confirmLabel}
            </ThemedText>
          </Pressable>

          {/* Cancel: default-toned, always available. */}
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            hitSlop={Spacing.two}
            style={[styles.cancelButton, { backgroundColor: theme.backgroundElement }]}
            testID="delete-confirm-cancel"
          >
            <ThemedText type="default" style={styles.buttonLabel}>
              {DELETE_CANCEL}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = 'rgba(128, 128, 128, 0.4)';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: 480,
  },
  // Dialog headings render at Body size with weight 600 (A-3-UI-6).
  heading: {
    fontWeight: '600',
  },
  confirmButton: {
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontWeight: '600',
  },
});
