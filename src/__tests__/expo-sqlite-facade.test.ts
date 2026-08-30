import { afterEach, describe, expect, it } from "vitest";

// Deep driver subpath, not the barrel: drizzle-orm/expo-sqlite's index
// re-exports query.js (the useLiveQuery React hook), whose top-level
// `import { addDatabaseChangeListener } from "expo-sqlite"` drags the
// REAL native package into the graph at module load. The driver subpath
// is a first-class export of drizzle-orm's exports map and contains
// everything the data layer uses.
import { drizzle } from "drizzle-orm/expo-sqlite/driver";
import { eq } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Every import goes through the "expo-sqlite" specifier — the vitest
// resolve.alias routes it to scripts/vitest/expo-sqlite-facade (the same
// slot the react-native facade occupies in vitest.config.ts). Importing
// the facade by file path here would hide an alias regression.
import * as SQLite from "expo-sqlite";

/**
 * Facade contract test (03-01 Task 2, Pitfall 8 / T-03-02).
 *
 * Pins the exact return shapes drizzle-orm@0.45.2's expo-sqlite session
 * consumes (source-read: node_modules/drizzle-orm/expo-sqlite/session.js)
 * and proves the REAL drizzle driver runs end to end over node:sqlite —
 * driver compatibility, not just shape parity. This is the proof the
 * whole phase's test strategy rests on.
 */

const DB_NAME = "facade-contract.db";

afterEach(() => {
  // Test isolation: close open handles and clear the per-run temp dir.
  SQLite.reset();
});

describe("expo-sqlite facade module surface", () => {
  it("exports exactly openDatabaseSync + the test-only reset helper", () => {
    expect(Object.keys(SQLite).sort()).toEqual(["openDatabaseSync", "reset"]);
  });

  it("openDatabaseSync exposes exactly the drizzle sync call surface", () => {
    const db = SQLite.openDatabaseSync(DB_NAME);
    // prepareSync/execSync/closeSync — nothing else beyond what
    // drizzle-orm/expo-sqlite touches at module load (Pitfall 8:
    // surface discipline, implement exactly the call list).
    expect(Object.keys(db).sort()).toEqual(["closeSync", "execSync", "prepareSync"]);
    db.closeSync();
  });

  it("prepareSync returns exactly executeSync + executeForRawResultSync", () => {
    const db = SQLite.openDatabaseSync(DB_NAME);
    db.execSync("CREATE TABLE t (id INTEGER PRIMARY KEY, body TEXT NOT NULL)");
    const stmt = db.prepareSync("SELECT id, body FROM t");
    expect(Object.keys(stmt).sort()).toEqual(["executeForRawResultSync", "executeSync"]);
    db.closeSync();
  });
});

describe("expo-sqlite facade return shapes", () => {
  it("executeSync returns numeric changes/lastInsertRowId plus row getters", () => {
    const db = SQLite.openDatabaseSync(DB_NAME);
    db.execSync("CREATE TABLE t (id INTEGER PRIMARY KEY, body TEXT NOT NULL)");

    const run = db.prepareSync("INSERT INTO t (body) VALUES (?)").executeSync(["alpha"]);

    // drizzle session.js destructures { changes, lastInsertRowId } from
    // executeSync — both numeric (node:sqlite names it lastInsertRowid
    // with a lowercase d; the facade must map it). drizzle's run() path
    // reads only these two fields — getters are never called on
    // mutation statements, so the contract pins them on SELECTs only.
    expect(run.changes).toBe(1);
    expect(typeof run.changes).toBe("number");
    expect(run.lastInsertRowId).toBe(1);
    expect(typeof run.lastInsertRowId).toBe("number");

    // Row getters on a SELECT statement return column-named row objects,
    // stable across repeated calls (expo-sqlite caches the result set).
    const result = db.prepareSync("SELECT id, body FROM t").executeSync([]);
    expect(typeof result.getAllSync).toBe("function");
    expect(typeof result.getFirstSync).toBe("function");
    expect(result.getAllSync()).toEqual([{ id: 1, body: "alpha" }]);
    expect(result.getAllSync()).toEqual([{ id: 1, body: "alpha" }]);
    expect(result.getFirstSync()).toEqual({ id: 1, body: "alpha" });

    db.prepareSync("INSERT INTO t (body) VALUES (?)").executeSync(["beta"]);
    db.closeSync();
  });

  it("executeForRawResultSync returns raw value arrays, not row objects", () => {
    const db = SQLite.openDatabaseSync(DB_NAME);
    db.execSync("CREATE TABLE t (id INTEGER PRIMARY KEY, body TEXT NOT NULL)");
    db.prepareSync("INSERT INTO t (body) VALUES (?)").executeSync(["alpha"]);

    const raw = db
      .prepareSync("SELECT id, body FROM t WHERE id = ?")
      .executeForRawResultSync([1]);

    expect(Object.keys(raw).sort()).toEqual(["getAllSync"]);
    // drizzle's mapResultRow indexes raw rows positionally — arrays only.
    expect(raw.getAllSync()).toEqual([[1, "alpha"]]);

    db.closeSync();
  });
});

describe("expo-sqlite facade file persistence", () => {
  it("close → reopen by the same name sees the same data (file-backed)", () => {
    const db = SQLite.openDatabaseSync(DB_NAME);
    db.execSync("CREATE TABLE t (id INTEGER PRIMARY KEY, body TEXT NOT NULL)");
    db.prepareSync("INSERT INTO t (body) VALUES (?)").executeSync(["alpha"]);
    db.prepareSync("INSERT INTO t (body) VALUES (?)").executeSync(["beta"]);
    db.closeSync();

    const reopened = SQLite.openDatabaseSync(DB_NAME);
    const rows = reopened
      .prepareSync("SELECT COUNT(*) AS count FROM t")
      .executeForRawResultSync([])
      .getAllSync();
    expect(rows).toEqual([[2]]);
    reopened.closeSync();
  });

  it("reset clears the temp dir — the next open starts empty", () => {
    const db = SQLite.openDatabaseSync(DB_NAME);
    db.execSync("CREATE TABLE t (id INTEGER PRIMARY KEY, body TEXT NOT NULL)");
    db.prepareSync("INSERT INTO t (body) VALUES (?)").executeSync(["alpha"]);
    db.closeSync();

    SQLite.reset();

    const fresh = SQLite.openDatabaseSync(DB_NAME);
    const tables = fresh
      .prepareSync(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 't'"
      )
      .executeForRawResultSync([])
      .getAllSync();
    expect(tables).toEqual([[0]]);
    fresh.closeSync();
  });
});

describe("drizzle driver over the facade (T-03-02 compatibility proof)", () => {
  const notes = sqliteTable("facade_notes", {
    id: int("id").primaryKey({ autoIncrement: true }),
    body: text("body").notNull(),
  });

  it("runs insert/select/delete-with-where and transaction blocks", () => {
    // drizzle is not a DDL tool — create the table on the same handle the
    // driver will use (the facade memoizes handles by name).
    const client = SQLite.openDatabaseSync("drizzle-roundtrip.db");
    client.execSync(
      "CREATE TABLE facade_notes (id INTEGER PRIMARY KEY AUTOINCREMENT, body TEXT NOT NULL)"
    );
    const db = drizzle(client);

    // insert (executeSync path)
    const inserted = db.insert(notes).values({ body: "alpha" }).run();
    expect(inserted.changes).toBe(1);

    // select (executeForRawResultSync + mapResultRow path)
    expect(db.select().from(notes).all()).toEqual([{ id: 1, body: "alpha" }]);

    // delete with where
    db.delete(notes).where(eq(notes.body, "alpha")).run();
    expect(db.select().from(notes).all()).toEqual([]);

    // transaction block: begin/commit through run() → prepareSync
    db.transaction((tx) => {
      tx.insert(notes).values({ body: "beta" }).run();
      tx.insert(notes).values({ body: "gamma" }).run();
    });
    expect(db.select().from(notes).all().length).toBe(2);

    // transaction rollback: a thrown body must roll the inserts back
    expect(() =>
      db.transaction((tx) => {
        tx.insert(notes).values({ body: "delta" }).run();
        throw new Error("rollback me");
      })
    ).toThrow("rollback me");
    expect(db.select().from(notes).all().length).toBe(2);
  });
});
