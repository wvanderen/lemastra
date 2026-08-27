import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CalculateResponse } from "@/lib/api-schemas";
import {
  buildExportFilename,
  buildExportPayload,
  exportChartRevision,
} from "@/lib/workspace/export";

// Chart-export tests (03-06 Task 2) — the WORK-07 mechanics (D-13):
// a slug-sanitized filename, a provenance-complete pretty-printed
// cache write through the OO File API, and a capability-gated native
// share (Pattern 6 / Pitfalls 6–7).
//
// Contract under test (plan behavior rows):
// - buildExportFilename returns lemastra-chart-<slug>-<revision-id>.json;
//   the slug sanitizes emoji/spaces/slashes, caps at 40, falls back to
//   "chart" — user labels NEVER reach the filesystem unsanitized
//   (T-03-18); distinct slug+id pairs never collapse.
// - exportChartRevision writes 2-space pretty JSON of
//   {chartId, revisionId, label, identity, envelope} to a File under
//   Paths.cache; parse-back deep-equals the input payload, provenance
//   intact (input_revision, skill_revision, swisseph/tzdata versions).
// - shareAsync is invoked ONLY when isAvailableAsync resolves true,
//   with the file uri and mimeType application/json (Pitfall 7 — the
//   cache-dir file:// uri the native module accepts).
// - Unavailable → a typed { status: "unavailable" } result, no share
//   call (the caller renders the capability state, D-03 vocabulary).
//
// Test mechanics: expo-file-system + expo-sharing are mocked at the
// module boundary (vi.mock) — the write and share invocations are
// captured, never performed.

const fileSystem = vi.hoisted(() => {
  /** Every write captured (name + content) — asserted by the tests. */
  const writes: Array<{ directory: unknown; name: string; content: string }> = [];
  return {
    writes,
    File: class MockFile {
      constructor(
        public directory: unknown,
        public name: string
      ) {}
      get uri(): string {
        return `file://${String(this.directory)}/${this.name}`;
      }
      write(content: string): Promise<void> {
        writes.push({ directory: this.directory, name: this.name, content });
        return Promise.resolve();
      }
    },
    Paths: { cache: "/mock-cache" },
  };
});

const sharing = vi.hoisted(() => ({
  isAvailableAsync: vi.fn<() => Promise<boolean>>(),
  shareAsync: vi.fn<(uri: string, options?: { mimeType?: string }) => Promise<void>>(),
}));

vi.mock("expo-file-system", () => fileSystem);
vi.mock("expo-sharing", () => sharing);

// ---------------------------------------------------------------------------
// Fixtures — a stored-revision payload with the full provenance block
// ---------------------------------------------------------------------------

const PROVENANCE = {
  skill_revision: "660d992",
  swisseph_version: "2.10.03",
  tzdata_version: "2026.3",
  schema_version: "chart-input v1",
  ephemeris_mode: "Moshier (built-in)",
  house_system: "Whole Sign",
  zodiac_mode: "tropical",
  orb_policy: "standard",
  input_revision: "abc123def456",
  calculator_cmd: "python tools/birth_to_chart.py --input <temp-json> --validate",
} as const;

const ENVELOPE: CalculateResponse = {
  reading_type: "natal",
  chart_data: {
    placements: [
      { body: "Sun", sign: "Gemini", degree: 0.5, absolute_degree: 60.5, motion: "direct" },
    ],
    birth_time_confidence: "Timed",
  },
  provenance: { ...PROVENANCE },
  unavailable_factors: [],
  provisional_factors: [],
};

const IDENTITY = {
  date: "1990-05-21",
  time: "14:30",
  label: "Lisbon, Portugal",
  zone_source: "google",
} as const;

const PAYLOAD_INPUT = {
  chartId: "chart-1",
  label: "My saved chart",
  revisionId: "rev-2",
  identity: { ...IDENTITY },
  envelope: ENVELOPE,
} as const;

beforeEach(() => {
  fileSystem.writes.length = 0;
  sharing.isAvailableAsync.mockReset().mockResolvedValue(true);
  sharing.shareAsync.mockReset().mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// buildExportFilename — slug sanitization is the T-03-18 gate
// ---------------------------------------------------------------------------

describe("buildExportFilename", () => {
  it("formats lemastra-chart-<slug>-<revision-id>.json", () => {
    expect(buildExportFilename("My saved chart", "rev-2")).toBe(
      "lemastra-chart-my-saved-chart-rev-2.json"
    );
  });

  it("sanitizes emoji, spaces, and path separators — raw labels never reach the filesystem", () => {
    expect(buildExportFilename("🌞 My / Chart ★", "rev-9")).toBe(
      "lemastra-chart-my-chart-rev-9.json"
    );
    // A traversal attempt collapses into dashes — no separators survive.
    expect(buildExportFilename("../../etc/passwd", "rev-9")).toBe(
      "lemastra-chart-etc-passwd-rev-9.json"
    );
  });

  it("falls back to 'chart' when sanitization empties the label", () => {
    expect(buildExportFilename("", "rev-3")).toBe("lemastra-chart-chart-rev-3.json");
    expect(buildExportFilename("🌞🌟✨", "rev-3")).toBe("lemastra-chart-chart-rev-3.json");
  });

  it("caps the slug at 40 characters with no trailing dash after the cut", () => {
    const name = buildExportFilename("a".repeat(80), "rev-4");
    // lemastra-chart- + 40 a's + -rev-4.json
    expect(name).toBe(`lemastra-chart-${"a".repeat(40)}-rev-4.json`);
    const dashed = buildExportFilename(`x ${"b".repeat(45)} y`, "rev-4");
    expect(dashed).toBe(`lemastra-chart-x-${"b".repeat(38)}-rev-4.json`);
  });

  it("keeps distinct labels distinct unless their slugs AND ids collide", () => {
    const a = buildExportFilename("Sunset Chart", "rev-1");
    const b = buildExportFilename("Night Chart", "rev-1");
    expect(a).not.toBe(b);

    // Same label, different revision → different name (Pitfall 6).
    expect(buildExportFilename("Sunset Chart", "rev-1")).not.toBe(
      buildExportFilename("Sunset Chart", "rev-2")
    );

    // Labels differing only in case/emoji collapse to the same slug +
    // same id ⇒ same name — the collision the revision-id suffix exists
    // to prevent, so identical inputs mapping to one name is correct.
    expect(buildExportFilename("SUNSET chart", "rev-1")).toBe(
      buildExportFilename("sunset 🌞 chart", "rev-1")
    );
  });
});

// ---------------------------------------------------------------------------
// buildExportPayload — pure, provenance-complete, key-ordered
// ---------------------------------------------------------------------------

describe("buildExportPayload", () => {
  it("builds {chartId, revisionId, label, identity, envelope} in exactly that key order", () => {
    const payload = buildExportPayload({ ...PAYLOAD_INPUT });
    expect(Object.keys(payload)).toEqual([
      "chartId",
      "revisionId",
      "label",
      "identity",
      "envelope",
    ]);
  });

  it("deep-equals its inputs — envelope and identity pass through untouched", () => {
    const payload = buildExportPayload({ ...PAYLOAD_INPUT });
    expect(payload).toEqual({
      chartId: "chart-1",
      revisionId: "rev-2",
      label: "My saved chart",
      identity: { ...IDENTITY },
      envelope: ENVELOPE,
    });
  });
});

// ---------------------------------------------------------------------------
// exportChartRevision — cache write + capability-gated share
// ---------------------------------------------------------------------------

describe("exportChartRevision", () => {
  it("writes 2-space pretty JSON under Paths.cache with the sanitized filename", async () => {
    await exportChartRevision(buildExportPayload({ ...PAYLOAD_INPUT }));

    expect(fileSystem.writes).toHaveLength(1);
    const write = fileSystem.writes[0];
    expect(write.directory).toBe("/mock-cache");
    expect(write.name).toBe("lemastra-chart-my-saved-chart-rev-2.json");
    // Pretty-printed with 2-space indentation.
    expect(write.content).toContain('\n  "chartId"');
  });

  it("parse-back of the written content deep-equals the input payload, provenance intact", async () => {
    await exportChartRevision(buildExportPayload({ ...PAYLOAD_INPUT }));

    const parsed = JSON.parse(fileSystem.writes[0].content) as Record<string, unknown>;
    expect(parsed).toEqual(JSON.parse(JSON.stringify(buildExportPayload({ ...PAYLOAD_INPUT }))));

    const provenance = parsed.envelope as { provenance: Record<string, string> };
    expect(provenance.provenance.input_revision).toBe("abc123def456");
    expect(provenance.provenance.skill_revision).toBe("660d992");
    expect(provenance.provenance.swisseph_version).toBe("2.10.03");
    expect(provenance.provenance.tzdata_version).toBe("2026.3");
  });

  it("shares the cache file uri as application/json when the capability check passes", async () => {
    sharing.isAvailableAsync.mockResolvedValue(true);

    const result = await exportChartRevision(buildExportPayload({ ...PAYLOAD_INPUT }));

    expect(sharing.shareAsync).toHaveBeenCalledTimes(1);
    expect(sharing.shareAsync).toHaveBeenCalledWith(
      "file:///mock-cache/lemastra-chart-my-saved-chart-rev-2.json",
      { mimeType: "application/json" }
    );
    expect(result).toEqual({
      status: "shared",
      uri: "file:///mock-cache/lemastra-chart-my-saved-chart-rev-2.json",
    });
  });

  it("returns a typed unavailable result WITHOUT sharing when the gate rejects", async () => {
    sharing.isAvailableAsync.mockResolvedValue(false);

    const result = await exportChartRevision(buildExportPayload({ ...PAYLOAD_INPUT }));

    expect(result).toEqual({ status: "unavailable" });
    expect(sharing.shareAsync).not.toHaveBeenCalled();
    // The file was still written — the failure mode is the share
    // capability, not the write.
    expect(fileSystem.writes).toHaveLength(1);
  });

  it("overwrites on re-export of the same revision (Pitfall 6 — no stale content)", async () => {
    const payload = buildExportPayload({ ...PAYLOAD_INPUT });
    await exportChartRevision(payload);
    await exportChartRevision(payload);

    expect(fileSystem.writes).toHaveLength(2);
    expect(fileSystem.writes[0].name).toBe(fileSystem.writes[1].name);
    expect(fileSystem.writes[1].content).toBe(fileSystem.writes[0].content);
  });
});
