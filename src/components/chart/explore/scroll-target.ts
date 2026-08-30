import type { FactorRef } from "@/lib/chart-wheel/geometry";

/**
 * Pure auto-scroll targeting (04-04 Task 2) — the vitest seam per
 * 04-RESEARCH Open Question 3: every scroll-target computation lives in
 * THIS module, which has ZERO react-native imports, so the math and
 * the loop-guard contract below are unit-testable in plain Node,
 * independently of RN scrolling mechanics. The surface only measures
 * rows (onLayout) and calls ScrollView.scrollTo with the computed y.
 *
 * Registry contract: the explore surface measures each pressable
 * evidence row's y-offset in ScrollView CONTENT coordinates (the row's
 * offset within its section list + the list's offset within the lists
 * root + the lists root's own offset within the page content — composed
 * at scroll time) and stores it keyed by rowKeyFor(factor).
 * scrollTargetFor(selection, registry) returns the stored top for the
 * selection's row, or null when the selection has no list row (sign and
 * angle factors live only on the wheel) or the row has not been
 * measured yet.
 *
 * LOOP-GUARD CONTRACT (Pitfall 9 — auto-scroll feedback loops):
 *
 *   Selection changes ONLY on explicit user intent (a row press, a
 *   wheel tap, an a11y-overlay activate). Scroll position is NEVER a
 *   selection event.
 *
 *   The surface's ONLY programmatic writes to scroll position run under
 *   createScrollLoopGuard(): begin() before scrollTo, end() when the
 *   scroll events settle. Any future scroll-position-derived logic MUST
 *   check isProgrammatic() and MUST NEVER call setSelection from a
 *   scroll handler — scroll→select→scroll feedback is a geometry-grade
 *   bug (lists twitching after every selection), not a tuning problem.
 *
 *   Directionality: only WHEEL-origin selections auto-scroll (the row
 *   the user just pressed is already visible under their finger).
 */

/** Registry key for a pressable evidence row. */
export type RowKey = string;

/** Measured row tops in ScrollView content coordinates (the scrollTo y-space). */
export type RowTopsRegistry = Map<RowKey, number>;

/**
 * The registry key for a selectable row — placements, houses, and
 * aspects only (the three FactorRef kinds with list rows). Sign/angle
 * keys are produced for completeness but never registered, so their
 * lookups return null.
 */
export function rowKeyFor(factor: FactorRef): RowKey {
  switch (factor.kind) {
    case "planet":
      return `planet-${factor.body}`;
    case "house":
      return `house-${factor.house}`;
    case "aspect":
      return `aspect-${factor.index}`;
    default:
      // sign/angle factors have no list rows — never registered.
      return `${factor.kind}`;
  }
}

/**
 * The scroll target for a selection: the row's measured top, or null
 * when there is no matching row (null selection, wheel-only factor, or
 * unmeasured row). Pure: same inputs → same output, no RN involvement.
 */
export function scrollTargetFor(
  selection: FactorRef | null,
  registry: RowTopsRegistry
): number | null {
  if (selection === null) return null;
  const top = registry.get(rowKeyFor(selection));
  return top === undefined ? null : top;
}

/** The loop-guard handle (see the contract above). */
export interface ScrollLoopGuard {
  /** True while a programmatic (surface-initiated) scroll is in flight. */
  isProgrammatic(): boolean;
  /** Mark the start of a programmatic scroll. */
  begin(): void;
  /** Release the guard (scroll settled / user scroll observed). */
  end(): void;
}

/** Create a loop guard for one surface instance. */
export function createScrollLoopGuard(): ScrollLoopGuard {
  let programmatic = false;
  return {
    isProgrammatic: () => programmatic,
    begin: () => {
      programmatic = true;
    },
    end: () => {
      programmatic = false;
    },
  };
}

// ---------------------------------------------------------------------------
// Scroll invocation seam
// ---------------------------------------------------------------------------

/**
 * The scroll handle the surface implements with its RN ScrollView ref
 * (structural — this module never imports react-native, not even at
 * the type level; the explore surface's ref satisfies it).
 */
export interface ScrollViewLike {
  scrollTo(options: { y: number; animated?: boolean }): void;
}

/** A ref-like box around the scroll handle. */
export interface ScrollRefLike {
  current: ScrollViewLike | null;
}

/**
 * The programmatic auto-scroll invocation — one animated scrollTo to a
 * scrollTargetFor() result. Lives at a MODULE boundary so the surface
 * tests spy the exact payload (03-05 seam-mocking law): the RN vitest
 * shim's facade swaps ScrollView component identities per commit, so
 * instance/ref spying is not test-stable — the payload is the contract.
 */
export function programmaticScrollTo(ref: ScrollRefLike, y: number): void {
  ref.current?.scrollTo({ y, animated: true });
}
