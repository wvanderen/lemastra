import { afterEach, describe, expect, it, vi } from "vitest";

import { eq } from "drizzle-orm";

// Through the alias — same slot as the facade contract test.
import * as SQLite from "expo-sqlite";

import type { CalculateResponse } from "@/lib/api-schemas";
import { logger } from "@/lib/redact";
import {
  getWorkspaceDb,
  resetWorkspaceDbForTests,
  WORKSPACE_DB_NAME,
} from "@/lib/workspace/db";
import { getChartDetail, saveChart, WorkspaceError } from "@/lib/workspace/repository";
import {
  storedCalculationInputsSchema,
  storedIdentitySchema,
} from "@/lib/workspace/schema";
import { chartRevisions, charts } from "@/lib/workspace/schema";

// The committed migration index (served by the vitest virtual module —
// same artifacts the device bundle inlines). The journal's `when` is
// what makes drizzle's migrator SKIP re-applying over a stale shape.
import migrations from "../../drizzle/migrations.js";

/**
 * Migration-gate test (03-01 Task 3, Pattern 1 / Pitfall 3 / T-03-01/03).
 *
 * Proves the full open → migrate → insert → read → close → reopen
 * pipeline through the same seam the repository will use, against the
 * file-backed node:sqlite facade: the lazy getWorkspaceDb() singleton
 * runs migrations BEFORE any query is served, the memoized promise
 * yields one instance, and a reopen of the same file (singleton reset +
 * facade handle close) finds the rows intact with migrations NOT
 * re-applied destructively.
 */

// ---------------------------------------------------------------------------
// Fixtures — server envelope shape (verbatim from result-screen.test.tsx)
// ---------------------------------------------------------------------------

const ORB_POLICY =
  "birth_to_chart.py default orb table (luminaries 10°, personal 7°, Jupiter–Pluto 8°, Node 5°, angles 8°; sextile capped 6°)";

const PROVENANCE = {
  skill_revision: "660d992",
  swisseph_version: "2.10.03",
  tzdata_version: "2026.3",
  schema_version: "chart-input v1",
  ephemeris_mode: "Moshier (built-in)",
  house_system: "Whole Sign",
  zodiac_mode: "tropical",
  orb_policy: ORB_POLICY,
  input_revision: "abc123def456",
  calculator_cmd: "python tools/birth_to_chart.py --input <temp-json> --validate",
} as const;

function envelope(): CalculateResponse {
  return {
    reading_type: "natal",
    chart_data: {
      house_system: "Whole Sign",
      placements: [
        {
          body: "Sun",
          sign: "Gemini",
          degree: 0.4375,
          absolute_degree: 60.4375,
          motion: "direct",
          house: 10,
        },
      ],
      birth_time_confidence: "Timed",
    },
    provenance: { ...PROVENANCE },
  };
}

const GOOGLE_PLACE_FORM = {
  source: "google",
  label: "Lisbon, Portugal",
  lat: 38.7223,
  lon: -9.1393,
  location_type: "ROOFTOP",
  place_id: "ChIJV4sOCOC3jEcRTAxP_DdwHw4",
  partial_match: false,
} as const;

const MANUAL_PLACE_FORM = {
  source: "manual",
  label: "Faro, Portugal",
  lat: 37.0194,
  lon: -7.9304,
  iana_zone: "Europe/Lisbon",
  zone_source: "manual",
} as const;

const STORED_INPUTS = {
  date: "1990-05-21",
  time: "14:32",
  time_resolution: { mode: "second_pass", label: "Second pass (01:45)", utc: "1990-05-21T00:45:00Z" },
  confidence: "Timed",
  house_system: "Whole Sign",
  place: { label: "Lisbon, Portugal", lat: 38.7223, lon: -9.1393 },
  place_form: GOOGLE_PLACE_FORM,
  iana_zone: "Europe/Lisbon",
  zone_source: "google",
} as const;

const STORED_IDENTITY = {
  date: "1990-05-21",
  time: "14:32",
  label: "Lisbon, Portugal",
  zone_source: "google",
} as const;

const CHART_ID = "018f3a1e-7c2b-7000-8000-3b2f1a9c8d4e";
const REVISION_ID = "018f3a1e-9d4b-7000-8000-5e7d2b0f9a6c";
const CREATED_AT = new Date("2026-08-27T12:00:00.000Z");

afterEach(() => {
  // Drop the memoized singleton FIRST (no handle held after), then close
  // facade handles + clear the per-run temp dir. Unstub the dev flag and
  // logger spies so later suites see the production-like default.
  resetWorkspaceDbForTests();
  SQLite.reset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("stored zod contracts (D-01/D-02 storage shapes)", () => {
  it("parses a google-branch stored-inputs payload with time_resolution", () => {
    expect(storedCalculationInputsSchema.parse(STORED_INPUTS)).toEqual(STORED_INPUTS);
  });

  it("parses a manual place_form and an empty time for Unknown confidence", () => {
    const parsed = storedCalculationInputsSchema.parse({
      ...STORED_INPUTS,
      time: "",
      time_resolution: undefined,
      confidence: "Unknown",
      place_form: MANUAL_PLACE_FORM,
      place: { label: "Faro, Portugal", lat: 37.0194, lon: -7.9304 },
      iana_zone: "Europe/Lisbon",
      zone_source: "manual",
    });
    expect(parsed.confidence).toBe("Unknown");
    expect(parsed.time).toBe("");
  });

  it("rejects an unknown place_form source and a bad confidence", () => {
    expect(() =>
      storedCalculationInputsSchema.parse({ ...STORED_INPUTS, place_form: { source: "gps" } })
    ).toThrow();
    expect(() =>
      storedCalculationInputsSchema.parse({ ...STORED_INPUTS, confidence: "guessed" })
    ).toThrow();
  });

  it("parses the stored identity shape (result-screen identity, D-02)", () => {
    expect(storedIdentitySchema.parse(STORED_IDENTITY)).toEqual(STORED_IDENTITY);
    expect(() => storedIdentitySchema.parse({ ...STORED_IDENTITY, zone_source: "gps" })).toThrow();
  });
});

describe("workspace db migration gate (Pattern 1, Pitfall 3)", () => {
  it("opens → migrates → accepts typed inserts → re-reads after close/reopen", async () => {
    // First caller: opens, migrates, returns the drizzle instance.
    const db = await getWorkspaceDb();

    db.insert(charts)
      .values({
        id: CHART_ID,
        label: "My chart",
        created_at: CREATED_AT,
        updated_at: CREATED_AT,
      })
      .run();

    db.insert(chartRevisions)
      .values({
        id: REVISION_ID,
        chart_id: CHART_ID,
        input_revision: PROVENANCE.input_revision,
        confidence: "Timed",
        identity_date: STORED_IDENTITY.date,
        identity_place_label: STORED_IDENTITY.label,
        envelope: envelope(),
        inputs: storedCalculationInputsSchema.parse(STORED_INPUTS),
        identity: storedIdentitySchema.parse(STORED_IDENTITY),
        created_at: CREATED_AT,
      })
      .run();

    // Memoized singleton: a second caller awaits the SAME instance.
    const again = await getWorkspaceDb();
    expect(again).toBe(db);

    // Typed read-back: json-mode columns round-trip, timestamps as Dates.
    const [chartRow] = db.select().from(charts).where(eq(charts.id, CHART_ID)).all();
    expect(chartRow.label).toBe("My chart");
    expect(chartRow.created_at).toBeInstanceOf(Date);
    expect(chartRow.created_at.getTime()).toBe(CREATED_AT.getTime());

    const [revisionRow] = db
      .select()
      .from(chartRevisions)
      .where(eq(chartRevisions.id, REVISION_ID))
      .all();
    expect(revisionRow.chart_id).toBe(CHART_ID);
    expect(revisionRow.input_revision).toBe(PROVENANCE.input_revision);
    expect(revisionRow.confidence).toBe("Timed");
    expect(revisionRow.identity_date).toBe("1990-05-21");
    expect(revisionRow.identity_place_label).toBe("Lisbon, Portugal");
    expect(revisionRow.envelope.chart_data.birth_time_confidence).toBe("Timed");
    expect(revisionRow.envelope.provenance.input_revision).toBe(PROVENANCE.input_revision);
    expect(revisionRow.inputs.place_form.source).toBe("google");
    expect(revisionRow.identity.label).toBe("Lisbon, Portugal");
    expect(revisionRow.created_at.getTime()).toBe(CREATED_AT.getTime());

    // --- Simulate app restart: drop the singleton, close the file ---
    // (The facade memoizes handles by name, so this closes the very
    // handle the db gate opened — WITHOUT deleting the temp dir, unlike
    // SQLite.reset() which is the per-test world reset.)
    resetWorkspaceDbForTests();
    SQLite.openDatabaseSync(WORKSPACE_DB_NAME).closeSync();

    // Reopen: the gate re-runs over the SAME file. Migrations must not
    // re-apply destructively — the row survives intact.
    const reopened = await getWorkspaceDb();
    expect(reopened).not.toBe(db);

    const [reread] = reopened
      .select()
      .from(chartRevisions)
      .where(eq(chartRevisions.id, REVISION_ID))
      .all();
    expect(reread.envelope.provenance.input_revision).toBe(PROVENANCE.input_revision);
    expect(reread.created_at.getTime()).toBe(CREATED_AT.getTime());

    // The schema (with its unique index) survived the reopen cycle:
    // appending the same (chart_id, input_revision) must still conflict.
    expect(() =>
      reopened
        .insert(chartRevisions)
        .values({
          id: "018f3a1e-ffff-7000-8000-ffffffffffff",
          chart_id: CHART_ID,
          input_revision: PROVENANCE.input_revision,
          confidence: "Timed",
          identity_date: STORED_IDENTITY.date,
          identity_place_label: STORED_IDENTITY.label,
          envelope: envelope(),
          inputs: storedCalculationInputsSchema.parse(STORED_INPUTS),
          identity: storedIdentitySchema.parse(STORED_IDENTITY),
          created_at: new Date("2026-08-27T13:00:00.000Z"),
        })
        .run()
    ).toThrow(/UNIQUE/);
  });

  it("serves every caller through the same database name", async () => {
    // The repository (03-03) will rely on the single-file invariant:
    // openDatabaseSync is called with exactly WORKSPACE_DB_NAME.
    const db = await getWorkspaceDb();
    const handle = SQLite.openDatabaseSync(WORKSPACE_DB_NAME);
    const rows = handle
      .prepareSync("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'")
      .executeForRawResultSync([])
      .getAllSync();
    expect(rows.length).toBeGreaterThan(0);
    expect(db).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Gate self-heal scenarios (03-10 Task 3) — stale device databases from
// earlier Phase-03 dev builds, proven against the file-backed facade.
//
// The UAT device state (.planning/debug/chart-save-fails.md, ranked root
// cause 1): a resident lemastra.db whose __drizzle_migrations row sits at
// the committed journal's `when`, so drizzle's migrator skips re-applying
// m0000 over a stale table shape — the shape check, not migrate(), is what
// catches it. Dev flag via vi.stubGlobal (the runtime-safe __DEV__ probe
// in db.ts defaults to production-like under plain-Node vitest).
// ---------------------------------------------------------------------------

/** The committed journal's `when` — drizzle skips folders at or below it. */
const JOURNAL_WHEN = migrations.journal.entries[0].when;

/**
 * Seed the UAT-device state: an OLD-shaped chart_revisions (pre-03-03:
 * no identity_date / identity_place_label summary columns), a charts
 * table, and a journal row whose created_at equals the committed `when`.
 */
function seedStaleShapeWithJournalDb(): void {
  const handle = SQLite.openDatabaseSync(WORKSPACE_DB_NAME);
  handle.execSync(`CREATE TABLE chart_revisions (
	\`id\` text PRIMARY KEY NOT NULL,
	\`chart_id\` text NOT NULL,
	\`input_revision\` text NOT NULL,
	\`confidence\` text NOT NULL,
	\`envelope\` text NOT NULL,
	\`inputs\` text NOT NULL,
	\`identity\` text NOT NULL,
	\`created_at\` integer NOT NULL
)`);
  handle.execSync(`CREATE TABLE charts (
	\`id\` text PRIMARY KEY NOT NULL,
	\`label\` text NOT NULL,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
)`);
  // Drizzle's own journal-table shape (sqlite-core dialect migrate()).
  handle.execSync(
    "CREATE TABLE __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)"
  );
  handle
    .prepareSync("INSERT INTO __drizzle_migrations (id, hash, created_at) VALUES (1, '', ?)")
    .executeSync([JOURNAL_WHEN]);
  handle.closeSync();
}

describe("db gate self-heal — stale device DBs from earlier dev builds (03-10)", () => {
  it("dev build self-heals a stale shape with a journal row at the committed when — saveChart then succeeds (UAT Test 1 scenario)", async () => {
    seedStaleShapeWithJournalDb();
    vi.stubGlobal("__DEV__", true);
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    // The gate: migrate skips (journal row) → shape check detects the
    // missing summary columns → dev heal drops + re-migrates + re-verifies.
    const db = await getWorkspaceDb();
    expect(db).toBeDefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "workspace db self-heal — stale dev database dropped and re-migrated",
      { count: 1 }
    );
    expect(errorSpy).not.toHaveBeenCalled(); // the heal is warn-visible, not an error

    // The exact failure the user's device hit — a save against the
    // previously-conflicting DB — now succeeds and reads back.
    const saved = await saveChart({
      label: "Healed chart",
      envelope: envelope(),
      inputs: storedCalculationInputsSchema.parse(STORED_INPUTS),
      identity: storedIdentitySchema.parse(STORED_IDENTITY),
    });
    expect(saved.appended).toBe(true);

    const detail = await getChartDetail(saved.chartId);
    expect(detail?.chart.label).toBe("Healed chart");
    expect(detail?.revisionCount).toBe(1);
    expect(detail?.latest.envelope.provenance.input_revision).toBe(PROVENANCE.input_revision);
  });

  it("production build (dev flag off) fails typed OPEN_FAILED on the same stale DB — the mismatch is observable via the sanctioned logger", async () => {
    seedStaleShapeWithJournalDb();
    vi.stubGlobal("__DEV__", false);
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    await expect(getWorkspaceDb()).rejects.toMatchObject({
      name: "WorkspaceError",
      code: "OPEN_FAILED",
      message: expect.stringContaining("shape verification"),
    } satisfies Partial<WorkspaceError>);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "workspace db gate failed — storage engine error",
      {
        error_code: "OPEN_FAILED",
        error_message: expect.stringContaining("identity_date"), // the missing column is named
      }
    );
    expect(warnSpy).not.toHaveBeenCalled(); // production NEVER wipes (T-03-10-02)
  });

  it("dev build recovers a partial migration (tables present, journal absent) via the self-heal", async () => {
    // Migration died mid-way on device: fully-migrated table shapes but
    // no journal row. Seed it through the REAL migrator, then drop only
    // the journal table.
    await getWorkspaceDb();
    resetWorkspaceDbForTests();
    const handle = SQLite.openDatabaseSync(WORKSPACE_DB_NAME);
    handle.execSync("DROP TABLE __drizzle_migrations");
    handle.closeSync();

    vi.stubGlobal("__DEV__", true);
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    // Re-running m0000 over the existing tables must fail ("table
    // already exists"), the heal drops + re-migrates, and the save path
    // is healthy again.
    const db = await getWorkspaceDb();
    expect(db).toBeDefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    const saved = await saveChart({
      label: "Partial-migration chart",
      envelope: envelope(),
      inputs: storedCalculationInputsSchema.parse(STORED_INPUTS),
      identity: storedIdentitySchema.parse(STORED_IDENTITY),
    });
    const detail = await getChartDetail(saved.chartId);
    expect(detail?.chart.label).toBe("Partial-migration chart");
    expect(detail?.latest.identity.label).toBe(STORED_IDENTITY.label);
  });

  it("the self-heal is bounded to ONE attempt — a DB that fails even after the drop + re-migrate throws typed OPEN_FAILED", async () => {
    // A VIEW named chart_revisions: DROP TABLE cannot remove it, so the
    // heal's drop list spares it and the re-migrate fails on the name
    // conflict — a database that fails even after drop + re-migrate.
    const handle = SQLite.openDatabaseSync(WORKSPACE_DB_NAME);
    handle.execSync("CREATE VIEW chart_revisions AS SELECT 1 AS id");
    handle.closeSync();

    vi.stubGlobal("__DEV__", true);
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    await expect(getWorkspaceDb()).rejects.toMatchObject({
      name: "WorkspaceError",
      code: "OPEN_FAILED",
      message: expect.stringContaining("self-heal"),
    } satisfies Partial<WorkspaceError>);
    // Exactly one gate failure logged, no successful-heal warn: the
    // heal ran once (the stage is named in the thrown copy) and was
    // never retried.
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "workspace db gate failed — storage engine error",
      {
        error_code: "OPEN_FAILED",
        error_message: expect.stringContaining("chart_revisions"),
      }
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
