/**
 * react-native-reanimated vitest facade (04-03 Task 3, Rule 3 deviation,
 * extends the 04-01 facade law).
 *
 * Why: the wheel canvas (src/components/chart/explore/wheel-canvas.tsx)
 * consumes `useSharedValue` for its 04-05 zoom seam, and the D-03
 * mini-wheel entry card mounts on /chart/result and /chart/saved — so
 * every graph rendering those screens now imports Reanimated. The real
 * package entry (`lib/module`, ESM with directory imports) cannot load
 * under plain-Node vite workers ("Directory import … is not supported
 * resolving ES modules") — the same native-entry class the RNGH facade
 * solved in 04-01.
 *
 * Surface: exactly what app code imports today — `useSharedValue`.
 * The facade's shared value is a plain { value } box: reads and writes
 * work synchronously (the identity-view contract the wheel's tap
 * inverse depends on), there is simply no UI-thread runtime. Tests
 * that assert animation behavior mock this module per-file (per-file
 * vi.mocks take precedence over the alias — facade law). When a
 * Phase-4/5 consumer imports a new export, extend this facade
 * deliberately.
 */

/** Benign shared-value double — synchronous reads/writes, no UI thread. */
export interface SharedValueFacade<T> {
  value: T;
}

export function useSharedValue<T>(initial: T): SharedValueFacade<T> {
  return { value: initial };
}
