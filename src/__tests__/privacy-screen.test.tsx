import { render, screen } from "@testing-library/react-native/pure";
import { describe, expect, it } from "vitest";

import PrivacyScreen from "@/app/privacy";
import providerRegistryData from "@/data/provider-registry.json";

// All assertions derive from the bundled registry itself: the screen must
// render whatever the registry declares — never hardcoded disclosure
// strings (T-01-03). If registry and screen drift, these tests fail.
const registry = providerRegistryData;

describe("Privacy & Data disclosure screen", () => {
  it("renders exactly one entry per registry provider", () => {
    render(<PrivacyScreen />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(registry.providers.length);
  });

  it("shows the first provider's full disclosure facts", () => {
    render(<PrivacyScreen />);

    const first = registry.providers[0];
    if (!first) throw new Error("registry must contain at least one provider");

    // Name
    expect(screen.getByText(first.name)).toBeTruthy();

    // Every data category the provider declares
    for (const category of first.dataCategories) {
      expect(screen.getByText(category)).toBeTruthy();
    }

    // Transmission trigger, retention, purpose — verbatim from the registry
    expect(screen.getByText(`When it sends: ${first.transmissionTrigger}`)).toBeTruthy();
    expect(screen.getByText(first.retention)).toBeTruthy();
    expect(screen.getByText(first.purpose)).toBeTruthy();
  });

  it("labels every planned provider with an explicit inactive status", () => {
    render(<PrivacyScreen />);

    const plannedProviders = registry.providers.filter((p) => p.status === "planned");
    const plannedLabels = screen.getAllByText("Planned — not yet active");
    expect(plannedLabels).toHaveLength(plannedProviders.length);
  });

  it("shows a nothing-active summary banner while every provider is planned", () => {
    render(<PrivacyScreen />);

    const allPlanned = registry.providers.every((p) => p.status === "planned");
    if (!allPlanned) return; // banner only exists in the all-planned posture

    expect(screen.getByText(/no data currently leaves your device/i)).toBeTruthy();
  });
});
