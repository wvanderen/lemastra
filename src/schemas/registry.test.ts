import { describe, expect, it } from "vitest";

import providerRegistryData from "../data/provider-registry.json";
import { providerRegistrySchema, type Provider } from "./provider-registry";

// The six canonical provider ids fixed by docs/governance/data-inventory.md
// (plan 01-04). The registry vocabulary must equal the inventory vocabulary —
// this is the single comparison basis plan 01-06's consistency tests reuse.
const CANONICAL_PROVIDER_IDS = [
  "google-geocoding-timezone",
  "hosting-platform",
  "lemastra-calculation",
  "openai-responses",
  "sentry",
  "supabase",
];

// A minimal valid provider used as the base for rejection (mutation) tests.
const validProvider: Provider = {
  id: "test-provider",
  name: "Test Provider",
  status: "planned",
  introducedInPhase: 2,
  dataCategories: ["birth-date"],
  transmissionTrigger: "user-initiated test action",
  retention: "ephemeral — discarded after response (retention-deletion-policy.md §1)",
  purpose: "App functionality",
  appleLabelMapping: "Other User Content",
  playDataTypes: ["Personal info → Other info"],
};

function registryWith(providers: unknown[]) {
  return { schemaVersion: 1, providers };
}

/** Base provider minus one field — every listed field must be required. */
function providerWithout(field: keyof Provider) {
  const clone = { ...validProvider } as Record<string, unknown>;
  delete clone[field];
  return clone;
}

describe("bundled provider registry", () => {
  it("parses through providerRegistrySchema and contains exactly 6 providers", () => {
    const registry = providerRegistrySchema.parse(providerRegistryData);
    expect(registry.providers).toHaveLength(6);
    expect(registry.providers.map((p) => p.id).sort()).toEqual(CANONICAL_PROVIDER_IDS);
  });

  it("marks exactly the two Phase-2 live providers active (calculation + geocoding flows)", () => {
    const registry = providerRegistrySchema.parse(providerRegistryData);
    const active = registry.providers
      .filter((provider) => provider.status === "active")
      .map((provider) => provider.id)
      .sort();
    // Phase-2 truth (plan 02-08): the calculation + geocoding/timezone flows
    // are wired, so exactly these two ids are active — everything else stays
    // planned until its own phase flips it (governed act, Pitfall 9).
    expect(active).toEqual(["google-geocoding-timezone", "lemastra-calculation"]);
    for (const provider of registry.providers) {
      if (!active.includes(provider.id)) {
        expect(provider.status, `${provider.id} must remain planned`).toBe("planned");
      }
    }
  });

  it("has every provider declare at least one data category", () => {
    const registry = providerRegistrySchema.parse(providerRegistryData);
    for (const provider of registry.providers) {
      expect(provider.dataCategories.length).toBeGreaterThan(0);
    }
  });
});

describe("providerRegistrySchema validation gate", () => {
  it("rejects a provider whose status is outside the enum", () => {
    const enabled = { ...validProvider, status: "enabled" };
    expect(() => providerRegistrySchema.parse(registryWith([enabled]))).toThrow();
  });

  it("rejects a provider missing any required disclosure field", () => {
    const requiredFields = [
      "dataCategories",
      "transmissionTrigger",
      "retention",
      "purpose",
      "appleLabelMapping",
      "playDataTypes",
    ] as const;

    for (const field of requiredFields) {
      const malformed = providerWithout(field);
      expect(
        () => providerRegistrySchema.parse(registryWith([malformed])),
        `missing ${field} must be rejected`
      ).toThrow();
    }
  });

  it("rejects an empty dataCategories array (a provider with no disclosed data)", () => {
    const empty = { ...validProvider, dataCategories: [] };
    expect(() => providerRegistrySchema.parse(registryWith([empty]))).toThrow();
  });

  describe("introducedInPhase accepts a positive integer or null", () => {
    it("accepts a positive integer", () => {
      const registry = providerRegistrySchema.parse(
        registryWith([{ ...validProvider, introducedInPhase: 3 }])
      );
      expect(registry.providers[0]?.introducedInPhase).toBe(3);
    });

    it("accepts null (post-v1 provider with no scheduled phase)", () => {
      const registry = providerRegistrySchema.parse(
        registryWith([{ ...validProvider, introducedInPhase: null }])
      );
      expect(registry.providers[0]?.introducedInPhase).toBeNull();
    });

    it.each([0, -2, 1.5, "2"])("rejects %s", (value) => {
      const malformed = { ...validProvider, introducedInPhase: value };
      expect(() => providerRegistrySchema.parse(registryWith([malformed]))).toThrow();
    });
  });

  it("rejects an unknown schemaVersion", () => {
    expect(() =>
      providerRegistrySchema.parse({ schemaVersion: 2, providers: [validProvider] })
    ).toThrow();
  });
});
