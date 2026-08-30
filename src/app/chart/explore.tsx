import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";

import { FactPanel } from "@/components/chart/explore/fact-panel";
import { WheelCanvas } from "@/components/chart/explore/wheel-canvas";
import { ThemedText } from "@/components/themed-text";
import { LOADING_CHART, OPEN_FAILED_ERROR_COPY } from "@/components/workspace/copy";
import { ErrorCard } from "@/components/workspace/error-card";
import { WebUnsupported } from "@/components/workspace/web-unsupported";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useRevisionContent, useWorkspaceChart } from "@/hooks/use-workspace";
import type { CalculateResponse } from "@/lib/api-schemas";
import { buildWheelGeometry, type FactorRef } from "@/lib/chart-wheel/geometry";

/**
 * /chart/explore — the dedicated exploration surface (D-01, WHEEL-01/02's
 * walkable half): the wheel hero at the top (D-02) with the inline fact
 * panel adjacent below (D-09), ONE shared selection feeding both (D-10).
 *
 * Route contract (id-param law): the only inputs are `?id={chartId}` and
 * the optional `?revision={revisionId}` (latest by default; the revision
 * chain stays read-only per Phase-3 D-07) — id-style lookup keys, never
 * an envelope through router params (T-03-16). The repository is the
 * only data source: content = revision ? useRevisionContent(revision) :
 * useWorkspaceChart(id), zero network, the stored envelope IS the
 * evidence (repository-edge zod re-parse, D-02 Phase 3).
 *
 * State screens mirror /chart/saved exactly: a missing id or unknown
 * chart/revision (repository null) redirects home — never /birth;
 * loading renders centered "Loading chart…" and nothing else (T-03-17);
 * a typed OPEN_FAILED read renders the open-failed error card — never a
 * partial render. Content renders only AFTER the repository-edge parse.
 *
 * Web posture (D-04): web renders the WebUnsupported capability card
 * with ZERO canvas mounted. A web /chart/explore visit is genuinely
 * data-less (the repository is web-unavailable — 03-03 D-03), so the
 * capability card is the honest deep-link landing, not an error; the
 * full web evidence experience ships on /chart/result's web branch in
 * 04-07 Task 2.
 */

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ id?: string; revision?: string }>();
  const chartId = typeof params.id === "string" ? params.id : "";
  const revisionId = typeof params.revision === "string" ? params.revision : "";

  // Both hooks stay mounted (rules-of-hooks); only the ACTIVE lookup
  // runs — the inactive one receives an empty id (query-layer disabled).
  const byRevision = revisionId.length > 0;
  const chartQuery = useWorkspaceChart(byRevision ? "" : chartId);
  const revisionQuery = useRevisionContent(byRevision ? revisionId : "");

  const activeQuery = byRevision ? revisionQuery : chartQuery;
  const missingParams = !byRevision && chartId.length === 0;

  // Missing id or unknown chart/revision (repository null) → home,
  // never /birth (saved-chart law).
  useEffect(() => {
    if (missingParams || activeQuery.data === null) router.replace("/");
  }, [missingParams, activeQuery.data]);

  if (missingParams || activeQuery.data === null) return null;

  // D-04: web renders the capability card — no Canvas mounts. The web
  // repository is unavailable, so the read stays pending (never errors,
  // never null-redirects): the card is the honest deep-link posture.
  if (Platform.OS === "web") {
    return (
      <View style={styles.stateScreen}>
        <WebUnsupported testID="explore-web-unsupported" />
      </View>
    );
  }

  if (activeQuery.isError) {
    // Typed open-failure surface — never a partial render.
    return (
      <View style={styles.stateScreen}>
        <ErrorCard
          heading={OPEN_FAILED_ERROR_COPY.heading}
          body={OPEN_FAILED_ERROR_COPY.body}
          testID="explore-error"
        />
      </View>
    );
  }

  if (activeQuery.isPending) {
    return (
      <View style={styles.stateScreen} testID="explore-loading">
        <ThemedText type="small" themeColor="textSecondary">
          {LOADING_CHART}
        </ThemedText>
      </View>
    );
  }

  const data = activeQuery.data;
  // Narrow the union by shape: a revision read carries `.revision`,
  // a chart detail carries `.latest` (both zod-parsed envelopes).
  const envelope = "revision" in data ? data.revision.envelope : data.latest.envelope;

  return <ExploreContent envelope={envelope} />;
}

/** The native explore composition — wheel hero + fact panel, one selection. */
function ExploreContent({ envelope }: { envelope: CalculateResponse }) {
  const { width } = useWindowDimensions();
  const [selection, setSelection] = useState<FactorRef | null>(null);
  const geometry = useMemo(() => buildWheelGeometry(envelope, { size: 720 }), [envelope]);

  // Responsive square: the container width minus content padding,
  // clamped to the geometry base (never upscaled past 720).
  const wheelSize = Math.min(Math.max(width - Spacing.three * 2, 360), 720);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* D-02 wheel-first hero at the top — the chart's visual face. */}
      <WheelCanvas
        geometry={geometry}
        selection={selection}
        onSelect={setSelection}
        size={wheelSize}
      />
      {/* D-09 inline fact panel adjacent below — selection and its facts
          read as one unit; no bottom sheet, no navigated fact screen. */}
      <FactPanel selection={selection} envelope={envelope} />
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
  // Centered loading/error states (saved.tsx stateScreen precedent —
  // content only after the stored envelope parses).
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
