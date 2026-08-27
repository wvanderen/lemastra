import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { z } from "zod";

import { RESULT_TITLE, resultIdentityLine, resultValidationStatus } from "@/components/birth/copy";
import { AssumptionsLine } from "@/components/chart/assumptions-line";
import { PlacementList } from "@/components/chart/placement-list";
import { ProvenanceDetails } from "@/components/chart/provenance-details";
import { UnavailableFactors } from "@/components/chart/unavailable-factors";
import { ThemedText } from "@/components/themed-text";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { calculateResponseSchema } from "@/lib/api-schemas";

/**
 * /chart/result — the phase's full trust surface (D-10/D-12/D-13).
 *
 * Parse-then-trust (T-02-33): the envelope param is parsed with
 * calculateResponseSchema and the identity param with its zod schema
 * BEFORE any render; a missing or malformed payload redirects to /birth
 * — this screen never partially renders unvalidated data.
 *
 * Layout order (02-UI-SPEC): Display title → identity line → "Placements"
 * list → assumptions card → "Calculation details" (expandable) →
 * validation status → unavailable-factors section (Unknown mode) →
 * provisional-factors cards. Every fact is a list row — no wheel, no
 * preview graphic, no interpretation (D-13).
 */

/** Identity-line inputs carried alongside the envelope by the confirm screen. */
const identitySchema = z.object({
  date: z.string().min(1).describe("Birth date as entered (YYYY-MM-DD)."),
  time: z.string().describe("Normalized birth time; empty string for Unknown confidence."),
  label: z.string().min(1).describe("Place label from the confirmed draft."),
  zone_source: z
    .enum(["google", "manual"])
    .describe("How the birth zone was resolved (place-resolution provenance row)."),
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

  const { envelope, identity } = parsed;
  const confidence = envelope.chart_data.birth_time_confidence;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ThemedText type="subtitle" accessibilityRole="header">
        {RESULT_TITLE}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {resultIdentityLine(identity, confidence)}
      </ThemedText>

      <PlacementList placements={envelope.chart_data.placements} />

      <AssumptionsLine
        provenance={envelope.provenance}
        confidence={confidence}
        onAdjust={() =>
          router.navigate({ pathname: "/birth", params: { openAssumptions: "1" } })
        }
      />

      <ProvenanceDetails
        provenance={envelope.provenance}
        placeResolution={{ zone_source: identity.zone_source }}
      />

      <ThemedText type="small" themeColor="textSecondary">
        {resultValidationStatus(envelope.provenance.schema_version)}
      </ThemedText>

      <UnavailableFactors
        unavailable={envelope.unavailable_factors}
        provisional={envelope.provisional_factors}
      />
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
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
});
