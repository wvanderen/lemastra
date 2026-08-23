import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import providerRegistryData from "../data/provider-registry.json";
import { providerRegistrySchema } from "../schemas/provider-registry";

/**
 * Consistency gate: provider registry ↔ disclosure drafts ↔ data inventory
 * (plan 01-06, GATE-05). The registry is the single comparison source — both
 * disclosure drafts must cover every provider id, and the Play CSV's
 * collect/share overview answer must match the registry's activation state.
 *
 * Fail-hard semantics (quick_validate.py analog, 01-PATTERNS.md): drift
 * throws inside vitest → non-zero exit → CI fails. Prevents one-time
 * disclosure drift between phases (threat T-01-12).
 */

const GOVERNANCE_DIR = new URL("../../docs/governance/", import.meta.url);

function readGovernanceFile(relativePath: string): string {
  // A missing file throws ENOENT here — the test fails hard, by design.
  return readFileSync(new URL(relativePath, GOVERNANCE_DIR), "utf8");
}

// Google's official Data-safety CSV template header (sample template linked
// from support.google.com/googleplay/android-developer/answer/10787469).
// Headers are never invented — the CSV must keep exactly this column set
// (threat T-01-13: taxonomy/template contamination).
const PLAY_CSV_HEADER = [
  "Question ID (machine readable)",
  "Response ID (machine readable)",
  "Response value",
  "Answer requirement",
  "Human-friendly question label",
] as const;

// The REQUIRED overview question of the Play Data-safety form: "Does your
// app collect or share any of the required user data types?"
const PLAY_OVERVIEW_QUESTION_ID = "PSL_DATA_COLLECTION_COLLECTS_PERSONAL_DATA";

/**
 * Quote-naive CSV split — acceptable because the drafted CSV is simple (no
 * quoted fields, no embedded commas/newlines). Asserts nothing by itself;
 * rectangularity is asserted by the tests below.
 */
function parseCsvNaive(content: string): string[][] {
  return content
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(","));
}

describe("provider registry ↔ disclosure/inventory parity", () => {
  const registry = providerRegistrySchema.parse(providerRegistryData);
  const appleWorksheet = readGovernanceFile("disclosures/apple-labels.md");
  const dataInventory = readGovernanceFile("data-inventory.md");

  it("apple-labels.md contains every registry provider id", () => {
    for (const provider of registry.providers) {
      expect(
        appleWorksheet,
        `apple-labels.md is missing prepared answers for provider: ${provider.id}`
      ).toContain(provider.id);
    }
  });

  it("data-inventory.md contains every registry provider id", () => {
    for (const provider of registry.providers) {
      expect(
        dataInventory,
        `data-inventory.md is missing provider: ${provider.id}`
      ).toContain(provider.id);
    }
  });
});

describe("docs/governance/disclosures/play-data-safety.csv", () => {
  const csv = parseCsvNaive(readGovernanceFile("disclosures/play-data-safety.csv"));

  it("parses as rectangular CSV with Google's official template header", () => {
    expect(csv.length, "CSV must have a header row plus at least one data row").toBeGreaterThanOrEqual(2);
    const header = csv[0] ?? [];
    expect(header, "header row must match Google's official template column set").toEqual([
      ...PLAY_CSV_HEADER,
    ]);
    for (const row of csv) {
      expect(
        row.length,
        `row is not rectangular (expected ${header.length} columns): "${row.join(",")}"`
      ).toBe(header.length);
    }
  });

  it("collect/share overview answer matches the registry activation state", () => {
    const registry = providerRegistrySchema.parse(providerRegistryData);
    const anyActive = registry.providers.some((provider) => provider.status === "active");
    const overview = csv.find((row) => (row[0] ?? "") === PLAY_OVERVIEW_QUESTION_ID);
    expect(overview, `missing REQUIRED overview row ${PLAY_OVERVIEW_QUESTION_ID}`).toBeDefined();
    // Zero-collection truth while every provider is planned; flips the moment
    // any provider activates.
    expect(overview?.[2]).toBe(anyActive ? "TRUE" : "FALSE");
  });

  it("every active registry provider is declared in the Play CSV", () => {
    const registry = providerRegistrySchema.parse(providerRegistryData);
    const activeProviders = registry.providers.filter(
      (provider) => provider.status === "active"
    );

    if (activeProviders.length === 0) {
      // Vacuously true while every provider is planned (Phase 1 truth).
      // Advisory only — warns without failing (warn-soft, quick_validate.py
      // semantics).
      console.warn(
        "[disclosures-consistency] no active providers — active-provider CSV rule is vacuous"
      );
      return;
    }

    // Data-type selection rows answered TRUE ("Collected").
    const declaredTypes = csv.filter(
      (row) => (row[0] ?? "").startsWith("PSL_DATA_TYPES_") && (row[2] ?? "") === "TRUE"
    );
    expect(
      declaredTypes.length,
      "active providers exist but no data type is declared as collected in the CSV"
    ).toBeGreaterThan(0);

    for (const provider of activeProviders) {
      // playDataTypes entries are "Category → Type" (arrow form) or a bare
      // category/type name; the data-type name must appear in a TRUE
      // data-type row's human-friendly label.
      for (const playType of provider.playDataTypes) {
        const typeName = playType.split("→").pop()?.trim() || playType;
        const declared = declaredTypes.some((row) => (row[4] ?? "").includes(typeName));
        expect(
          declared,
          `${provider.id}: Play data type "${typeName}" is not declared in the CSV`
        ).toBe(true);
      }
    }
  });
});
