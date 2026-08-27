import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Shared selectable card with radio accessibility semantics (02-UI-SPEC
 * §"Component Inventory").
 *
 * Selected state is conveyed through THREE channels — never color alone
 * (Accessibility Contract): backgroundSelected fill, a 2px accent border
 * (1px hairline when unselected), and a 600-weight label. The press target
 * is at least 48dp; visual content insets come from the Spacing tokens.
 */

export type OptionCardProps = {
  /** Option label — also the radio's accessible name (with the helper). */
  label: string;
  /** Optional helper text rendered under the label (Label/textSecondary). */
  helper?: string;
  /** Whether this option is the checked one in its group. */
  selected: boolean;
  onPress: () => void;
  testID?: string;
};

/** Card hairline carried forward from the Phase-1 privacy.tsx card treatment. */
const HAIRLINE_BORDER_COLOR = 'rgba(128, 128, 128, 0.4)';

export function OptionCard({ label, helper, selected, onPress, testID }: OptionCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? theme.accent : HAIRLINE_BORDER_COLOR,
        },
      ]}
    >
      <ThemedText type="default" style={selected ? styles.labelSelected : undefined}>
        {label}
      </ThemedText>
      {helper ? (
        <ThemedText type="small" themeColor="textSecondary">
          {helper}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    padding: Spacing.three,
    gap: Spacing.two,
    // Interactive controls keep a hit area of at least 44pt/48dp even when
    // the visual content is shorter (02-UI-SPEC §"Spacing exceptions").
    minHeight: 48,
  },
  labelSelected: {
    fontWeight: '600',
  },
});
