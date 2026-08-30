import { z } from "zod";

import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import {
  confidenceSchema,
  houseSystemSchema,
  placeCandidateSchema,
  timeResolutionOptionSchema,
  type CalculateResponse,
  type Confidence,
} from "@/lib/api-schemas";

/**
 * Workspace storage schema (D-01, D-02) — the repo's first SQLite layer.
 *
 * Two artifacts live here:
 *
 * 1. Drizzle tables (`charts`, `chart_revisions`) — Pattern 2's
 *    "versioned JSON envelope + indexed summary columns" shape
 *    (STACK.md): the immutable CalculateResponse envelope, the stored
 *    calculation inputs (D-08 revise prefill, Pattern 5), and the
 *    result-screen identity travel as json-mode text columns, while
 *    confidence / identity date / place label are denormalized real
 *    columns so list queries never parse envelope JSON (D-11).
 * 2. The stored zod contracts (`storedCalculationInputsSchema`,
 *    `storedIdentitySchema`) — same .describe() contract-docs discipline
 *    as api-schemas.ts, so this module doubles as the storage contract
 *    reference. Parse-then-trust (D-02): the repository validates every
 *    envelope at save AND read; these schemas cover what the envelope
 *    alone does not carry (the birth-flow inputs).
 *
 * Revisions are append-only (D-05/D-06): a row is never mutated, and the
 * unique index on (chart_id, input_revision) is the hard backstop for
 * "identical inputs do not create a new revision" — the client compares
 * the server-computed digest, never re-derives it.
 */

// ---------------------------------------------------------------------------
// Stored zod contracts (D-02 storage shapes)
// ---------------------------------------------------------------------------

/** Google branch of the stored place union — mirrors birth.tsx / PlaceSearch. */
const storedGooglePlaceFormSchema = z.object({
  source: z.literal("google").describe("Discriminator: place chosen from Google Geocoding results."),
  label: z.string().min(1).describe("Formatted address of the selected candidate."),
  lat: z.number().min(-90).max(90).describe("Authoritative latitude (geometry.location)."),
  lon: z.number().min(-180).max(180).describe("Authoritative longitude (geometry.location)."),
  location_type: placeCandidateSchema.shape.location_type.describe(
    "Google location_type — precision hint carried for revise prefill."
  ),
  place_id: z.string().optional().describe("Google place_id; absent on some partial/interpolated results."),
  partial_match: z
    .boolean()
    .optional()
    .describe("Google partial_match caveat; emitted only when true."),
});

/** Manual branch of the stored place union — user-entered coordinates + zone. */
const storedManualPlaceFormSchema = z.object({
  source: z.literal("manual").describe("Discriminator: place entered manually (D-05 fallback)."),
  label: z.string().min(1).describe("User-provided place name for the manual entry."),
  lat: z.number().min(-90).max(90).describe("User-entered latitude."),
  lon: z.number().min(-180).max(180).describe("User-entered longitude."),
  iana_zone: z.string().min(1).describe("User-chosen IANA zone (the tz_override the request carried)."),
  zone_source: z.literal("manual").describe("Always 'manual' on this branch."),
});

/**
 * The CalculateRequest inputs a revision must persist so the Phase-2
 * birth flow can be prefilled on revise (D-08, Pattern 5) — the envelope
 * + identity params alone cannot reconstruct the flow (codebase-verified:
 * lat/lon, iana_zone, and time_resolution are missing there).
 */
export const storedCalculationInputsSchema = z.object({
  date: z.string().describe("Birth date as entered (YYYY-MM-DD, server DATE_PATTERN)."),
  time: z
    .string()
    .describe(
      "Birth time (HH:MM) as sent to the calculator — the noon reference " +
        "(12:00) for Unknown confidence invocations; the raw empty string is " +
        "stored only when nothing was entered."
    ),
  time_resolution: timeResolutionOptionSchema
    .optional()
    .describe(
      "The D-08 picker option chosen for a tricky civil time " +
        "(ambiguous/nonexistent); absent when classification was normal."
    ),
  confidence: confidenceSchema.describe("Birth-time confidence echoed from the form (D-09)."),
  house_system: houseSystemSchema.describe("Requested house system (D-11 selector)."),
  place: z
    .object({
      label: z.string().min(1).describe("Place display name (identity vocabulary)."),
      lat: z.number().min(-90).max(90).describe("Latitude sent to the calculator."),
      lon: z.number().min(-180).max(180).describe("Longitude sent to the calculator."),
    })
    .describe("Normalized place summary — the union branches below carry the full detail."),
  place_form: z
    .discriminatedUnion("source", [storedGooglePlaceFormSchema, storedManualPlaceFormSchema])
    .describe("Which birth-form branch produced the place (google candidate vs manual entry)."),
  iana_zone: z
    .string()
    .min(1)
    .describe(
      "IANA zone identity for the birth instant — the manual branch's " +
        "tz_override, otherwise the server-resolved zone (D-07)."
    ),
  zone_source: z
    .enum(["google", "manual"])
    .describe("'google' = server-resolved zone; 'manual' = user tz_override."),
});

/**
 * The result-screen identity shape a revision stores (D-02): exactly the
 * {date, time, label, zone_source} the confirm → result flow carried.
 */
export const storedIdentitySchema = z.object({
  date: z.string().describe("Identity line date (YYYY-MM-DD)."),
  time: z.string().describe("Identity line time (HH:MM); empty string for Unknown confidence."),
  label: z.string().min(1).describe("Identity line place label."),
  zone_source: z
    .enum(["google", "manual"])
    .describe("CALC-03 place-resolution provenance (02-09: travels with the identity)."),
});

export type StoredCalculationInputs = z.infer<typeof storedCalculationInputsSchema>;
export type StoredIdentity = z.infer<typeof storedIdentitySchema>;

// ---------------------------------------------------------------------------
// Drizzle tables (Pattern 2)
// ---------------------------------------------------------------------------

/**
 * A saved chart: one identity with an immutable revision chain (D-05).
 * Renaming mutates ONLY this row's label/updated_at — never a revision.
 */
export const charts = sqliteTable("charts", {
  id: text("id").primaryKey(), // UUIDv4 from expo-crypto (03-03 ids.ts)
  label: text("label").notNull(),
  created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(), // list ordering (D-11)
});

/**
 * One immutable revision of a chart's calculation basis (D-02/D-06).
 * Append-only; the (chart_id, input_revision) unique index enforces
 * "identical inputs do not create a new revision" at the storage layer.
 */
export const chartRevisions = sqliteTable(
  "chart_revisions",
  {
    id: text("id").primaryKey(), // UUIDv4 from expo-crypto (03-03 ids.ts)
    chart_id: text("chart_id")
      .notNull()
      .references(() => charts.id),
    // Server-computed sha256[:12] digest of the normalized calculator
    // inputs (CALC-03) — the client never re-derives it (D-06).
    input_revision: text("input_revision").notNull(),
    // Denormalized summary columns (D-11) so listCharts never parses
    // envelope JSON.
    confidence: text("confidence").$type<Confidence>().notNull(),
    identity_date: text("identity_date").notNull(),
    identity_place_label: text("identity_place_label").notNull(),
    // The full immutable calculation envelope (parse-then-trust via
    // calculateResponseSchema at save AND read).
    envelope: text("envelope", { mode: "json" }).$type<CalculateResponse>().notNull(),
    // D-08 revise prefill inputs (storedCalculationInputsSchema).
    inputs: text("inputs", { mode: "json" }).$type<StoredCalculationInputs>().notNull(),
    // Result-screen identity (storedIdentitySchema).
    identity: text("identity", { mode: "json" }).$type<StoredIdentity>().notNull(),
    created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("revisions_chart_input_idx").on(t.chart_id, t.input_revision), // D-06 dedupe
    index("revisions_chart_created_idx").on(t.chart_id, t.created_at),
  ]
);
