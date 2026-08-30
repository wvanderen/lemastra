import { randomUUID as nodeRandomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Through the alias — the node:sqlite-backed facade (03-01). reset() is
// the per-test world reset; openDatabaseSync/closeSync simulate restarts.
import * as SQLite from "expo-sqlite";

// ids.ts wraps expo-crypto — mock it at the PACKAGE boundary with
// node:crypto (the repository-test convention), hoisted so the mock is
// installed before the repository graph loads. The vi.fn keeps per-test
// control: healthy v4 by default, a thrown engine-style error in the
// failure test.
const cryptoMock = vi.hoisted(() => ({ randomUUID: vi.fn() }));
vi.mock("expo-crypto", () => cryptoMock);

import type { CalculateResponse, HouseSystem } from "@/lib/api-schemas";
import { logger } from "@/lib/redact";
import {
  resetWorkspaceDbForTests,
  WORKSPACE_DB_NAME,
} from "@/lib/workspace/db";
import {
  getChartDetail,
  listCharts,
  saveChart,
} from "@/lib/workspace/repository";

/**
 * Sync-path coverage the 415-test suite never had (03-10 Task 3).
 *
 * The dev-client save failure (UAT Test 1) was narrowed to the write
 * transaction's device-only primitives — expo-crypto randomUUID (a raw
 * sync native call with NO dev fallback) and the transaction insert
 * path — none of which the vitest suite exercised end to end. vitest
 * cannot reach the device native path; this file pins everything
 * reachable at the seams we CAN test:
 *
 * - the UUIDv4 id contract through the REAL ids module + the real
 *   drizzle insert path (what any future sync layer relies on),
 * - a randomUUID failure surfacing as a typed AND logged SAVE_FAILED
 *   (never swallowed — the observability fix proven at this seam),
 * - already-typed NOT_FOUND failures staying log-quiet,
 * - the full restart round-trip through the same gate the device runs.
 */

// ---------------------------------------------------------------------------
// Fixtures — server envelope shapes (workspace-repository.test.ts vocabulary)
// ---------------------------------------------------------------------------

const ORB_POLICY =
  "birth_to_chart.py default orb table (luminaries 10°, personal 7°, Jupiter–Pluto 8°, Node 5°, angles 8°; sextile capped 6°)";

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

/** Canonical UUIDv4 shape: 8-4-4-4-12 hex, version nibble 4, RFC variant. */
const UUIDV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeEach(() => {
  // Healthy default: node:crypto v4 through the real ids module.
  cryptoMock.randomUUID.mockImplementation(() => nodeRandomUUID());
});

afterEach(() => {
  resetWorkspaceDbForTests();
  SQLite.reset();
  vi.restoreAllMocks();
  cryptoMock.randomUUID.mockReset();
});

// ---------------------------------------------------------------------------
// UUIDv4 contract through the real save path
// ---------------------------------------------------------------------------

describe("sync-path id contract (UUIDv4 through the real ids module)", () => {
  it("persisted chart_id and revision_id match the canonical v4 shape — read back through getChartDetail", async () => {
    const saved = await saveChart({
      label: "Mia’s chart",
      envelope: envelope("sync111222333"),
      inputs: storedInputs(),
      identity: { ...IDENTITY },
    });

    expect(saved.chartId).toMatch(UUIDV4);
    expect(saved.revisionId).toMatch(UUIDV4);

    // The PERSISTED ids (not just the return value) hold the contract.
    const detail = await getChartDetail(saved.chartId);
    expect(detail?.chart.chartId).toBe(saved.chartId);
    expect(detail?.latest.revisionId).toMatch(UUIDV4);
    expect(detail?.latest.revisionId).toBe(saved.revisionId);
  });
});

// ---------------------------------------------------------------------------
// randomUUID failure — typed + logged SAVE_FAILED (never swallowed)
// ---------------------------------------------------------------------------

describe("randomUUID failure inside the save transaction (device cause (b) named, not swallowed)", () => {
  it("saveChart rejects with WorkspaceError SAVE_FAILED and the sanctioned logger carries error_code + the underlying message", async () => {
    cryptoMock.randomUUID.mockImplementation(() => {
      // Engine-style named error, as a raw sync native call would throw.
      const error = new Error("ExpoCrypto: randomUUID native call failed");
      error.name = "ExpoCryptoError";
      throw error;
    });
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    await expect(
      saveChart({
        label: "Mia’s chart",
        envelope: envelope("sync444555666"),
        inputs: storedInputs(),
        identity: { ...IDENTITY },
      })
    ).rejects.toMatchObject({
      name: "WorkspaceError",
      code: "SAVE_FAILED",
      message: "ExpoCrypto: randomUUID native call failed",
    });

    // The exact evidence the next UAT report must quote: error_code +
    // engine text at the sanctioned seam, pre-redact contract.
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "workspace operation failed — underlying storage error",
      {
        error_code: "SAVE_FAILED",
        error_message: "ExpoCrypto: randomUUID native call failed",
      }
    );

    // Nothing partially written — the transaction rolled back.
    expect(await listCharts()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Already-typed failures stay quiet (Task 1's only-on-wrap rule)
// ---------------------------------------------------------------------------

describe("already-typed failures pass through unlogged", () => {
  it("a NOT_FOUND append under an unknown chartId does NOT trigger a logger error call", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    await expect(
      saveChart({
        chartId: "00000000-0000-4000-8000-000000000000",
        label: "Mia’s chart",
        envelope: envelope("sync777888999"),
        inputs: storedInputs(),
        identity: { ...IDENTITY },
      })
    ).rejects.toMatchObject({ name: "WorkspaceError", code: "NOT_FOUND" });

    expect(errorSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Restart survival through the same gate the device runs (pre-UAT)
// ---------------------------------------------------------------------------

describe("full round-trip on the facade: save → close → reopen → identical reads", () => {
  it("listCharts + getChartDetail return the identical envelope/inputs/identity after a restart", async () => {
    const saved = await saveChart({
      label: "Restart chart",
      envelope: envelope("syncaaabbbccc"),
      inputs: storedInputs(),
      identity: { ...IDENTITY },
    });
    expect(saved.appended).toBe(true);

    // Simulate app restart: drop the singleton, close the file handle —
    // the next repository call re-runs the SAME gate the device runs.
    resetWorkspaceDbForTests();
    SQLite.openDatabaseSync(WORKSPACE_DB_NAME).closeSync();

    const list = await listCharts();
    expect(list).toHaveLength(1);
    expect(list[0]?.chartId).toBe(saved.chartId);
    expect(list[0]?.label).toBe("Restart chart");
    expect(list[0]?.date).toBe(IDENTITY.date);
    expect(list[0]?.placeLabel).toBe(IDENTITY.label);
    expect(list[0]?.confidence).toBe("Timed");
    expect(list[0]?.revisionCount).toBe(1);

    const detail = await getChartDetail(saved.chartId);
    expect(detail?.latest.revisionId).toBe(saved.revisionId);
    expect(detail?.latest.envelope).toEqual(envelope("syncaaabbbccc"));
    expect(detail?.latest.inputs).toEqual(storedInputs());
    expect(detail?.latest.identity).toEqual({ ...IDENTITY });
  });
});
