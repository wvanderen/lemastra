import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Canvas, Group } from "@shopify/react-native-skia";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { CalculateResponse } from "@/lib/api-schemas";
import { buildWheelGeometry } from "@/lib/chart-wheel/geometry";

import { EXPLORE_CARD_HELPER, EXPLORE_CARD_TITLE } from "./copy";
import { WheelGraphics } from "./wheel-canvas";

/**
 * D-03 mini-wheel entry card — the tappable static wheel preview on
 * /chart/result and /chart/saved that pushes the explore route. The
 * first screen after calculating shows a wheel.
 *
 * Static preview law: the card renders the SAME deterministic geometry
 * (buildWheelGeometry) through the SAME primitive tree (WheelGraphics)
 * as the interactive hero — but non-interactively: NO GestureDetector,
 * and the canvas frame is pointerEvents "none", so every touch lands
 * on the card itself. Selection is permanently null (no highlight).
 *
 * The card owns NO navigation target knowledge beyond onPressExplore —
 * each screen decides where to push (saved: by chartId; unsaved result:
 * SavePrompt first, then the returned chartId — PRIV-01 explicit-save).
 *
 * Card treatment: Phase-1 law (radius 8, hairline border, Spacing.three)
 * on the secondary surface; ThemedText/theme tokens only.
 */

/** Static mini-wheel display size (px) inside the card. */
const MINI_WHEEL_SIZE = 288;

export type MiniWheelCardProps = {
  /** The already-zod-parsed envelope (repository edge / result parse). */
  envelope: CalculateResponse;
  /** Push handler — opens the explore route for this chart. */
  onPressExplore: () => void;
  testID?: string;
};

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

export function MiniWheelCard({ envelope, onPressExplore, testID }: MiniWheelCardProps) {
  const theme = useTheme();
  const geometry = useMemo(() => buildWheelGeometry(envelope, { size: 720 }), [envelope]);
  const displayScale = MINI_WHEEL_SIZE / geometry.size;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPressExplore}
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      testID={testID}
    >
      <ThemedText type="default" accessibilityRole="header" style={styles.heading}>
        {EXPLORE_CARD_TITLE}
      </ThemedText>
      {/* Static preview: non-interactive — no gesture, no hit testing. */}
      <View pointerEvents="none" style={styles.wheelFrame} testID={testID ? `${testID}-wheel` : undefined}>
        <Canvas style={{ width: MINI_WHEEL_SIZE, height: MINI_WHEEL_SIZE }}>
          <Group
            transform={[{ scale: displayScale }]}
            origin={{ x: geometry.cx, y: geometry.cy }}
          >
            <WheelGraphics
              geometry={geometry}
              selection={null}
              colors={{
                text: theme.text,
                textSecondary: theme.textSecondary,
                accent: theme.accent,
              }}
            />
          </Group>
        </Canvas>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {EXPLORE_CARD_HELPER}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: "center",
  },
  heading: {
    fontWeight: "600",
  },
  wheelFrame: {
    width: "100%",
    alignItems: "center",
  },
});
