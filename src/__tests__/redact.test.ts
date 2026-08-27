import { afterEach, describe, expect, it, vi } from "vitest";

import { ALLOWED_LOG_KEYS, logger, redact } from "@/lib/redact";

// ---------------------------------------------------------------------------
// redact() allowlist + sanctioned logger unit tests (D-16 — PRIV-03/PRIV-04).
//
// Pure-unit archetype of src/lib/api-schemas.test.ts: prove the documented
// survival shapes parse/hold, then prove every envelope-shaped, birth-data-
// shaped, and unknown value is stripped (mutation table). The companion
// source-scan gate lives in telemetry-guard.test.ts.
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.restoreAllMocks();
});

describe("redact() keeps coarse allowlisted fields verbatim", () => {
  it("keeps error_code and duration_ms exactly as passed", () => {
    expect(redact({ error_code: "CALC_TIMEOUT", duration_ms: 42 })).toEqual({
      error_code: "CALC_TIMEOUT",
      duration_ms: 42,
    });
  });

  it("keeps every key in ALLOWED_LOG_KEYS when its value is a primitive", () => {
    const metadata: Record<string, unknown> = {
      error_code: "CALC_ENGINE_ERROR",
      duration_ms: 1200,
      count: 3,
      attempt: 2,
      chart_id: "0f0e0d0c-1111-4000-8000-000000000000",
      revision_id: "a1b2c3d4e5f6",
    };
    const output = redact(metadata);
    expect(output).toEqual(metadata);
  });

  it("keeps JSON-safe primitives only (null survives; bigint is dropped)", () => {
    expect(redact({ count: null, attempt: true })).toEqual({ count: null, attempt: true });
    expect(redact({ count: 10n })).toEqual({});
  });
});

describe("redact() removes envelope-shaped values (PRIV-03)", () => {
  it("drops chart_data, provenance, and placements keys", () => {
    const output = redact({
      error_code: "CALC_ENGINE_ERROR",
      chart_data: {
        placements: [{ body: "Sun", sign: "Leo", degree: 12.5, absolute_degree: 132.5, motion: "direct" }],
        birth_time_confidence: "Timed",
      },
      provenance: { skill_revision: "abc123", input_revision: "deadbeefcafe" },
      placements: [{ body: "Moon" }],
    });
    expect(output).toEqual({ error_code: "CALC_ENGINE_ERROR" });
    expect("chart_data" in output).toBe(false);
    expect("provenance" in output).toBe(false);
    expect("placements" in output).toBe(false);
  });
});

describe("redact() removes birth-data-shaped values (PRIV-04)", () => {
  it("drops date/time/place/label/iana_zone/envelope/identity/inputs at the top level", () => {
    const output = redact({
      date: "1990-01-01",
      time: "14:30",
      place: { label: "Brooklyn, NY, USA", lat: 40.7128, lon: -74.006 },
      label: "Birth chart",
      iana_zone: "America/New_York",
      envelope: { chart_data: {}, provenance: {} },
      identity: { date: "1990-01-01", label: "Brooklyn" },
      inputs: { date: "1990-01-01", confidence: "Timed" },
      duration_ms: 42,
    });
    expect(output).toEqual({ duration_ms: 42 });
  });

  it("drops birth-data-shaped keys nested one level deep inside an allowlisted container value", () => {
    const output = redact({
      count: {
        attempt: 2,
        date: "1990-01-01",
        time: "14:30",
        place: { label: "Brooklyn, NY, USA" },
        label: "Birth chart",
        iana_zone: "Europe/Paris",
        envelope: { chart_data: {} },
        identity: { date: "1990-01-01" },
        inputs: { confidence: "Timed" },
      },
    });
    expect(output).toEqual({ count: { attempt: 2 } });
  });

  it("drops deeper structure wholesale from allowlisted containers (no deep-merging untrusted shape)", () => {
    const output = redact({
      count: {
        attempt: { nested: { deeper: "object" } }, // depth-2 object: dropped
        chart_id: ["not", "a", "primitive"], // array: dropped
        duration_ms: 7, // primitive: kept
      },
    });
    expect(output).toEqual({ count: { duration_ms: 7 } });
  });
});

describe("redact() is an allowlist (default-deny, not a blocklist)", () => {
  it("drops unknown keys the blocklist never anticipated", () => {
    const output = redact({
      error_code: "CALC_VALIDATION_FAILED",
      user_question: "What does my Moon mean?",
      generated_prose: "Your Moon in Leo suggests…",
      somebody_future_key: "anything",
    });
    expect(output).toEqual({ error_code: "CALC_VALIDATION_FAILED" });
  });

  it("drops arrays and functions as values, even under allowlisted keys", () => {
    expect(redact({ duration_ms: [1, 2, 3] })).toEqual({});
    expect(redact({ count: () => 1 })).toEqual({});
  });

  it("never emits a key outside ALLOWED_LOG_KEYS at either level", () => {
    const output = redact({
      error_code: "X",
      secret_payload: { nested: { deeply: true } },
      chart_id: { date: "1990-01-01", count: 1 },
    });
    const assertAllAllowlisted = (obj: Record<string, unknown>) => {
      for (const key of Object.keys(obj)) {
        expect(ALLOWED_LOG_KEYS.has(key), `unexpected key in output: ${key}`).toBe(true);
      }
    };
    assertAllAllowlisted(output);
    if (typeof output.chart_id === "object" && output.chart_id !== null) {
      assertAllAllowlisted(output.chart_id as Record<string, unknown>);
    }
  });
});

describe("logger — the only sanctioned output path (D-16)", () => {
  it("info routes metadata through redact() before the console call", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("calc:completed", { duration_ms: 42, date: "1990-01-01", chart_data: { placements: [] } });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("calc:completed", { duration_ms: 42 });
  });

  it("warn routes metadata through redact() before the console call", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("geocode:degraded", { error_code: "PLACE_PROVIDER_UNAVAILABLE", iana_zone: "Europe/Paris" });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("geocode:degraded", { error_code: "PLACE_PROVIDER_UNAVAILABLE" });
  });

  it("error routes metadata through redact() before the console call", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("db:migration-failed", { attempt: 3, inputs: { date: "1990-01-01" } });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("db:migration-failed", { attempt: 3 });
  });

  it("passes an empty redacted payload when no metadata is supplied", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("boot");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("boot", {});
  });
});
