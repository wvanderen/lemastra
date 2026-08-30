import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";

import { AssumptionsLine } from "@/components/chart/assumptions-line";
import { EvidenceLists } from "@/components/chart/explore/evidence-lists";
import { FactPanel } from "@/components/chart/explore/fact-panel";
import {
  createScrollLoopGuard,
  programmaticScrollTo,
  rowKeyFor,
  scrollTargetFor,
  type RowTopsRegistry,
} from "@/components/chart/explore/scroll-target";
import { WheelCanvas } from "@/components/chart/explore/wheel-canvas";
import { UnavailableFactors } from "@/components/chart/unavailable-factors";
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
 * panel adjacent below (D-09), the synchronized evidence lists under
 * both (WHEEL-04), and the D-13 trust sections closing the page —
 * final order: wheel → fact panel → placements → houses → aspects →
 * lots → sect → assumptions → unavailable (D-02/D-13).
 *
 * ONE shared selection feeds everything (D-10): row press and wheel
 * tap both call the same setSelection; the wheel highlights, the panel
 * shows the facts, and the matching list row reports selected state.
 * Auto-scroll is WHEEL→LIST only (the pressed row is already visible):
 * a wheel-origin selection scrolls the page to scrollTargetFor(...)
 * under the loop guard, and scroll events can never re-select —
 * selection changes only on explicit user intent (Pitfall 9; the guard
 * contract lives in scroll-target.ts).
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
 * Trust sections (D-13): AssumptionsLine mounts WITHOUT an action
 * (03-07 optional action; this surface is read-only — revise flows
 * through the saved detail), and UnavailableFactors renders the server
 * reasons verbatim. Web posture (D-04): web renders the WebUnsupported
 * capability card with ZERO canvas mounted. A web /chart/explore visit
 * is genuinely data-less (the repository is web-unavailable — 03-03
 * D-03), so the capability card is the honest deep-link landing, not an
 * error; the full web evidence experience ships on /chart/result's web
 * branch in 04-07 Task 2.
 */

/** iOS needs a throttle for onScroll to fire at all (guard release). */
const SCROLL_EVENT_THROTTLE_MS = 16;

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

/** The native explore composition — wheel hero, fact panel, synced lists, trust sections. */
function ExploreContent({ envelope }: { envelope: CalculateResponse }) {
  const { width } = useWindowDimensions();
  const [selection, setSelection] = useState<FactorRef | null>(null);
  const geometry = useMemo(() => buildWheelGeometry(envelope, { size: 720 }), [envelope]);

  // D-10 auto-scroll plumbing (Pitfall 9): rows report measured tops
  // relative to the lists root; the wrapper's own page offset composes
  // at scroll time; only WHEEL-origin selections scroll — a pressed row
  // is already visible under the user's finger.
  const scrollRef = useRef<ScrollView>(null);
  const loopGuardRef = useRef(createScrollLoopGuard());
  const rowTopsRef = useRef(new Map<string, number>());
  const listsOffsetYRef = useRef(0);
  const scrollOnNextSelectionRef = useRef(false);

  const selectFromWheel = useCallback((factor: FactorRef) => {
    scrollOnNextSelectionRef.current = true;
    setSelection(factor);
  }, []);

  const selectFromRow = useCallback((factor: FactorRef) => {
    setSelection(factor);
  }, []);

  const handleRowLayout = useCallback((factor: FactorRef, topWithinLists: number) => {
    rowTopsRef.current.set(rowKeyFor(factor), topWithinLists);
  }, []);

  const handleListsLayout = useCallback((event: LayoutChangeEvent) => {
    listsOffsetYRef.current = event.nativeEvent.layout.y;
  }, []);

  // Wheel-origin auto-scroll under the loop guard. The registry is
  // composed at scroll time (row tops + the lists wrapper offset), so
  // measurement arrival order never matters. No matching row → no
  // scroll (sign/angle factors live only on the wheel).
  useEffect(() => {
    if (selection === null) return;
    if (!scrollOnNextSelectionRef.current) return;
    scrollOnNextSelectionRef.current = false;
    const registry: RowTopsRegistry = new Map();
    for (const [key, top] of rowTopsRef.current) {
      registry.set(key, top + listsOffsetYRef.current);
    }
    const target = scrollTargetFor(selection, registry);
    if (target === null) return;
    loopGuardRef.current.begin();
    // Module-boundary seam: tests spy programmaticScrollTo's payload.
    programmaticScrollTo(scrollRef, target);
  }, [selection]);

  // The ONLY scroll handler: it releases the programmatic guard and can
  // NEVER select — scroll events are not selection events (Pitfall 9;
  // the guard contract lives in scroll-target.ts).
  const releaseScrollGuard = useCallback(() => {
    loopGuardRef.current.end();
  }, []);

  // Responsive square: the container width minus content padding,
  // clamped to the geometry base (never upscaled past 720).
  const wheelSize = Math.min(Math.max(width - Spacing.three * 2, 360), 720);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={styles.content}
      onScroll={releaseScrollGuard}
      scrollEventThrottle={SCROLL_EVENT_THROTTLE_MS}
      testID="explore-scroll"
    >
      {/* D-02 wheel-first hero at the top — the chart's visual face. */}
      <WheelCanvas
        geometry={geometry}
        selection={selection}
        onSelect={selectFromWheel}
        size={wheelSize}
      />
      {/* D-09 inline fact panel adjacent below — selection and its facts
          read as one unit; no bottom sheet, no navigated fact screen. */}
      <FactPanel selection={selection} envelope={envelope} />
      {/* WHEEL-04: the synchronized evidence lists — five sections in
          D-02/D-13 order (placements → houses → aspects → lots → sect);
          the wrapper reports the block's page offset for auto-scroll. */}
      <View onLayout={handleListsLayout} testID="evidence-lists-wrapper">
        <EvidenceLists
          envelope={envelope}
          selection={selection}
          onSelect={selectFromRow}
          onRowLayout={handleRowLayout}
        />
      </View>
      {/* D-13 judgment section — methodological assumptions, read-only
          (no adjust action: revise flows through the saved detail). */}
      <AssumptionsLine
        provenance={envelope.provenance}
        confidence={envelope.chart_data.birth_time_confidence}
      />
      {/* D-13 uncertainty cards — server reasons verbatim; renders
          nothing for Timed/Rectified charts without flagged factors. */}
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
