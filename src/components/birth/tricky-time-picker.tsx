import { StyleSheet, View } from 'react-native';

import {
  TRICKY_TIME_AMBIGUOUS_HEADING,
  TRICKY_TIME_CHOICE_REQUIRED,
  TRICKY_TIME_FOOTNOTE,
  TRICKY_TIME_FIRST_HELPER,
  TRICKY_TIME_NONEXISTENT_HEADING,
  TRICKY_TIME_SECOND_HELPER,
  trickyTimeAmbiguousBody,
  trickyTimeNonexistentBody,
} from '@/components/birth/copy';
import { ThemedText } from '@/components/themed-text';
import { OptionCard } from '@/components/ui/option-card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ResolveTimeResponse, TimeResolutionMode } from '@/lib/api-schemas';

/**
 * D-08 explicit tricky-time resolution picker (BIRTH-03 client behavior).
 *
 * Renders ONLY when the server classified the civil time as `ambiguous` or
 * `nonexistent` — a normal classification renders nothing. The option cards
 * carry the SERVER's option labels verbatim (T-02-31): the UI never
 * re-derives offsets or clock-jump explanations, it consumes the
 * resolve-time payload (`ResolveTimeResponse`) exactly as the API emitted
 * it, and the server revalidates the chosen mode (02-03 schema).
 *
 * The choice is required — while `value` is null the required-choice helper
 * is visible and the confirm screen keeps Calculate disabled; the choice is
 * never made silently (D-08).
 */

/** Copy-deck helpers keyed by resolution mode (ambiguous case only). */
const MODE_HELPERS: Partial<Record<TimeResolutionMode, string>> = {
  first_pass: TRICKY_TIME_FIRST_HELPER,
  second_pass: TRICKY_TIME_SECOND_HELPER,
};

export type TrickyTimePickerProps = {
  /** The full resolve-time response — supplies classification, options, and IANA zone. */
  resolved: ResolveTimeResponse;
  /** Entered birth date (YYYY-MM-DD) — interpolates the explanation body. */
  date: string;
  /** Entered birth time (HH:MM) — interpolates the explanation body. */
  time: string;
  /** The selected resolution mode, or null while no choice has been made. */
  value: TimeResolutionMode | null;
  /** Emits the pressed option's mode (the server payload's own value). */
  onChange: (mode: TimeResolutionMode) => void;
};

export function TrickyTimePicker({ resolved, date, time, value, onChange }: TrickyTimePickerProps) {
  const theme = useTheme();
  const classification = resolved.resolved.classification;

  // A normal civil time needs no resolution — no picker at all.
  if (classification === 'normal') {
    return null;
  }

  const ambiguous = classification === 'ambiguous';

  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      accessibilityLiveRegion="polite"
      testID="tricky-time-picker"
    >
      <ThemedText type="default" accessibilityRole="header" style={styles.heading}>
        {ambiguous ? TRICKY_TIME_AMBIGUOUS_HEADING : TRICKY_TIME_NONEXISTENT_HEADING}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {ambiguous
          ? trickyTimeAmbiguousBody(date, resolved.iana_zone, time)
          : trickyTimeNonexistentBody(date, resolved.iana_zone, time)}
      </ThemedText>

      <View accessibilityRole="radiogroup" style={styles.options}>
        {resolved.resolved.options.map((option) => (
          <OptionCard
            key={option.mode}
            label={option.label}
            helper={ambiguous ? MODE_HELPERS[option.mode] : undefined}
            selected={value === option.mode}
            onPress={() => onChange(option.mode)}
            testID={`tricky-time-${option.mode}`}
          />
        ))}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {TRICKY_TIME_FOOTNOTE}
      </ThemedText>
      {value === null ? (
        <ThemedText type="small" themeColor="textSecondary">
          {TRICKY_TIME_CHOICE_REQUIRED}
        </ThemedText>
      ) : null}
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
    gap: Spacing.two,
  },
  heading: {
    fontWeight: '600',
  },
  options: {
    gap: Spacing.two,
  },
});
