import { readFileSync } from "node:fs";
import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { render as rtlRender } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { FACT_PANEL_IDLE } from "@/components/chart/explore/copy";
import { orbVisualPhrase } from "@/components/chart/explore/copy";
import {
  LOTS_HEADING,
  MODE_TOGGLE_HEADING,
  SECT_HEADING,
} from "@/components/chart/explore/copy";
import { PLACEMENTS_HEADING } from "@/components/chart/copy";
import { WEB_UNSUPPORTED_HEADING } from "@/components/workspace/copy";
import { calculateResponseSchema, type CalculateResponse } from "@/lib/api-schemas";

// Web conformance suite (04-07 Task 2) — D-04 delivered as written:
//
// - /chart/result on web renders the FULL evidence experience from the
//   in-memory envelope the screen already holds — ModeToggle +
//   FactPanel + EvidenceLists with selection via pressable rows (the
//   D-10 list-half; the wheel half of the sync does not exist on web)
//   — and ZERO Canvas elements mount (no graphical wheel; the
//   capability card stays only on the genuinely data-less
//   /chart/explore deep-link, whose repository is web-unavailable).
// - The SAME components the native surface uses mount from the SAME
//   envelope and deck (T-04-16: no web-specific formatter or data
//   path); flipping the mode toggles vocabulary/depth together, and
//   EvidenceLists' placements section supersedes the plain
//   PlacementList (exactly one placements table, no duplicate).
// - Selected rows convey state through accessibilityState + accent
//   border — never color alone (A11Y-02).
//
// Test mechanics: the result-screen pattern (02-09) — RNTL /pure,
// expo-router mocked, fresh retry-off QueryClient — plus the
// explore-route pattern for the deep-link case (repository pending:
// the web read never resolves, so the capability card is the honest
// landing). Platform.OS swaps per test with try/finally restore. The
// wheel canvas graph loads through the per-file RNGH/reanimated/
// worklets inert mocks + the skia facade alias; ZERO-Canvas is
// asserted through the facade's recorded primitives (`__getRendered`
// — a Canvas that never renders never records).
//
// Test-order law (04-04): the interaction tests run LAST — one
// state-updating interaction direction per file section, nothing
// after the flip test.

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  navigate: vi.fn(),
}));
const paramsState = vi.hoisted(() => ({ value: {} as Record<string, string | string[]> }));
const repository = vi.hoisted(() => ({
  getChartDetail: vi.fn(),
  getRevisionContent: vi.fn(),
  isWorkspaceStorageAvailable: vi.fn(),
}));
// The result screen's useExploreMode persists through AsyncStorage;
// tests seed per-case (technical = full depth with lots/sect/orb).
const modeStore = vi.hoisted(
  () => new Map<string, string>([["@lemastra:explore.mode.v1", "technical"]])
);

vi.mock("expo-router", () => ({
  router: routerMock,
  useLocalSearchParams: () => paramsState.value,
}));

vi.mock("expo-crypto", async () => {
  const nodeCrypto = await import("node:crypto");
  return { randomUUID: () => nodeCrypto.randomUUID() };
});

vi.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => Promise.resolve(modeStore.get(key) ?? null),
    setItem: (key: string, value: string) => {
      modeStore.set(key, value);
      return Promise.resolve();
    },
  },
}));

// D-03 seam fake with the real typed-error class preserved (the
// deep-link case; the result screen never reaches the repository).
vi.mock("@/lib/workspace/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/workspace/repository")>();
  return {
    ...actual,
    getChartDetail: repository.getChartDetail,
    getRevisionContent: repository.getRevisionContent,
    isWorkspaceStorageAvailable: repository.isWorkspaceStorageAvailable,
  };
});

// Per-file gesture/native mocks (facade law — the wheel-canvas module
// graph loads device-free; the canvas itself never mounts on web).
vi.mock("react-native-gesture-handler", () => ({
  Gesture: {
    Tap: () => ({
      onEnd() {
        return this;
      },
    }),
    Pan: () => ({
      activeOffsetX() {
        return this;
      },
      activeOffsetY() {
        return this;
      },
      onUpdate() {
        return this;
      },
      onEnd() {
        return this;
      },
    }),
    Pinch: () => ({
      onUpdate() {
        return this;
      },
      onEnd() {
        return this;
      },
    }),
    Simultaneous: (...gestures: unknown[]) => gestures,
  },
  GestureDetector: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock("react-native-reanimated", () => ({
  useSharedValue: (initial: unknown) => ({ value: initial }),
}));
vi.mock("react-native-worklets", () => ({
  runOnJS:
    (fn: (...args: unknown[]) => unknown) =>
    (...args: unknown[]) =>
      fn(...args),
}));

// Fixture envelope — the frozen Timed golden (houses, aspects, lots,
// sect), parsed through the same schema the screen enforces.
const timedEnvelope: CalculateResponse = calculateResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../test/fixtures/frozen-natal-envelope.json", import.meta.url), "utf8")
  )
);

const TIMED_IDENTITY = {
  date: "1990-05-21",
  time: "14:32",
  label: "Lisbon, Portugal",
  zone_source: "google",
} as const;

/** The light-scheme accent — selected borders resolve through useTheme. */
const ACCENT = "#2266CC";

let render: typeof rtlRender;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let Platform: typeof import("react-native").Platform;
// Typed as the FACADE module — the vitest alias resolves the specifier
// to the recording facade (wheel-selection.test.tsx law).
type SkiaFacade = typeof import("../../scripts/vitest/skia-facade/index");
let skia: SkiaFacade;
let ResultScreen: typeof import("@/app/chart/result").default;
let ExploreScreen: typeof import("@/app/chart/explore").default;

beforeAll(async () => {
  ({ render, fireEvent, cleanup, act, waitFor } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ Platform } = await import("react-native"));
  skia = (await import("@shopify/react-native-skia")) as unknown as SkiaFacade;
  ({ default: ResultScreen } = await import("@/app/chart/result"));
  ({ default: ExploreScreen } = await import("@/app/chart/explore"));
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
  paramsState.value = {};
  modeStore.set("@lemastra:explore.mode.v1", "technical");
  if (Platform.OS !== "ios") Platform.OS = "ios";
});

beforeEach(() => {
  repository.isWorkspaceStorageAvailable.mockReturnValue(true);
  skia.__clearRendered();
});

/** Count Canvas primitives recorded since the last clear (mount proof). */
function canvasMounts(): number {
  return skia.__getRendered().filter((entry) => entry.type === "Canvas").length;
}

/** Fresh retry-off QueryClient wrapper (result-screen.test.tsx law). */
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
}

/** Render /chart/result on WEB from the in-memory envelope param. */
async function renderResultWeb() {
  const originalOS = Platform.OS;
  Platform.OS = "web";
  paramsState.value = {
    envelope: JSON.stringify(timedEnvelope),
    identity: JSON.stringify(TIMED_IDENTITY),
  };
  const { Wrapper } = makeWrapper();
  const view = await render(
    <Wrapper>
      <ResultScreen />
    </Wrapper>
  );
  await act(async () => {});
  await waitFor(() => expect(view.getByTestId("fact-panel")).toBeTruthy());
  return { view, restore: () => (Platform.OS = originalOS) };
}

// ---------------------------------------------------------------------------
// D-04: web /chart/result renders the full evidence experience, zero canvas
// ---------------------------------------------------------------------------

describe("web /chart/result — D-04 evidence experience", () => {
  it("mounts ModeToggle + FactPanel + EvidenceLists from the in-memory envelope with ZERO Canvas elements", async () => {
    const { view, restore } = await renderResultWeb();
    try {
      // The full evidence experience mounts (technical seed: every
      // section at full depth).
      expect(view.getByTestId("explore-mode-toggle")).toBeTruthy();
      expect(view.getByText(MODE_TOGGLE_HEADING)).toBeTruthy();
      expect(view.getByTestId("fact-panel")).toBeTruthy();
      expect(view.getByText(FACT_PANEL_IDLE)).toBeTruthy();
      expect(view.getByTestId("evidence-section-placements")).toBeTruthy();
      expect(view.getByTestId("evidence-section-houses")).toBeTruthy();
      expect(view.getByTestId("evidence-section-aspects")).toBeTruthy();
      expect(view.getByTestId("evidence-section-lots")).toBeTruthy();
      expect(view.getByTestId("evidence-section-sect")).toBeTruthy();

      // D-04: no graphical wheel — no Canvas primitive EVER mounts
      // (the facade records mounts; zero recorded = zero mounted), and
      // the native-only mini-wheel card stays absent.
      expect(canvasMounts()).toBe(0);
      expect(view.queryByTestId("result-explore-card")).toBeNull();

      // EvidenceLists' placements section SUPERSEDES the plain
      // PlacementList on web — exactly one placements table.
      expect(view.getAllByText(PLACEMENTS_HEADING).length).toBe(1);

      // The SavePrompt flow is untouched: the save CTA still renders
      // (disabled without stored request inputs — never a crash).
      expect(view.getByTestId("result-save-cta")).toBeTruthy();
    } finally {
      restore();
    }
  });

  it("hides the D-06 Simple hidden list and swaps vocabulary from the SAME envelope when the preference is Simple", async () => {
    modeStore.set("@lemastra:explore.mode.v1", "simple");
    const { view, restore } = await renderResultWeb();
    try {
      // Simple hides lots + sect entirely and the orb columns.
      expect(view.queryByTestId("evidence-section-lots")).toBeNull();
      expect(view.queryByText(LOTS_HEADING)).toBeNull();
      expect(view.queryByTestId("evidence-section-sect")).toBeNull();
      expect(view.queryByText(SECT_HEADING)).toBeNull();
      expect(view.queryByText(orbVisualPhrase(0.3))).toBeNull();

      // Same envelope, same deck: the retrograde placement chips its
      // glossary term (D-08) — the covered vocabulary survives the
      // platform change because the SAME components mount.
      expect(view.getByTestId("glossary-retrograde")).toBeTruthy();

      // Zero canvas on web in every mode.
      expect(canvasMounts()).toBe(0);
    } finally {
      restore();
    }
  });
});

// ---------------------------------------------------------------------------
// D-04: web /chart/explore deep-link — the honest capability card
// ---------------------------------------------------------------------------

describe("web /chart/explore — deep-link posture (unchanged from 04-03)", () => {
  it("renders the WebUnsupported capability card with zero canvas and no evidence surfaces", async () => {
    // The web repository is unavailable: the read stays pending and
    // the card is the honest data-less landing.
    repository.getChartDetail.mockReturnValue(new Promise(() => undefined));
    const originalOS = Platform.OS;
    Platform.OS = "web";
    try {
      paramsState.value = { id: "chart-1" };
      const { Wrapper } = makeWrapper();
      const view = await render(
        <Wrapper>
          <ExploreScreen />
        </Wrapper>
      );
      await act(async () => {});

      expect(view.getByText(WEB_UNSUPPORTED_HEADING)).toBeTruthy();
      expect(view.queryByTestId("fact-panel")).toBeNull();
      expect(view.queryByTestId("evidence-section-placements")).toBeNull();
      expect(view.queryByTestId("explore-mode-toggle")).toBeNull();
      expect(canvasMounts()).toBe(0);
    } finally {
      Platform.OS = originalOS;
    }
  });
});

// ---------------------------------------------------------------------------
// D-10 list-half on web — row press populates the panel (interaction
// tests LAST: one state-updating direction per section, 04-04 law)
// ---------------------------------------------------------------------------

describe("web /chart/result — selection via pressable rows (D-10 list-half)", () => {
  it("pressing an evidence row populates the fact panel with that factor's exact facts and conveys selected state (a11yState + accent)", async () => {
    const { view, restore } = await renderResultWeb();
    try {
      fireEvent.press(view.getByTestId("evidence-row-planet-Sun"));
      await act(async () => {});

      // Exact facts in the panel — the deck-exact Technical sentence.
      expect(
        view.getByText(
          "Sun in Aries 26°39′, House 4, Direct motion, Dignities: Exaltation, absolute 26.65°"
        )
      ).toBeTruthy();

      // Selected state: accessibilityState + accent border, never
      // color alone (A11Y-02).
      const row = view.getByTestId("evidence-row-planet-Sun");
      expect(row.props.accessibilityState).toMatchObject({ selected: true });
      const borderColor = [row.props.style]
        .flat()
        .filter((s) => s && typeof s === "object")
        .map((s) => (s as { borderColor?: string }).borderColor)
        .find((c) => c !== undefined);
      expect(borderColor).toBe(ACCENT);
    } finally {
      restore();
    }
  });

  it("flipping the mode toggle switches vocabulary and depth together from the same envelope (runs LAST)", async () => {
    const { view, restore } = await renderResultWeb();
    try {
      // Select a factor in Technical…
      fireEvent.press(view.getByTestId("evidence-row-planet-Sun"));
      await act(async () => {});
      expect(
        view.getByText(
          "Sun in Aries 26°39′, House 4, Direct motion, Dignities: Exaltation, absolute 26.65°"
        )
      ).toBeTruthy();

      // …then flip to Simple: the SAME selection re-renders through
      // the plain-language templates (same data path), the deep
      // sections disappear, and the toggle's checked state moves.
      fireEvent.press(view.getByTestId("mode-simple"));
      await act(async () => {});

      expect(
        view.getByText("Sun in Aries at 26°39′, in House 4, moving direct, Exaltation")
      ).toBeTruthy();
      expect(view.queryByTestId("evidence-section-lots")).toBeNull();
      expect(view.queryByTestId("evidence-section-sect")).toBeNull();
      expect(view.getByTestId("mode-simple").props.accessibilityState).toMatchObject({
        checked: true,
      });
      expect(view.getByTestId("mode-technical").props.accessibilityState).toMatchObject({
        checked: false,
      });

      // The row keeps its selected state across the flip — selection
      // and mode share the FactorRef space, not the same state.
      expect(view.getByTestId("evidence-row-planet-Sun").props.accessibilityState).toMatchObject({
        selected: true,
      });
      expect(canvasMounts()).toBe(0);
    } finally {
      restore();
    }
  });
});
