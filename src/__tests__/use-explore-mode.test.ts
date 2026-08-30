import type { renderHook as rtlRenderHook } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { EXPLORE_MODE_KEY, type ExploreMode, useExploreMode } from "@/hooks/use-explore-mode";

// AsyncStorage is native-module-backed and has no real store under the
// vitest RN shim — mock it with an in-memory Map (jest-preset-parity
// style, matching the use-disclosure.test.tsx seam). vi.hoisted keeps
// the references usable inside the hoisted factory; the failure flags
// flip getItem/setItem into rejections for the safe-persist/read-
// fallback paths (D-07 best-effort contract).
const store = vi.hoisted(() => new Map<string, string>());
const failures = vi.hoisted(() => ({ read: false, write: false }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (key: string) =>
      failures.read
        ? Promise.reject(new Error("storage read failed"))
        : Promise.resolve(store.get(key) ?? null),
    setItem: (key: string, value: string) => {
      if (failures.write) return Promise.reject(new Error("storage write failed"));
      store.set(key, value);
      return Promise.resolve();
    },
  },
}));

// Acquired in beforeAll (not a static import): RNTL requires react-native
// at import time, and the RN test shim only seeds require.cache when the
// setupFile has run — which happens after collection but before hooks.
// RNTL v14: renderHook is async (act-wrapped).
let renderHook: typeof rtlRenderHook;
let cleanup: () => Promise<void>;
let act: <T>(callback: () => T | Promise<T>) => Promise<T>;

beforeAll(async () => {
  ({ renderHook, cleanup, act } = await import("@testing-library/react-native/pure"));
});

// RNTL's `/pure` entry skips automatic cleanup — unmount after every
// test so repeated renders don't leak into later hooks, and reset the
// fake storage seam between cases.
afterEach(async () => {
  await cleanup();
  store.clear();
  failures.read = false;
  failures.write = false;
});

describe("useExploreMode (D-07 Simple/Technical preference)", () => {
  it("returns mode 'simple' on first render — the first-run default before storage resolves", async () => {
    const hook = await renderHook(() => useExploreMode());
    expect(hook.result.current.mode).toBe("simple");
  });

  it("persists under the exact versioned key @lemastra:explore.mode.v1", async () => {
    expect(EXPLORE_MODE_KEY).toBe("@lemastra:explore.mode.v1");

    const hook = await renderHook(() => useExploreMode());
    await act(async () => {
      hook.result.current.setMode("technical");
    });

    expect(store.get("@lemastra:explore.mode.v1")).toBe("technical");
  });

  it("hydrates a stored 'technical' preference after mount", async () => {
    store.set(EXPLORE_MODE_KEY, "technical");
    const hook = await renderHook(() => useExploreMode());
    await act(async () => {});
    expect(hook.result.current.mode).toBe("technical");
  });

  it("setMode flips state immediately and round-trips through storage", async () => {
    const first = await renderHook(() => useExploreMode());
    await act(async () => {
      first.result.current.setMode("technical" satisfies ExploreMode);
    });
    expect(first.result.current.mode).toBe("technical");
    await cleanup();

    // Fresh hook instance — reads the persisted preference, not memory.
    const second = await renderHook(() => useExploreMode());
    await act(async () => {});
    expect(second.result.current.mode).toBe("technical");
  });

  it("keeps the in-state flip when the persist write rejects (safe-persist, never blocks the UI)", async () => {
    failures.write = true;
    const hook = await renderHook(() => useExploreMode());
    await act(async () => {
      hook.result.current.setMode("technical");
    });
    expect(hook.result.current.mode).toBe("technical");
    expect(store.has(EXPLORE_MODE_KEY)).toBe(false);
  });

  it("falls back to the 'simple' default when the read rejects", async () => {
    failures.read = true;
    const hook = await renderHook(() => useExploreMode());
    await act(async () => {});
    expect(hook.result.current.mode).toBe("simple");
  });

  it("parses the stored value against the union — corrupted values fall back to 'simple' (T-04-03)", async () => {
    store.set(EXPLORE_MODE_KEY, "banana");
    const hook = await renderHook(() => useExploreMode());
    await act(async () => {});
    expect(hook.result.current.mode).toBe("simple");
  });
});
