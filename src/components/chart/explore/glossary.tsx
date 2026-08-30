import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { GLOSSARY } from "./copy";

/**
 * D-08 tap-to-explain glossary chip (Simple mode) — an unfamiliar term
 * renders as a chip that expands inline to its short static definition
 * from the copy deck. Progressive disclosure keeps Simple clean: the
 * definition is one press away, never cluttering the surface.
 *
 * The provenance-details disclosure pattern per term (04-PATTERNS
 * §glossary): expanded state is STRUCTURAL
 * (accessibilityState={{ expanded }}), never conveyed by the caret
 * glyph alone. Definitions are deck content (GLOSSARY) — static
 * strings, never interpretation, never a template over envelope values
 * (T-04-13 / T-02-34 extension).
 *
 * Unknown terms render NOTHING (no broken affordance): callers chip
 * only terms the deck covers, and a deck gap degrades to plain text
 * rather than an empty disclosure.
 */

/** Cap the definition width so long definitions wrap near their chip. */
const DEFINITION_MAX_WIDTH = 280;

export type GlossaryProps = {
  /** Deck glossary term (e.g. "trine") — the chip label and definition key. */
  term: string;
};

export function Glossary({ term }: GlossaryProps) {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();

  const definition = GLOSSARY[term];
  if (definition === undefined) return null;

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        testID={`glossary-${term}`}
        style={[styles.chip, { backgroundColor: theme.backgroundElement }]}
      >
        <ThemedText type="small" themeColor="textSecondary" style={styles.term}>
          {term}
        </ThemedText>
        {/* Status-marker glyph only — state is conveyed structurally by
            accessibilityState.expanded, never by the glyph alone. */}
        <ThemedText type="small" themeColor="textSecondary">
          {expanded ? "▴" : "▾"}
        </ThemedText>
      </Pressable>
      {expanded ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.definition}
          testID={`glossary-definition-${term}`}
        >
          {definition}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
    maxWidth: DEFINITION_MAX_WIDTH,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.4)",
    paddingHorizontal: Spacing.two,
    minHeight: 44,
    alignSelf: "flex-start",
  },
  term: {
    fontWeight: "600",
  },
  definition: {
    // The expanded definition reads as a small annotation under the chip.
    fontStyle: "italic",
  },
});
