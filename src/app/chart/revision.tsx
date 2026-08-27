import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { resultValidationStatus } from "@/components/birth/copy";
import { AssumptionsLine } from "@/components/chart/assumptions-line";
import { PlacementList } from "@/components/chart/placement-list";
import { ProvenanceDetails } from "@/components/chart/provenance-details";
import { UnavailableFactors } from "@/components/chart/unavailable-factors";
import { ThemedText } from "@/components/themed-text";
import {
  BACK_TO_HISTORY,
  LOADING_CHART,
  OPEN_FAILED_ERROR_COPY,
  READ_ONLY_MARKER_HEADING,
  historyLine,
} from "@/components/workspace/copy";
import { ErrorCard } from "@/components/workspace/error-card";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useRevisionContent, useWorkspaceChart } from "@/hooks/use-workspace";
import { useTheme } from "@/hooks/use-theme";
import { revisionHistoryEntries } from "@/lib/workspace/revision-diff";

/**
 * /chart/revision — the read-only earlier-version view (D-07, WORK-04).
 *
 * Route contract (id-param law): the only input is `?id={revisionId}` —
 * the revision is read from the repository by id, never through router
 * params. The stored envelope IS the evidence (D-02): this screen makes
 * ZERO network calls and renders the Phase-2 result composition
 * (PlacementList, AssumptionsLine WITHOUT an action, ProvenanceDetails,
 * validation status, UnavailableFactors) exactly as the saved detail
 * does — plus the "Earlier version — read-only" marker card carrying
 * "{date} · {what changed}" and the "Back to History" link (T-03-22:
 * no mutating control of any kind mounts here).
 *
 * The what-changed phrase comes from the chart detail under the SAME
 * query key the saved screen uses (cache-shared, invalidated together):
 * revisionHistoryEntries diffs stored inputs over the full revision
 * chain, so the marker's phrase is identical to the History row the
 * user tapped. A missing id, unknown revision, or unknown chart
 * redirects home; a typed OPEN_FAILED read renders the open-failed
 * error card — never a partial render (Pitfall 1).
 */

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

export default function RevisionScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const revisionId = typeof params.id === "string" ? params.id : "";

  const revisionQuery = useRevisionContent(revisionId);
  const chartId = revisionQuery.data?.chartId ?? "";
  const detailQuery = useWorkspaceChart(chartId);

  // The opened revision's History entry (date + derived phrase).
  const historyEntry = useMemo(() => {
    if (revisionId.length === 0 || !detailQuery.data) return null;
    return (
      revisionHistoryEntries(detailQuery.data.revisions).find(
        (entry) => entry.revisionId === revisionId
      ) ?? null
    );
  }, [revisionId, detailQuery.data]);

  // Missing id, unknown revision, unknown chart, or a revision absent
  // from the detail's history → home (never /birth — saved-chart law).
  useEffect(() => {
    if (revisionId.length === 0 || revisionQuery.data === null) router.replace("/");
  }, [revisionId, revisionQuery.data]);
  useEffect(() => {
    if (revisionQuery.isSuccess && detailQuery.isSuccess && historyEntry === null) {
      router.replace("/");
    }
  }, [revisionQuery.isSuccess, detailQuery.isSuccess, historyEntry]);

  if (revisionId.length === 0 || revisionQuery.data === null) return null;

  if (revisionQuery.isError) {
    return (
      <View style={styles.stateScreen}>
        <ErrorCard
          heading={OPEN_FAILED_ERROR_COPY.heading}
          body={OPEN_FAILED_ERROR_COPY.body}
          testID="revision-error"
        />
      </View>
    );
  }

  if (
    revisionQuery.isPending ||
    !detailQuery.data ||
    !historyEntry ||
    detailQuery.data === null
  ) {
    // Content renders only after BOTH the stored envelope and its
    // History entry resolve (parse-then-trust, T-03-17).
    return (
      <View style={styles.stateScreen} testID="revision-loading">
        <ThemedText type="small" themeColor="textSecondary">
          {LOADING_CHART}
        </ThemedText>
      </View>
    );
  }

  if (detailQuery.isError) {
    return (
      <View style={styles.stateScreen}>
        <ErrorCard
          heading={OPEN_FAILED_ERROR_COPY.heading}
          body={OPEN_FAILED_ERROR_COPY.body}
          testID="revision-error"
        />
      </View>
    );
  }

  const read = revisionQuery.data;
  const { envelope, identity } = read.revision;
  const confidence = envelope.chart_data.birth_time_confidence;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Read-only marker — the trust surface that this version is frozen. */}
      <View
        style={[styles.marker, { backgroundColor: theme.backgroundElement }]}
        testID="revision-marker"
      >
        <ThemedText type="small" style={styles.markerHeading}>
          {READ_ONLY_MARKER_HEADING}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {historyLine(historyEntry.date, historyEntry.phrase)}
        </ThemedText>
      </View>

      {/* The same Phase-2 composition the saved detail renders — stored
          evidence only; AssumptionsLine carries NO action (read-only). */}
      <PlacementList placements={envelope.chart_data.placements} />

      <AssumptionsLine provenance={envelope.provenance} confidence={confidence} />

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

      <Pressable
        accessibilityRole="link"
        hitSlop={Spacing.two}
        onPress={() => router.back()}
        style={styles.backLink}
      >
        <ThemedText type="linkPrimary">{BACK_TO_HISTORY}</ThemedText>
      </Pressable>
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
  // Centered loading/error states (saved.tsx stateScreen precedent).
  stateScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.three,
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  marker: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  markerHeading: {
    fontWeight: "600",
  },
  backLink: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});
