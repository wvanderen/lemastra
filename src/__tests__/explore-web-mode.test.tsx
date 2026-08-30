import { readFileSync } from "node:fs";
import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { render as rtlRender } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { orbVisualPhrase } from "@/components/chart/explore/copy";
import { calculateResponseSchema, type CalculateResponse } from "@/lib/api-schemas";

// Web MODE-FLIP direction (04-07 Task 2, companion of
// explore-web.test.tsx): flipping the mode toggle on web's /chart/result
// evidence experience switches vocabulary and depth together from the
// SAME envelope (D-05/D-06, T-04-16 — the same components, deck, and
// data path the native surface uses).
//
// Why its own file (test-order law, 04-04): the RN vitest shim's
// facade swaps ScrollView identities per commit, so only ONE
// state-updating interaction per test FILE commits reliably —
// explore-web.test.tsx owns the row-press direction, this file owns
// the toggle-press direction. One press, one test, nothing after it.
//
// Proof decomposition: the panel's mode-keyed sentence templates are
// component-pinned for BOTH modes by explore-mode.test.tsx (FactPanel
// mode-keyed sentences + the one-flip test); this file proves the WEB
// surface's wiring — one toggle press re-renders the mounted evidence
// family's depth (lots/sect/orb hide, glossary chips appear, radio
// state moves) from the same envelope.

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  navigate: vi.fn(),
}));
const paramsState = vi.hoisted(() => ({ value: {} as Record<string, string | string[]> }));
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

// Fixture envelope — the frozen Timed golden (lots + sect + aspects).
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

let render: typeof rtlRender;
let fireEvent: typeof import("@testing-library/react-native/pure").fireEvent;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;
let waitFor: typeof import("@testing-library/react-native/pure").waitFor;
let Platform: typeof import("react-native").Platform;
/** The suite's ambient OS — captured once; every swap restores it. */
let originalOS: typeof Platform.OS;
let ResultScreen: typeof import("@/app/chart/result").default;

beforeAll(async () => {
  ({ render, fireEvent, cleanup, act, waitFor } = await import(
    "@testing-library/react-native/pure"
  ));
  ({ Platform } = await import("react-native"));
  originalOS = Platform.OS;
  ({ default: ResultScreen } = await import("@/app/chart/result"));
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
  paramsState.value = {};
  modeStore.set("@lemastra:explore.mode.v1", "technical");
  if (Platform.OS !== originalOS) Platform.OS = originalOS;
});

beforeEach(() => {
  modeStore.set("@lemastra:explore.mode.v1", "technical");
});

describe("web /chart/result — mode flip switches vocabulary/depth together", () => {
  it("one toggle press hides the D-06 deep list and swaps row vocabulary from the same envelope (runs LAST — one act per file)", async () => {
    const originalOS = Platform.OS;
    Platform.OS = "web";
    try {
      paramsState.value = {
        envelope: JSON.stringify(timedEnvelope),
        identity: JSON.stringify(TIMED_IDENTITY),
      };
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      );
      const view = await render(
        <Wrapper>
          <ResultScreen />
        </Wrapper>
      );
      await act(async () => {});
      await waitFor(() => expect(view.getByTestId("fact-panel")).toBeTruthy());

      // Technical (hydrated preference): every deep section at full
      // depth, orb columns visible, radio checked on Technical.
      expect(view.getByTestId("evidence-section-lots")).toBeTruthy();
      expect(view.getByTestId("evidence-section-sect")).toBeTruthy();
      expect(view.getByText(orbVisualPhrase(0.3))).toBeTruthy();
      expect(view.getByTestId("mode-technical").props.accessibilityState).toMatchObject({
        checked: true,
      });

      // THE one state-updating act of this file (03-05 law:
      // fireEvent.press on the accessible host + act flush).
      fireEvent.press(view.getByTestId("mode-simple"));
      await act(async () => {});

      // Simple: the D-06 hidden list goes (lots, sect, orb)…
      expect(view.queryByTestId("evidence-section-lots")).toBeNull();
      expect(view.queryByTestId("evidence-section-sect")).toBeNull();
      expect(view.queryByText(orbVisualPhrase(0.3))).toBeNull();
      // …the covered vocabulary chips in (two retrograde rows)…
      expect(view.getAllByTestId("glossary-retrograde").length).toBe(2);
      // …and the radio's checked state moved — one flip, everything
      // together, from the SAME envelope mount.
      expect(view.getByTestId("mode-simple").props.accessibilityState).toMatchObject({
        checked: true,
      });
      expect(view.getByTestId("mode-technical").props.accessibilityState).toMatchObject({
        checked: false,
      });
    } finally {
      Platform.OS = originalOS;
    }
  });
});
