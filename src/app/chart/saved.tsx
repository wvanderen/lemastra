import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { resultIdentityLine, resultValidationStatus } from "@/components/birth/copy";
import { AssumptionsLine } from "@/components/chart/assumptions-line";
import { PlacementList } from "@/components/chart/placement-list";
import { ProvenanceDetails } from "@/components/chart/provenance-details";
import { UnavailableFactors } from "@/components/chart/unavailable-factors";
import { ThemedText } from "@/components/themed-text";
import { LOADING_CHART, OPEN_FAILED_ERROR_COPY } from "@/components/workspace/copy";
import { ErrorCard } from "@/components/workspace/error-card";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useWorkspaceChart } from "@/hooks/use-workspace";

/**
 * /chart/saved — the saved-chart detail screen (WORK-03, D-02 reopen
 * law): reads ONE chart from the repository by its id param and renders
 * the Phase-2 result composition from the latest revision's stored
 * envelope — ZERO network calls, the stored envelope IS the evidence.
 *
 * Route contract (id-param law): the only input is `?id={chartId}` — a
 * saved chart never travels through router params (03-RESEARCH
 * anti-pattern); the repository is the only data source, so an unknown
 * id is data, not code (T-03-16).
 *
 * Parse-then-trust at the repository edge (D-02): the screen renders
 * content only AFTER the stored envelope re-parse succeeds — while the
 * read is pending it shows centered "Loading chart…" and nothing else
 * (T-03-17), and a typed OPEN_FAILED read renders the open-failed
 * error card — never a partial render, never a redirect into the birth
 * flow for a saved chart. An unknown id (repository null) or a missing
 * param redirects home.
 *
 * Layout (03-UI-SPEC §"/chart/saved"): Display title (the chart label)
 * → identity line (stored identity + confidence) → PlacementList →
 * AssumptionsLine (adjust action unchanged this plan) →
 * ProvenanceDetails → validation status → UnavailableFactors. History,
 * rename, export, and delete arrive in later plans.
 */
export default function SavedChartScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const chartId = typeof params.id === "string" ? params.id : "";
  const detailQuery = useWorkspaceChart(chartId);

  // Unknown chart (repository null) or missing id → home, never /birth.
  useEffect(() => {
    if (chartId.length === 0 || detailQuery.data === null) router.replace("/");
  }, [chartId, detailQuery.data]);

  if (chartId.length === 0 || detailQuery.data === null) return null;

  if (detailQuery.isError) {
    // Typed open-failure surface — never a partial render.
    return (
      <View style={styles.stateScreen}>
        <ErrorCard
          heading={OPEN_FAILED_ERROR_COPY.heading}
          body={OPEN_FAILED_ERROR_COPY.body}
          testID="saved-chart-error"
        />
      </View>
    );
  }

  if (detailQuery.isPending) {
    return (
      <View style={styles.stateScreen} testID="saved-chart-loading">
        <ThemedText type="small" themeColor="textSecondary">
          {LOADING_CHART}
        </ThemedText>
      </View>
    );
  }

  const detail = detailQuery.data;
  const { envelope, identity } = detail.latest;
  const confidence = envelope.chart_data.birth_time_confidence;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ThemedText type="subtitle" accessibilityRole="header">
        {detail.chart.label}
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
  // Centered loading/error states (03-UI-SPEC: content only after the
  // stored envelope parses).
  stateScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.three,
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
});
