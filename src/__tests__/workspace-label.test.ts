import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

// ids.ts wraps expo-crypto, whose JS entry reaches for native modules —
// back the wrapper with node:crypto's own UUIDv4 so distinctness and
// format assertions exercise real randomness (the same randomUUID shape
// expo-crypto provides on device).
vi.mock("expo-crypto", async () => {
  const nodeCrypto = await import("node:crypto");
  return { randomUUID: () => nodeCrypto.randomUUID() };
});

import { newChartId, newRevisionId } from "@/lib/workspace/ids";
import { labelSchema, smartDefaultLabel, slugify } from "@/lib/workspace/label";

/**
 * Workspace label/slug/id utilities (03-03 Task 1, pure-unit archetype).
 *
 * Behavior rows under test (plan):
 * - labelSchema: trimmed 1–60 accepted; empty / whitespace-only / 61
 *   chars rejected by safeParse (D-10/A-3-UI-4 bound).
 * - slugify: lowercase, non-alphanumeric runs collapsed to single
 *   dashes, dashes trimmed, 40-char cap, "chart" fallback, no path
 *   separators survive (Pattern 6 / Pitfall 6).
 * - smartDefaultLabel: "date · place" vocabulary matching the result
 *   identity line (D-10 smart prefilled default).
 * - newChartId()/newRevisionId(): distinct UUIDv4 strings across calls
 *   (A3 — platform randomness, never Math.random).
 */

describe("labelSchema (trimmed 1–60, D-10 bound)", () => {
  it("accepts a normal label and returns it trimmed", () => {
    expect(labelSchema.parse("  Mia’s Chart  ")).toBe("Mia’s Chart");
  });

  it("accepts exactly 60 characters", () => {
    const sixty = "a".repeat(60);
    expect(labelSchema.safeParse(sixty).success).toBe(true);
  });

  it("rejects the empty string and whitespace-only labels", () => {
    expect(labelSchema.safeParse("").success).toBe(false);
    expect(labelSchema.safeParse("    ").success).toBe(false);
    expect(labelSchema.safeParse("\t\n").success).toBe(false);
  });

  it("rejects 61 characters", () => {
    expect(labelSchema.safeParse("a".repeat(61)).success).toBe(false);
  });
});

describe("slugify (Pattern 6 sanitization)", () => {
  it("collapses punctuation, symbols, and spaces into single dashes", () => {
    expect(slugify("Mia's Chart ✨ 2026")).toBe("mia-s-chart-2026");
  });

  it("lowercases the label", () => {
    expect(slugify("MY CHART")).toBe("my-chart");
  });

  it("collapses runs of non-alphanumerics to ONE dash", () => {
    expect(slugify("a  --  b")).toBe("a-b");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("caps the slug at 40 characters", () => {
    expect(slugify("x".repeat(100))).toBe("x".repeat(40));
  });

  it("never leaves a trailing dash after the cap", () => {
    expect(slugify("abcd-".repeat(9))).toBe("abcd-abcd-abcd-abcd-abcd-abcd-abcd-abcd");
  });

  it("falls back to 'chart' when nothing alphanumeric survives", () => {
    expect(slugify("✨ ✨ ✨")).toBe("chart");
  });

  it("lets no path separators survive", () => {
    expect(slugify("../../etc/passwd")).toBe("etc-passwd");
    expect(slugify("a/b\\c")).toBe("a-b-c");
  });
});

describe("smartDefaultLabel (date · place identity vocabulary, D-10)", () => {
  it("joins date and place with the identity-line separator", () => {
    expect(smartDefaultLabel("1990-04-17", "Lisbon")).toBe("1990-04-17 · Lisbon");
  });

  it("keeps the full place label intact", () => {
    expect(smartDefaultLabel("1990-04-17", "Lisbon, Portugal")).toBe(
      "1990-04-17 · Lisbon, Portugal"
    );
  });
});

describe("id generation (A3 — expo-crypto randomUUID)", () => {
  const UUIDV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it("returns distinct UUIDv4 strings across calls", () => {
    const chartIds = [newChartId(), newChartId(), newChartId()];
    const revisionIds = [newRevisionId(), newRevisionId(), newRevisionId()];
    const all = [...chartIds, ...revisionIds];
    expect(new Set(all).size).toBe(all.length);
  });

  it("shapes every id as a UUIDv4", () => {
    expect(newChartId()).toMatch(UUIDV4);
    expect(newRevisionId()).toMatch(UUIDV4);
  });
});
