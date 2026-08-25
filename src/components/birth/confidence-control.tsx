import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { OptionCard } from '@/components/ui/option-card';
import { Spacing } from '@/constants/theme';
import type { Confidence } from '@/lib/api-schemas';

import { CONFIDENCE_HEADING, CONFIDENCE_OPTIONS } from './copy';

/**
 * D-09 four-state inline birth-time confidence control.
 *
 * An inline segmented radio group composed of OptionCard rows — no modal,
 * no separate screen. Radio-group semantics per the Accessibility
 * Contract: the container is a radiogroup, each option a radio with a
 * checked state; selection is conveyed by fill + accent border + 600
 * weight (never color alone). Selecting Unknown disables and clears the
 * time field — that side effect belongs to the form (02-06), which swaps
 * the time-field helper to UNKNOWN_TIME_FIELD_HELPER.
 */

export type ConfidenceControlProps = {
  /** Currently selected confidence; defaults to Timed (the copy-deck default). */
  value?: Confidence;
  /** Called with the calculator label (Timed/Approximate/Rectified/Unknown). */
  onChange: (value: Confidence) => void;
  testID?: string;
};

export function ConfidenceControl({ value = 'Timed', onChange, testID }: ConfidenceControlProps) {
  return (
    <View accessibilityRole="radiogroup" style={styles.group} testID={testID}>
      <ThemedText type="default" accessibilityRole="header" style={styles.heading}>
        {CONFIDENCE_HEADING}
      </ThemedText>
      {CONFIDENCE_OPTIONS.map((option) => (
        <OptionCard
          key={option.value}
          label={option.value}
          helper={option.helper}
          selected={value === option.value}
          onPress={() => onChange(option.value)}
          testID={`confidence-${option.value.toLowerCase()}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
  },
  heading: {
    fontWeight: '600',
  },
});
