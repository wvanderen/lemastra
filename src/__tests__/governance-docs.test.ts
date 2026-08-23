import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Structural gate for the governance document set (plans 01-03/01-04/01-05).
 *
 * Ports the quick_validate.py fail-hard gate semantics (astrology-skill analog,
 * 01-PATTERNS.md): a missing file or missing section is a hard failure that
 * throws inside vitest → non-zero exit → CI fails. Governance documents may
 * not be silently deleted or restructured later (threat T-01-14).
 */

const GOVERNANCE_DIR = new URL("../../docs/governance/", import.meta.url);

function readGovernanceDoc(fileName: string): string {
  // A missing file throws ENOENT here — the test fails hard, by design.
  return readFileSync(new URL(fileName, GOVERNANCE_DIR), "utf8");
}

// The five required sections of the Swiss Ephemeris posture document
// (docs/governance/swiss-ephemeris-posture.md, plan 01-03).
const POSTURE_SECTIONS = [
  "## 1. Decision & Rationale",
  "## 2. Distribution Model",
  "## 3. Obligations Inventory",
  "## 4. Attribution & Notices",
  "## 5. Approval Record",
] as const;

// Governance documents that must exist and be non-empty (plans 01-04/01-05).
const REQUIRED_DOCS = [
  "data-inventory.md",
  "retention-deletion-policy.md",
  "privacy-policy.md",
  "secret-isolation-policy.md",
] as const;

describe("docs/governance/swiss-ephemeris-posture.md structure (GATE-01)", () => {
  it("contains all five numbered section headings", () => {
    const posture = readGovernanceDoc("swiss-ephemeris-posture.md");
    for (const section of POSTURE_SECTIONS) {
      expect(posture, `posture doc missing section heading: ${section}`).toContain(section);
    }
  });
});

describe("governance document set exists and is non-empty (GATE-05/GATE-06)", () => {
  it.each([...REQUIRED_DOCS])("%s exists and is non-empty", (fileName) => {
    const content = readGovernanceDoc(fileName);
    expect(content.trim().length, `${fileName} exists but is empty`).toBeGreaterThan(0);
  });
});
