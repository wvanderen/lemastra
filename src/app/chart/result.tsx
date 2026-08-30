import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { z } from "zod";

import { RESULT_TITLE, resultIdentityLine, resultValidationStatus } from "@/components/birth/copy";
import { AssumptionsLine } from "@/components/chart/assumptions-line";
import { EXPLORE_CARD_SAVE_HINT } from "@/components/chart/explore/copy";
import { EvidenceLists } from "@/components/chart/explore/evidence-lists";
import { FactPanel } from "@/components/chart/explore/fact-panel";
import { MiniWheelCard } from "@/components/chart/explore/mini-wheel-card";
import { ModeToggle } from "@/components/chart/explore/mode-toggle";
import { PlacementList } from "@/components/chart/placement-list";
import { ProvenanceDetails } from "@/components/chart/provenance-details";
import { UnavailableFactors } from "@/components/chart/unavailable-factors";
import { ThemedText } from "@/components/themed-text";
import {
  DEDUPE_HELPER,
  SAVE_CTA,
  SAVE_ERROR_COPY,
  SAVE_NEW_VERSION_CTA,
  SAVED_STATE,
  saveErrorCodeLine,
} from "@/components/workspace/copy";
import { ErrorCard } from "@/components/workspace/error-card";
import { SavePrompt } from "@/components/workspace/save-prompt";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useExploreMode } from "@/hooks/use-explore-mode";
import { useSaveChart } from "@/hooks/use-workspace";
import { useTheme } from "@/hooks/use-theme";
import { calculateResponseSchema } from "@/lib/api-schemas";
import type { FactorRef } from "@/lib/chart-wheel/geometry";
import { WorkspaceError } from "@/lib/workspace/errors";
import { smartDefaultLabel } from "@/lib/workspace/label";
import { storedCalculationInputsSchema } from "@/lib/workspace/schema";

/**
 * /chart/result — the phase's full trust surface (D-10/D-12/D-13),
 * extended in Phase 3 with the Save vertical slice (D-10, WORK-02).
 *
 * Parse-then-trust (T-02-33): the envelope param is parsed with
 * calculateResponseSchema and the identity param with its zod schema
 * BEFORE any render; a missing or malformed payload redirects to /birth
 * — this screen never partially renders unvalidated data. The request
 * param (Pattern 5 / A6 — the stored calculation inputs) parses beside
 * them through storedCalculationInputsSchema but guards SEPARATELY
 * (T-03-12): a present-but-malformed or absent request never redirects
 * — the Save CTA renders disabled instead, never a crash.
 *
 * Explicit-save-only (PRIV-01): nothing persists until the user taps
 * Save chart and confirms the label prompt; the useSaveChart mutation
 * is the ONLY write trigger (retry false — recovery is the error
 * card's Try again).
 *
 * Layout order (02-UI-SPEC + 03-UI-SPEC): Display title → identity
 * line → Save CTA block (D-10 insertion — visible without scrolling
 * past Placements) → "Placements" list → assumptions card →
 * "Calculation details" (expandable) → validation status →
 * unavailable-factors section (Unknown mode) → provisional-factors
 * cards. Post-save the CTA block becomes the neutral "Saved ✓" chip
 * in the same position (dedupe adds the already-saved helper).
 *
 * Revise flow (03-07, D-08): a chartId param (threaded by the confirm
 * screen) swaps the CTA label to "Save new version" and the save calls
 * repository.saveChart WITH chartId — appending under the same chart
 * while prior revisions stay byte-identical. No chartId → fresh flow,
 * new chart, "Save chart" label exactly as before.
 *
 * Web branch (04-07, D-04 user decision): on Platform.OS === "web" the
 * native wheel-first block (mini-wheel card + PlacementList) is
 * replaced by the full evidence experience — ModeToggle + FactPanel +
 * EvidenceLists from the SAME in-memory envelope, selection via
 * pressable rows (D-10 list-half), zero canvas. The web branch mounts
 * the same components the explore surface uses, so web users get dual
 * views, structured lists, fact panels, and exact facts without the
 * graphical wheel; the capability card stays only on the genuinely
 * data-less /chart/explore deep-link.
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
  const theme = useTheme();
  const save = useSaveChart();
  const [promptVisible, setPromptVisible] = useState(false);
  // Explore intent (D-03): tapped the wheel card on an unsaved chart —
  // the SavePrompt opens under this intent and a successful save pushes
  // the explore route with the returned chartId. PRIV-01 holds: the
  // prompt's confirm remains the ONLY persistence trigger.
  const [exploreIntent, setExploreIntent] = useState(false);
  // D-04 web branch (04-07 Task 2): web renders the full evidence
  // experience — ModeToggle + FactPanel + EvidenceLists — from the
  // in-memory envelope this screen already holds, with selection via
  // pressable rows (the D-10 list-half; no canvas, no wheel). ONE
  // shared selection + ONE mode state feed the same components the
  // native explore surface uses (T-04-16: no web-specific formatter
  // or data path — the hooks stay mounted on native too, just unused).
  const [selection, setSelection] = useState<FactorRef | null>(null);
  const { mode, setMode } = useExploreMode();
  const params = useLocalSearchParams<{
    envelope?: string;
    identity?: string;
    request?: string;
    chartId?: string;
  }>();

  // D-08: present only when launched from a saved chart's revise flow —
  // the Save CTA reads "Save new version" and the save appends under the
  // SAME chart. The fresh flow carries no chartId (creates a new chart).
  const chartId =
    typeof params.chartId === "string" && params.chartId.length > 0 ? params.chartId : undefined;

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

  // T-03-12: the request param is a SEPARATE guard — malformed or
  // absent stored inputs disable saving, never the screen.
  const requestInputs = useMemo(() => {
    if (!params.request) return null;
    try {
      return storedCalculationInputsSchema.parse(JSON.parse(params.request));
    } catch {
      return null;
    }
  }, [params.request]);

  useEffect(() => {
    if (!parsed) router.replace("/birth");
  }, [parsed]);

  if (!parsed) return null;

  const { envelope, identity } = parsed;
  const confidence = envelope.chart_data.birth_time_confidence;

  const saveDisabled = requestInputs === null || save.isPending;

  // The chart id the explore card can push: the revise-flow chartId
  // param (chart already exists) or the id a completed save returned.
  const savedChartId =
    save.isSuccess && save.data !== undefined ? save.data.chartId : chartId;

  // The ONLY persistence trigger (PRIV-01): the prompt's confirm.
  const handleSave = (label: string) => {
    if (!requestInputs) return;
    save.mutate(
      {
        // Revise flow: saveChart WITH chartId appends under the same
        // chart (dedupe honest via appended:false, D-06).
        ...(chartId !== undefined ? { chartId } : {}),
        label,
        envelope,
        inputs: requestInputs,
        identity,
      },
      {
        onSettled: () => setPromptVisible(false),
        onSuccess: (result) => {
          // Explore intent: push with the returned chartId — a dedupe
          // (appended:false) still pushes; the chart exists either way.
          if (exploreIntent) {
            setExploreIntent(false);
            router.push({ pathname: "/chart/explore", params: { id: result.chartId } });
          }
        },
      }
    );
  };

  // D-03 entry: saved (or revise-flow) charts push the explore route
  // directly; an unsaved chart opens the SavePrompt under the explore
  // intent first (cancel stays on result — nothing persists).
  const handleExplore = () => {
    if (savedChartId !== undefined) {
      router.push({ pathname: "/chart/explore", params: { id: savedChartId } });
      return;
    }
    setExploreIntent(true);
    setPromptVisible(true);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ThemedText type="subtitle" accessibilityRole="header">
        {RESULT_TITLE}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {resultIdentityLine(identity, confidence)}
      </ThemedText>

      {save.isSuccess ? (
        <View style={styles.savedBlock}>
          <View
            style={[styles.savedChip, { backgroundColor: theme.backgroundSelected }]}
            testID="result-saved-chip"
          >
            <ThemedText type="small" style={styles.savedChipLabel}>
              {SAVED_STATE}
            </ThemedText>
          </View>
          {save.data?.appended === false ? (
            <ThemedText type="small" themeColor="textSecondary">
              {DEDUPE_HELPER}
            </ThemedText>
          ) : null}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: saveDisabled }}
          disabled={saveDisabled}
          onPress={() => {
            setExploreIntent(false);
            setPromptVisible(true);
          }}
          style={[styles.saveCta, { backgroundColor: theme.accent }]}
          testID="result-save-cta"
        >
          {save.isPending ? (
            <ActivityIndicator color={theme.background} testID="result-saving-indicator" />
          ) : null}
          <ThemedText type="default" style={[styles.saveCtaLabel, { color: theme.background }]}>
            {chartId !== undefined ? SAVE_NEW_VERSION_CTA : SAVE_CTA}
          </ThemedText>
        </Pressable>
      )}

      {save.isError ? (
        <View style={styles.saveErrorBlock}>
          <ErrorCard
            heading={SAVE_ERROR_COPY.heading}
            body={SAVE_ERROR_COPY.body}
            actionLabel={SAVE_ERROR_COPY.action}
            onAction={() => {
              if (save.variables) save.mutate(save.variables);
            }}
            testID="result-save-error"
          />
          {save.error instanceof WorkspaceError ? (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              testID="result-save-error-code"
            >
              {saveErrorCodeLine(save.error.code)}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {Platform.OS === "web" ? (
        // D-04 (user decision): web renders the FULL evidence
        // experience in place of the native wheel-first block — the
        // SAME ModeToggle/FactPanel/EvidenceLists components the
        // explore surface uses, mounted from the SAME in-memory
        // envelope (dual views, structured lists, fact panels, exact
        // facts) with ZERO canvas. EvidenceLists' placements section
        // supersedes the plain PlacementList (no duplicate table); row
        // presses drive the one shared selection below the panel
        // (D-10's list-half — the wheel half does not exist on web).
        // Trust sections + the SavePrompt flow continue untouched.
        <>
          <ModeToggle mode={mode} onChange={setMode} />
          <FactPanel selection={selection} envelope={envelope} mode={mode} />
          <EvidenceLists
            envelope={envelope}
            selection={selection}
            onSelect={setSelection}
            mode={mode}
          />
        </>
      ) : (
        <>
          {/* D-03 wheel preview card — native only (D-04: no graphical
              wheel on web). Saved/revise charts push explore directly;
              unsaved opens the SavePrompt under the explore intent
              with the save-hint caption below. */}
          <View style={styles.exploreBlock}>
            <MiniWheelCard
              envelope={envelope}
              onPressExplore={handleExplore}
              testID="result-explore-card"
            />
            {savedChartId === undefined ? (
              <ThemedText type="small" themeColor="textSecondary">
                {EXPLORE_CARD_SAVE_HINT}
              </ThemedText>
            ) : null}
          </View>
          <PlacementList placements={envelope.chart_data.placements} />
        </>
      )}

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

      <SavePrompt
        visible={promptVisible}
        defaultLabel={smartDefaultLabel(identity.date, identity.label)}
        pending={save.isPending}
        onSave={handleSave}
        onCancel={() => {
          setPromptVisible(false);
          setExploreIntent(false);
        }}
        testID="result-save-prompt"
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
  saveCta: {
    borderRadius: 8,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  saveCtaLabel: {
    fontWeight: "600",
  },
  savedBlock: {
    gap: Spacing.two,
  },
  // Card + code caption group tightly (the caption belongs to the card,
  // not to the page-level content rhythm).
  // Card + caption group tightly (the caption belongs to the card).
  exploreBlock: {
    gap: Spacing.one,
  },
  saveErrorBlock: {
    gap: Spacing.one,
  },
  // Neutral post-save chip (03-UI-SPEC): backgroundSelected fill, no
  // accent, no success hue — the text carries the meaning.
  savedChip: {
    borderRadius: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.three,
  },
  savedChipLabel: {
    fontWeight: "600",
  },
});
