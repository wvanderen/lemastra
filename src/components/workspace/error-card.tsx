import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Workspace error card — the Phase-3 sibling of the Phase-2
 * ErrorBanner (same visual structure: 1px error border, error-colored
 * Label/600 heading, Body text, optional recovery action).
 *
 * Unlike ErrorBanner (keyed by a CALC-04 error code), this card is fed
 * entirely by props: the caller picks the class from the workspace
 * copy deck (SAVE_ERROR_COPY, OPEN_FAILED_ERROR_COPY, …) and supplies
 * heading/body/actionLabel. The card renders its full text via
 * accessibilityLabel — meaning never rides on color alone (T-02-19).
 */

export type ErrorCardProps = {
  /** Heading from a workspace copy-deck error class. */
  heading: string;
  /** Body copy; omitted when the class defines none. */
  body?: string;
  /** Recovery action label; the action renders only when BOTH label and callback are present. */
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
};

export function ErrorCard({
  heading,
  body,
  actionLabel,
  onAction,
  testID,
}: ErrorCardProps) {
  const theme = useTheme();

  const accessibleText = [heading, body].filter(Boolean).join(' ');

  // Error-colored Label/600 heading — the token (never a hex literal)
  // is resolved per scheme at render time.
  const headingStyle = { color: theme.error, fontWeight: '600' as const };

  return (
    <View
      style={[
        styles.card,
        { borderColor: theme.error, backgroundColor: theme.backgroundElement },
      ]}
      accessibilityRole="alert"
      accessibilityLabel={accessibleText}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <ThemedText type="small" style={headingStyle}>
        {heading}
      </ThemedText>
      {body ? <ThemedText type="default">{body}</ThemedText> : null}
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={Spacing.two}
          style={styles.action}
        >
          <ThemedText type="small" style={headingStyle}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});
