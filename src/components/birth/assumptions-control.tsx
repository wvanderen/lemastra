import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { OptionCard } from '@/components/ui/option-card';
import { Spacing } from '@/constants/theme';
import { houseSystemSchema, type HouseSystem } from '@/lib/api-schemas';

import { ASSUMPTIONS_HEADER, HOUSE_SYSTEM_HELPER, HOUSE_SYSTEM_LABEL } from './copy';

/**
 * D-11 collapsible house-system selector.
 *
 * Collapsed under "Assumptions & advanced"; expands in place to a radio
 * list of the ten calculator-supported house systems. The vocabulary is
 * imported from houseSystemSchema (the shared API contract, mirroring
 * birth_to_chart.py HOUSE_SYSTEMS verbatim) — never a local literal list,
 * so client and calculator can never drift. Whole Sign is pre-selected
 * (the calculator default). The CALC_UNSUITABLE_HOUSE_SYSTEM banner's
 * "Open Assumptions" action deep-links here (02-08).
 */

/** The ten supported systems, in schema vocabulary order. */
const HOUSE_SYSTEMS = houseSystemSchema.options;

export type AssumptionsControlProps = {
  /** Currently selected house system; defaults to Whole Sign. */
  value?: HouseSystem;
  /** Called with the selected calculator label. */
  onChange: (value: HouseSystem) => void;
  /** Render the section expanded on mount (deep-link landing). */
  defaultExpanded?: boolean;
  testID?: string;
};

export function AssumptionsControl({
  value = 'Whole Sign',
  onChange,
  defaultExpanded = false,
  testID,
}: AssumptionsControlProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={styles.header}
      >
        <ThemedText type="default" style={styles.headerLabel}>
          {ASSUMPTIONS_HEADER}
        </ThemedText>
        {/* Status-marker glyph only — state is conveyed structurally by
            accessibilityState.expanded, never by the glyph alone. */}
        <ThemedText type="default" themeColor="textSecondary">
          {expanded ? '▴' : '▾'}
        </ThemedText>
      </Pressable>

      {expanded ? (
        <View accessibilityRole="radiogroup" style={styles.list}>
          <ThemedText type="small" style={styles.fieldLabel}>
            {HOUSE_SYSTEM_LABEL}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {HOUSE_SYSTEM_HELPER}
          </ThemedText>
          {HOUSE_SYSTEMS.map((system) => (
            <OptionCard
              key={system}
              label={system}
              selected={value === system}
              onPress={() => onChange(system)}
              testID={`house-system-${system.toLowerCase().replace(/\s+/g, '-')}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 48,
  },
  headerLabel: {
    fontWeight: '600',
  },
  list: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  fieldLabel: {
    fontWeight: '600',
  },
});
