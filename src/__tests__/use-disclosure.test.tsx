import type { render as rtlRender, renderHook as rtlRenderHook } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import QueryProvider from "@/lib/query-client";
import { CALCULATION_DISCLOSURE_KEY, useDisclosure } from "@/hooks/use-disclosure";

// AsyncStorage is native-module-backed and has no real store under the
// vitest RN shim — mock it with an in-memory Map (jest-preset-parity style,
// matching the AsyncLocalStorage surface the shim itself provides).
// vi.hoisted keeps the Map reference usable inside the hoisted factory.
const store = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => Promise.resolve(store.get(key) ?? null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    },
  },
}));

// Acquired in beforeAll (not a static import): RNTL requires react-native
// at import time, and the RN test shim only seeds require.cache when the
// setupFile has run — which happens after collection but before hooks.
// Queries run through each render()/renderHook() result (the same query API
// `screen` proxies) — vitest's CJS interop can split the `screen` singleton
// from the render instance. RNTL v14: render/renderHook are async
// (act-wrapped).
type RenderResult = Awaited<ReturnType<typeof rtlRender>>;
type RenderHookResult = Awaited<ReturnType<typeof rtlRenderHook>>;
let render: typeof rtlRender;
let renderHook: typeof rtlRenderHook;
let cleanup: () => Promise<void>;
let act: (callback: () => void | Promise<unknown>) => Promise<void>;

beforeAll(async () => {
  ({ render, renderHook, cleanup, act } = await import("@testing-library/react-native/pure"));
});

// RNTL's `/pure` entry skips automatic cleanup — unmount after every test
// so repeated renders don't leak into later text queries or AppState
// subscriptions.
afterEach(async () => {
  await cleanup();
  store.clear();
});

describe("useDisclosure (D-04 one-time calculation notice)", () => {
  it("starts unacknowledged on a fresh store", async () => {
    const hook = await renderHook(() => useDisclosure());
    expect(hook.result.current.acknowledged).toBe(false);
  });

  it("persists acknowledgement so a second mount reports acknowledged", async () => {
    const first = await renderHook(() => useDisclosure());
    await act(async () => {
      await first.result.current.acknowledge();
    });
    expect(first.result.current.acknowledged).toBe(true);
    await cleanup();

    // Fresh hook instance — reads the persisted flag, not in-memory state.
    const second = await renderHook(() => useDisclosure());
    await act(async () => {});
    expect(second.result.current.acknowledged).toBe(true);
  });

  it("persists under the exact versioned key @lemastra:disclosure.calculation.v1", async () => {
    expect(CALCULATION_DISCLOSURE_KEY).toBe("@lemastra:disclosure.calculation.v1");

    const hook = await renderHook(() => useDisclosure());
    await act(async () => {
      await hook.result.current.acknowledge();
    });

    expect(store.get("@lemastra:disclosure.calculation.v1")).toBe("true");
  });
});

describe("QueryProvider (TanStack Query React Native wiring)", () => {
  it("renders its children", async () => {
    const { focusManager } = await import("@tanstack/react-query");
    const { Text } = await import("react-native");

    const view: RenderResult = await render(
      <QueryProvider>
        <Text>query-provider-child</Text>
      </QueryProvider>
    );

    expect(view.getByText("query-provider-child")).toBeDefined();
    void focusManager; // imported lazily alongside render deps
  });

  it("wires focusManager to AppState visibility", async () => {
    const { focusManager } = await import("@tanstack/react-query");
    const { Text, DeviceEventEmitter } = await import("react-native");

    const setEnabled = vi.fn();
    vi.spyOn(focusManager, "setEnabled").mockImplementation(setEnabled);

    await render(
      <QueryProvider>
        <Text>ignored</Text>
      </QueryProvider>
    );

    // The real AppState JS (running on the shim's turbo-module mock)
    // receives native appStateDidChange events through the public
    // DeviceEventEmitter singleton.
    DeviceEventEmitter.emit("appStateDidChange", { app_state: "background" });
    expect(setEnabled).toHaveBeenCalledWith(false);

    DeviceEventEmitter.emit("appStateDidChange", { app_state: "active" });
    expect(setEnabled).toHaveBeenCalledWith(true);
  });
});
