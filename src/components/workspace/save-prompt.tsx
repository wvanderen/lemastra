import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { LABEL_MAX_LENGTH, labelSchema } from "@/lib/workspace/label";

import {
  CHART_NAME_LABEL,
  LABEL_FIELD_ERROR,
  SAVE_PROMPT_CANCEL,
  SAVE_PROMPT_CONFIRM,
  SAVE_PROMPT_HEADING,
  SAVE_PROMPT_HELPER,
} from "./copy";

/**
 * D-10 save-prompt modal — the label prompt behind the result screen's
 * Save chart CTA.
 *
 * A controlled RN Modal (03-UI-SPEC dialog primitive — NOT Alert.alert:
 * the label input must work cross-platform and tests assert exact
 * copy). Centered card, accessibilityViewIsModal, autofocus TextInput
 * prefilled with the smart default, and labelSchema.safeParse gating
 * the confirm per keystroke (A-3-UI-4: trimmed 1–60). The component
 * owns NO persistence — the parent's onSave handler performs the save
 * and drives `pending` (calculation-disclosure controlled-props law).
 *
 * Explicit-save-only (PRIV-01): this prompt is the ONLY route to a
 * repository write; it never opens itself.
 */

export type SavePromptProps = {
  /** Modal visibility — the parent opens on CTA tap and closes on save/cancel. */
  visible: boolean;
  /** Smart prefilled default ("{date} · {place}" — smartDefaultLabel). */
  defaultLabel: string;
  /** True while the parent's save mutation is in flight — both buttons disable. */
  pending: boolean;
  /** Fired with the TRIMMED validated label when confirm is pressed. */
  onSave: (label: string) => void;
  /** Fired when cancel (or the Android back button) dismisses the prompt. */
  onCancel: () => void;
  testID?: string;
};

export function SavePrompt({
  visible,
  defaultLabel,
  pending,
  onSave,
  onCancel,
  testID,
}: SavePromptProps) {
  const theme = useTheme();
  const [label, setLabel] = useState(defaultLabel);

  // Prefill on every open: the smart default changes per chart, and a
  // dismissed prompt must never leak a previous chart's label into the
  // next one.
  useEffect(() => {
    if (visible) setLabel(defaultLabel);
  }, [visible, defaultLabel]);

  // Validation gates the confirm per keystroke (trimmed 1–60 — the
  // repository revalidates on write; the UI validates before asking).
  const parsed = labelSchema.safeParse(label);
  const labelValid = parsed.success;
  const confirmDisabled = !labelValid || pending;

  // Error token resolved per scheme at render time (error-banner law).
  const fieldErrorStyle = { color: theme.error, fontWeight: '600' as const };

  const onConfirmPress = () => {
    if (confirmDisabled) return;
    // Emit the trimmed label the schema normalized.
    onSave(labelSchema.parse(label));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={pending ? undefined : onCancel}
      accessibilityViewIsModal
      testID={testID ? `${testID}-modal` : undefined}
    >
      <View style={styles.backdrop}>
        <View
          style={[styles.card, { backgroundColor: theme.background }]}
          accessibilityViewIsModal
          testID={testID}
        >
          <ThemedText type="default" accessibilityRole="header" style={styles.heading}>
            {SAVE_PROMPT_HEADING}
          </ThemedText>

          <View style={styles.field}>
            <ThemedText type="small" style={styles.fieldLabel}>
              {CHART_NAME_LABEL}
            </ThemedText>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder={defaultLabel}
              placeholderTextColor={theme.textSecondary}
              autoFocus
              accessibilityLabel={CHART_NAME_LABEL}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
              testID="save-prompt-input"
            />
            {labelValid ? null : (
              <ThemedText
                type="small"
                style={fieldErrorStyle}
                accessibilityLiveRegion="polite"
              >
                {LABEL_FIELD_ERROR}
              </ThemedText>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              {SAVE_PROMPT_HELPER}
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: confirmDisabled }}
            disabled={confirmDisabled}
            onPress={onConfirmPress}
            style={[styles.confirmButton, { backgroundColor: theme.accent }]}
            testID="save-prompt-confirm"
          >
            <ThemedText
              type="default"
              style={[styles.buttonLabel, { color: theme.background }]}
            >
              {SAVE_PROMPT_CONFIRM}
            </ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: pending }}
            disabled={pending}
            onPress={onCancel}
            hitSlop={Spacing.two}
            style={[styles.cancelButton, { backgroundColor: theme.backgroundElement }]}
            testID="save-prompt-cancel"
          >
            <ThemedText type="default" style={styles.buttonLabel}>
              {SAVE_PROMPT_CANCEL}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Longest accepted label re-exported for style decisions (A-3-UI-4). */
export { LABEL_MAX_LENGTH };

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
  field: {
    gap: Spacing.two,
  },
  fieldLabel: {
    fontWeight: '600',
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
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
