import * as SQLite from "expo-sqlite";

import { getTableColumns, getTableName } from "drizzle-orm";

// Deep driver subpath, not the barrel — drizzle-orm/expo-sqlite's index
// re-exports query.js (useLiveQuery), whose top-level expo-sqlite import
// pulls the real native package into any non-device graph (03-01 Task 2).
import { drizzle } from "drizzle-orm/expo-sqlite/driver";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

// Explicit .js extension — vite does not append extensions for
// extensionless relative imports (tsc bundler mode and Metro accept it).
// db.ts is three levels deep (src/lib/workspace) → three ups to root.
import migrations from "../../../drizzle/migrations.js";
import { logger } from "@/lib/redact";
import { WorkspaceError } from "./errors";
import * as schema from "./schema";

/**
 * Workspace database gate (03-01 Task 3, Pattern 1; hardened 03-10).
 *
 * What: the lazy singleton every workspace repository call awaits —
 * openDatabaseSync → drizzle() → imperative migrate() → post-migrate
 * shape verification → db. Under vitest the `expo-sqlite` specifier
 * resolves to the node:sqlite facade (same file-backed semantics); on
 * device it is the real sandbox SQLite file (D-04 — plain SQLite in the
 * OS app sandbox, no encryption in v1).
 *
 * Why a memoized promise (Pitfall 3 / T-03-03): DB open + migrate are
 * async, and no query may be served against a not-yet-migrated (or
 * not-yet-open) database. Every caller awaits the SAME promise, so the
 * migration gate runs exactly once before any repository call touches
 * a table. A failed gate clears the memo so the next call retries the
 * gate instead of serving a permanently rejected promise.
 *
 * Hardened gate contract (03-10, UAT Test 1 gap / ranked root cause 1):
 * - TYPED FAILURES: no raw error ever escapes — every gate failure
 *   (open, migrate, shape verification) is logged through the
 *   sanctioned logger (error_code OPEN_FAILED + error_message with the
 *   underlying engine text) and rethrown as WorkspaceError OPEN_FAILED
 *   with fixed developer copy naming the failed stage.
 * - SHAPE VERIFICATION: after migrate(), PRAGMA table_info column-name
 *   sets are compared against drizzle's getTableColumns of the two
 *   personal tables — the check derives its expectation from schema.ts,
 *   so future migrations keep it correct with zero maintenance. A
 *   device-resident lemastra.db from an earlier dev build (whose
 *   journal row makes drizzle SKIP re-migration over a stale table
 *   shape) is detected here instead of corrupting saves.
 * - DEV-BUILD SELF-HEAL: on any gate failure, a dev build (runtime-safe
 *   __DEV__ probe) drops chart_revisions → charts → __drizzle_migrations
 *   (FK-safe order, DROP TABLE IF EXISTS via execSync — deliberately
 *   not file deletion) and re-runs migrate() + shape verification on the
 *   SAME drizzle instance, bounded to ONE attempt. The heal spares
 *   everything outside SQLite (AsyncStorage disclosure flags untouched
 *   — same sparing semantics as deleteAllData); pre-release, no
 *   production users exist, and dev-build data loss to a stale schema
 *   is the honest recovery. PRODUCTION BUILDS NEVER WIPE — they fail
 *   typed (T-03-10-02). openDatabaseSync itself failing yields no
 *   client handle: no heal, typed failure directly.
 *
 * D-03 adapter seam: this module is the only expo-sqlite consumer; a
 * later web (IndexedDB) adapter slots in behind the repository
 * interface without touching screens. Mounted lazily (module-level
 * singleton, like the query-client precedent) — no React coupling.
 */

export const WORKSPACE_DB_NAME = "lemastra.db";

const buildDb = (client: SQLite.SQLiteDatabase) => drizzle(client, { schema });

export type WorkspaceDb = ReturnType<typeof buildDb>;

// __DEV__ is a React Native global that does not exist under plain-Node
// vitest — the local declare types the probe for tsc while the runtime
// typeof check keeps the gate safe on any platform.
declare const __DEV__: boolean | undefined;

/** Dev-build flag — the self-heal wipe is dev-only (T-03-10-02). */
function isDevBuild(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__ === true;
}

/** The gate stage that failed — named in the typed error's fixed copy. */
type GateStage =
  | "open"
  | "migrate"
  | "shape verification"
  | "self-heal re-migrate"
  | "self-heal shape verification";

function underlyingMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Workspace database error.";
}

/**
 * Log the failure through the sanctioned seam (same metadata contract
 * as the repository error boundary — 03-10 Task 1) and build the typed
 * error. The engine text rides ONLY in the redact()-filtered metadata;
 * the thrown message is fixed developer copy naming the stage.
 */
function failGate(stage: GateStage, error: unknown): WorkspaceError {
  logger.error("workspace db gate failed — storage engine error", {
    error_code: "OPEN_FAILED",
    error_message: underlyingMessage(error),
  });
  return new WorkspaceError({
    code: "OPEN_FAILED",
    message: `Workspace database could not be opened — the ${stage} stage failed.`,
  });
}

/** Close a failing client without ever masking the original failure. */
function closeClientQuietly(client: SQLite.SQLiteDatabase | null): void {
  if (client === null) return;
  try {
    client.closeSync();
  } catch {
    // A close failure must never mask the gate failure being thrown.
  }
}

/** Actual column-name set of a table, via PRAGMA table_info. */
function tableColumnNames(client: SQLite.SQLiteDatabase, table: string): Set<string> {
  const rows = client
    .prepareSync(`PRAGMA table_info(${table})`)
    .executeSync<{ name: unknown }>()
    .getAllSync();
  return new Set(rows.map((row) => String(row.name)));
}

/**
 * Post-migrate shape verification: the PRAGMA column-name SET (order-
 * independent) of each personal table must equal drizzle's expectation
 * derived from schema.ts. A missing OR unexpected column is a mismatch
 * — the gate fails rather than serving queries against a stale shape.
 */
function verifyPostMigrateShape(client: SQLite.SQLiteDatabase): void {
  for (const table of [schema.charts, schema.chartRevisions]) {
    const expected = new Set(
      Object.values(getTableColumns(table)).map((column) => column.name)
    );
    const actual = tableColumnNames(client, getTableName(table));
    const missing = [...expected].filter((name) => !actual.has(name));
    const unexpected = [...actual].filter((name) => !expected.has(name));
    if (missing.length > 0 || unexpected.length > 0) {
      throw new Error(
        `post-migrate schema shape mismatch on ${getTableName(table)}: ` +
          `missing [${missing.join(", ")}], unexpected [${unexpected.join(", ")}]`
      );
    }
  }
}

/**
 * One bounded dev-build self-heal attempt (T-03-10-02): drop the
 * personal tables + drizzle journal in FK-safe order, then re-run
 * migrate() and the shape verification on the same drizzle instance.
 * A second failure propagates to the caller's typed failure path.
 */
async function healWorkspaceDb(client: SQLite.SQLiteDatabase, db: WorkspaceDb): Promise<void> {
  client.execSync("DROP TABLE IF EXISTS chart_revisions");
  client.execSync("DROP TABLE IF EXISTS charts");
  client.execSync("DROP TABLE IF EXISTS __drizzle_migrations");
  await migrate(db, migrations);
  verifyPostMigrateShape(client);
}

let dbPromise: Promise<WorkspaceDb> | null = null;

export function getWorkspaceDb(): Promise<WorkspaceDb> {
  if (dbPromise === null) {
    const init = (async () => {
      let client: SQLite.SQLiteDatabase | null = null;
      let db: WorkspaceDb | null = null;
      let stage: GateStage = "open";
      try {
        client = SQLite.openDatabaseSync(WORKSPACE_DB_NAME);
        db = buildDb(client);
        stage = "migrate";
        await migrate(db, migrations);
        stage = "shape verification";
        verifyPostMigrateShape(client);
        return db;
      } catch (error) {
        if (client !== null && db !== null && isDevBuild()) {
          // Dev build with a client handle: ONE self-heal attempt. A
          // heal failure (or a shape mismatch that survives it) throws
          // the typed OPEN_FAILED below — the heal is never retried.
          let healStage: GateStage = "self-heal re-migrate";
          try {
            await healWorkspaceDb(client, db);
            healStage = "self-heal shape verification";
            verifyPostMigrateShape(client);
            logger.warn("workspace db self-heal — stale dev database dropped and re-migrated", {
              count: 1,
            });
            return db;
          } catch (healError) {
            closeClientQuietly(client);
            throw failGate(healStage, healError);
          }
        }
        // Production build, no dev flag, or no client handle (the open
        // itself failed): NO wipe ever — typed, logged failure.
        closeClientQuietly(client);
        throw failGate(stage, error);
      }
    })();
    dbPromise = init;
    // A failed gate is retryable; unhandled-rejection noise is avoided
    // because every caller awaits dbPromise (== init) anyway.
    void init.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

/** Test-only: drop the memoized promise so the next call re-runs the gate. */
export function resetWorkspaceDbForTests(): void {
  dbPromise = null;
}
