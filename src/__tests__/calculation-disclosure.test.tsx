import { readFileSync } from "node:fs";

import type { render as rtlRender, within as rtlWithin } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import providerRegistryData from "@/data/provider-registry.json";

// Calculation-disclosure tests (02-08 Task 1) — the registry-driven D-04
// one-time notice (T-02-29/T-02-30).
//
// Invariant (Phase-1 pattern, extended): the component renders ONLY registry
// content. Every rendered provider string (name, status, data categories,
// transmission trigger, retention, purpose) must trace to the bundled
// registry data object — assertions derive from the registry, exactly like
// privacy-screen.test.tsx. A source scan additionally proves the component
// file contains no provider-content literals of its own: if someone
// hardcodes a name or retention string, BOTH the parity assertions and the
// source scan fail.
//
// The registry flips the two Phase-2 providers from planned → active in
// Task 3 of this plan; the status-label assertions derive from
// provider.status so they hold before AND after the governed flip.

const routerMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("expo-router", () => ({
  router: routerMock,
}));

// Acquired in beforeAll (not a static import): RNTL requires react-native
// at import time, and the RN test shim only seeds require.cache when the
// setupFile has run — which happens after collection but before hooks.
let render: typeof rtlRender;
let within: typeof rtlWithin;
let userEvent: typeof import("@testing-library/react-native/pure").userEvent;
let cleanup: () => Promise<void>;
let CalculationDisclosure: typeof import("@/components/birth/calculation-disclosure").CalculationDisclosure;
let copy: typeof import("@/components/birth/copy");

beforeAll(async () => {
  ({ render, within, userEvent, cleanup } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ CalculationDisclosure } = await import("@/components/birth/calculation-disclosure"));
  copy = await import("@/components/birth/copy");
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
});

/** The two locked D-04 provider ids (Phase-1/2 vocabulary). */
const DISCLOSURE_IDS = ["lemastra-calculation", "google-geocoding-timezone"] as const;

function registryEntry(id: string) {
  const entry = providerRegistryData.providers.find((provider) => provider.id === id);
  if (!entry) throw new Error(`registry must contain provider: ${id}`);
  return entry;
}

describe("CalculationDisclosure — registry-driven content (D-04)", () => {
  it("renders exactly the two locked provider entries, with content verbatim from the registry", async () => {
    const onAcknowledge = vi.fn();
    const view = await render(<CalculationDisclosure onAcknowledge={onAcknowledge} />);

    const cards = view.getAllByRole("listitem");
    expect(cards.map((card) => card.props.accessibilityLabel)).toEqual(
      DISCLOSURE_IDS.map((id) => {
        const entry = registryEntry(id);
        const statusLabel = entry.status === "planned" ? "Planned — not yet active" : "Active";
        return `${entry.name} — ${statusLabel}`;
      })
    );

    for (const id of DISCLOSURE_IDS) {
      const entry = registryEntry(id);
      const card = within(cards[DISCLOSURE_IDS.indexOf(id)]!);
      // Name, trigger, retention, and purpose trace to the registry fields.
      expect(card.getByText(entry.name)).toBeTruthy();
      expect(card.getByText(`When it sends: ${entry.transmissionTrigger}`)).toBeTruthy();
      expect(card.getByText(entry.retention)).toBeTruthy();
      expect(card.getByText(entry.purpose)).toBeTruthy();
      // Every declared data category chip renders.
      for (const category of entry.dataCategories) {
        expect(card.getByText(category)).toBeTruthy();
      }
    }
  });

  it("renders no provider entries beyond the two locked ids", async () => {
    const view = await render(<CalculationDisclosure onAcknowledge={() => undefined} />);
    for (const provider of providerRegistryData.providers) {
      if (!(DISCLOSURE_IDS as readonly string[]).includes(provider.id)) {
        expect(view.queryByText(provider.name)).toBeNull();
      }
    }
  });

  it("shows the disclosure heading, intro, acknowledgement CTA, and privacy link", async () => {
    const view = await render(<CalculationDisclosure onAcknowledge={() => undefined} />);
    expect(view.getByText(copy.DISCLOSURE_HEADING)).toBeTruthy();
    expect(view.getByText(copy.DISCLOSURE_INTRO)).toBeTruthy();
    expect(view.getByText(copy.DISCLOSURE_CTA)).toBeTruthy();
    expect(view.getByText(copy.DISCLOSURE_PRIVACY_LINK)).toBeTruthy();
  });

  it("fires onAcknowledge from the 'Got it — Calculate chart' CTA", async () => {
    const onAcknowledge = vi.fn();
    const view = await render(<CalculationDisclosure onAcknowledge={onAcknowledge} />);
    await userEvent.press(view.getByText(copy.DISCLOSURE_CTA));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  it("links 'Read full privacy details' to /privacy", async () => {
    const view = await render(<CalculationDisclosure onAcknowledge={() => undefined} />);
    await userEvent.press(view.getByText(copy.DISCLOSURE_PRIVACY_LINK));
    expect(routerMock.push).toHaveBeenCalledWith("/privacy");
  });
});

describe("CalculationDisclosure — no own provider content (T-02-30)", () => {
  it("component source contains no provider-content literals from the registry", async () => {
    // Mirror of the Phase-1 disclosures-consistency approach, applied to the
    // component source: every provider string rendered must come from the
    // registry DATA at runtime, so the source file may not embed any of
    // them. Provider ids are vocabulary (allowed); content is not.
    const source = readFileSync(
      new URL("../components/birth/calculation-disclosure.tsx", import.meta.url),
      "utf8"
    );

    for (const provider of providerRegistryData.providers) {
      const contentStrings = [
        provider.name,
        provider.retention,
        provider.purpose,
        provider.transmissionTrigger,
        ...provider.dataCategories,
      ];
      for (const content of contentStrings) {
        expect(
          source.includes(content),
          `component source must not embed provider content: ${content.slice(0, 40)}…`
        ).toBe(false);
      }
    }
  });
});
