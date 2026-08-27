import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { resultIdentityLine, resultValidationStatus } from "@/components/birth/copy";
import { AssumptionsLine } from "@/components/chart/assumptions-line";
import { PlacementList } from "@/components/chart/placement-list";
import { ProvenanceDetails } from "@/components/chart/provenance-details";
import { UnavailableFactors } from "@/components/chart/unavailable-factors";
import { ThemedText } from "@/components/themed-text";
import {
  DELETE_ERROR_COPY,
  EXPORT_ERROR_COPY,
  LOADING_CHART,
  OPEN_FAILED_ERROR_COPY,
} from "@/components/workspace/copy";
import { DataActions } from "@/components/workspace/data-actions";
import { DeleteConfirm } from "@/components/workspace/delete-confirm";
import { ErrorCard } from "@/components/workspace/error-card";
import { RenameControl } from "@/components/workspace/rename-control";
import { WebUnsupported } from "@/components/workspace/web-unsupported";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useDeleteChart, useRenameChart, useWorkspaceChart } from "@/hooks/use-workspace";
import { buildExportPayload, exportChartRevision } from "@/lib/workspace/export";

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
 * Chart controls (03-06): inline rename at the title (D-12), and the
 * end-of-screen data-actions card — export (D-13: latest revision as
 * pretty JSON through the capability-gated share sheet) and delete
 * (D-14: modal-confirm-gated transactional cascade; success dismisses
 * the detail home, failure renders the exact error deck with Try
 * again and removes nothing). History arrives in a later plan.
 */

/** Export flow state — every outcome is a real rendered surface, never a toast. */
type ExportState = "idle" | "pending" | "unavailable" | "failed";

export default function SavedChartScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const chartId = typeof params.id === "string" ? params.id : "";
  const detailQuery = useWorkspaceChart(chartId);
  const renameMutation = useRenameChart(chartId);
  const deleteMutation = useDeleteChart(chartId);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [exportState, setExportState] = useState<ExportState>("idle");

  // Unknown chart (repository null) or missing id → home, never /birth.
  useEffect(() => {
    if (chartId.length === 0 || detailQuery.data === null) router.replace("/");
  }, [chartId, detailQuery.data]);

  // Delete success → the detail is dismissed home; the list refreshes
  // via the mutation's ['charts'] invalidation (Pitfall 10).
  useEffect(() => {
    if (deleteMutation.isSuccess) router.replace("/");
  }, [deleteMutation.isSuccess]);

  // Delete failure → the modal closes; the error card owns recovery
  // ("Nothing was removed. Try again." — nothing is silently retried).
  useEffect(() => {
    if (deleteMutation.isError) setConfirmVisible(false);
  }, [deleteMutation.isError]);

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

  const runExport = async () => {
    if (exportState === "pending") return;
    setExportState("pending");
    try {
      const result = await exportChartRevision(
        buildExportPayload({
          chartId: detail.chart.chartId,
          revisionId: detail.latest.revisionId,
          label: detail.chart.label,
          identity: detail.latest.identity,
          envelope: detail.latest.envelope,
        })
      );
      setExportState(result.status === "shared" ? "idle" : "unavailable");
    } catch {
      // Honest failure: the file could not be created — nothing lost.
      setExportState("failed");
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <RenameControl
        label={detail.chart.label}
        onCommit={(label) => renameMutation.mutate(label)}
      />
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

      <DataActions
        revisionCount={detail.revisionCount}
        onExport={() => void runExport()}
        exportPending={exportState === "pending"}
        onDelete={() => setConfirmVisible(true)}
        testID="saved-chart-data-actions"
      />

      {/* Share sheet unavailable — the capability state, not an error (D-03 vocabulary). */}
      {exportState === "unavailable" ? <WebUnsupported /> : null}

      {/* Export failure — the exact error deck with a working retry. */}
      {exportState === "failed" ? (
        <ErrorCard
          heading={EXPORT_ERROR_COPY.heading}
          body={EXPORT_ERROR_COPY.body}
          actionLabel={EXPORT_ERROR_COPY.action}
          onAction={() => void runExport()}
          testID="saved-chart-export-error"
        />
      ) : null}

      {/* Delete failure — nothing was removed; retry re-runs the confirmed cascade. */}
      {deleteMutation.isError ? (
        <ErrorCard
          heading={DELETE_ERROR_COPY.heading}
          body={DELETE_ERROR_COPY.body}
          actionLabel={DELETE_ERROR_COPY.action}
          onAction={() => deleteMutation.mutate()}
          testID="saved-chart-delete-error"
        />
      ) : null}

      <DeleteConfirm
        visible={confirmVisible}
        variant="chart"
        label={detail.chart.label}
        revisionCount={detail.revisionCount}
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmVisible(false)}
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
