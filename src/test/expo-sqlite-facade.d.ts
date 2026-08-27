/**
 * Type augmentation for the vitest `expo-sqlite` alias
 * (scripts/vitest/expo-sqlite-facade).
 *
 * tsc resolves the "expo-sqlite" specifier to the REAL package types
 * (it does not know vitest.config.ts's resolve.alias), so the facade's
 * test-only `reset` helper is invisible to TypeScript otherwise. The
 * helper exists only in the test pipeline — it is deliberately NOT part
 * of the device API surface, hence this augmentation instead of a
 * facade interface export leaking into app types. The `export {}` makes
 * this file a module so `declare module` MERGES with the package's own
 * types rather than shadowing them.
 */
export {};

declare module "expo-sqlite" {
  /** Test-only: close open facade handles and clear the per-run temp dir. */
  export function reset(): void;
}
