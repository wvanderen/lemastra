import { afterEach, describe, expect, it, vi } from "vitest";

import {
  calculateResponseSchema,
  classificationSchema,
  errorSchema,
  houseSystemSchema,
  placeSearchResponseSchema,
  resolveTimeResponseSchema,
  timeResolutionModeSchema,
  zonesResponseSchema,
  type CalculateResponse,
  type PlaceSearchResponse,
  type ResolveTimeResponse,
} from "./api-schemas";
import { ApiError, postPlaceSearch, resolveBaseUrl } from "./api";

// ---------------------------------------------------------------------------
// Fixtures — the documented success envelopes from 02-RESEARCH.md §"FastAPI
// Service Skeleton" endpoint table + §"Resolve payload for the D-08 picker".
// Discipline copied from src/schemas/registry.test.ts: parse every documented
// success shape, then prove malformed variants throw (mutation table).
// ---------------------------------------------------------------------------

const placeSearchFixture: PlaceSearchResponse = {
  candidates: [
    {
      label: "Brooklyn, NY, USA",
      lat: 40.7128,
      lon: -74.006,
      location_type: "APPROXIMATE",
      place_id: "ChIJCSF8lLFZwokRangZKX8JVCg",
    },
    {
      // place_id is optional (partial / interpolated results may lack it)
      label: "Brooklyn Park, MN, USA",
      lat: 45.0971,
      lon: -93.3563,
      location_type: "APPROXIMATE",
    },
  ],
  provenance: {
    provider: "google-geocoding-timezone",
    lookup_timestamp: "2026-08-25T18:00:00Z",
  },
};

const resolveTimeNormalFixture: ResolveTimeResponse = {
  iana_zone: "America/New_York",
  zone_source: "google",
  google: {
    timeZoneId: "America/New_York",
    rawOffset: -18000,
    dstOffset: 3600,
    timeZoneName: "Eastern Daylight Time",
  },
  resolved: {
    offset_seconds: -14400,
    offset_label: "-04:00",
    classification: "normal",
    options: [],
  },
  drift: false,
};

// 2024-11-03 01:30 America/New_York — fall-back overlap (research §DST).
const resolveTimeAmbiguousFixture: ResolveTimeResponse = {
  iana_zone: "America/New_York",
  zone_source: "google",
  google: {
    timeZoneId: "America/New_York",
    rawOffset: -18000,
    dstOffset: 0,
    timeZoneName: "Eastern Standard Time",
  },
  resolved: {
    offset_seconds: -14400,
    offset_label: "-04:00",
    classification: "ambiguous",
    options: [
      {
        mode: "first_pass",
        label: "01:30 EDT (-04:00) — first occurrence before the clocks fell back",
        utc: "2024-11-03T05:30:00Z",
      },
      {
        mode: "second_pass",
        label: "01:30 EST (-05:00) — second occurrence after the clocks fell back",
        utc: "2024-11-03T06:30:00Z",
      },
    ],
  },
  drift: false,
};

// 2024-03-10 02:30 America/New_York — spring-forward gap (research §DST).
const resolveTimeNonexistentFixture: ResolveTimeResponse = {
  iana_zone: "America/New_York",
  zone_source: "google",
  google: {
    timeZoneId: "America/New_York",
    rawOffset: -18000,
    dstOffset: 3600,
    timeZoneName: "Eastern Daylight Time",
  },
  resolved: {
    offset_seconds: -14400,
    offset_label: "-04:00",
    classification: "nonexistent",
    options: [
      {
        mode: "shifted",
        label: "02:30 did not exist (clocks jumped 02:00→03:00). Using 03:30 EDT (-04:00).",
        utc: "2024-03-10T07:30:00Z",
      },
    ],
  },
  drift: false,
};

// Manual fallback (D-05): tz_override path — no Google lookup happened.
const resolveTimeManualFixture: ResolveTimeResponse = {
  iana_zone: "Europe/Amsterdam",
  zone_source: "manual",
  google: null,
  resolved: {
    offset_seconds: 3600,
    offset_label: "+01:00",
    classification: "normal",
    options: [],
  },
  drift: false,
};

const calculateTimedFixture = {
  reading_type: "natal",
  chart_data: {
    house_system: "Whole Sign",
    ascendant: { sign: "Virgo", degree: 24.5496, absolute_degree: 174.5496 },
    midheaven: { sign: "Gemini", degree: 24.9, absolute_degree: 84.9 },
    house_cusps: [
      { house: 1, sign: "Virgo", degree: 0.0, absolute_degree: 150.0 },
      { house: 2, sign: "Libra", degree: 0.0, absolute_degree: 180.0 },
    ],
    placements: [
      {
        body: "Sun",
        sign: "Gemini",
        degree: 0.4375,
        absolute_degree: 60.4375,
        motion: "direct",
        condition: [],
        dignity: [],
        house: 10,
      },
      {
        body: "Moon",
        sign: "Sagittarius",
        degree: 12.25,
        absolute_degree: 252.25,
        motion: "direct",
        condition: [],
        dignity: [],
        house: 4,
      },
    ],
    // Real-world aspect shapes from the recorded Lexington chart: the
    // calculator emits `applying: true` XOR `separating: true` as optional
    // presence flags, and NEITHER key when relative speed is zero (angles
    // carry speed None — e.g. the Ascendant-Midheaven square below).
    aspects: [
      {
        body_a: "Sun",
        aspect: "square",
        body_b: "Moon",
        orb_degrees: 5.3982,
        applying: true,
        exact: false,
      },
      {
        body_a: "Sun",
        aspect: "trine",
        body_b: "Jupiter",
        orb_degrees: 2.1,
        separating: true,
        exact: false,
      },
      {
        body_a: "Ascendant",
        aspect: "square",
        body_b: "Midheaven",
        orb_degrees: 0.7063,
        exact: false,
      },
    ],
    sect: {
      status: "day",
      luminary_of_sect: "Sun",
      sect_mate_planets: ["Jupiter", "Saturn"],
      notes: "Sun altitude 60.6° at birth (above horizon).",
    },
    lots: [
      {
        name: "Lot of Fortune",
        sign: "Leo",
        degree: 10.5,
        absolute_degree: 130.5,
        formula: "Asc + Moon − Sun (day sect)",
      },
    ],
    source_notes:
      "Computed by pyswisseph/Swiss Ephemeris 2.10.03. Frame: tropical. House system: Whole Sign.",
    birth_time_confidence: "Timed",
  },
  provenance: {
    skill_revision: "660d9921a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7",
    swisseph_version: "2.10.03",
    tzdata_version: "2026.3",
    schema_version: "chart_input_schema (draft 2020-12)",
    ephemeris_mode: "Moshier (built-in)",
    house_system: "Whole Sign",
    zodiac_mode: "tropical",
    orb_policy: "tool default table",
    input_revision: "0123456789ab",
    calculator_cmd: "birth_to_chart.py --input … --validate",
  },
} satisfies CalculateResponse;

// Unknown birth time (D-10): houses/angles/sect/lots keys are absent, the
// Moon carries a provisional note, and the envelope explains what is
// unavailable (derived by the API from output-key absence).
const calculateUnknownFixture = {
  chart_data: {
    placements: [
      {
        body: "Sun",
        sign: "Gemini",
        degree: 0.4375,
        absolute_degree: 60.4375,
        motion: "direct",
        condition: [],
        dignity: [],
      },
      {
        body: "Moon",
        sign: "Sagittarius",
        degree: 12.25,
        absolute_degree: 252.25,
        motion: "direct",
        condition: [],
        dignity: [],
        notes: "Provisional: computed at the noon reference.",
      },
    ],
    aspects: [
      {
        body_a: "Sun",
        aspect: "trine",
        body_b: "Saturn",
        orb_degrees: 5.325,
        separating: true,
        exact: false,
      },
    ],
    birth_time_confidence: "Unknown",
    source_notes: "Computed by pyswisseph/Swiss Ephemeris 2.10.03. …",
  },
  provenance: { ...calculateTimedFixture.provenance },
  unavailable_factors: [
    { factor: "houses", reason: "Requires a birth time" },
    { factor: "ascendant_mc", reason: "Requires a birth time" },
    { factor: "sect", reason: "Requires sunrise/sunset timing" },
    { factor: "lots", reason: "Lot of Fortune requires the Ascendant" },
  ],
  provisional_factors: [
    { factor: "moon", reason: "Moon moves ~13°/day; degree may shift without a known time" },
  ],
} satisfies CalculateResponse;

// Recorded from the live calculate endpoint (case-placidus-lex, Lexington KY
// 1990-06-15 14:30, Placidus) so the client zod contract and the server
// golden tests can never silently diverge again. Plain object — NO
// `satisfies CalculateResponse`: this is recorded server output the client
// must accept, not client-authored data. Trimmed (cusps/placements/lots)
// but every retained value is verbatim; the 4 aspects cover all three
// emission shapes (applying-only, separating-only, neither).
const recordedCalculateFixture = {
  reading_type: "natal",
  chart_data: {
    house_system: "Placidus",
    ascendant: { sign: "Libra", degree: 5.5032, absolute_degree: 185.5032 },
    midheaven: { sign: "Cancer", degree: 6.2095, absolute_degree: 96.2095 },
    house_cusps: [
      { house: 1, sign: "Libra", degree: 5.5032, absolute_degree: 185.5032 },
      { house: 2, sign: "Scorpio", degree: 2.4011, absolute_degree: 212.4011 },
    ],
    placements: [
      {
        body: "Sun",
        sign: "Gemini",
        degree: 24.3882,
        absolute_degree: 84.3882,
        motion: "direct",
        condition: [],
        dignity: [],
        house: 9,
      },
      {
        body: "Moon",
        sign: "Pisces",
        degree: 18.99,
        absolute_degree: 348.99,
        motion: "direct",
        condition: [],
        dignity: [],
        house: 6,
      },
      {
        body: "Mercury",
        sign: "Gemini",
        degree: 6.1571,
        absolute_degree: 66.1571,
        motion: "direct",
        condition: [],
        dignity: ["domicile"],
        house: 9,
      },
    ],
    aspects: [
      {
        body_a: "Sun",
        aspect: "square",
        body_b: "Moon",
        orb_degrees: 5.3982,
        applying: true,
        exact: false,
      },
      {
        body_a: "Moon",
        aspect: "sextile",
        body_b: "Venus",
        orb_degrees: 0.1061,
        applying: true,
        exact: false,
      },
      {
        body_a: "Moon",
        aspect: "trine",
        body_b: "Jupiter",
        orb_degrees: 3.0419,
        separating: true,
        exact: false,
      },
      {
        // Neither flag: zero relative motion — the calculator omits both
        // keys for stationary pairs and angle contacts (Asc/MC).
        body_a: "Ascendant",
        aspect: "square",
        body_b: "Midheaven",
        orb_degrees: 0.7063,
        exact: false,
      },
    ],
    sect: {
      status: "day",
      luminary_of_sect: "Sun",
      sect_mate_planets: ["Jupiter", "Saturn"],
      notes: "Sun altitude 71.6° at birth (above horizon).",
    },
    lots: [
      {
        name: "Lot of Fortune",
        sign: "Cancer",
        degree: 0.105,
        absolute_degree: 90.105,
        house: 9,
        formula: "Asc + Moon − Sun (day sect)",
      },
    ],
    source_notes:
      "Computed by pyswisseph/Swiss Ephemeris 2.10.03. Frame: tropical. House system: Placidus. Ephemeris mode: Moshier (built-in). Topocentric Moon: off. Birth-time confidence: Timed. Major essential dignity (domicile/exaltation/detriment/fall) for the seven classical planets is derived from planet+sign (Ptolemy I.17, I.19); minor essential dignity and `condition` remain interpretive and are emitted empty. Input: date 1990-06-15, time 14:30, tz America/New_York (iana), lat 38.0389091, lon -84.5152662. Place (label only; coordinates are authoritative): Lexington, KY, USA.",
    birth_time_confidence: "Timed",
  },
  provenance: {
    skill_revision: "660d992a61139ed0286eaf0a38f4e8e0fd4f7822",
    swisseph_version: "2.10.03",
    tzdata_version: "2026.3",
    schema_version: "Astrology Skill Chart Input (draft 2020-12)",
    ephemeris_mode: "Moshier (built-in)",
    house_system: "Placidus",
    zodiac_mode: "tropical",
    orb_policy:
      "birth_to_chart.py default orb table (luminaries 10°, personal 7°, Jupiter–Pluto 8°, Node 5°, angles 8°; sextile capped 6°)",
    input_revision: "0a0b5ce1750f",
    calculator_cmd: "python tools/birth_to_chart.py --input <temp-json> --validate",
  },
  unavailable_factors: [],
  provisional_factors: [],
};

const errorFixture = {
  error: {
    code: "PLACE_ZERO_RESULTS",
    message: "No match found for “zzzqqq”.",
    recoverable: true,
    hint: "Try a nearby city or enter coordinates manually",
  },
};

const zonesFixture = {
  zones: ["Africa/Abidjan", "America/New_York", "Europe/Amsterdam"],
};

// The eleven CALC-04 codes (02-RESEARCH.md §error taxonomy, mirrored by
// api/lemastra_api/errors.py).
const ALL_ERROR_CODES = [
  "PLACE_ZERO_RESULTS",
  "PLACE_PROVIDER_UNAVAILABLE",
  "PLACE_INVALID_QUERY",
  "TIMEZONE_NO_RESULTS",
  "TIMEZONE_PROVIDER_UNAVAILABLE",
  "TIMEZONE_INVALID_ZONE",
  "CALC_INVALID_INPUT",
  "CALC_ENGINE_ERROR",
  "CALC_TIMEOUT",
  "CALC_VALIDATION_FAILED",
  "CALC_UNSUITABLE_HOUSE_SYSTEM",
] as const;

describe("closed vocabulary enums", () => {
  it("accepts the exact ten calculator house systems", () => {
    const systems = [
      "Whole Sign",
      "Placidus",
      "Regiomontanus",
      "Koch",
      "Equal",
      "Campanus",
      "Porphyrius",
      "Morinus",
      "Alcabitius",
      "Topocentric",
    ];
    for (const system of systems) {
      expect(houseSystemSchema.parse(system)).toBe(system);
    }
  });

  it("rejects a house system outside the calculator vocabulary", () => {
    expect(() => houseSystemSchema.parse("Whole sign")).toThrow();
    expect(() => houseSystemSchema.parse("placidus")).toThrow();
  });

  it("classification accepts normal, ambiguous, nonexistent only", () => {
    expect(classificationSchema.parse("normal")).toBe("normal");
    expect(() => classificationSchema.parse("Ambiguous")).toThrow();
  });

  it("time-resolution mode accepts first_pass, second_pass, shifted only", () => {
    expect(timeResolutionModeSchema.parse("first_pass")).toBe("first_pass");
    expect(() => timeResolutionModeSchema.parse("third_pass")).toThrow();
  });
});

describe("placeSearchResponseSchema", () => {
  it("parses the documented success envelope", () => {
    const parsed = placeSearchResponseSchema.parse(placeSearchFixture);
    expect(parsed.candidates).toHaveLength(2);
    expect(parsed.candidates[0]).toMatchObject({
      label: "Brooklyn, NY, USA",
      lat: 40.7128,
      lon: -74.006,
      location_type: "APPROXIMATE",
    });
    expect(parsed.provenance.provider).toBe("google-geocoding-timezone");
  });

  it("rejects a candidate without coordinates", () => {
    const malformed = {
      ...placeSearchFixture,
      candidates: [{ label: "Nowhere", lon: -74.006, location_type: "APPROXIMATE" }],
    };
    expect(() => placeSearchResponseSchema.parse(malformed)).toThrow();
  });

  it("rejects a provenance field removed", () => {
    const malformed = JSON.parse(JSON.stringify(placeSearchFixture));
    delete malformed.provenance.lookup_timestamp;
    expect(() => placeSearchResponseSchema.parse(malformed)).toThrow();
  });

  it("rejects a provider outside the locked registry id", () => {
    const malformed = {
      ...placeSearchFixture,
      provenance: { ...placeSearchFixture.provenance, provider: "google" },
    };
    expect(() => placeSearchResponseSchema.parse(malformed)).toThrow();
  });
});

describe("resolveTimeResponseSchema", () => {
  it("parses a normal resolution (empty options, no picker)", () => {
    const parsed = resolveTimeResponseSchema.parse(resolveTimeNormalFixture);
    expect(parsed.resolved.classification).toBe("normal");
    expect(parsed.resolved.options).toEqual([]);
    expect(parsed.drift).toBe(false);
  });

  it("parses a DST-ambiguous resolution with two distinct options", () => {
    const parsed = resolveTimeResponseSchema.parse(resolveTimeAmbiguousFixture);
    expect(parsed.resolved.classification).toBe("ambiguous");
    expect(parsed.resolved.options.map((o) => o.mode)).toEqual(["first_pass", "second_pass"]);
    expect(new Set(parsed.resolved.options.map((o) => o.utc)).size).toBe(2);
  });

  it("parses a nonexistent (gap) resolution with a single shifted option", () => {
    const parsed = resolveTimeResponseSchema.parse(resolveTimeNonexistentFixture);
    expect(parsed.resolved.classification).toBe("nonexistent");
    expect(parsed.resolved.options).toHaveLength(1);
    expect(parsed.resolved.options[0]?.mode).toBe("shifted");
    expect(parsed.resolved.options[0]?.utc).toBe("2024-03-10T07:30:00Z");
  });

  it("parses a manual zone_source with a null google block", () => {
    const parsed = resolveTimeResponseSchema.parse(resolveTimeManualFixture);
    expect(parsed.zone_source).toBe("manual");
    expect(parsed.google).toBeNull();
  });

  it("rejects an option without a mode", () => {
    const malformed = JSON.parse(JSON.stringify(resolveTimeAmbiguousFixture));
    delete malformed.resolved.options[0].mode;
    expect(() => resolveTimeResponseSchema.parse(malformed)).toThrow();
  });

  it("rejects a classification outside the enum", () => {
    const malformed = {
      ...resolveTimeNormalFixture,
      resolved: { ...resolveTimeNormalFixture.resolved, classification: "Ambiguous" },
    };
    expect(() => resolveTimeResponseSchema.parse(malformed)).toThrow();
  });

  it("rejects a payload missing the drift flag", () => {
    const malformed = JSON.parse(JSON.stringify(resolveTimeNormalFixture));
    delete malformed.drift;
    expect(() => resolveTimeResponseSchema.parse(malformed)).toThrow();
  });
});

describe("calculateResponseSchema", () => {
  it("parses a full timed-chart envelope", () => {
    const parsed = calculateResponseSchema.parse(calculateTimedFixture);
    expect(parsed.chart_data.house_system).toBe("Whole Sign");
    expect(parsed.chart_data.placements[0]).toMatchObject({
      body: "Sun",
      sign: "Gemini",
      house: 10,
    });
    expect(parsed.chart_data.placements[0]).not.toHaveProperty("notes");
    expect(parsed.provenance).toMatchObject({
      skill_revision: expect.any(String),
      swisseph_version: "2.10.03",
      tzdata_version: "2026.3",
      input_revision: "0123456789ab",
    });
    expect(parsed).not.toHaveProperty("unavailable_factors");
    // Aspects cover all three calculator emission shapes: one applying-only,
    // one separating-only, one with both presence flags absent.
    const aspects = parsed.chart_data.aspects ?? [];
    expect(aspects).toHaveLength(3);
    expect(aspects.filter((a) => a.applying === true)).toHaveLength(1);
    expect(aspects.filter((a) => a.separating === true)).toHaveLength(1);
    expect(aspects.filter((a) => a.applying === undefined && a.separating === undefined)).toHaveLength(
      1
    );
  });

  it("parses a recorded real calculate response (client/server contract)", () => {
    const parsed = calculateResponseSchema.parse(recordedCalculateFixture);
    const aspects = parsed.chart_data.aspects ?? [];
    expect(aspects).toHaveLength(4);
    expect(aspects.filter((a) => a.applying === true)).toHaveLength(2);
    expect(aspects.filter((a) => a.separating === true)).toHaveLength(1);
    expect(aspects.filter((a) => a.applying === undefined && a.separating === undefined)).toHaveLength(
      1
    );
    for (const aspect of aspects) {
      expect(typeof aspect.exact).toBe("boolean");
    }
    expect(typeof parsed.provenance.input_revision).toBe("string");
  });

  it("rejects aspect contract drift", () => {
    // The calculator only ever emits literal true; any other value means
    // the server contract changed and must surface as a parse failure.
    const notApplying = JSON.parse(JSON.stringify(recordedCalculateFixture));
    notApplying.chart_data.aspects[0].applying = false;
    expect(() => calculateResponseSchema.parse(notApplying)).toThrow();

    const noExact = JSON.parse(JSON.stringify(recordedCalculateFixture));
    delete noExact.chart_data.aspects[0].exact;
    expect(() => calculateResponseSchema.parse(noExact)).toThrow();
  });

  it("parses an unknown-time envelope lacking house keys", () => {
    const parsed = calculateResponseSchema.parse(calculateUnknownFixture);
    expect(parsed.chart_data.birth_time_confidence).toBe("Unknown");
    expect(parsed.chart_data).not.toHaveProperty("house_system");
    expect(parsed.chart_data).not.toHaveProperty("ascendant");
    expect(parsed.chart_data).not.toHaveProperty("sect");
    for (const placement of parsed.chart_data.placements) {
      expect(placement).not.toHaveProperty("house");
    }
    expect(parsed.chart_data.placements[1]?.notes).toContain("Provisional");
    expect(parsed.unavailable_factors?.map((f) => f.factor)).toEqual([
      "houses",
      "ascendant_mc",
      "sect",
      "lots",
    ]);
    expect(parsed.provisional_factors?.[0]?.factor).toBe("moon");
  });

  it("rejects a provenance block with a version field removed", () => {
    const malformed = JSON.parse(JSON.stringify(calculateTimedFixture));
    delete malformed.provenance.swisseph_version;
    expect(() => calculateResponseSchema.parse(malformed)).toThrow();
  });

  it("rejects a provenance house system outside the calculator vocabulary", () => {
    const malformed = JSON.parse(JSON.stringify(calculateTimedFixture));
    malformed.provenance.house_system = "whole-sign";
    expect(() => calculateResponseSchema.parse(malformed)).toThrow();
  });

  it("rejects a birth-time confidence outside the four calculator labels", () => {
    const malformed = JSON.parse(JSON.stringify(calculateTimedFixture));
    malformed.chart_data.birth_time_confidence = "timed";
    expect(() => calculateResponseSchema.parse(malformed)).toThrow();
  });

  it("rejects a placement without its core position fields", () => {
    const malformed = JSON.parse(JSON.stringify(calculateTimedFixture));
    delete malformed.chart_data.placements[0].absolute_degree;
    expect(() => calculateResponseSchema.parse(malformed)).toThrow();
  });
});

describe("errorSchema", () => {
  it("parses the documented error body", () => {
    const parsed = errorSchema.parse(errorFixture);
    expect(parsed.error.code).toBe("PLACE_ZERO_RESULTS");
    expect(parsed.error.recoverable).toBe(true);
    expect(parsed.error.hint).toBeDefined();
  });

  it("parses every one of the eleven CALC-04 codes", () => {
    for (const code of ALL_ERROR_CODES) {
      const body = { error: { ...errorFixture.error, code } };
      expect(errorSchema.parse(body).error.code).toBe(code);
    }
  });

  it("rejects a code outside the closed enum", () => {
    const malformed = { error: { ...errorFixture.error, code: "PLACE_NADA" } };
    expect(() => errorSchema.parse(malformed)).toThrow();
  });

  it("rejects a body with recoverable removed", () => {
    const malformed = JSON.parse(JSON.stringify(errorFixture));
    delete malformed.error.recoverable;
    expect(() => errorSchema.parse(malformed)).toThrow();
  });

  it("rejects a body with message removed", () => {
    const malformed = JSON.parse(JSON.stringify(errorFixture));
    delete malformed.error.message;
    expect(() => errorSchema.parse(malformed)).toThrow();
  });
});

describe("zonesResponseSchema", () => {
  it("parses a sorted IANA zone list", () => {
    const parsed = zonesResponseSchema.parse(zonesFixture);
    expect(parsed.zones).toHaveLength(3);
    expect(parsed.zones[0]).toBe("Africa/Abidjan");
  });

  it("rejects a non-string zone entry", () => {
    const malformed = { zones: ["America/New_York", 42] };
    expect(() => zonesResponseSchema.parse(malformed)).toThrow();
  });

  it("rejects a payload without the zones key", () => {
    expect(() => zonesResponseSchema.parse({})).toThrow();
  });
});

describe("resolveBaseUrl", () => {
  it("prefers EXPO_PUBLIC_API_URL when set", () => {
    expect(resolveBaseUrl("https://api.example.com", "ios")).toBe("https://api.example.com");
  });

  it("uses the Android emulator loopback alias on android", () => {
    expect(resolveBaseUrl(undefined, "android")).toBe("http://10.0.2.2:8000");
  });

  it("uses localhost everywhere else", () => {
    expect(resolveBaseUrl(undefined, "ios")).toBe("http://localhost:8000");
    expect(resolveBaseUrl(undefined, "web")).toBe("http://localhost:8000");
  });
});

describe("api client (parse-then-trust)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses a success envelope through the schema before returning", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(placeSearchFixture), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await postPlaceSearch({ query: "brooklyn" });
    expect(result.candidates).toHaveLength(2);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init).toMatchObject({
      method: "POST",
      headers: { "content-type": "application/json" },
    });
  });

  it("throws a typed ApiError for a non-2xx error body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(errorFixture), {
          status: 404,
          headers: { "content-type": "application/json" },
        })
      )
    );

    const failure = await postPlaceSearch({ query: "zzzqqq" }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({
      code: "PLACE_ZERO_RESULTS",
      hint: "Try a nearby city or enter coordinates manually",
    });
  });

  it("rejects a malformed 2xx body (nothing unparsed reaches callers)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ candidates: [{ label: "No coords" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )
    );

    await expect(postPlaceSearch({ query: "brooklyn" })).rejects.toThrow();
  });
});
