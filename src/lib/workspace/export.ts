import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { CalculateResponse } from "@/lib/api-schemas";
import { slugify } from "./label";
import type { StoredIdentity } from "./schema";

/**
 * Single-chart JSON export (D-13 / WORK-07) — Pattern 6: a
 * slug-sanitized filename, a provenance-complete pretty-printed write
 * to the app cache dir via the OO File API, and a capability-gated
 * native share.
 *
 * Trust boundaries (plan threat model):
 * - user label → filesystem (T-03-18): the ONLY label-derived
 *   filesystem input is the slug from label.ts (alphanumeric+dash,
 *   capped, constant fallback) — computed BEFORE any File
 *   construction, so raw labels never reach the filesystem.
 * - app sandbox → other apps (T-03-20/T-03-21): the share sheet is
 *   the only egress; it always receives a cache-dir file uri from the
 *   OO File API — the exact path Android's native module accepts
 *   (Pitfall 7). Export files are transient user-initiated share
 *   artifacts in the sandbox cache dir (documented /privacy posture).
 *
 * Pure builders are exported for unit tests; exportChartRevision is
 * the only function touching device APIs.
 */

/** Provenance-complete export payload — everything a saved revision is (D-13). */
export interface ExportChartPayload {
  chartId: string;
  revisionId: string;
  label: string;
  identity: StoredIdentity;
  envelope: CalculateResponse;
}

/** Pure payload builder — key order is the export document's shape. */
export function buildExportPayload(input: {
  chartId: string;
  revisionId: string;
  label: string;
  identity: StoredIdentity;
  envelope: CalculateResponse;
}): ExportChartPayload {
  return {
    chartId: input.chartId,
    revisionId: input.revisionId,
    label: input.label,
    identity: input.identity,
    envelope: input.envelope,
  };
}

/**
 * Export filename: `lemastra-chart-<slug(label)>-<revision-id>.json`.
 * The slug sanitizes emoji/spaces/separators (T-03-18) and the
 * revision-id suffix makes names effectively unique (Pitfall 6);
 * re-exports of the same revision overwrite the same file.
 */
export function buildExportFilename(label: string, revisionId: string): string {
  return `lemastra-chart-${slugify(label)}-${revisionId}.json`;
}

/** Typed outcome — `unavailable` is a capability state, not an error (D-03 vocabulary). */
export type ExportChartResult =
  | { status: "shared"; uri: string }
  | { status: "unavailable" };

/**
 * Write the payload as 2-space pretty JSON under Paths.cache (creates
 * or overwrites — OO File.write semantics) and hand it to the native
 * share sheet as application/json, gated on Sharing.isAvailableAsync().
 */
export async function exportChartRevision(
  payload: ExportChartPayload
): Promise<ExportChartResult> {
  const name = buildExportFilename(payload.label, payload.revisionId);
  const file = new File(Paths.cache, name);
  await file.write(JSON.stringify(payload, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    // Capability gate (Pitfall 7 / T-03-21): the caller renders the
    // capability state; nothing is reported as broken.
    return { status: "unavailable" };
  }

  await Sharing.shareAsync(file.uri, { mimeType: "application/json" });
  return { status: "shared", uri: file.uri };
}
