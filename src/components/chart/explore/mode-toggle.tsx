import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import type { ExploreMode } from "@/hooks/use-explore-mode";
import { useTheme } from "@/hooks/use-theme";

import { MODE_OPTIONS, MODE_TOGGLE_HEADING } from "./copy";

/**
 * D-05 global Simple ↔ Technical segmented toggle — one inline control
 * that flips the whole explore experience at once (wheel labels, list
 * rows, and the fact panel change vocabulary and factor depth
 * together, EVID-02).
 *
 * The confidence-control radiogroup pattern compacted to one
 * horizontal row (04-PATTERNS §mode-toggle): the container is a
 * View-level radiogroup, each segment a radio with a checked state,
 * and the options come from the copy deck (MODE_OPTIONS — never
 * literals in the component, Pitfall 11). Selection is conveyed
 * through THREE channels — backgroundSelected fill, a 2px accent
 * border (1px hairline when unselected), and a 600-weight label —
 * never color alone (A11Y-02, the OptionCard law).
 *
 * Controlled component: the surface owns the mode through
 * useExploreMode() and passes value/onChange down as plain props
 * (D-06 same-data-path law — one state, prop-passed; not context, not
 * two trees).
 */

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

export type ModeToggleProps = {
  /** The active explore mode (useExploreMode's value). */
  mode: ExploreMode;
  /** Called with the pressed segment's mode. */
  onChange: (mode: ExploreMode) => void;
  testID?: string;
};

export function ModeToggle({ mode, onChange, testID }: ModeToggleProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={MODE_TOGGLE_HEADING}
      style={styles.group}
      testID={testID ?? "explore-mode-toggle"}
    >
      <ThemedText type="small" themeColor="textSecondary" style={styles.heading}>
        {MODE_TOGGLE_HEADING}
      </ThemedText>
      <View style={styles.row}>
        {MODE_OPTIONS.map((segment) => {
          const selected = mode === segment.value;
          return (
            <Pressable
              key={segment.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(segment.value)}
              testID={`mode-${segment.value}`}
              style={[
                styles.segment,
                {
                  backgroundColor: selected
                    ? theme.backgroundSelected
                    : theme.backgroundElement,
                },
                selected && styles.segmentSelected,
                selected && { borderColor: theme.accent },
              ]}
            >
              <ThemedText type="default" style={selected ? styles.labelSelected : undefined}>
                {segment.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.one,
  },
  heading: {
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    minHeight: 48,
    justifyContent: "center",
  },
  // Selected channel #2: the heavier accent border (color + structure —
  // never hue alone; the accent color itself is applied inline from the
  // live theme).
  segmentSelected: {
    borderWidth: 2,
  },
  // Selected channel #3: 600-weight label.
  labelSelected: {
    fontWeight: "600",
  },
});
