import { z } from "zod";

/**
 * Zod schema for the LemAstra provider registry
 * (`src/data/provider-registry.json`).
 *
 * The registry is the single source of truth for every privacy disclosure
 * LemAstra makes: the in-app Privacy & Data screen renders it (plan 01-02),
 * the Apple label worksheet and Play Data-safety CSV derive from it
 * (plan 01-06), and the data inventory (`docs/governance/data-inventory.md`)
 * shares its provider-id vocabulary.
 *
 * Field descriptions follow the chart_input_schema.json analog convention:
 * every field carries its own documentation so the schema doubles as the
 * contract reference. Malformed registry data must fail validation loudly
 * (non-zero test/CI exit) — disclosures cannot silently drift.
 */

export const providerStatusSchema = z
  .enum(["planned", "active"])
  .describe(
    "Whether the provider's remote flow is enabled. 'planned' = the flow " +
      "does not exist yet and the provider receives nothing; 'active' = the " +
      "flow is live. Flipping to active requires updating the registry, the " +
      "data inventory, and the retention policy first (retention-deletion-policy.md §7)."
  );

export const providerSchema = z.object({
  id: z
    .string()
    .describe(
      "Canonical provider identifier (slug). Must equal the identifier " +
        "vocabulary in docs/governance/data-inventory.md — consistency is " +
        "enforced by the plan 01-06 test suite."
    ),
  name: z.string().describe("Human-readable provider name shown on the Privacy & Data screen."),
  status: providerStatusSchema,
  introducedInPhase: z
    .number()
    .int()
    .positive()
    .nullable()
    .describe(
      "Phase number in which the provider's remote flow is introduced " +
        "(e.g. 2 for calculation/geocoding/hosting, 7 for model traffic), " +
        "or null for providers with no scheduled phase (post-v1)."
    ),
  dataCategories: z
    .array(z.string())
    .min(1)
    .describe(
      "Data category slugs the provider receives when active. Slugs are " +
        "defined in docs/governance/data-inventory.md §3; a category may not " +
        "be used in any disclosure unless it is defined there."
    ),
  transmissionTrigger: z
    .string()
    .describe("User or system action that causes data to be sent to the provider."),
  retention: z
    .string()
    .describe(
      "How long the provider (or LemAstra on its behalf) keeps the data. " +
        "Strings must reference the governing decision in " +
        "docs/governance/retention-deletion-policy.md by section number."
    ),
  purpose: z.string().describe("Purpose of the data flow, in store-disclosure terms."),
  appleLabelMapping: z
    .string()
    .describe(
      "Draft mapping to Apple App Store privacy-label data types " +
        "(finalized in the plan 01-06 worksheet; Apple taxonomy terms only)."
    ),
  playDataTypes: z
    .array(z.string())
    .describe(
      "Draft mapping to Google Play Data-safety data types in " +
        "'Category → Type' form (finalized in the plan 01-06 CSV; Google " +
        "taxonomy terms only)."
    ),
  notes: z
    .string()
    .optional()
    .describe("Optional caveats: re-verification commitments, activation preconditions."),
});

export const providerRegistrySchema = z.object({
  schemaVersion: z
    .literal(1)
    .describe("Registry data format version. Bump when the shape evolves incompatibly."),
  providers: z
    .array(providerSchema)
    .min(1)
    .describe("Every provider whose data flows LemAstra discloses, planned or active."),
});

export type Provider = z.infer<typeof providerSchema>;
export type ProviderRegistry = z.infer<typeof providerRegistrySchema>;
