import { useRef } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { formatDegreeMinutes, splitDegreeMinutes } from "@/components/chart/placement-list";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import type { ExploreMode } from "@/hooks/use-explore-mode";
import { useTheme } from "@/hooks/use-theme";
import type { CalculateResponse } from "@/lib/api-schemas";
import type { FactorRef } from "@/lib/chart-wheel/geometry";

import { PLACEMENTS_HEADING, housePhrase, motionLabel, placementA11yLabel } from "../copy";
import { Glossary } from "./glossary";
import {
  APPLYING_LABEL,
  ASPECTS_HEADING,
  EXACT_ASPECT_LABEL,
  GLOSSARY,
  GLOSSARY_TERM_RETROGRADE,
  HOUSES_HEADING,
  LOTS_HEADING,
  NOT_EXACT_ASPECT_LABEL,
  SECT_HEADING,
  SECT_LUMINARY_LABEL,
  SECT_MATES_LABEL,
  SEPARATING_LABEL,
  aspectRowA11yLabel,
  aspectRowA11yLabelSimple,
  houseRowA11yLabel,
  houseRowA11yLabelSimple,
  lotRowA11yLabel,
  orbVisualPhrase,
  sectCardA11yLabel,
  sectStatusPhrase,
} from "./copy";

/**
 * EvidenceLists (04-04 Task 1) — WHEEL-04's table half: the five
 * structured evidence sections rendered from the SAME stored envelope
 * the wheel draws (T-04-08: emitted fields only — no client-side
 * recomputation of any astrological fact anywhere in this file).
 *
 * Sections render ONLY when their envelope key exists — the Timed
 * fixture carries all five; an Unknown-time chart renders placements +
 * aspects and NO houses/lots/sect shells (Phase-2 D-10 honesty: absent
 * keys ⇒ absent sections). Lots + sect render at FULL envelope depth
 * (formula, luminary, sect mates, notes verbatim) — the D-06
 * Technical-only sections; Simple mode hides them (04-06), along with
 * the orb / applying / separating fields, from the SAME data path.
 *
 * Rows extend the PlacementList patterns (never a fork): the Phase-1
 * card treatment, the ONE degree split (splitDegreeMinutes feeds both
 * the D°MM′ visual and the spoken sentence — A-UI-4), and the copy-deck
 * a11y sentences. Planet/house/aspect rows are PRESSABLE and emit the
 * same FactorRef union the wheel emits (D-10 one shared selection);
 * lots/sect have no FactorRef kind, so they render as plain listitems.
 *
 * Selected rows convey state through THREE channels (A11Y-02):
 * accessibilityState.selected + accent border + 600 label weight —
 * never color alone.
 *
 * Row measurement seam (Task 2's auto-scroll): rows report their
 * y-offset within their section list, lists report their offset within
 * this component, and onRowLayout(ref, composedTop) fires whenever
 * either measurement lands (re-emitting buffered rows when a list's
 * offset arrives late). The explore surface composes the component's
 * own offset and scrolls — scroll-target.ts owns the math.
 */

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

/** Section list ids — the layout-registry keys inside this component. */
const LIST_KEYS = {
  placements: "placements",
  houses: "houses",
  aspects: "aspects",
  lots: "lots",
} as const;

type ListKey = (typeof LIST_KEYS)[keyof typeof LIST_KEYS];

/** A buffered row measurement awaiting (or re-emitting after) its list offset. */
interface RowMeasure {
  factor: FactorRef;
  y: number;
  listKey: ListKey;
}

/**
 * Stable row testID (kind + identity). Test queries only — the
 * auto-scroll registry keys off FactorRef via scroll-target's
 * rowKeyFor, never off these strings.
 */
function rowTestId(factor: FactorRef): string {
  switch (factor.kind) {
    case "planet":
      return `evidence-row-planet-${factor.body}`;
    case "house":
      return `evidence-row-house-${factor.house}`;
    case "aspect":
      return `evidence-row-aspect-${factor.index}`;
    default:
      // sign/angle factors have no list rows; lots are identified by name.
      return `evidence-row-${factor.kind}`;
  }
}

/** Row testID for a lot (identified by name — no FactorRef kind exists). */
function lotTestId(name: string): string {
  return `evidence-row-lot-${name}`;
}

/** Does a row's factor equal the current selection? (wheel-canvas regionMatches law) */
function sameFactor(a: FactorRef, b: FactorRef): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "planet":
      return b.kind === "planet" && b.body === a.body;
    case "sign":
      return b.kind === "sign" && b.sign === a.sign;
    case "house":
      return b.kind === "house" && b.house === a.house;
    case "angle":
      return b.kind === "angle" && b.which === a.which;
    case "aspect":
      return b.kind === "aspect" && b.index === a.index;
  }
}

export type EvidenceListsProps = {
  /** The already-zod-parsed envelope (repository edge — parse-then-trust). */
  envelope: CalculateResponse;
  /** The shared selection (D-10) — highlights the matching row. */
  selection: FactorRef | null;
  /** Row press → the surface's shared setSelection (same union the wheel emits). */
  onSelect: (factor: FactorRef) => void;
  /**
   * Reports a pressable row's measured top WITHIN this component
   * (list offset + row offset). The surface adds the component's own
   * page offset — scroll-target.ts owns the target math.
   */
  onRowLayout?: (factor: FactorRef, topWithinLists: number) => void;
  /**
   * The explore mode (04-06, D-06): Simple hides the lots + sect
   * sections and the orb / applying / separating fields, swaps the
   * row sentences to the deck's plain-language variants, and renders
   * glossary chips for the covered terms — all from the SAME envelope
   * (no mode branch recomputes or rewords an astrological fact,
   * T-04-12). Technical renders every field at full depth.
   */
  mode: ExploreMode;
};

function SectionHeading({ label }: { label: string }) {
  return (
    <ThemedText type="default" accessibilityRole="header" style={styles.heading}>
      {label}
    </ThemedText>
  );
}

function SelectableRow({
  factor,
  selected,
  onPress,
  onLayout,
  a11yLabel,
  children,
}: {
  factor: FactorRef;
  selected: boolean;
  onPress: (factor: FactorRef) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  a11yLabel: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onPress(factor)}
      onLayout={onLayout}
      role="listitem"
      accessibilityState={{ selected }}
      accessibilityLabel={a11yLabel}
      testID={rowTestId(factor)}
      style={[
        styles.row,
        { backgroundColor: theme.backgroundElement },
        selected && styles.rowSelected,
        selected && { borderColor: theme.accent },
      ]}
    >
      {children}
    </Pressable>
  );
}

export function EvidenceLists({ envelope, selection, onSelect, onRowLayout, mode }: EvidenceListsProps) {
  const theme = useTheme();
  const chart = envelope.chart_data;
  const simple = mode === "simple";

  // Measurement buffers (Task 2 seam): rows arrive before/after their
  // list offset — emit whenever either lands, re-emitting buffered rows.
  const rowsRef = useRef(new Map<string, RowMeasure>());
  const listYsRef = useRef(new Map<ListKey, number>());

  const emitRow = (measure: RowMeasure) => {
    const listY = listYsRef.current.get(measure.listKey);
    if (listY !== undefined) onRowLayout?.(measure.factor, listY + measure.y);
  };

  const handleListLayout = (listKey: ListKey) => (event: LayoutChangeEvent) => {
    listYsRef.current.set(listKey, event.nativeEvent.layout.y);
    for (const measure of rowsRef.current.values()) {
      if (measure.listKey === listKey) emitRow(measure);
    }
  };

  const handleRowLayout = (factor: FactorRef, listKey: ListKey) => (event: LayoutChangeEvent) => {
    const measure: RowMeasure = { factor, y: event.nativeEvent.layout.y, listKey };
    rowsRef.current.set(rowTestId(factor), measure);
    emitRow(measure);
  };

  const isSelected = (factor: FactorRef) => selection !== null && sameFactor(factor, selection);

  return (
    <View style={styles.root}>
      {/* Placements — every calculated body (placement-list depth). */}
      <SectionHeading label={PLACEMENTS_HEADING} />
      <View
        role="list"
        accessible
        style={styles.list}
        testID="evidence-section-placements"
        onLayout={handleListLayout(LIST_KEYS.placements)}
      >
        {chart.placements.map((placement) => {
          const factor: FactorRef = { kind: "planet", body: placement.body };
          const selected = isSelected(factor);
          const { degrees, minutes } = splitDegreeMinutes(placement.degree);
          return (
            <SelectableRow
              key={`${placement.body}-${placement.absolute_degree}`}
              factor={factor}
              selected={selected}
              onPress={onSelect}
              onLayout={handleRowLayout(factor, LIST_KEYS.placements)}
              a11yLabel={placementA11yLabel({
                body: placement.body,
                sign: placement.sign,
                degrees,
                minutes,
                house: placement.house,
                motion: placement.motion,
                dignities: placement.dignity,
              })}
            >
              <ThemedText type="default" style={styles.rowLabel}>
                {placement.body}
              </ThemedText>
              <ThemedText
                type="default"
                style={selected ? styles.detailSelected : undefined}
              >{`${placement.sign} ${formatDegreeMinutes(placement.degree)}`}</ThemedText>
              {placement.house !== undefined ? (
                <ThemedText type="default">{housePhrase(placement.house)}</ThemedText>
              ) : null}
              <ThemedText type="default">{motionLabel(placement.motion)}</ThemedText>
              {/* Dignity renders ONLY where present — never a dash placeholder. */}
              {placement.dignity && placement.dignity.length > 0 ? (
                <ThemedText type="default">{placement.dignity.join(", ")}</ThemedText>
              ) : null}
              {/* D-08: Simple mode chips the covered motion term — the
                  glossary explains "retrograde" one tap away. */}
              {simple && placement.motion === GLOSSARY_TERM_RETROGRADE ? (
                <Glossary term={GLOSSARY_TERM_RETROGRADE} />
              ) : null}
            </SelectableRow>
          );
        })}
      </View>

      {/* Houses — only when the envelope carries cusps (D-10). */}
      {chart.house_cusps !== undefined ? (
        <>
          <SectionHeading label={HOUSES_HEADING} />
          <View
            role="list"
            accessible
            style={styles.list}
            testID="evidence-section-houses"
            onLayout={handleListLayout(LIST_KEYS.houses)}
          >
            {chart.house_cusps.map((cusp) => {
              const factor: FactorRef = { kind: "house", house: cusp.house };
              const selected = isSelected(factor);
              const { degrees, minutes } = splitDegreeMinutes(cusp.degree);
              return (
                <SelectableRow
                  key={`house-${cusp.house}`}
                  factor={factor}
                  selected={selected}
                  onPress={onSelect}
                  onLayout={handleRowLayout(factor, LIST_KEYS.houses)}
                  a11yLabel={
                    simple
                      ? houseRowA11yLabelSimple({
                          house: cusp.house,
                          cuspSign: cusp.sign,
                          degrees,
                          minutes,
                        })
                      : houseRowA11yLabel({
                          house: cusp.house,
                          cuspSign: cusp.sign,
                          degrees,
                          minutes,
                        })
                  }
                >
                  <ThemedText type="default" style={styles.rowLabel}>
                    {housePhrase(cusp.house)}
                  </ThemedText>
                  <ThemedText
                    type="default"
                    style={selected ? styles.detailSelected : undefined}
                  >{`${cusp.sign} ${formatDegreeMinutes(cusp.degree)}`}</ThemedText>
                </SelectableRow>
              );
            })}
          </View>
        </>
      ) : null}

      {/* Aspects — orb + presence-flag motion + exact state. */}
      {chart.aspects !== undefined ? (
        <>
          <SectionHeading label={ASPECTS_HEADING} />
          <View
            role="list"
            accessible
            style={styles.list}
            testID="evidence-section-aspects"
            onLayout={handleListLayout(LIST_KEYS.aspects)}
          >
            {chart.aspects.map((aspect, index) => {
              const factor: FactorRef = { kind: "aspect", index };
              const selected = isSelected(factor);
              return (
                <SelectableRow
                  key={`aspect-${index}`}
                  factor={factor}
                  selected={selected}
                  onPress={onSelect}
                  onLayout={handleRowLayout(factor, LIST_KEYS.aspects)}
                  a11yLabel={
                    simple
                      ? aspectRowA11yLabelSimple({
                          bodyA: aspect.body_a,
                          aspect: aspect.aspect,
                          bodyB: aspect.body_b,
                          orbDegrees: aspect.orb_degrees,
                          applying: aspect.applying,
                          separating: aspect.separating,
                          exact: aspect.exact,
                        })
                      : aspectRowA11yLabel({
                          bodyA: aspect.body_a,
                          aspect: aspect.aspect,
                          bodyB: aspect.body_b,
                          orbDegrees: aspect.orb_degrees,
                          applying: aspect.applying,
                          separating: aspect.separating,
                          exact: aspect.exact,
                        })
                  }
                >
                  <ThemedText
                    type="default"
                    style={styles.rowLabel}
                  >{`${aspect.body_a} ${aspect.aspect} ${aspect.body_b}`}</ThemedText>
                  {/* D-06: orb is a Technical-only field — Simple hides
                      the deep-technical columns, never rewords them. */}
                  {simple ? null : (
                    <ThemedText type="default" style={selected ? styles.detailSelected : undefined}>
                      {orbVisualPhrase(aspect.orb_degrees)}
                    </ThemedText>
                  )}
                  {/* Presence flags render ONLY when they exist AND the
                      mode shows them (D-06 hidden list) — stationary
                      contacts carry neither (calculator contract). */}
                  {aspect.applying === true && !simple ? (
                    <ThemedText type="default">{APPLYING_LABEL}</ThemedText>
                  ) : null}
                  {aspect.separating === true && !simple ? (
                    <ThemedText type="default">{SEPARATING_LABEL}</ThemedText>
                  ) : null}
                  <ThemedText type="default">
                    {aspect.exact ? EXACT_ASPECT_LABEL : NOT_EXACT_ASPECT_LABEL}
                  </ThemedText>
                  {/* D-08: Simple mode chips the aspect term (rendered
                      only when the deck covers it — envelope aspect
                      names stay verbatim, the glossary explains them). */}
                  {simple && GLOSSARY[aspect.aspect] !== undefined ? (
                    <Glossary term={aspect.aspect} />
                  ) : null}
                </SelectableRow>
              );
            })}
          </View>
        </>
      ) : null}

      {/* Lots — D-06 Technical-only section at full envelope depth
          (no FactorRef kind: plain listitems, never pressable).
          Simple mode hides it entirely (hidden list, D-06). */}
      {mode === "technical" && chart.lots !== undefined ? (
        <>
          <SectionHeading label={LOTS_HEADING} />
          <View
            role="list"
            accessible
            style={styles.list}
            testID="evidence-section-lots"
          >
            {chart.lots.map((lot) => {
              const { degrees, minutes } = splitDegreeMinutes(lot.degree);
              return (
                <View
                  key={lot.name}
                  style={[styles.row, { backgroundColor: theme.backgroundElement }]}
                  role="listitem"
                  accessible
                  testID={lotTestId(lot.name)}
                  accessibilityLabel={lotRowA11yLabel({
                    name: lot.name,
                    sign: lot.sign,
                    degrees,
                    minutes,
                    formula: lot.formula,
                  })}
                >
                  <ThemedText type="default" style={styles.rowLabel}>
                    {lot.name}
                  </ThemedText>
                  <ThemedText
                    type="default"
                  >{`${lot.sign} ${formatDegreeMinutes(lot.degree)}`}</ThemedText>
                  <ThemedText type="default">{lot.formula}</ThemedText>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {/* Sect — D-06 Technical-only card at full envelope depth,
          notes verbatim (the Sun-altitude basis). Simple mode hides
          it entirely (hidden list, D-06). */}
      {mode === "technical" && chart.sect !== undefined ? (
        <>
          <SectionHeading label={SECT_HEADING} />
          <View
            style={[styles.card, { backgroundColor: theme.backgroundElement }]}
            accessible
            testID="evidence-section-sect"
            accessibilityLabel={sectCardA11yLabel({
              status: chart.sect.status,
              luminary: chart.sect.luminary_of_sect,
              sectMates: chart.sect.sect_mate_planets,
              notes: chart.sect.notes,
            })}
          >
            <ThemedText type="default" style={styles.rowLabel}>
              {sectStatusPhrase(chart.sect.status)}
            </ThemedText>
            <ThemedText
              type="default"
            >{`${SECT_LUMINARY_LABEL}: ${chart.sect.luminary_of_sect}`}</ThemedText>
            <ThemedText
              type="default"
            >{`${SECT_MATES_LABEL}: ${chart.sect.sect_mate_planets.join(", ")}`}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {chart.sect.notes}
            </ThemedText>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.two,
  },
  heading: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    padding: Spacing.three,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    columnGap: Spacing.two,
    rowGap: Spacing.one,
  },
  // Selected channel #2: a heavier accent border (color + structure —
  // never hue alone). The accent color itself is applied inline from
  // the live theme.
  rowSelected: {
    borderWidth: 2,
  },
  rowLabel: {
    fontWeight: "600",
  },
  // Selected channel #3: 600 weight on the selected row's fact text.
  detailSelected: {
    fontWeight: "600",
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
