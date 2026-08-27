import {
  WHAT_CHANGED_BIRTH_DATE,
  WHAT_CHANGED_BIRTH_TIME,
  WHAT_CHANGED_BIRTHPLACE,
  WHAT_CHANGED_DETAILS,
  WHAT_CHANGED_HOUSE_SYSTEM,
  WHAT_CHANGED_ORIGINAL_DETAILS,
  WHAT_CHANGED_TIME_CONFIDENCE,
  WHAT_CHANGED_TIME_ZONE,
  WHAT_CHANGED_TIME_ZONE_RESOLUTION,
} from "@/components/workspace/copy";

import type { ChartRevisionSummary } from "./repository";
import type { StoredCalculationInputs } from "./schema";

/**
 * Revision diff utilities (D-07) — the "what changed" derivation behind the
 * History list and the read-only revision marker.
 *
 * Pure functions over pairs of StoredCalculationInputs, template-over-facts
 * only (the T-02-34 discipline, chart/copy.ts formatter idiom): a diff maps
 * to the copy deck's fixed phrase vocabulary (A-3-UI-7), never a raw JSON
 * diff, never an invented interpretation (T-03-24). No React, no storage —
 * trivially unit-testable.
 *
 * Field → phrase mapping (single change → its phrase; multiple → the
 * "Details changed" fallback):
 * - date → "Birth date changed"
 * - time → "Birth time changed"
 * - place / place_form → "Birthplace changed"
 * - iana_zone / zone_source → "Time zone changed"
 * - time_resolution → "Time-zone resolution changed"
 * - confidence → "Time confidence changed"
 * - house_system → "House system changed"
 */

/** True when the place selection differs between two stored bases. */
function placeChanged(prev: StoredCalculationInputs, next: StoredCalculationInputs): boolean {
  if (
    prev.place.label !== next.place.label ||
    prev.place.lat !== next.place.lat ||
    prev.place.lon !== next.place.lon
  ) {
    return true;
  }
  if (
    prev.place_form.source !== next.place_form.source ||
    prev.place_form.label !== next.place_form.label ||
    prev.place_form.lat !== next.place_form.lat ||
    prev.place_form.lon !== next.place_form.lon
  ) {
    return true;
  }
  // Branch-specific fields beyond the shared ones. The manual branch's
  // iana_zone IS the tz_override — a zone change there surfaces through the
  // top-level iana_zone comparison ("Time zone changed"), so only the
  // google branch carries place-only extras here.
  if (prev.place_form.source === "google" && next.place_form.source === "google") {
    return (
      prev.place_form.location_type !== next.place_form.location_type ||
      prev.place_form.place_id !== next.place_form.place_id
    );
  }
  return false;
}

/** True when the D-08 tricky-time resolution choice is unchanged. */
function sameTimeResolution(
  prev: StoredCalculationInputs["time_resolution"],
  next: StoredCalculationInputs["time_resolution"]
): boolean {
  if (prev === undefined && next === undefined) return true;
  if (prev === undefined || next === undefined) return false;
  return prev.mode === next.mode && prev.label === next.label && prev.utc === next.utc;
}

/**
 * The human "what changed" phrase for one revision relative to its
 * predecessor. Exactly one of the copy deck's fixed phrases; multiple
 * differing fields collapse to the "Details changed" fallback. Identical
 * inputs (unreachable through the UI — the (chart, input_revision) dedupe
 * of D-06 prevents the pair) stay inside the closed vocabulary too.
 */
export function whatChangedPhrase(
  prev: StoredCalculationInputs,
  next: StoredCalculationInputs
): string {
  const changed: string[] = [];
  if (prev.date !== next.date) changed.push(WHAT_CHANGED_BIRTH_DATE);
  if (prev.time !== next.time) changed.push(WHAT_CHANGED_BIRTH_TIME);
  if (placeChanged(prev, next)) changed.push(WHAT_CHANGED_BIRTHPLACE);
  if (prev.iana_zone !== next.iana_zone || prev.zone_source !== next.zone_source) {
    changed.push(WHAT_CHANGED_TIME_ZONE);
  }
  if (!sameTimeResolution(prev.time_resolution, next.time_resolution)) {
    changed.push(WHAT_CHANGED_TIME_ZONE_RESOLUTION);
  }
  if (prev.confidence !== next.confidence) changed.push(WHAT_CHANGED_TIME_CONFIDENCE);
  if (prev.house_system !== next.house_system) changed.push(WHAT_CHANGED_HOUSE_SYSTEM);

  if (changed.length === 1) return changed[0]!;
  return WHAT_CHANGED_DETAILS; // zero (dedupe-guarded) or multiple fields
}

/** One History row's derived data (revision-diff output shape). */
export interface RevisionHistoryEntry {
  revisionId: string;
  /** Revision creation date as YYYY-MM-DD (identity-line vocabulary). */
  date: string;
  /** The derived "what changed" phrase from the fixed vocabulary. */
  phrase: string;
}

/** Format a revision's creation instant for the History rows (YYYY-MM-DD). */
export function formatHistoryDate(createdAt: Date): string {
  return createdAt.toISOString().slice(0, 10);
}

/**
 * Newest-first History entries. The chronologically FIRST revision of a
 * chart reads "Original details"; every later row is the diff against its
 * immediate predecessor. Ordering is owned here — arrival order never
 * changes the result.
 */
export function revisionHistoryEntries(
  revisions: readonly ChartRevisionSummary[]
): RevisionHistoryEntry[] {
  const chronological = [...revisions].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
  return chronological
    .map((revision, index) => ({
      revisionId: revision.revisionId,
      date: formatHistoryDate(revision.createdAt),
      phrase:
        index === 0
          ? WHAT_CHANGED_ORIGINAL_DETAILS
          : whatChangedPhrase(chronological[index - 1]!.inputs, revision.inputs),
    }))
    .reverse();
}
