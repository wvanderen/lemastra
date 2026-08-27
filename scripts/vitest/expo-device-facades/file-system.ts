/**
 * expo-file-system vitest facade (03-08, extends the 03-01 expo-sqlite
 * facade pattern).
 *
 * Why: `@/lib/workspace/export` imports the OO File API; the real
 * package entry pulls expo-modules-core and crashes under plain Node
 * (`__DEV__ is not defined`). Tests that assert WRITE CONTENT mock
 * this module per-file (chart-export.test.ts / data-controls.test.tsx
 * captured-writes convention, which takes precedence over the alias);
 * this facade exists so UNMOCKED graphs — the Phase-1 privacy-screen
 * tests rendering DataControls — load without device APIs.
 *
 * Surface: exactly what export.ts consumes — `File` (OO subset:
 * constructor(directory, name), `.uri`, `.write(content)`) and
 * `Paths.cache`. Writes land in an in-memory map keyed by uri so a
 * curious test can still inspect them.
 */
const writes = new Map<string, string>();

export class File {
  constructor(
    public directory: unknown,
    public name: string
  ) {}

  get uri(): string {
    return `file://${String(this.directory)}/${this.name}`;
  }

  write(content: string): Promise<void> {
    writes.set(this.uri, content);
    return Promise.resolve();
  }
}

export const Paths = {
  cache: "/lemastra-vitest-cache",
};

/** Test-introspection helper — every write captured by uri. */
export function __recordedWrites(): ReadonlyMap<string, string> {
  return writes;
}
