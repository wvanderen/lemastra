import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { z } from "zod";

import { RESULT_TITLE, resultIdentityLine, resultValidationStatus } from "@/components/birth/copy";
import { ThemedText } from "@/components/themed-text";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { calculateResponseSchema } from "@/lib/api-schemas";

/**
 * /chart/result — minimal-but-real result screen (deepened by 02-09).
 *
 * Guard rule: arriving without a calculated payload redirects to /birth —
 * this screen only ever renders parse-then-trust data (the envelope passed
 * through the calculate schema, plus the identity line fields). The
 * placements list, assumptions card, expandable provenance, and
 * unavailable/provisional factors are 02-09 scope and are deliberately NOT
 * stubbed here — no fake data, no placeholders (trust-boundary rule).
 */

/** Identity-line inputs carried alongside the envelope by the confirm screen. */
const identitySchema = z.object({
  date: z.string().min(1).describe("Birth date as entered (YYYY-MM-DD)."),
  time: z.string().describe("Normalized birth time; empty string for Unknown confidence."),
  label: z.string().min(1).describe("Place label from the confirmed draft."),
});

export default function ResultScreen() {
  const params = useLocalSearchParams<{ envelope?: string; identity?: string }>();

  const parsed = useMemo(() => {
    if (!params.envelope || !params.identity) return null;
    try {
      return {
        identity: identitySchema.parse(JSON.parse(params.identity)),
        envelope: calculateResponseSchema.parse(JSON.parse(params.envelope)),
      };
    } catch {
      return null;
    }
  }, [params.envelope, params.identity]);

  useEffect(() => {
    if (!parsed) router.replace("/birth");
  }, [parsed]);

  if (!parsed) return null;

  const confidence = parsed.envelope.chart_data.birth_time_confidence;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ThemedText type="subtitle" accessibilityRole="header">
        {RESULT_TITLE}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {resultIdentityLine(parsed.identity, confidence)}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {resultValidationStatus(parsed.envelope.provenance.schema_version)}
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingTop: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
});
