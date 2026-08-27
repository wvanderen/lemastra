# expo-sqlite vitest facade

Aliases the `expo-sqlite` specifier to a `node:sqlite`-backed facade so
the workspace data layer (drizzle-orm's expo-sqlite driver) runs under
vitest against a **real SQL engine** with zero new dev dependencies.

- **Wired in:** `vitest.config.ts` → `resolve.alias`
  (`{ find: /^expo-sqlite$/, replacement: scripts/vitest/expo-sqlite-facade/index.ts }`) —
  the same slot as the react-native facade alias.
- **Contract:** pinned by `src/__tests__/expo-sqlite-facade.test.ts`,
  which also proves the real `drizzle()` driver (insert / select /
  delete-with-where / transaction commit + rollback) runs over it.
- **Files, not `:memory:`:** every named database maps to a file under a
  per-run `mkdtemp` temp dir, so close → reopen-by-name observes the
  same data (WORK-03 restart semantics). `reset()` is the test-only
  isolation hook (closes handles, deletes the temp dir).

## Pitfall 8 — surface discipline (T-03-02)

The facade implements **exactly** the synchronous call surface
drizzle-orm@0.45.2's expo-sqlite session consumes (source-read from
`node_modules/drizzle-orm/expo-sqlite/session.js`) and nothing more:

- `openDatabaseSync(name)` → `{ prepareSync, execSync, closeSync }`
- `prepareSync(sql)` → `{ executeSync, executeForRawResultSync }`
- `executeSync(params)` → `{ changes, lastInsertRowId }` (numeric —
  node:sqlite's `lastInsertRowid` lowercase-d is mapped) plus
  `getAllSync()`/`getFirstSync()` column-named row getters
- `executeForRawResultSync(params)` → `{ getAllSync() }` returning
  positional value **arrays** (drizzle's `mapResultRow` indexes by
  column position; node:sqlite has no raw-row mode on Node 22)

Do not add methods here without re-reading the drizzle session source —
surface drift between this facade and device semantics is precisely
what the contract test exists to catch. Repository code must stay on
the drizzle query API (never raw expo-sqlite methods) so the facade
surface stays minimal.
