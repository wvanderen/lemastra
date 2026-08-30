/**
 * expo-sharing vitest facade (03-08, extends the 03-01 expo-sqlite
 * facade pattern).
 *
 * Why: `@/lib/workspace/export` imports the native share sheet; the
 * real package entry pulls expo-modules-core and crashes under plain
 * Node (`__DEV__ is not defined`). Tests that assert SHARE invocations
 * mock this module per-file (chart-export.test.ts gated-share
 * convention, which takes precedence over the alias); this facade
 * exists so UNMOCKED graphs — the Phase-1 privacy-screen tests
 * rendering DataControls — load without device APIs.
 *
 * Surface: exactly what export.ts consumes. Defaults: capability
 * reported available, share resolves as a silent no-op — nothing a
 * test has not explicitly mocked should render error states.
 */
export function isAvailableAsync(): Promise<boolean> {
  return Promise.resolve(true);
}

export function shareAsync(
  _uri: string,
  _options?: { mimeType?: string }
): Promise<void> {
  return Promise.resolve();
}
