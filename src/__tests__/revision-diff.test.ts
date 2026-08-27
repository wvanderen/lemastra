import { describe, expect, it } from "vitest";

import {
  WHAT_CHANGED_BIRTHPLACE,
  WHAT_CHANGED_BIRTH_TIME,
  WHAT_CHANGED_BIRTH_DATE,
  WHAT_CHANGED_DETAILS,
  WHAT_CHANGED_HOUSE_SYSTEM,
  WHAT_CHANGED_ORIGINAL_DETAILS,
  WHAT_CHANGED_TIME_CONFIDENCE,
  WHAT_CHANGED_TIME_ZONE,
  WHAT_CHANGED_TIME_ZONE_RESOLUTION,
} from "@/components/workspace/copy";
import type { ChartRevisionSummary } from "@/lib/workspace/repository";
import {
  formatHistoryDate,
  revisionHistoryEntries,
  whatChangedPhrase,
} from "@/lib/workspace/revision-diff";
import type { StoredCalculationInputs } from "@/lib/workspace/schema";

// revision-diff tests (03-07 Task 1) — the D-07 "what changed" derivation:
// pure functions over pairs of StoredCalculationInputs (template-over-facts
// only, T-02-34 discipline — chart/copy.ts formatter idiom).
//
// Contract under test (plan behavior rows + A-3-UI-7):
// - whatChangedPhrase returns the EXACT copy-deck phrase for each
//   single-field change: Birth date / Birth time / Birthplace / Time zone /
//   Time-zone resolution / Time confidence / House system.
// - Multiple differing fields → "Details changed" (the closed-vocabulary
//   fallback — never a raw JSON diff, never an invented interpretation).
// - revisionHistoryEntries returns NEWEST-FIRST {revisionId, date, phrase}
//   entries; the chronologically FIRST revision of a chart reads
//   "Original details"; every later row is the diff against its
//   predecessor. Dates render as YYYY-MM-DD (the identity vocabulary).
//
// Pure unit rows (api-schemas.test.ts archetype): no React, no storage.

// ---------------------------------------------------------------------------
// Fixtures — one valid StoredCalculationInputs base + field overrides
// ---------------------------------------------------------------------------

const BASE: StoredCalculationInputs = {
  date: "1990-05-21",
  time: "14:32",
  confidence: "Timed",
  house_system: "Whole Sign",
  place: { label: "Lisbon, Portugal", lat: 38.7223, lon: -9.1393 },
  place_form: {
    source: "google",
    label: "Lisbon, Portugal",
    lat: 38.7223,
    lon: -9.1393,
    location_type: "ROOFTOP",
    place_id: "p1",
  },
  iana_zone: "Europe/Lisbon",
  zone_source: "google",
};

function inputs(overrides: Partial<StoredCalculationInputs> = {}): StoredCalculationInputs {
  return { ...BASE, ...overrides };
}

/** A revision-summary row with the given inputs (id doubles as digest here). */
function rev(
  revisionId: string,
  createdAt: Date,
  revisionInputs: StoredCalculationInputs
): ChartRevisionSummary {
  return { revisionId, createdAt, inputRevision: revisionId, inputs: revisionInputs };
}

// ---------------------------------------------------------------------------
// whatChangedPhrase — single-field vocabulary (A-3-UI-7, exact strings)
// ---------------------------------------------------------------------------

describe("whatChangedPhrase — fixed single-field vocabulary", () => {
  it("birth date → 'Birth date changed'", () => {
    expect(whatChangedPhrase(BASE, inputs({ date: "1991-06-01" }))).toBe(WHAT_CHANGED_BIRTH_DATE);
  });

  it("birth time → 'Birth time changed'", () => {
    expect(whatChangedPhrase(BASE, inputs({ time: "09:07" }))).toBe(WHAT_CHANGED_BIRTH_TIME);
  });

  it("place label (normalized summary + union branch) → 'Birthplace changed'", () => {
    const next = inputs({
      place: { label: "Porto, Portugal", lat: 41.1579, lon: -8.6291 },
      place_form: {
        source: "google",
        label: "Porto, Portugal",
        lat: 41.1579,
        lon: -8.6291,
        location_type: "ROOFTOP",
        place_id: "p2",
      },
    });
    expect(whatChangedPhrase(BASE, next)).toBe(WHAT_CHANGED_BIRTHPLACE);
  });

  it("place union branch swap (google → manual, same coordinates) → 'Birthplace changed'", () => {
    const next = inputs({
      place_form: {
        source: "manual",
        label: "Lisbon, Portugal",
        lat: 38.7223,
        lon: -9.1393,
        iana_zone: "Europe/Lisbon",
        zone_source: "manual",
      },
    });
    expect(whatChangedPhrase(BASE, next)).toBe(WHAT_CHANGED_BIRTHPLACE);
  });

  it("iana zone identity → 'Time zone changed'", () => {
    expect(whatChangedPhrase(BASE, inputs({ iana_zone: "Europe/Madrid" }))).toBe(
      WHAT_CHANGED_TIME_ZONE
    );
  });

  it("zone source (google → manual resolution) → 'Time zone changed'", () => {
    expect(whatChangedPhrase(BASE, inputs({ zone_source: "manual" }))).toBe(
      WHAT_CHANGED_TIME_ZONE
    );
  });

  it("time_resolution gained (normal → chosen D-08 option) → 'Time-zone resolution changed'", () => {
    const next = inputs({
      time_resolution: {
        mode: "second_pass",
        label: "01:30 EST (−05:00) — second occurrence after the clocks fell back",
        utc: "2024-11-03T06:30:00Z",
      },
    });
    expect(whatChangedPhrase(BASE, next)).toBe(WHAT_CHANGED_TIME_ZONE_RESOLUTION);
  });

  it("time_resolution option changed (first_pass → second_pass) → 'Time-zone resolution changed'", () => {
    const first = inputs({
      time_resolution: {
        mode: "first_pass",
        label: "01:30 EDT (−04:00) — first occurrence before the clocks fell back",
        utc: "2024-11-03T05:30:00Z",
      },
    });
    const second = inputs({
      time_resolution: {
        mode: "second_pass",
        label: "01:30 EST (−05:00) — second occurrence after the clocks fell back",
        utc: "2024-11-03T06:30:00Z",
      },
    });
    expect(whatChangedPhrase(first, second)).toBe(WHAT_CHANGED_TIME_ZONE_RESOLUTION);
  });

  it("confidence → 'Time confidence changed'", () => {
    expect(whatChangedPhrase(BASE, inputs({ confidence: "Rectified", time: "15:00" }))).not.toBe(
      WHAT_CHANGED_TIME_CONFIDENCE
    ); // time also changed → multi-field fallback, proved below
    expect(
      whatChangedPhrase(BASE, inputs({ confidence: "Rectified", time: BASE.time }))
    ).toBe(WHAT_CHANGED_TIME_CONFIDENCE);
  });

  it("house system → 'House system changed'", () => {
    expect(whatChangedPhrase(BASE, inputs({ house_system: "Placidus" }))).toBe(
      WHAT_CHANGED_HOUSE_SYSTEM
    );
  });
});

// ---------------------------------------------------------------------------
// whatChangedPhrase — multi-field fallback + closed vocabulary
// ---------------------------------------------------------------------------

describe("whatChangedPhrase — fallback", () => {
  it("multiple differing fields → 'Details changed'", () => {
    const next = inputs({ date: "1991-06-01", house_system: "Placidus" });
    expect(whatChangedPhrase(BASE, next)).toBe(WHAT_CHANGED_DETAILS);
  });

  it("identical inputs stay inside the closed vocabulary ('Details changed') — the (chart, input_revision) dedupe makes this pair unreachable through the UI (D-06)", () => {
    expect(whatChangedPhrase(BASE, inputs())).toBe(WHAT_CHANGED_DETAILS);
  });
});

// ---------------------------------------------------------------------------
// revisionHistoryEntries — newest-first rows, first revision, dates
// ---------------------------------------------------------------------------

describe("revisionHistoryEntries", () => {
  it("marks the chronologically first revision 'Original details' and diffs later rows against their predecessor", () => {
    const entries = revisionHistoryEntries([
      rev("rev-2", new Date("2026-08-27T10:00:00Z"), inputs({ date: "1991-06-01" })),
      rev("rev-1", new Date("2026-08-20T10:00:00Z"), inputs()),
    ]);

    // Newest first.
    expect(entries.map((entry) => entry.revisionId)).toEqual(["rev-2", "rev-1"]);
    expect(entries[0]!.phrase).toBe(WHAT_CHANGED_BIRTH_DATE);
    expect(entries[0]!.date).toBe("2026-08-27");
    expect(entries[1]!.phrase).toBe(WHAT_CHANGED_ORIGINAL_DETAILS);
    expect(entries[1]!.date).toBe("2026-08-20");
  });

  it("sorts chronologically itself — arrival order never changes the result", () => {
    const oldest = rev("rev-1", new Date("2026-08-20T10:00:00Z"), inputs());
    const middle = rev("rev-2", new Date("2026-08-23T10:00:00Z"), inputs({ date: "1991-06-01" }));
    const newest = rev(
      "rev-3",
      new Date("2026-08-27T10:00:00Z"),
      inputs({ date: "1991-06-01", time: "09:07" })
    );

    const entries = revisionHistoryEntries([newest, oldest, middle]);

    expect(entries.map((entry) => entry.revisionId)).toEqual(["rev-3", "rev-2", "rev-1"]);
    expect(entries.map((entry) => entry.phrase)).toEqual([
      WHAT_CHANGED_BIRTH_TIME,
      WHAT_CHANGED_BIRTH_DATE,
      WHAT_CHANGED_ORIGINAL_DETAILS,
    ]);
  });

  it("formats dates as YYYY-MM-DD (identity-line vocabulary)", () => {
    expect(formatHistoryDate(new Date("2026-08-27T23:59:59Z"))).toBe("2026-08-27");
    expect(formatHistoryDate(new Date("1990-05-21T00:00:01Z"))).toBe("1990-05-21");
  });
});
