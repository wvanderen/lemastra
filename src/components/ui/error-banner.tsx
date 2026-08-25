import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ErrorCode, HouseSystem } from '@/lib/api-schemas';

import { errorBannerCopy, NETWORK_ERROR_COPY } from './copy';

/**
 * Per-`error_code` recoverable error banner (CALC-04 client rendering).
 *
 * Pattern (02-UI-SPEC §"Error banners"): card with a 1px error border,
 * error-colored heading (Label/600), body in Body/text color, hint in
 * Label/textSecondary, and a recovery action where the copy deck defines
 * one. Headings always start with a "Couldn't…"-style phrasing and the
 * banner exposes its full text via accessibilityLabel — meaning never
 * rides on color alone (T-02-19).
 *
 * Trust boundary (T-02-18): all copy comes from the local copy deck keyed
 * by the VALIDATED error code; the only server text rendered is the
 * CALC_INVALID_INPUT field message. `code` absent/unrecognized renders the
 * network fallback.
 */

export type ErrorBannerProps = {
  /** Validated error_code from errorCodeSchema; absent → network fallback. */
  code?: ErrorCode | null;
  /** Server-provided user-facing message — rendered ONLY for CALC_INVALID_INPUT. */
  message?: string;
  /** The user's place query — fills the PLACE_ZERO_RESULTS heading template. */
  query?: string;
  /** The requested house system — fills the CALC_UNSUITABLE_HOUSE_SYSTEM heading template. */
  houseSystem?: HouseSystem;
  /** Recovery action callback; the banner renders its action only when provided. */
  onAction?: () => void;
  testID?: string;
};

export function ErrorBanner({
  code,
  message,
  query,
  houseSystem,
  onAction,
  testID,
}: ErrorBannerProps) {
  const theme = useTheme();

  const copy = code ? errorBannerCopy(code, { query, houseSystem }) : NETWORK_ERROR_COPY;

  // CALC_INVALID_INPUT is the single pass-through (T-02-18): the
  // calculator's field-naming copy is already user-facing, verified text.
  const body =
    code === 'CALC_INVALID_INPUT' && message ? `${message} ${copy.body}` : copy.body;

  const accessibleText = [copy.heading, body, copy.hint].filter(Boolean).join(' ');

  // Error-colored Label/600 heading — the token (never a hex literal) is
  // resolved per scheme at render time.
  const headingStyle = { color: theme.error, fontWeight: '600' as const };

  return (
    <View
      style={[
        styles.banner,
        { borderColor: theme.error, backgroundColor: theme.backgroundElement },
      ]}
      accessibilityRole="alert"
      accessibilityLabel={accessibleText}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <ThemedText type="small" style={headingStyle}>
        {copy.heading}
      </ThemedText>
      {body ? <ThemedText type="default">{body}</ThemedText> : null}
      {copy.hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {copy.hint}
        </ThemedText>
      ) : null}
      {copy.action && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={Spacing.two}
          style={styles.action}
        >
          <ThemedText type="small" style={headingStyle}>
            {copy.action}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
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
