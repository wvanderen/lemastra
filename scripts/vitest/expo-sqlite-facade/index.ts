import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DatabaseSync, type SQLInputValue, type StatementSync } from "node:sqlite";

/**
 * expo-sqlite test facade for Vitest (plain-Node environment).
 *
 * Problem: the real `expo-sqlite` package reaches for native modules
 * (ExpoSQLite) that do not exist outside a device/simulator, so the
 * repository/data-layer code it backs could not be exercised by vitest —
 * and a hand-rolled fake SQL engine would lie about SQL semantics
 * (constraints, transactions, file persistence).
 *
 * Fix (zero new dependencies — Node 22 ships `node:sqlite` unflagged):
 * back the EXACT synchronous call surface that drizzle-orm@0.45.2's
 * expo-sqlite session consumes with node:sqlite's `DatabaseSync`, and
 * alias the `expo-sqlite` specifier to this module in vitest.config.ts
 * (the same slot the react-native facade occupies). The surface was
 * source-read, not guessed: node_modules/drizzle-orm/expo-sqlite/
 * session.js touches only `client.prepareSync(sql)` and, on the returned
 * statement, `executeSync(params)` → `{ changes, lastInsertRowId }` +
 * `getAllSync`/`getFirstSync` row getters, and
 * `executeForRawResultSync(params).getAllSync()` → positional value
 * arrays. The imperative migrator (drizzle-orm/expo-sqlite/migrator →
 * sqlite-core dialect `migrate()`) also only uses session
 * run/values/transaction — all of which route through that same surface.
 *
 * PITFALL 8 — SURFACE DISCIPLINE (T-03-02): implement exactly that call
 * list and NOTHING more. Repository code stays on the drizzle API (never
 * raw expo-sqlite methods) so this facade stays minimal; the contract
 * test (src/__tests__/expo-sqlite-facade.test.ts) pins every shape.
 *
 * Databases are FILE-BACKED under a per-run mkdtemp dir — never
 * `:memory:` — because WORK-03 restart semantics (close → reopen sees
 * the same data) are part of what tests must observe. Handles are
 * memoized by name (like expo-sqlite's own database map); `reset()` is
 * the test-only isolation hook that closes handles and clears the dir.
 */

/** Row objects as node:sqlite returns them (column-name keyed). */
type FacadeRow = Record<string, unknown>;

export interface FacadeRunResult {
  readonly changes: number;
  readonly lastInsertRowId: number;
  getAllSync(): FacadeRow[];
  getFirstSync(): FacadeRow | null;
}

export interface FacadeRawResult {
  getAllSync(): unknown[][];
}

export interface FacadeStatement {
  executeSync(params?: SQLInputValue[]): FacadeRunResult;
  executeForRawResultSync(params?: SQLInputValue[]): FacadeRawResult;
}

export interface FacadeDatabase {
  prepareSync(sql: string): FacadeStatement;
  execSync(sql: string): void;
  closeSync(): void;
}

let tempDir: string | null = null;
const openHandles = new Map<string, FacadeDatabase>();

function getTempDir(): string {
  tempDir ??= mkdtempSync(join(tmpdir(), "lemastra-vitest-sqlite-"));
  return tempDir;
}

/** node:sqlite may surface rowids as bigint; expo-sqlite uses number. */
function toNumber(value: number | bigint): number {
  return typeof value === "bigint" ? Number(value) : value;
}

function wrapStatement(stmt: StatementSync): FacadeStatement {
  return {
    executeSync(params: SQLInputValue[] = []) {
      const bound = stmt.run(...params);
      // expo-sqlite executes the statement ONCE inside executeSync and
      // the returned result caches its rows; node:sqlite has no single
      // call that yields both changes and rows, so rows are fetched by
      // the FIRST getter call and memoized. Observable behavior is
      // identical on the drizzle call surface (run() reads only
      // changes/rowid; all()/get() run on SELECT-shaped statements).
      let cached: FacadeRow[] | null = null;
      const rows = (): FacadeRow[] => {
        cached ??= stmt.all(...params);
        return cached;
      };
      return {
        // node:sqlite names it `lastInsertRowid` (lowercase d); drizzle's
        // session destructures `lastInsertRowId` (capital D) — map it.
        changes: toNumber(bound.changes),
        lastInsertRowId: toNumber(bound.lastInsertRowid),
        getAllSync: () => rows(),
        getFirstSync: () => rows()[0] ?? null,
      };
    },
    executeForRawResultSync(params: SQLInputValue[] = []) {
      return {
        // drizzle's mapResultRow indexes raw rows positionally, so rows
        // must be value ARRAYS. node:sqlite has no raw-row mode on this
        // Node line (rawALL landed later); Object.values preserves the
        // engine's column insertion order for drizzle's generated SQL.
        getAllSync: () => stmt.all(...params).map((row) => Object.values(row)),
      };
    },
  };
}

export function openDatabaseSync(name: string): FacadeDatabase {
  const existing = openHandles.get(name);
  if (existing) {
    return existing;
  }

  const db = new DatabaseSync(join(getTempDir(), name));
  const handle: FacadeDatabase = {
    prepareSync: (sql: string) => wrapStatement(db.prepare(sql)),
    execSync: (sql: string) => db.exec(sql),
    closeSync: () => {
      db.close();
      openHandles.delete(name);
    },
  };
  openHandles.set(name, handle);
  return handle;
}

/** Test-only isolation hook: close handles and clear the per-run temp dir. */
export function reset(): void {
  for (const handle of openHandles.values()) {
    handle.closeSync();
  }
  openHandles.clear();
  if (tempDir !== null) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
}
