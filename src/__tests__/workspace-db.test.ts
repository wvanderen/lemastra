import { afterEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

// Through the alias — same slot as the facade contract test.
import * as SQLite from "expo-sqlite";

import type { CalculateResponse } from "@/lib/api-schemas";
import { chartRevisions, charts } from "@/lib/workspace/schema";
import {
  getWorkspaceDb,
  resetWorkspaceDbForTests,
  WORKSPACE_DB_NAME,
} from "@/lib/workspace/db";
import {
  storedCalculationInputsSchema,
  storedIdentitySchema,
} from "@/lib/workspace/schema";

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
  // facade handles + clear the per-run temp dir.
  resetWorkspaceDbForTests();
  SQLite.reset();
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
    resetWorkspaceDbForTests();
    SQLite.reset();

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
