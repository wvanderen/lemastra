/**
 * Simple ↔ Technical explore-mode preference (D-07, EVID-02).
 *
 * The explore surface's global mode toggle flips vocabulary + factor
 * depth everywhere (D-05). This hook owns ONLY the preference state
 * and its persistence — it carries no UI vocabulary. Consumers pass
 * `mode` down as a plain prop to their surfaces (D-06 same-data-path
 * law: both modes derive from the same envelope; not context, not two
 * component trees).
 *
 * Mirrors the use-disclosure.ts pattern exactly: a versioned
 * AsyncStorage key (bump the suffix when mode semantics change), a
 * mounted-guarded best-effort read whose failure falls back to the
 * default, and an optimistic setState + safe-persist write whose
 * failure never blocks the UI. First-run default is Simple (D-07).
 *
 * The stored value is parsed against the two-valued union before it
 * reaches state — a corrupted or foreign value falls back to the
 * default silently (T-04-03): the preference is never rendered raw
 * and can never crash a surface.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

/** Versioned persistence key — bump `.v1` when mode semantics change. */
export const EXPLORE_MODE_KEY = "@lemastra:explore.mode.v1";

/** The two explore modes (D-05). */
export type ExploreMode = "simple" | "technical";

/** First-run default (D-07). */
export const DEFAULT_EXPLORE_MODE: ExploreMode = "simple";

/**
 * Parse a stored value against the union: only the exact literals are
 * accepted; anything else (including corrupted values, T-04-03)
 * resolves to the default.
 */
function parseStoredMode(value: string | null): ExploreMode {
  return value === "technical" ? "technical" : DEFAULT_EXPLORE_MODE;
}

/**
 * The remembered Simple ↔ Technical preference.
 *
 * `mode` starts at the first-run default and hydrates the stored
 * preference after mount; `setMode` flips state immediately and
 * persists best-effort.
 */
export function useExploreMode(): {
  mode: ExploreMode;
  setMode: (mode: ExploreMode) => void;
} {
  const [mode, setModeState] = useState<ExploreMode>(DEFAULT_EXPLORE_MODE);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(EXPLORE_MODE_KEY)
      .then((value) => {
        if (mounted) {
          setModeState(parseStoredMode(value));
        }
      })
      .catch(() => undefined); // a read failure must never block rendering
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback((next: ExploreMode) => {
    // Optimistic flip — the UI never waits on storage.
    setModeState(next);
    // Safe-persist: an unavailable store degrades to this session's
    // memory only — never to blocking or crashing the toggle.
    AsyncStorage.setItem(EXPLORE_MODE_KEY, next).catch(() => undefined);
  }, []);

  return { mode, setMode };
}
