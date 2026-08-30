import { randomUUID as nodeRandomUUID } from "node:crypto";

/**
 * expo-crypto vitest facade (03-08, extends the 03-01 expo-sqlite
 * facade pattern).
 *
 * Why: graphs that reach `@/lib/workspace/repository` (via ./ids) load
 * expo-crypto, whose package entry pulls expo-modules-core — native
 * initialization that crashes under plain Node (`__DEV__ is not
 * defined`). Files that previously needed the module mocked per-file
 * (the result-screen.test.tsx node:crypto stand-in convention) can
 * still vi.mock over this facade; the alias merely gives UNMOCKED
 * graphs — e.g. the Phase-1 privacy-screen tests, which render the
 * registry screen now that it mounts DataControls — a loadable,
 * honest UUID source instead of a crash.
 *
 * Surface: exactly what src/lib/workspace/ids.ts consumes —
 * `randomUUID()` backed by node:crypto (still cryptographic
 * randomness, never Math.random — the ids.ts law).
 */
export function randomUUID(): string {
  return nodeRandomUUID();
}
