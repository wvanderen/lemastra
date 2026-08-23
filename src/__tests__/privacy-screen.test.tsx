import type { render as rtlRender, within as rtlWithin } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import PrivacyScreen from "@/app/privacy";
import providerRegistryData from "@/data/provider-registry.json";

// All assertions derive from the bundled registry itself: the screen must
// render whatever the registry declares — never hardcoded disclosure
// strings (T-01-03). If registry and screen drift, these tests fail.
const registry = providerRegistryData;

// Acquired in beforeAll (not a static import): RNTL requires react-native
// at import time, and the RN test shim only seeds require.cache when the
// setupFile has run — which happens after collection but before hooks.
// Queries run through each render() result (the same query API `screen`
// proxies) because vitest's CJS interop can split the `screen` singleton
// from the `render` instance. RNTL v14: render is async (act-wrapped).
type RenderResult = Awaited<ReturnType<typeof rtlRender>>;
let render: typeof rtlRender;
let within: typeof rtlWithin;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  ({ render, within, cleanup } = await import("@testing-library/react-native/pure"));
});

// RNTL's `/pure` entry skips automatic cleanup — unmount after every test
// so repeated renders don't leak into later text queries.
afterEach(async () => {
  await cleanup();
});

describe("Privacy & Data disclosure screen", () => {
  it("renders exactly one entry per registry provider", async () => {
    const view = await render(<PrivacyScreen />);
    expect(view.queryAllByRole("listitem")).toHaveLength(registry.providers.length);
  });

  it("shows the first provider's full disclosure facts", async () => {
    const view = await render(<PrivacyScreen />);

    const items = view.getAllByRole("listitem");
    expect(items.length).toBeGreaterThanOrEqual(1);
    const card = within(items[0]!);

    const first = registry.providers[0];
    if (!first) throw new Error("registry must contain at least one provider");

    // Name
    expect(card.getByText(first.name)).toBeTruthy();

    // Every data category the provider declares
    for (const category of first.dataCategories) {
      expect(card.getByText(category)).toBeTruthy();
    }

    // Transmission trigger, retention, purpose — verbatim from the registry
    expect(card.getByText(`When it sends: ${first.transmissionTrigger}`)).toBeTruthy();
    expect(card.getByText(first.retention)).toBeTruthy();
    expect(card.getByText(first.purpose)).toBeTruthy();
  });

  it("labels every planned provider with an explicit inactive status", async () => {
    const view = await render(<PrivacyScreen />);

    const plannedProviders = registry.providers.filter((p) => p.status === "planned");
    const plannedLabels = view.getAllByText("Planned — not yet active");
    expect(plannedLabels).toHaveLength(plannedProviders.length);
  });

  it("shows a nothing-active summary banner while every provider is planned", async () => {
    const view = await render(<PrivacyScreen />);

    const allPlanned = registry.providers.every((p) => p.status === "planned");
    if (!allPlanned) return; // banner only exists in the all-planned posture

    expect(view.getByText(/no data currently leaves your device/i)).toBeTruthy();
  });
});
