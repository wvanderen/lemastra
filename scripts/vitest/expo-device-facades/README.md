# expo-device-facades — vitest aliases for the device-API modules

Extends the 03-01 `expo-sqlite-facade` pattern to the three expo device
modules the workspace graph reaches (`03-08`):

| Alias | Facade | Replaces |
|---|---|---|
| `expo-crypto` | `crypto.ts` (`randomUUID` via `node:crypto`) | native crypto entry |
| `expo-file-system` | `file-system.ts` (OO `File` subset + `Paths.cache`, in-memory writes) | native FS entry |
| `expo-sharing` | `sharing.ts` (capability-available no-op share) | native share entry |

## Why

All three package entries pull `expo-modules-core`, whose top-level
`setUpJsLogger.fx.ts` references `__DEV__` and crashes under plain Node.
Before 03-08, every test file that touched these modules mocked them
per-file (`vi.mock`) — which works when the file is editable. The
Phase-1 `privacy-screen.test.tsx` renders the registry screen bare and
**must pass unmodified** (its governance value is that it was written
before any of this existed); once `/privacy` mounts DataControls, its
graph reaches `repository.ts` → `./ids` → `expo-crypto` and
`export.ts` → `expo-file-system`/`expo-sharing`. The config-level alias
gives that unmodifiable graph loadable modules.

## Precedence

`vi.mock("expo-file-system", …)` (and the others) registered in a test
file **take precedence** over the alias for that file's module graph —
the per-file captured-writes/gated-share assertions are unaffected.
The facade is the floor for graphs that never asked for a mock.

## Surface law

Each facade exports EXACTLY the surface the app consumes today
(`ids.ts`: `randomUUID`; `export.ts`: `File(directory, name)`,
`.uri`, `.write()`, `Paths.cache`, `isAvailableAsync`, `shareAsync`).
When consumption grows, extend the facade in the same commit — a graph
that imports an un-facaded export fails loudly at resolve time.
