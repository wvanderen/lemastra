import * as SQLite from "expo-sqlite";

// Deep driver subpath, not the barrel — drizzle-orm/expo-sqlite's index
// re-exports query.js (useLiveQuery), whose top-level expo-sqlite import
// pulls the real native package into any non-device graph (03-01 Task 2).
import { drizzle } from "drizzle-orm/expo-sqlite/driver";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

// Explicit .js extension — vite does not append extensions for
// extensionless relative imports (tsc bundler mode and Metro accept it).
// db.ts is three levels deep (src/lib/workspace) → three ups to root.
import migrations from "../../../drizzle/migrations.js";
import * as schema from "./schema";

/**
 * Workspace database gate (03-01 Task 3, Pattern 1).
 *
 * What: the lazy singleton every workspace repository call awaits —
 * openDatabaseSync → drizzle() → imperative migrate() → db. Under
 * vitest the `expo-sqlite` specifier resolves to the node:sqlite
 * facade (same file-backed semantics); on device it is the real
 * sandbox SQLite file (D-04 — plain SQLite in the OS app sandbox, no
 * encryption in v1).
 *
 * Why a memoized promise (Pitfall 3 / T-03-03): DB open + migrate are
 * async, and no query may be served against a not-yet-migrated (or
 * not-yet-open) database. Every caller awaits the SAME promise, so the
 * migration gate runs exactly once before any repository call touches
 * a table. A failed open/migrate clears the memo so the next call
 * retries the gate instead of serving a permanently rejected promise.
 *
 * D-03 adapter seam: this module is the only expo-sqlite consumer; a
 * later web (IndexedDB) adapter slots in behind the repository
 * interface without touching screens. Mounted lazily (module-level
 * singleton, like the query-client precedent) — no React coupling.
 */

export const WORKSPACE_DB_NAME = "lemastra.db";

const buildDb = (client: SQLite.SQLiteDatabase) => drizzle(client, { schema });

export type WorkspaceDb = ReturnType<typeof buildDb>;

let dbPromise: Promise<WorkspaceDb> | null = null;

export function getWorkspaceDb(): Promise<WorkspaceDb> {
  if (dbPromise === null) {
    const init = (async () => {
      const client = SQLite.openDatabaseSync(WORKSPACE_DB_NAME);
      const db = buildDb(client);
      // Imperative migration gate — the journal makes re-runs no-ops on
      // an already-migrated file (verified by the reopen test).
      await migrate(db, migrations);
      return db;
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
