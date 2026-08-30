import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

// Through the alias — the node:sqlite-backed facade (03-01). reset() is
// the per-test world reset; openDatabaseSync/closeSync simulate restarts.
import * as SQLite from "expo-sqlite";

// ids.ts wraps expo-crypto, whose JS entry reaches for native modules —
// back it with node:crypto's UUIDv4 (same randomUUID shape on device).
vi.mock("expo-crypto", async () => {
  const nodeCrypto = await import("node:crypto");
  return { randomUUID: () => nodeCrypto.randomUUID() };
});

import { eq } from "drizzle-orm";

import {
  calculateResponseSchema,
  type CalculateResponse,
  type HouseSystem,
} from "@/lib/api-schemas";
import {
  getWorkspaceDb,
  resetWorkspaceDbForTests,
  WORKSPACE_DB_NAME,
} from "@/lib/workspace/db";
import {
  deleteAllData,
  deleteChart,
  exportAllData,
  getChartDetail,
  getRevisionContent,
  isWorkspaceStorageAvailable,
  listCharts,
  renameChart,
  saveChart,
  WorkspaceError,
} from "@/lib/workspace/repository";
import { chartRevisions, charts } from "@/lib/workspace/schema";

/**
 * Workspace repository integration tests (03-03 Tasks 2–3) — the full
 * persistence vocabulary proven against a REAL SQL engine through the
 * 03-01 facade, per the plan's behavior rows:
 *
 * - Save: chart+revision in ONE transaction; (chart, input_revision)
 *   dedupe writes nothing (D-06); parse-then-trust BEFORE any write
 *   (D-02); typed VALIDATION/NOT_FOUND failures.
 * - List: updated_at desc, summary columns only (D-11).
 * - Reads: envelope AND inputs re-parsed through the stored zod
 *   contracts (D-02); corrupted rows throw WorkspaceError OPEN_FAILED —
 *   never a crash, never partial data (Pitfall 1).
 * - Mutations: rename touches chart metadata only (D-05); delete is an
 *   explicit transactional cascade (Pitfall 2); delete-all wipes the
 *   personal tables only (Pitfall 9).
 * - Restart (WORK-03) / immutability byte-equality (WORK-04) / privacy
 *   source-scan (PRIV-01) / frozen-fixture regression live in the Task 3
 *   blocks below.
 *
 * Isolation: resetWorkspaceDbForTests() drops the db singleton, then
 * SQLite.reset() closes handles and clears the per-run temp dir — every
 * test starts on a fresh, migrated database file.
 */

// ---------------------------------------------------------------------------
// Fixtures — server envelope shapes (result-screen.test.tsx vocabulary)
// ---------------------------------------------------------------------------

const ORB_POLICY =
  "birth_to_chart.py default orb table (luminaries 10°, personal 7°, Jupiter–Pluto 8°, Node 5°, angles 8°; sextile capped 6°)";

/** Real-shaped provenance block; the digest is the only varying input. */
function envelope(digest: string): CalculateResponse {
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
        {
          body: "Moon",
          sign: "Cancer",
          degree: 14.05,
          absolute_degree: 104.05,
          motion: "direct",
          house: 11,
          dignity: ["Domicile"],
        },
      ],
      birth_time_confidence: "Timed",
    },
    provenance: {
      skill_revision: "660d992",
      swisseph_version: "2.10.03",
      tzdata_version: "2026.3",
      schema_version: "chart-input v1",
      ephemeris_mode: "Moshier (built-in)",
      house_system: "Whole Sign",
      zodiac_mode: "tropical",
      orb_policy: ORB_POLICY,
      input_revision: digest,
      calculator_cmd: "python tools/birth_to_chart.py --input <temp-json> --validate",
    },
  };
}

function storedInputs(houseSystem: HouseSystem = "Whole Sign") {
  return {
    date: "1990-05-21",
    time: "14:32",
    confidence: "Timed" as const,
    house_system: houseSystem,
    place: { label: "Lisbon, Portugal", lat: 38.7223, lon: -9.1393 },
    place_form: {
      source: "google" as const,
      label: "Lisbon, Portugal",
      lat: 38.7223,
      lon: -9.1393,
      location_type: "ROOFTOP" as const,
      place_id: "ChIJV4sOCOC3jEcRTAxP_DdwHw4",
      partial_match: false,
    },
    iana_zone: "Europe/Lisbon",
    zone_source: "google" as const,
  };
}

const IDENTITY = {
  date: "1990-05-21",
  time: "14:32",
  label: "Lisbon, Portugal",
  zone_source: "google",
} as const;

const UUIDV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Distinct updated_at ordering needs distinct millisecond stamps. */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function seedChart(label: string, digest: string) {
  return saveChart({
    label,
    envelope: envelope(digest),
    inputs: storedInputs(),
    identity: { ...IDENTITY },
  });
}

async function rawCounts(chartId?: string) {
  const db = await getWorkspaceDb();
  const chartRows = chartId
    ? db.select({ id: charts.id }).from(charts).where(eq(charts.id, chartId)).all()
    : db.select({ id: charts.id }).from(charts).all();
  const revisionRows = chartId
    ? db
        .select({ id: chartRevisions.id })
        .from(chartRevisions)
        .where(eq(chartRevisions.chart_id, chartId))
        .all()
    : db.select({ id: chartRevisions.id }).from(chartRevisions).all();
  return { charts: chartRows.length, revisions: revisionRows.length };
}

/** Raw access through the facade — byte-exact reads/mutations of stored text. */
function workspaceHandle(): ReturnType<typeof SQLite.openDatabaseSync> {
  return SQLite.openDatabaseSync(WORKSPACE_DB_NAME);
}

/** The exact stored envelope TEXT for a revision (json-mode column bytes). */
function rawEnvelopeText(revisionId: string): string {
  const rows = workspaceHandle()
    .prepareSync("SELECT envelope FROM chart_revisions WHERE id = ?")
    .executeForRawResultSync([revisionId])
    .getAllSync();
  return String(rows[0]?.[0]);
}

/** Corrupt a stored envelope in place (valid JSON, schema-invalid). */
function corruptEnvelope(revisionId: string): void {
  workspaceHandle()
    .prepareSync("UPDATE chart_revisions SET envelope = ? WHERE id = ?")
    .executeSync(['{"chart_data": {}}', revisionId]);
}

afterEach(() => {
  resetWorkspaceDbForTests();
  SQLite.reset();
});

// ---------------------------------------------------------------------------
// saveChart — creation, dedupe, append, validation (D-02/D-06)
// ---------------------------------------------------------------------------

describe("saveChart", () => {
  it("creates the chart row and first revision in one transaction (appended true)", async () => {
    const saved = await seedChart("Mia’s chart", "aaa111222333");

    expect(saved.appended).toBe(true);
    expect(saved.chartId).toMatch(UUIDV4);
    expect(saved.revisionId).toMatch(UUIDV4);

    const detail = await getChartDetail(saved.chartId);
    expect(detail?.chart.label).toBe("Mia’s chart");
    expect(detail?.revisionCount).toBe(1);
    expect(detail?.latest.envelope.provenance.input_revision).toBe("aaa111222333");
    expect(detail?.latest.envelope.chart_data.placements[0]?.body).toBe("Sun");
    expect(detail?.latest.inputs.place_form.source).toBe("google");
    expect(detail?.latest.identity.label).toBe("Lisbon, Portugal");
  });

  it("writes nothing when the chart already holds the same input_revision (D-06 dedupe)", async () => {
    const first = await seedChart("Mia’s chart", "bbb111222333");
    const second = await saveChart({
      chartId: first.chartId,
      label: "Mia’s chart",
      envelope: envelope("bbb111222333"),
      inputs: storedInputs(),
      identity: { ...IDENTITY },
    });

    expect(second.appended).toBe(false);
    expect(second.chartId).toBe(first.chartId);
    expect(second.revisionId).toBe(first.revisionId);

    const counts = await rawCounts(first.chartId);
    expect(counts).toEqual({ charts: 1, revisions: 1 });
    const detail = await getChartDetail(first.chartId);
    expect(detail?.revisionCount).toBe(1);
  });

  it("appends a new revision when the digest changed and bumps the chart", async () => {
    const first = await seedChart("Mia’s chart", "ccc111222333");
    await sleep(5);
    const second = await saveChart({
      chartId: first.chartId,
      label: "Mia’s chart",
      envelope: envelope("ccc111222444"),
      inputs: storedInputs(),
      identity: { ...IDENTITY },
    });

    expect(second.appended).toBe(true);
    expect(second.revisionId).not.toBe(first.revisionId);

    const detail = await getChartDetail(first.chartId);
    expect(detail?.revisionCount).toBe(2);
    expect(detail?.latest.inputRevision).toBe("ccc111222444");
    expect(detail?.revisions.map((r) => r.inputRevision)).toEqual([
      "ccc111222444",
      "ccc111222333",
    ]);
    // History entries carry the stored inputs (D-08 diff surface).
    expect(detail?.revisions[1]?.inputs.date).toBe("1990-05-21");
  });

  it("rejects an unparseable envelope, a bad label, and bad inputs with VALIDATION — before writing", async () => {
    await expect(
      saveChart({
        label: "Valid label",
        envelope: { chart_data: {} },
        inputs: storedInputs(),
        identity: { ...IDENTITY },
      })
    ).rejects.toMatchObject({ code: "VALIDATION", name: "WorkspaceError" });

    await expect(
      seedChart("   ", "ddd111222333")
    ).rejects.toMatchObject({ code: "VALIDATION" });

    await expect(
      saveChart({
        label: "Valid label",
        envelope: envelope("ddd111222333"),
        // Constructed through a JSON boundary so the deliberately-invalid
        // confidence reaches zod at runtime instead of failing tsc.
        inputs: JSON.parse(
          JSON.stringify({ ...storedInputs(), confidence: "guessed" })
        ),
        identity: { ...IDENTITY },
      })
    ).rejects.toMatchObject({ code: "VALIDATION" });

    const counts = await rawCounts();
    expect(counts).toEqual({ charts: 0, revisions: 0 });
  });

  it("throws NOT_FOUND when appending under an unknown chartId", async () => {
    await expect(
      saveChart({
        chartId: "no-such-chart",
        label: "Valid label",
        envelope: envelope("eee111222333"),
        inputs: storedInputs(),
        identity: { ...IDENTITY },
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ---------------------------------------------------------------------------
// listCharts — updated_at desc, summary columns only (D-11)
// ---------------------------------------------------------------------------

describe("listCharts", () => {
  it("lists most-recently-updated first with summary fields and no envelope parsing", async () => {
    const a = await seedChart("Chart A", "aaa111aaa111");
    await sleep(5);
    const b = await seedChart("Chart B", "bbb111bbb111");

    const list = await listCharts();
    expect(list.map((row) => row.label)).toEqual(["Chart B", "Chart A"]);

    const [first, second] = list;
    expect(first?.chartId).toBe(b.chartId);
    expect(first).toMatchObject({
      label: "Chart B",
      date: "1990-05-21",
      placeLabel: "Lisbon, Portugal",
      confidence: "Timed",
      revisionCount: 1,
    });
    expect(first?.updatedAt).toBeInstanceOf(Date);
    expect(second?.chartId).toBe(a.chartId);
  });
});

// ---------------------------------------------------------------------------
// Reads — parse-then-trust at every read (D-02)
// ---------------------------------------------------------------------------

describe("getChartDetail / getRevisionContent", () => {
  it("returns parsed envelope/inputs/identity content for a saved revision", async () => {
    const saved = await seedChart("Mia’s chart", "fff111222333");

    const read = await getRevisionContent(saved.revisionId);
    expect(read?.chartId).toBe(saved.chartId);
    expect(read?.label).toBe("Mia’s chart");
    expect(read?.revision.envelope.provenance.input_revision).toBe("fff111222333");
    expect(read?.revision.inputs.place.label).toBe("Lisbon, Portugal");
  });

  it("returns null for unknown chart and revision ids", async () => {
    expect(await getChartDetail("no-such-chart")).toBeNull();
    expect(await getRevisionContent("no-such-revision")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Mutations — rename metadata-only, cascade delete, wipe (D-05/D-14/PRIV-06)
// ---------------------------------------------------------------------------

describe("renameChart", () => {
  it("updates label and updated_at only; revisions untouched", async () => {
    const saved = await seedChart("Old name", "aaa222333444");
    const before = await getChartDetail(saved.chartId);
    await sleep(5);

    await renameChart(saved.chartId, "New name");

    const after = await getChartDetail(saved.chartId);
    expect(after?.chart.label).toBe("New name");
    expect(after?.chart.updatedAt.getTime()).toBeGreaterThan(
      before!.chart.updatedAt.getTime()
    );
    expect(after?.revisionCount).toBe(1);
    expect(after?.latest.inputRevision).toBe("aaa222333444");
  });

  it("rejects invalid labels with VALIDATION and unknown ids with NOT_FOUND", async () => {
    const saved = await seedChart("Old name", "aaa222333555");
    await expect(renameChart(saved.chartId, "")).rejects.toMatchObject({
      code: "VALIDATION",
    });
    await expect(renameChart("no-such-chart", "Whatever")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("deleteChart", () => {
  it("removes the chart and all its revisions in one transaction (explicit cascade)", async () => {
    const saved = await seedChart("Doomed chart", "bbb222333444");
    await saveChart({
      chartId: saved.chartId,
      label: "Doomed chart",
      envelope: envelope("bbb222333555"),
      inputs: storedInputs(),
      identity: { ...IDENTITY },
    });
    expect((await rawCounts(saved.chartId)).revisions).toBe(2);

    await deleteChart(saved.chartId);

    expect(await getChartDetail(saved.chartId)).toBeNull();
    expect(await rawCounts(saved.chartId)).toEqual({ charts: 0, revisions: 0 });
  });

  it("throws NOT_FOUND for an unknown chart", async () => {
    await expect(deleteChart("no-such-chart")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("deleteAllData", () => {
  it("wipes both personal tables and leaves nothing listed", async () => {
    await seedChart("Chart A", "ccc222333444");
    await seedChart("Chart B", "ccc222333555");

    await deleteAllData();

    expect(await listCharts()).toEqual([]);
    expect(await rawCounts()).toEqual({ charts: 0, revisions: 0 });
  });
});

// ---------------------------------------------------------------------------
// exportAllData — the full provenance-complete corpus (PRIV-05)
// ---------------------------------------------------------------------------

describe("exportAllData", () => {
  it("returns every chart with its full revision chain, parsed", async () => {
    const a = await seedChart("Chart A", "ddd222333444");
    await sleep(5);
    await saveChart({
      chartId: a.chartId,
      label: "Chart A",
      envelope: envelope("ddd222333555"),
      inputs: storedInputs(),
      identity: { ...IDENTITY },
    });
    await seedChart("Chart B", "ddd222333666");

    const exported = await exportAllData();
    expect(exported.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(exported.charts).toHaveLength(2);

    const chartA = exported.charts.find((c) => c.chartId === a.chartId);
    expect(chartA?.label).toBe("Chart A");
    expect(chartA?.revisions.map((r) => r.inputRevision)).toEqual([
      "ddd222333444",
      "ddd222333555",
    ]);
    expect(chartA?.revisions[0]?.envelope.provenance.input_revision).toBe("ddd222333444");
    expect(chartA?.revisions[0]?.inputs.place_form.source).toBe("google");
    expect(chartA?.revisions[0]?.identity.label).toBe("Lisbon, Portugal");
  });
});

// ---------------------------------------------------------------------------
// Availability gate (D-03)
// ---------------------------------------------------------------------------

describe("isWorkspaceStorageAvailable", () => {
  it("reports true on the native test substrate (web is the D-03 degradation)", () => {
    // The RN shim reports ios — the native branch. The web branch
    // (Platform.OS === 'web' → false) is consumed by gate screens later
    // in the phase.
    expect(isWorkspaceStorageAvailable()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 3 — integration matrix (restart, immutability, guards, frozen fixture)
// ---------------------------------------------------------------------------

describe("restart survival (WORK-03)", () => {
  it("keeps saved revisions across close→reopen from the SAME file, listing most-recently-updated first", async () => {
    const a = await seedChart("Chart A", "rst111222333");
    await sleep(5);
    const b = await seedChart("Chart B", "rst111222444");

    // Simulate app restart: drop the memoized singleton, close the file
    // handle (the facade memoizes by name, so this closes the gate's own
    // handle WITHOUT deleting the temp dir — SQLite.reset() is the
    // per-test world reset, not a restart).
    resetWorkspaceDbForTests();
    workspaceHandle().closeSync();

    // Reopen from the same file: the gate re-runs, rows survive.
    const list = await listCharts();
    expect(list.map((row) => row.chartId)).toEqual([b.chartId, a.chartId]); // updated_at desc
    expect(list[1]).toMatchObject({
      label: "Chart A",
      date: "1990-05-21",
      placeLabel: "Lisbon, Portugal",
      confidence: "Timed",
      revisionCount: 1,
    });

    const detail = await getChartDetail(b.chartId);
    expect(detail?.chart.label).toBe("Chart B");
    expect(detail?.latest.envelope.provenance.input_revision).toBe("rst111222444");
    expect(detail?.latest.envelope.chart_data.placements).toHaveLength(2);
    expect(detail?.latest.inputs.place_form.source).toBe("google");
  });
});

describe("revision immutability (WORK-04/D-06)", () => {
  it("keeps the prior revision's stored bytes identical after a changed-digest append; identical digest appends nothing", async () => {
    const first = await seedChart("Mia’s chart", "imm111222333");
    const firstBytes = rawEnvelopeText(first.revisionId);

    await sleep(5);
    const second = await saveChart({
      chartId: first.chartId,
      label: "Mia’s chart",
      envelope: envelope("imm111222444"),
      inputs: storedInputs(),
      identity: { ...IDENTITY },
    });
    expect(second.appended).toBe(true);
    expect(rawEnvelopeText(first.revisionId)).toBe(firstBytes); // byte-identical

    // Re-saving the latest basis: nothing written, count stays put.
    const again = await saveChart({
      chartId: first.chartId,
      label: "Mia’s chart",
      envelope: envelope("imm111222444"),
      inputs: storedInputs(),
      identity: { ...IDENTITY },
    });
    expect(again.appended).toBe(false);
    expect((await rawCounts(first.chartId)).revisions).toBe(2);
    expect(rawEnvelopeText(first.revisionId)).toBe(firstBytes);
  });
});

describe("mutations leave revision bytes untouched / wipe cleanly (D-05/D-14)", () => {
  it("renameChart keeps the stored envelope bytes identical", async () => {
    const saved = await seedChart("Old name", "mut111222333");
    const bytes = rawEnvelopeText(saved.revisionId);
    await sleep(5);

    await renameChart(saved.chartId, "New name");

    expect(rawEnvelopeText(saved.revisionId)).toBe(bytes);
    const list = await listCharts();
    expect(list[0]?.label).toBe("New name");
  });

  it("deleteChart leaves zero rows in both tables for that chart; deleteAllData empties both", async () => {
    const a = await seedChart("Chart A", "mut111222444");
    await saveChart({
      chartId: a.chartId,
      label: "Chart A",
      envelope: envelope("mut111222555"),
      inputs: storedInputs(),
      identity: { ...IDENTITY },
    });
    const b = await seedChart("Chart B", "mut111222666");

    await deleteChart(a.chartId);
    expect(await rawCounts(a.chartId)).toEqual({ charts: 0, revisions: 0 });
    expect((await listCharts()).map((row) => row.chartId)).toEqual([b.chartId]);

    await deleteAllData();
    expect(await rawCounts()).toEqual({ charts: 0, revisions: 0 });
  });
});

describe("export corpus (PRIV-05)", () => {
  it("deep-equals the seeded multi-chart/multi-revision corpus", async () => {
    const a = await seedChart("Chart A", "exp111222333");
    const firstRevisionId = a.revisionId;
    await sleep(5);
    await saveChart({
      chartId: a.chartId,
      label: "Chart A",
      envelope: envelope("exp111222444"),
      inputs: storedInputs(),
      identity: { ...IDENTITY },
    });
    await sleep(5);
    const b = await seedChart("Chart B", "exp111222555");

    const detailA = await getChartDetail(a.chartId);
    const detailB = await getChartDetail(b.chartId);
    const revisionA1 = await getRevisionContent(firstRevisionId);

    const exported = await exportAllData();
    expect(exported.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(exported.charts).toEqual([
      {
        chartId: a.chartId,
        label: "Chart A",
        createdAt: detailA!.chart.createdAt,
        updatedAt: detailA!.chart.updatedAt,
        revisions: [revisionA1!.revision, detailA!.latest],
      },
      {
        chartId: b.chartId,
        label: "Chart B",
        createdAt: detailB!.chart.createdAt,
        updatedAt: detailB!.chart.updatedAt,
        revisions: [detailB!.latest],
      },
    ]);
  });
});

describe("typed reopen failures (Pitfall 1 — T-03-09)", () => {
  it("surfaces a hand-corrupted stored envelope as WorkspaceError OPEN_FAILED — never a crash, never partial data", async () => {
    const saved = await seedChart("Mia’s chart", "crp111222333");
    corruptEnvelope(saved.revisionId);

    await expect(getChartDetail(saved.chartId)).rejects.toMatchObject({
      name: "WorkspaceError",
      code: "OPEN_FAILED",
    });
    await expect(getRevisionContent(saved.revisionId)).rejects.toMatchObject({
      code: "OPEN_FAILED",
    });
    await expect(exportAllData()).rejects.toMatchObject({ code: "OPEN_FAILED" });
  });
});

// ---------------------------------------------------------------------------
// Privacy source-scan (PRIV-01 — T-03-11) + frozen fixture (Pitfall 1)
// ---------------------------------------------------------------------------

const WORKSPACE_DIR = fileURLToPath(new URL("../lib/workspace/", import.meta.url));
const FROZEN_FIXTURE = new URL("../test/fixtures/frozen-natal-envelope.json", import.meta.url);

/**
 * The API CLIENT module (exact specifier) — `@/lib/api` / `./api` /
 * `../api`. Deliberately NOT api-schemas: the stored zod contracts ARE
 * the parse-then-trust dependency the repository must import (D-02).
 */
const API_CLIENT_SPECIFIER = /^(\.{1,2}\/|@\/lib\/)api$/;

/** Global network-call tokens — none may appear in the persistence layer. */
const NETWORK_CALL_TOKENS: readonly RegExp[] = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bsendBeacon\b/,
  /\baxios\b/,
];

/** Module specifiers referenced by import syntax (telemetry-guard helper). */
function importSpecifiers(content: string): string[] {
  const specifiers: string[] = [];
  const patterns = [
    /\bfrom\s*["']([^"'\n]+)["']/g,
    /\bimport\s*["']([^"'\n]+)["']/g,
    /\bimport\s*\(\s*["']([^"'\n]+)["']/g,
    /\brequire\s*\(\s*["']([^"'\n]+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (match[1]) specifiers.push(match[1]);
    }
  }
  return specifiers;
}

describe("PRIV-01: the persistence layer never touches the network", () => {
  it("workspace modules import no API client and contain no global-network call token", () => {
    const violations: string[] = [];
    const files = readdirSync(WORKSPACE_DIR).filter((file) => file.endsWith(".ts"));
    expect(files.length).toBeGreaterThanOrEqual(4); // db, ids, label, repository, schema

    for (const file of files) {
      const content = readFileSync(join(WORKSPACE_DIR, file), "utf8");
      for (const specifier of importSpecifiers(content)) {
        if (API_CLIENT_SPECIFIER.test(specifier)) {
          violations.push(`${file} imports the API client module "${specifier}"`);
        }
      }
      for (const token of NETWORK_CALL_TOKENS) {
        if (token.test(content)) {
          violations.push(`${file} contains a network-call token (${token.source})`);
        }
      }
    }
    expect(
      violations,
      "The stored envelope IS the evidence (PRIV-01) — reopen never " +
        "re-calls the API. Violations: " +
        violations.join("; ")
    ).toEqual([]);
  });
});

describe("frozen envelope fixture regression (Pitfall 1 — schema drift)", () => {
  it("still parses the frozen real CalculateResponse through calculateResponseSchema", () => {
    // A missing file throws ENOENT — the fixture may not be silently
    // deleted (fail-hard by design).
    const frozen: unknown = JSON.parse(readFileSync(FROZEN_FIXTURE, "utf8"));
    const parsed = calculateResponseSchema.parse(frozen);
    expect(parsed.provenance.input_revision).toBe("f40e2a1b3c4d");
    expect(parsed.chart_data.house_system).toBe("Placidus");
    expect(parsed.chart_data.house_cusps).toHaveLength(12);
    expect(parsed.chart_data.placements).toHaveLength(8);
    expect(parsed.chart_data.placements?.map((p) => p.house)).toEqual([4, 8, 1, 3, 7, 5, 2, 11]);
  });

  it("round-trips the frozen envelope through saveChart → getChartDetail intact", async () => {
    const frozen: unknown = JSON.parse(readFileSync(FROZEN_FIXTURE, "utf8"));
    const saved = await saveChart({
      label: "Frozen chart",
      envelope: frozen,
      inputs: storedInputs("Placidus"),
      identity: { ...IDENTITY, date: "1990-04-17" },
    });
    expect(saved.appended).toBe(true);

    const detail = await getChartDetail(saved.chartId);
    expect(detail?.latest.envelope.chart_data.house_system).toBe("Placidus");
    expect(detail?.latest.envelope.chart_data.ascendant?.sign).toBe("Sagittarius");
    expect(detail?.latest.envelope.provenance.input_revision).toBe("f40e2a1b3c4d");
  });
});
