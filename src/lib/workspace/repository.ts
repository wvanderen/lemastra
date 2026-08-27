import type { CalculateResponse, Confidence } from "@/lib/api-schemas";
import type { StoredCalculationInputs, StoredIdentity } from "./schema";

/**
 * Workspace repository (D-03 adapter seam) — the ONLY persistence module.
 *
 * Parse-then-trust (D-02): every envelope passes through
 * calculateResponseSchema.parse at save AND at read; stored data is
 * frozen at save time and re-validated before anything is returned to
 * calling code. A revision that no longer parses surfaces as a typed
 * WorkspaceError (OPEN_FAILED) — never a crash, never a partial return
 * (Pitfall 1).
 *
 * This module contains no network code (PRIV-01, test-enforced by the
 * 03-03 matrix): the stored envelope IS the evidence — reopen never
 * re-calls the API. Screens and hooks depend on the WorkspaceRepository
 * interface only, so tests inject fakes and a later web (IndexedDB)
 * adapter slots in behind the same seam.
 *
 * Revision law (D-05/D-06): revisions are append-only; the digest key is
 * the server-computed provenance.input_revision, which the client
 * compares but NEVER re-derives. Renaming touches chart metadata only;
 * deletion is an explicit transactional cascade (Pitfall 2 — the SQLite
 * foreign_keys pragma is never trusted).
 */

// ---------------------------------------------------------------------------
// Typed errors (ApiError pattern — typed failures, never crashes)
// ---------------------------------------------------------------------------

/**
 * Failure vocabulary for every workspace operation:
 * - OPEN_FAILED — the database could not be opened/migrated, or stored
 *   data failed its zod contract on read (Pitfall 1 typed reopen).
 * - SAVE_FAILED — a write transaction failed.
 * - NOT_FOUND — the requested chart/revision id does not exist.
 * - VALIDATION — envelope/label/inputs failed validation at save (D-02).
 * - UNAVAILABLE — the D-03 web gate: storage requires the native app.
 */
export type WorkspaceErrorCode =
  | "OPEN_FAILED"
  | "SAVE_FAILED"
  | "NOT_FOUND"
  | "VALIDATION"
  | "UNAVAILABLE";

/** Typed error for every workspace failure — mirrors ApiError's shape. */
export class WorkspaceError extends Error {
  readonly code: WorkspaceErrorCode;

  constructor(body: { code: WorkspaceErrorCode; message: string }) {
    super(body.message);
    this.name = "WorkspaceError";
    this.code = body.code;
  }
}

// ---------------------------------------------------------------------------
// Repository vocabulary (the D-03 seam every Phase-3 screen consumes)
// ---------------------------------------------------------------------------

/** One immutable revision as read back through the stored contracts. */
export interface RevisionContent {
  revisionId: string;
  /** Server sha256[:12] digest of the normalized inputs — never re-derived. */
  inputRevision: string;
  envelope: CalculateResponse;
  inputs: StoredCalculationInputs;
  identity: StoredIdentity;
  createdAt: Date;
}

/** A saved-chart list row (D-11) — summary columns only, never envelopes. */
export interface ChartListItem {
  chartId: string;
  label: string;
  date: string;
  placeLabel: string;
  confidence: Confidence;
  revisionCount: number;
  updatedAt: Date;
}

/** History entry — inputs included so History diffs without repository changes. */
export interface ChartRevisionSummary {
  revisionId: string;
  createdAt: Date;
  inputRevision: string;
  inputs: StoredCalculationInputs;
}

/** Full saved-chart read: metadata + latest revision content + history. */
export interface ChartDetail {
  chart: { chartId: string; label: string; createdAt: Date; updatedAt: Date };
  latest: RevisionContent;
  revisionCount: number;
  revisions: ChartRevisionSummary[];
}

/** A single revision read by id (read-only prior-revision view, D-07). */
export interface RevisionRead {
  chartId: string;
  label: string;
  revision: RevisionContent;
  createdAt: Date;
}

/** Save input — envelope is `unknown` because parse-then-trust starts here. */
export interface SaveChartInput {
  chartId?: string;
  label: string;
  envelope: unknown;
  inputs: StoredCalculationInputs;
  identity: StoredIdentity;
}

export interface SaveChartResult {
  chartId: string;
  revisionId: string;
  /** false when (chart, input_revision) already exists — nothing written (D-06). */
  appended: boolean;
}

/** One chart with its full revision chain (export-all corpus member, D-15). */
export interface ExportedChart {
  chartId: string;
  label: string;
  createdAt: Date;
  updatedAt: Date;
  revisions: RevisionContent[];
}

/** The complete personal corpus (PRIV-05 — provenance-complete export). */
export interface ExportedWorkspace {
  exportedAt: string;
  charts: ExportedChart[];
}

/**
 * The persistence vocabulary (D-03 adapter seam). Screens, hooks, and
 * tests depend on this interface only; the SQLite/Drizzle implementation
 * is the single native consumer of expo-sqlite.
 */
export interface WorkspaceRepository {
  /**
   * Save a calculation envelope. Without chartId: creates the chart row
   * + first revision in ONE transaction. With chartId: appends under the
   * existing chart — unless the chart already holds a revision with the
   * same provenance.input_revision, in which case nothing is written and
   * appended is false (D-06). Envelope/label/inputs/identity are
   * validated BEFORE any transaction; failures throw WorkspaceError
   * VALIDATION.
   */
  saveChart(input: SaveChartInput): Promise<SaveChartResult>;
  /** Saved charts, most-recently-updated first (D-11) — summary columns only. */
  listCharts(): Promise<ChartListItem[]>;
  /** Chart metadata + latest revision + full history; null when unknown id. */
  getChartDetail(chartId: string): Promise<ChartDetail | null>;
  /** One revision by id with its chart label; null when unknown id. */
  getRevisionContent(revisionId: string): Promise<RevisionRead | null>;
  /** Mutates chart label/updated_at ONLY — never a revision (D-05). */
  renameChart(chartId: string, label: string): Promise<void>;
  /** Deletes the chart and ALL its revisions in one transaction (D-14). */
  deleteChart(chartId: string): Promise<void>;
  /** The full personal corpus (PRIV-05). */
  exportAllData(): Promise<ExportedWorkspace>;
  /** Wipes every personal row (charts + revisions) — bookkeeping survives (PRIV-06). */
  deleteAllData(): Promise<void>;
  /** Native true, web false — the D-03 gate screens consume this. */
  isWorkspaceStorageAvailable(): boolean;
}
