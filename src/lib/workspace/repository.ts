import { and, desc, eq } from "drizzle-orm";
import { Platform } from "react-native";

import {
  calculateResponseSchema,
  type CalculateResponse,
  type Confidence,
} from "@/lib/api-schemas";
import { getWorkspaceDb } from "./db";
import { newChartId, newRevisionId } from "./ids";
import { labelSchema } from "./label";
import {
  chartRevisions,
  charts,
  storedCalculationInputsSchema,
  storedIdentitySchema,
  type StoredCalculationInputs,
  type StoredIdentity,
} from "./schema";

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

// ---------------------------------------------------------------------------
// SQLite implementation (function-per-operation over getWorkspaceDb())
// ---------------------------------------------------------------------------

/**
 * D-03 native gate: persistence targets iOS/Android. On web every
 * operation short-circuits with a typed UNAVAILABLE error so screens can
 * render the "saved charts require the app" degradation state — no web
 * storage code path exists this phase.
 */
export function isWorkspaceStorageAvailable(): boolean {
  return Platform.OS !== "web";
}

function requireStorageAvailable(): void {
  if (!isWorkspaceStorageAvailable()) {
    throw new WorkspaceError({
      code: "UNAVAILABLE",
      message: "Saved charts require the app — workspace storage is native-only.",
    });
  }
}

/** D-02 pre-write gate: a schema failure is a typed VALIDATION error. */
function parseOrThrow<T>(parse: () => T): T {
  try {
    return parse();
  } catch {
    throw new WorkspaceError({
      code: "VALIDATION",
      message: "The chart payload failed its contract and was not saved (D-02).",
    });
  }
}

/** Pitfall 1 typed reopen: stored data that no longer parses fails loudly. */
function parseRevisionAtRead(row: {
  id: string;
  input_revision: string;
  envelope: unknown;
  inputs: unknown;
  identity: unknown;
  created_at: Date;
}): RevisionContent {
  try {
    return {
      revisionId: row.id,
      inputRevision: row.input_revision,
      envelope: calculateResponseSchema.parse(row.envelope),
      inputs: storedCalculationInputsSchema.parse(row.inputs),
      identity: storedIdentitySchema.parse(row.identity),
      createdAt: row.created_at,
    };
  } catch {
    throw new WorkspaceError({
      code: "OPEN_FAILED",
      message:
        "A saved revision failed its stored contract on read — it will not render partially.",
    });
  }
}

/** Re-throw typed errors untouched; wrap engine failures as the given code. */
function toWorkspaceError(error: unknown, code: WorkspaceErrorCode): WorkspaceError {
  if (error instanceof WorkspaceError) return error;
  return new WorkspaceError({
    code,
    message: error instanceof Error ? error.message : "Workspace database error.",
  });
}

type RevisionRow = typeof chartRevisions.$inferSelect;

export async function saveChart(input: SaveChartInput): Promise<SaveChartResult> {
  requireStorageAvailable();

  // Parse-then-trust BEFORE any transaction (D-02): the envelope goes
  // through the API contract, the label/inputs/identity through the
  // stored contracts. The digest is READ from the parsed envelope's
  // provenance — never re-derived on the client (D-06).
  const label = parseOrThrow(() => labelSchema.parse(input.label));
  const envelope = parseOrThrow(() => calculateResponseSchema.parse(input.envelope));
  const inputs = parseOrThrow(() => storedCalculationInputsSchema.parse(input.inputs));
  const identity = parseOrThrow(() => storedIdentitySchema.parse(input.identity));
  const digest = envelope.provenance.input_revision;

  const db = await getWorkspaceDb();
  try {
    return db.transaction((tx) => {
      const now = new Date();
      let chartId = input.chartId;

      if (chartId === undefined) {
        // New identity: chart row + first revision commit together or not
        // at all (Pattern 4).
        chartId = newChartId();
        tx.insert(charts)
          .values({ id: chartId, label, created_at: now, updated_at: now })
          .run();
      } else {
        const chart = tx.select({ id: charts.id }).from(charts).where(eq(charts.id, chartId)).get();
        if (!chart) {
          throw new WorkspaceError({
            code: "NOT_FOUND",
            message: "No saved chart with that id — nothing was appended.",
          });
        }
      }

      // D-06 dedupe — key is (chart, input_revision) (Pitfall 4): an
      // existing revision with the same server digest means the basis is
      // unchanged, so nothing is written. (Checking the pair, not just
      // the latest row, keeps the unique index a true backstop: a
      // re-save of ANY prior basis is the same "already saved" state.)
      const existing = tx
        .select({ id: chartRevisions.id })
        .from(chartRevisions)
        .where(and(eq(chartRevisions.chart_id, chartId), eq(chartRevisions.input_revision, digest)))
        .get();
      if (existing) {
        return { chartId, revisionId: existing.id, appended: false as const };
      }

      const revisionId = newRevisionId();
      tx.insert(chartRevisions)
        .values({
          id: revisionId,
          chart_id: chartId,
          input_revision: digest,
          confidence: envelope.chart_data.birth_time_confidence,
          identity_date: identity.date,
          identity_place_label: identity.label,
          envelope,
          inputs,
          identity,
          created_at: now,
        })
        .run();
      tx.update(charts).set({ updated_at: now }).where(eq(charts.id, chartId)).run();
      return { chartId, revisionId, appended: true as const };
    });
  } catch (error) {
    throw toWorkspaceError(error, "SAVE_FAILED");
  }
}

export async function listCharts(): Promise<ChartListItem[]> {
  requireStorageAvailable();
  const db = await getWorkspaceDb();

  // Summary-only reads (D-11): the chart table for ordering, then the
  // revision SUMMARY columns (never envelope JSON) reduced per chart.
  // Ascending iteration leaves the LAST row per chart = latest revision.
  const chartRows = db
    .select({ chartId: charts.id, label: charts.label, updatedAt: charts.updated_at })
    .from(charts)
    .orderBy(desc(charts.updated_at))
    .all();
  if (chartRows.length === 0) return [];

  const revisionRows = db
    .select({
      chartId: chartRevisions.chart_id,
      date: chartRevisions.identity_date,
      placeLabel: chartRevisions.identity_place_label,
      confidence: chartRevisions.confidence,
    })
    .from(chartRevisions)
    .orderBy(chartRevisions.created_at)
    .all();

  const latest = new Map<string, (typeof revisionRows)[number]>();
  const counts = new Map<string, number>();
  for (const row of revisionRows) {
    counts.set(row.chartId, (counts.get(row.chartId) ?? 0) + 1);
    latest.set(row.chartId, row);
  }

  return chartRows.flatMap((chart) => {
    const summary = latest.get(chart.chartId);
    if (!summary) return []; // unreachable: chart+revision commit together
    return [
      {
        chartId: chart.chartId,
        label: chart.label,
        date: summary.date,
        placeLabel: summary.placeLabel,
        confidence: summary.confidence,
        revisionCount: counts.get(chart.chartId) ?? 0,
        updatedAt: chart.updatedAt,
      },
    ];
  });
}

export async function getChartDetail(chartId: string): Promise<ChartDetail | null> {
  requireStorageAvailable();
  const db = await getWorkspaceDb();

  const chart = db.select().from(charts).where(eq(charts.id, chartId)).get();
  if (!chart) return null;

  const revisionRows = db
    .select()
    .from(chartRevisions)
    .where(eq(chartRevisions.chart_id, chartId))
    .orderBy(desc(chartRevisions.created_at))
    .all();
  if (revisionRows.length === 0) return null; // unreachable: append always pairs

  // Parse-then-trust at read (D-02): latest envelope first — a corrupted
  // row throws OPEN_FAILED before anything partial escapes (Pitfall 1).
  const latest = parseRevisionAtRead(revisionRows[0] as RevisionRow);
  const revisions = revisionRows.map((row) => ({
    revisionId: row.id,
    createdAt: row.created_at,
    inputRevision: row.input_revision,
    inputs: storedCalculationInputsSchema.parse(row.inputs),
  }));

  return {
    chart: {
      chartId: chart.id,
      label: chart.label,
      createdAt: chart.created_at,
      updatedAt: chart.updated_at,
    },
    latest,
    revisionCount: revisionRows.length,
    revisions,
  };
}

export async function getRevisionContent(revisionId: string): Promise<RevisionRead | null> {
  requireStorageAvailable();
  const db = await getWorkspaceDb();

  const row = db
    .select({ revision: chartRevisions, chartLabel: charts.label })
    .from(chartRevisions)
    .innerJoin(charts, eq(chartRevisions.chart_id, charts.id))
    .where(eq(chartRevisions.id, revisionId))
    .get();
  if (!row) return null;

  return {
    chartId: row.revision.chart_id,
    label: row.chartLabel,
    revision: parseRevisionAtRead(row.revision as RevisionRow),
    createdAt: row.revision.created_at,
  };
}

export async function renameChart(chartId: string, label: string): Promise<void> {
  requireStorageAvailable();
  const parsed = parseOrThrow(() => labelSchema.parse(label));
  const db = await getWorkspaceDb();

  // D-05: chart metadata ONLY — this update never touches a revision row.
  const result = db
    .update(charts)
    .set({ label: parsed, updated_at: new Date() })
    .where(eq(charts.id, chartId))
    .run();
  if (result.changes === 0) {
    throw new WorkspaceError({ code: "NOT_FOUND", message: "No saved chart with that id." });
  }
}

export async function deleteChart(chartId: string): Promise<void> {
  requireStorageAvailable();
  const db = await getWorkspaceDb();

  try {
    // Explicit cascade (Pitfall 2): revisions then chart, one transaction.
    // The SQLite foreign_keys pragma is never trusted to do this.
    db.transaction((tx) => {
      const chart = tx.select({ id: charts.id }).from(charts).where(eq(charts.id, chartId)).get();
      if (!chart) {
        throw new WorkspaceError({ code: "NOT_FOUND", message: "No saved chart with that id." });
      }
      tx.delete(chartRevisions).where(eq(chartRevisions.chart_id, chartId)).run();
      tx.delete(charts).where(eq(charts.id, chartId)).run();
    });
  } catch (error) {
    throw toWorkspaceError(error, "SAVE_FAILED");
  }
}

export async function exportAllData(): Promise<ExportedWorkspace> {
  requireStorageAvailable();
  const db = await getWorkspaceDb();

  const chartRows = db.select().from(charts).orderBy(charts.created_at).all();
  const revisionRows = db
    .select()
    .from(chartRevisions)
    .orderBy(chartRevisions.created_at)
    .all();

  const byChart = new Map<string, RevisionContent[]>();
  for (const row of revisionRows) {
    const list = byChart.get(row.chart_id) ?? [];
    list.push(parseRevisionAtRead(row as RevisionRow)); // parse-then-trust at read
    byChart.set(row.chart_id, list);
  }

  return {
    exportedAt: new Date().toISOString(),
    charts: chartRows.map((chart) => ({
      chartId: chart.id,
      label: chart.label,
      createdAt: chart.created_at,
      updatedAt: chart.updated_at,
      revisions: byChart.get(chart.id) ?? [],
    })),
  };
}

export async function deleteAllData(): Promise<void> {
  requireStorageAvailable();
  const db = await getWorkspaceDb();

  // Pitfall 9: personal tables ONLY — the migration journal is engine
  // bookkeeping and disclosure flags live in AsyncStorage, both spared.
  db.transaction((tx) => {
    tx.delete(chartRevisions).run();
    tx.delete(charts).run();
  });
}
