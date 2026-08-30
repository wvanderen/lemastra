import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { WEB_UNSUPPORTED_BODY, WEB_UNSUPPORTED_HEADING } from "./copy";

/**
 * D-03 web capability card — rendered in place of the saved-charts list
 * when workspace storage is unavailable (web): a capability state, NOT
 * an error banner. Heading + body only, no actions (03-UI-SPEC §"Home
 * workspace" web degradation row); the body states the privacy reason —
 * device-only storage — rather than a bare "not supported" (A-3-UI-9).
 */

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

export type WebUnsupportedProps = {
  testID?: string;
};

export function WebUnsupported({ testID }: WebUnsupportedProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      testID={testID}
    >
      <ThemedText type="default" accessibilityRole="header" style={styles.heading}>
        {WEB_UNSUPPORTED_HEADING}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {WEB_UNSUPPORTED_BODY}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  heading: {
    fontWeight: "600",
  },
});
