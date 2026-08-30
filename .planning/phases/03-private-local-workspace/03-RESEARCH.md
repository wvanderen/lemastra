# Phase 3: Private Local Workspace - Research

**Researched:** 2026-08-27
**Domain:** Client-local persistence (expo-sqlite + Drizzle ORM), immutable revision model, data export/deletion controls, telemetry-exclusion enforcement — React Native / Expo SDK 57 client work
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Local persistence uses **expo-sqlite + Drizzle ORM** per STACK.md — typed schema + migrations, versioned JSON envelopes with indexed summary columns (label, identity fields, revision id, timestamps). New deps installed via `npx expo install` (legitimacy/tilde-pin conventions from Phase 1).
- **D-02:** A saved chart revision stores the **full immutable calculation envelope** — the exact validated CalculateResponse (placements, provenance, unavailable/provisional factors) plus the identity/zone-source metadata the result screen carries. Reopening a saved chart **never re-calls the API**; the stored envelope IS the evidence (parse-then-trust via the existing `calculateResponseSchema`).
- **D-03:** **Native-first, adapter seam**: persistence targets iOS/Android. The data layer sits behind a thin repository interface so a web (IndexedDB) adapter can slot in later. Web shows a clear "saved charts require the app" state — no web storage spike this phase.
- **D-04:** **Plain SQLite in the OS app sandbox** — no SQLCipher/key management in v1. Encryption can be added later behind the same repository seam.
- **D-05:** A saved chart is **one identity with an immutable revision chain**: chart = UUID + display label; revisions append under it. Renaming (WORK-05) mutates chart metadata only — never a revision, never touching stored envelopes.
- **D-06:** **Any calculation-input change triggers a new revision** — birth data, resolved place/coordinates/zone, tricky-time resolution, time confidence, house system (formalizes Phase 2's D-11). Revision identity builds on the existing `input_revision` sha256[:12] digest. Identical inputs do not create a new revision.
- **D-07:** Opening a chart shows its **latest revision**; a History list in the chart detail shows prior revisions (date + what changed) and each opens **read-only**.
- **D-08:** **Revise = reuse the Phase-2 birth flow prefilled** with that revision's inputs → confirm → calculate → save appends the new revision. No forked edit path; the new calculation passes through the same validation/provenance chain.
- **D-09:** **Home becomes the workspace**: the "Calculate a chart" CTA stays on top; saved charts are listed beneath; the empty state is the current hero. No new tab shell, no dedicated /charts route.
- **D-10:** **Explicit save with label prompt**: the result screen gains a "Save chart" CTA; tapping prompts for a display label (smart prefilled default, e.g. date · place), then saves. Nothing is stored the user didn't explicitly ask to store (private-by-default).
- **D-11:** Chart list rows show **label + identity line (date · place, same vocabulary as the result identity line) + confidence marker when not "Timed" + revision badge when >1 revision**, sorted most-recently-updated first.
- **D-12:** **Rename happens inline on the saved-chart detail screen** via a validated input (non-empty, reasonable length); the list refreshes on save.
- **D-13:** Single-chart export (WORK-07) writes the saved revision's **full envelope + identity + label as pretty-printed JSON** to a file (`lemastra-chart-<label-slug>-<revision-id>.json`) and opens the **native share sheet via expo-sharing**. Machine-reusable, provenance-complete.
- **D-14:** Single-chart deletion (WORK-06) uses a **confirmation dialog** naming the chart, its revision count, and that dependent local artifacts are removed — then deletes the chart and all its revisions.
- **D-15:** PRIV-05/06 live as a **"Your data" section on the existing /privacy screen** (registry-driven from Phase 1): **Export all data** (one JSON file with every chart + revisions + metadata) and **Delete all data** (confirm dialog → wipes the database). Non-personal flags (disclosure acknowledgements) may survive a delete-all.
- **D-16:** **No analytics/crash SDK ships in Phase 3** (PRIV-03/04). The posture is enforced, not promised: tests assert no telemetry initialization and that log call sites exclude chart payloads; a small `redact()` utility + logging convention lands now so a later Sentry integration (Phase 7+) inherits the guardrail.

### the agent's Discretion
- Drizzle schema details (tables, columns, indices) and migration tooling within expo-sqlite — follow Expo's documented Drizzle integration.
- Repository interface shape and where it mounts (context provider vs module) — keep it thin so D-03's adapter seam is honest.
- Save-state ergonomics on the result screen after save (e.g. Saved confirmation, preventing duplicate saves of the same envelope).
- Smart-default label derivation (date · place format), duplicate-label handling, and label validation bounds.
- "What changed" summary derivation for the revision History list (input-diff presentation).
- Chart detail screen layout: how the Phase-2 result components (PlacementList, AssumptionsLine, ProvenanceDetails, UnavailableFactors) compose for a saved chart vs a fresh calculation.
- Export file writing mechanics (expo-file-system current OO API) and share-sheet capability fallbacks.
- How home's list and the disclosure/telemetry tests integrate with the existing vitest + RNTL setup.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (Phase boundary also excludes: interactive wheel/evidence views (Phase 4), transits (Phase 5), interpretation (Phase 6+), accounts/sync (v2), cloud storage (never in v1), web persistence adapter (deferred — native-first with adapter seam).)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WORK-01 | User can calculate and inspect a first chart without creating an account. | Already true from Phase 2 (no auth exists anywhere); Phase 3 adds no account gate. Home workspace (D-09) keeps the CTA as the top surface. Test: existing home/birth flow tests keep passing with the list mounted; assert no sign-in surface exists. |
| WORK-02 | User can save a chart locally with a chosen display label. | Drizzle `charts` + `chart_revisions` schema with label column + JSON-mode envelope column; save validates envelope via `calculateResponseSchema.parse` then persists (D-02/D-10). Label validation bounds per §Patterns. |
| WORK-03 | User can browse and reopen locally saved charts after restarting the app. | SQLite file in app sandbox persists across restarts; repository list query ordered by `updated_at desc`; reopen reads by chart/revision id and re-parses stored envelope (parse-then-trust) — never re-calls the API (D-02). Restart survival verified in vitest via file-backed `node:sqlite` temp DB (close + reopen). |
| WORK-04 | User can revise birth details by creating a new immutable chart revision without changing the basis of existing analyses. | Revision append keyed on `input_revision` digest (D-06): identical digest ⇒ no new revision; changed inputs ⇒ new append-only row. Immutability asserted by byte-comparing stored envelope JSON before/after append. Revise path prefills Phase-2 birth flow from stored CalculateRequest inputs (D-08). |
| WORK-05 | User can rename a locally saved chart. | `UPDATE charts SET label = ?, updated_at = ?` only (D-05); revisions rows untouched. Inline validated input on saved-chart detail (D-12). |
| WORK-06 | User can delete a locally saved chart and its dependent local artifacts after confirming. | Confirmation dialog naming chart + revision count (D-14); explicit transactional cascade delete (revisions then chart) in one `withTransactionAsync`/drizzle `db.transaction` — do NOT rely on FK pragma (see Pitfall 2). |
| WORK-07 | User can export the structured data and provenance for a saved chart. | Pretty-printed JSON via `expo-file-system` OO API (`new File(Paths.cache, ...).write(...)`), filename `lemastra-chart-<label-slug>-<revision-id>.json`, then `expo-sharing.shareAsync(file.uri, {mimeType: 'application/json'})` (D-13). Slug sanitization per §Patterns. |
| PRIV-01 | Charts, conversations, analyses, and reports are private and local by default. | No server write path exists (retention §1: charts device-side only); nothing persists without explicit Save (D-10); repository is the only persistence module and contains no network code — test-enforced. |
| PRIV-03 | Birth data, chart content, questions, conversations, and report prose are excluded from product analytics. | D-16: no analytics/crash SDK ships; test asserts no telemetry initialization; `redact()` utility + logging convention (allowlist-based, per retention §4 beforeSend posture) lands now. |
| PRIV-04 | Logs and crash telemetry redact provider credentials and sensitive astrology payloads. | Same enforcement surface as PRIV-03: redact() unit tests + log call-site test (only sanctioned logger may log; today the codebase has exactly one `console.warn` in a test helper — baseline is clean). |
| PRIV-05 | User can export all personal data stored locally by the app. | "Your data" section on /privacy (D-15): Export-all reads every chart + revision + metadata into one JSON file via the same File+share mechanics as WORK-07. Retention §5 principle implemented. |
| PRIV-06 | User can delete all personal data stored locally by the app. | Delete-all = transactional wipe of all personal-data rows (charts + revisions), keeping schema/migration bookkeeping + non-personal AsyncStorage disclosure flags (D-15). No server round-trip needed (retention §6: nothing server-side to purge). |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- **Tech stack locked:** React Native via Expo SDK 57 (RN 0.86, React 19.2.3, New Architecture only) — no escape hatch to the legacy bridge; Expo Router for navigation; new native-adjacent deps go through `npx expo install`.
- **Local storage mandate:** `expo-sqlite` for local-first persistence (versioned JSON envelopes + indexed summary columns, migrations, prepared statements) with **Drizzle ORM** for the typed local schema. `expo-secure-store` is only for small secrets — never charts/conversations. Web SQLite caveat resolved by D-03 (native-first, adapter seam).
- **Revision discipline:** Charts stored as immutable JSON revisions; a changed birth time, coordinates, timezone, house system, ephemeris version, or orb policy creates a NEW revision. IDs are UUIDv7/ULID-style.
- **Domain dependency:** `dev/astrology-skill` is authoritative for interpretive datasets; calculation stays behind the FastAPI service (this phase adds no calculation code — the stored envelope is the Phase-2 result).
- **Trust:** Calculated facts and structured evidence stay distinguishable from interpretation; parse-then-trust is repo law (no screen renders unvalidated stored data).
- **Privacy readiness:** No architecture assuming birth data/conversations are public; private-by-default is enforced in code this phase (PRIV-03/04/05/06).
- **GSD workflow enforcement:** file changes happen through GSD entry points (this research is part of `/gsd-plan-phase`).
- **Phase-1/2 carryovers that bind this phase:** tilde-pin + legitimacy checkpoint convention for every new dependency; typed routes must be regenerated (dev-server boot) after route changes before `tsc --noEmit`; copy-deck discipline (`copy.ts` per component); registry-driven disclosure UI consistency tests; gitleaks CI gates; vitest + RNTL `/pure` + zero-dependency RN shim as the test substrate.

## Summary

Phase 3 turns the Phase-2 calculated chart (an in-memory router param) into a durable, private, user-controlled local workspace. The technical core is the **first SQLite data layer in the repo**: `expo-sqlite` (~57.0.1) + `drizzle-orm` (0.45.2) with `drizzle-kit`-generated migrations, wrapped in a thin repository interface so a later web (IndexedDB) adapter can slot in (D-03). Every locked decision in CONTEXT.md D-01–D-16 maps onto well-documented, verified library capabilities: Drizzle's Expo driver, JSON-mode columns for immutable envelopes, generated SQL migrations gated before UI use, `expo-file-system`'s object-oriented `File`/`Paths` API for export files, and `expo-sharing`'s native share sheet (local `file://` URIs only on Android — enforced by the native module).

Three findings materially de-risk planning. **First**, Drizzle's `expo-sqlite` driver was source-verified (v0.45.2 `session.js`): it calls only the **synchronous** surface of `SQLiteDatabase` (`prepareSync`, `executeSync`, `getAllSync`/`getFirstSync`, `executeForRawResultSync`, raw `begin`/`commit`/`rollback`). **Second**, the installed Node 22.22.3 runs `node:sqlite` (`DatabaseSync`) **unflagged** (experimental warning only) — so the real Drizzle repository can be integration-tested in the existing vitest node environment by aliasing `expo-sqlite` to a thin `node:sqlite` facade implementing exactly that sync surface, zero new dev dependencies, mirroring the repo's existing config-time `react-native` facade pattern. **Third**, the stored-envelope contract needs one extension the CONTEXT implies but does not spell out: to prefill the Phase-2 birth flow on revise (D-08), a revision row must also persist the **CalculateRequest inputs** (lat/lon, iana_zone, time_resolution, house_system) — the CalculateResponse envelope + identity params alone lack them (verified against `src/app/birth/confirm.tsx` / `src/app/chart/result.tsx`).

Privacy posture (PRIV-01/03/04/05/06) is enforced in code this phase: no analytics/crash SDK ships, a small `redact()` utility + logging convention lands now (D-16), and the retention-deletion-policy §5 principle ("deletable and exportable without an account") becomes repository-level export-all/delete-all mechanics joined to the registry-driven `/privacy` screen (D-15).

**Primary recommendation:** Build a single `src/lib/workspace/` data layer — Drizzle schema (charts + revisions tables), drizzle-kit migrations applied via the imperative `migrate()` inside a lazy repository module, with revision rows storing `{envelope (JSON), identity, calculate-request inputs, input_revision digest}`; test it in vitest through a `node:sqlite`-backed `expo-sqlite` alias, and gate all UI on migration success.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Chart/revision persistence | Client (device) — expo-sqlite in OS app sandbox | — | Private-by-default (PRIV-01); no server storage exists in v1 (retention §1). Repository interface isolates the engine (D-03 seam). |
| Revision identity (digest, immutability) | Client (device) — repository + schema constraints | API (produces `input_revision` digest server-side) | The server already computes the sha256[:12] digest of normalized inputs (CALC-03); the client stores and compares it — never re-derives (D-06). |
| Save/label UX, workspace list | Client — Expo Router screens + TanStack Query | — | Home (D-09) and result screen (D-10) surfaces; TanStack Query wires list/detail queries with invalidation on mutations. |
| Revise (prefill birth flow) | Client — router params into /birth | API (re-calculation through the normal confirm chain) | D-08: no forked edit path; the new calculation re-validates through the server (validation/provenance chain preserved). |
| Export file creation + share | Client — expo-file-system (OO API) + expo-sharing | — | Native-only v1 (D-03/D-13); Android native module enforces local `file://` URIs. Web shows capability-appropriate fallback state. |
| Export-all / delete-all controls | Client — /privacy "Your data" section + repository | — | Retention §5 principle; device-local data only, no server round-trip (§6). Registry-driven screen extension (D-15). |
| Telemetry exclusion / log redaction | Client — `redact()` util + logging convention + tests | — | Enforced pre-integration (retention §4 posture) so a later Sentry `beforeSend` inherits the guardrail (D-16). |
| Disclosure acknowledgements (non-personal) | Client — AsyncStorage (existing `use-disclosure` pattern) | — | Versioned-key precedent already ships; deliberately separate from SQLite so delete-all spares it (D-15). |
| Web degradation state | Client — Platform.OS gate at repository/UI mount | — | "Saved charts require the app" state; no web storage code paths this phase (D-03). |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-sqlite | ~57.0.1 (SDK-57 pin; registry latest 57.0.2) | SQLite engine + `SQLiteDatabase` (sync+async surfaces, transactions, `SQLiteProvider`) | Expo's first-party local-first recommendation in STACK.md; D-01 locks it. `[VERIFIED: npm registry + node_modules/expo/bundledNativeModules.json + Context7/expo source]` |
| drizzle-orm | 0.45.2 (latest; `^0.45` style per repo precedent) | Typed schema, query builder, `drizzle-orm/expo-sqlite` driver, `expo-sqlite/migrator` | D-01; Expo documents a first-class Drizzle integration; JSON-mode text columns fit the "versioned JSON envelope + indexed summary columns" storage shape. `[VERIFIED: npm registry + Context7 drizzle docs + driver source read]` |
| drizzle-kit | 0.31.10 (devDependency) | `generate` migrations from schema (`dialect: 'sqlite'`, `driver: 'expo'`) | The documented pairing; emits app-importable JS migration modules + journal. `[VERIFIED: npm registry + Context7]` |
| expo-file-system | ~57.0.5 (SDK-57 pin; registry latest 57.0.6) | Export file write via OO API (`File`, `Paths`) | STACK.md mandates the current OO API; verified SDK-57 exports. `[VERIFIED: Context7/expo source]` |
| expo-sharing | ~57.0.14 (SDK-57 pin; registry latest 57.0.16) | Native share sheet for exported JSON | D-13; Android enforces local `file://`; mimeType `application/json`. `[VERIFIED: Context7/expo source incl. Android module]` |
| zod (existing) | ^4.4.3 | Envelope validation at save AND reopen (parse-then-trust); label validation | Repo law T-02-06/T-02-33; `calculateResponseSchema` is the single stored-data contract. `[VERIFIED: codebase]` |
| TanStack Query (existing) | ^5.102.3 | Workspace list/detail queries + mutation invalidation | Existing `query-client.tsx` provider; persistence stays in SQLite (no query-cache persistence). `[VERIFIED: codebase]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-crypto | ~57.0.1 (SDK-57 pin; registry latest 57.0.2) | `randomUUID()` / `getRandomValues()` for chart + revision ids | Generate ids client-side (local-only artifacts). If time-ordered ids are wanted, format UUIDv7 over `getRandomValues` (formatting only — randomness stays in the platform API). `[VERIFIED: npm registry + bundledNativeModules]` |
| node:sqlite (Node builtin) | Node 22.22.3 runtime | Real SQL engine behind the vitest `expo-sqlite` alias | Test-only; verified working unflagged on the installed Node (experimental warning). Zero new deps. `[VERIFIED: local runtime execution]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-sqlite + Drizzle | Raw `expo-sqlite` SQL, no ORM | Fewer deps but hand-maintained typing/migrations; D-01 locks Drizzle — do not revisit. |
| expo-sqlite + Drizzle | AsyncStorage (existing precedent) | Key/value only — no transactions/indexes/ordered queries; charts+revisions need relational shape. STACK.md already rejects it for this use. |
| expo-sharing native share | expo-print PDF now | PDF export is Phase 9 (reports); WORK-07 wants machine-reusable JSON. |
| drizzle `useMigrations` hook | imperative `migrate()` in the repository module | Hook is the docs' happy path for React mounts; imperative call fits the thin-module repository (D-03 discretion). Both verified to exist in 0.45.2 — planner picks per mount choice. |
| node:sqlite test alias | `better-sqlite3` devDependency | Native module + new legitimacy surface + version skew; node:sqlite achieves the same with zero deps (repo zero-dependency precedent, STATE.md 01-02). |

**Installation:**
```bash
npx expo install expo-sqlite expo-file-system expo-sharing expo-crypto
npm install drizzle-orm        # runtime (^0.45 line)
npm install -D drizzle-kit     # codegen (0.31.x)
```
All installs follow the Phase-1 legitimacy-checkpoint convention (tilde pins authoritative for expo-*; record rationale per dep).

**Version verification (executed 2026-08-27):** `npm view` confirmed expo-sqlite 57.0.2 / expo-file-system 57.0.6 / expo-sharing 57.0.16 / expo-crypto 57.0.2 / drizzle-orm 0.45.2 (published 2026-03-27) / drizzle-kit 0.31.10 (2026-03-17) all current; `node_modules/expo/bundledNativeModules.json` pins the SDK-57 tilde ranges `expo-sqlite ~57.0.1`, `expo-file-system ~57.0.5`, `expo-sharing ~57.0.14`, `expo-crypto ~57.0.1`. No package ships a postinstall script. `[VERIFIED: npm registry]`

## Package Legitimacy Audit

> Seam run 2026-08-27 (`gsd-tools query package-legitimacy check --ecosystem npm …`) + `npm view` registry verification + postinstall script inspection (none on any package).

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| drizzle-orm | npm | latest 0.45.2 published 2026-03-27 | ~20.2M/wk | github.com/drizzle-team/drizzle-orm | OK | Approved |
| drizzle-kit | npm | latest 0.31.10 published 2026-03-17 | ~16.8M/wk | github.com/drizzle-team/drizzle-orm | OK | Approved |
| expo-sqlite | npm | 57.0.2 published 2026-08-26 | ~1.11M/wk | github.com/expo/expo | SUS ("too-new") | Approved via existing convention — see note |
| expo-file-system | npm | 57.0.6 published 2026-08-26 | ~8.99M/wk | github.com/expo/expo | SUS ("too-new") | Approved via existing convention — see note |
| expo-sharing | npm | 57.0.16 published 2026-08-26 | ~2.14M/wk | github.com/expo/expo | SUS ("too-new") | Approved via existing convention — see note |
| expo-crypto | npm | 57.0.2 published 2026-08-24 | ~3.66M/wk | github.com/expo/expo | SUS ("too-new") | Approved via existing convention — see note |

**Note on the four expo-* SUS verdicts:** the flag is `too-new` (publish recency only). All four are first-party packages of the official `expo/expo` monorepo with 1M–9M weekly downloads, none deprecated, none with postinstall scripts — the recent publish dates are simply Expo's active SDK-57-line release cadence (registry `latest` moves within days). Project convention (Phase 1) already governs this exactly: install via `npx expo install` (which pins the SDK-compatible tilde range from `bundledNativeModules.json`, NOT the moving `latest` tag) and record the per-dependency legitimacy rationale in the plan. The planner should still carry the Phase-1-style checkpoint note on the install task, but these are not slopsquatting signals. `[VERIFIED: npm registry + seam signals]`

**Packages removed due to SLOP verdict:** none.
**Packages flagged as suspicious [SUS]:** none requiring human-verify beyond the standing Phase-1 install-checkpoint convention above.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                    LemAstra client (native)                  │
                    │                                                             │
 /birth flow ──▶ /birth/confirm ──calculate──▶ /chart/result                       │
 (Phase 2,        (builds CalculateRequest;      │ parse-then-trust                │
  reused for       envelope + identity params)   │                                 │
  revise w/                                            │ Save CTA (D-10)           │
  prefill, D-08)  ┌─────────────────────────────────┘                                │
      ▲           ▼                                                                    │
      │    [Label prompt → validated label]                                            │
      │           │                                                                    │
      │           ▼                                                                    │
      │   ┌───────────────────────┐    save/envelope.parse    ┌──────────────────┐   │
      │   │  WorkspaceRepository  │──────────────────────────▶│ zod schemas      │   │
      │   │  (thin interface,     │◀──────────────────────────│ (api-schemas.ts) │   │
      │   │   D-03 adapter seam)  │    parsed envelope        └──────────────────┘   │
      │   └──────────┬────────────┘                                                │
      │              │ drizzle-orm/expo-sqlite (sync driver surface)                │
      │              ▼                                                               │
      │   ┌───────────────────────┐   migrations (drizzle-kit generate →            │
      │   │ expo-sqlite           │◀── imperative migrate() / useMigrations gate)   │
      │   │ SQLite file (sandbox) │                                                  │
      │   │ charts ─< revisions   │   (append-only revisions; label-only chart      │
      │   └──────────┬────────────┘    metadata mutations; updated_at ordering)     │
      │              │                                                                  │
      │              │ list/get/rename/delete/export-all/delete-all                  │
      │              ▼                                                                  │
      │   ┌───────────────────────┐                                                    │
      │   │ TanStack Query hooks  │──▶ Home workspace list (D-09)                     │
      │   └───────────────────────┘──▶ Saved-chart detail (+History, rename)          │
      │                                (reads by id — never by router-param envelope) │
      │                                                                                │
      │   /privacy ──"Your data" (D-15)──▶ Export all (File+share) / Delete all       │
      │                                    (transactional wipe; disclosure flags      │
      │                                     in AsyncStorage survive)                  │
      │                                                                                │
      │   redact() + logging convention (D-16) ── enforced by tests: no telemetry     │
      │   SDK init, no chart payloads at log call sites                                │
      └─────────────────────────────────────────────────────────────┬───────────────┘
                                                                    │
                              (calculation API calls still exist ONLY inside the
                               Phase-2 confirm flow — save/reopen/export never
                               touch the network; charts never leave the device)

  Web (Platform.OS === 'web'): repository mount short-circuits to a
  "saved charts require the app" state — no storage code path.
```

**Trace (primary use case, WORK-02→WORK-03):** calculate → result → Save CTA → label prompt → `calculateResponseSchema.parse` → repository.save (chart row + revision row in one transaction) → home list (TanStack Query) → app restart → list from SQLite → tap row → detail reads latest revision by id → re-parse envelope → render Phase-2 result components.

### Recommended Project Structure
```
src/
├── lib/
│   └── workspace/
│       ├── schema.ts          # Drizzle sqliteTable defs: charts, chart_revisions
│       ├── repository.ts      # WorkspaceRepository interface + SQLite implementation
│       │                      #   (D-03 seam: interface exported; impl swappable)
│       ├── db.ts              # lazy openDatabaseSync + drizzle() + migrate() gate
│       ├── ids.ts             # chart/revision id generation (expo-crypto)
│       ├── label.ts           # label validation + smart default + slug derivation
│       ├── revision-diff.ts   # "what changed" summary between CalculateRequest inputs
│       └── export.ts          # envelope → pretty JSON → File(Paths.cache) → shareAsync
├── components/
│   ├── workspace/
│   │   ├── chart-list.tsx     # home list rows (label, identity line, badges)
│   │   ├── save-prompt.tsx    # label prompt modal (validated input)
│   │   ├── rename-control.tsx # inline rename on detail (D-12)
│   │   ├── revision-history.tsx # History list (read-only prior revisions)
│   │   ├── delete-confirm.tsx # confirmation dialog (chart + revision count) (D-14)
│   │   └── data-controls.tsx  # /privacy "Your data": export-all / delete-all (D-15)
│   └── workspace/copy.ts      # copy deck (repo convention)
├── hooks/
│   └── use-workspace.ts       # TanStack Query hooks: list/detail/rename/delete/save
├── app/
│   ├── index.tsx              # extended: workspace list beneath CTA (D-09)
│   ├── chart/
│   │   ├── saved.tsx          # saved-chart detail by id param (+History +rename +delete +export)
│   │   └── revision.tsx       # read-only prior-revision view (D-07)
│   └── privacy.tsx            # extended: "Your data" section (D-15)
├── lib/redact.ts              # allowlist redaction utility + logging convention (D-16)
drizzle/                       # drizzle-kit output (journal + JS migration modules) — committed
drizzle.config.ts              # dialect: 'sqlite', driver: 'expo'
scripts/vitest/expo-sqlite-facade/  # node:sqlite-backed expo-sqlite alias for tests
```

### Pattern 1: Repository seam (D-03) + migration gate
**What:** One TypeScript interface owns every persistence capability; the SQLite/Drizzle implementation is the only consumer of `expo-sqlite`. Web mount returns an unavailable state instead of constructing a database.
**When to use:** Always — screens/hooks depend on the interface only; tests inject an in-memory fake.
**Example:**
```typescript
// Source: drizzle-orm docs (get-started/expo-new) + expo-sqlite source, adapted
import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "../../../drizzle/migrations";

// db.ts — lazy singleton; migration runs before any query is served
let dbPromise: Promise<WorkspaceDb> | null = null;
export function getWorkspaceDb() {
  dbPromise ??= (async () => {
    const expo = SQLite.openDatabaseSync("lemastra.db");
    const db = drizzle(expo, { schema });
    await migrate(db, migrations); // imperative gate (hook-free mount)
    return db;
  })();
  return dbPromise;
}
```
`[VERIFIED: Context7 /drizzle-team/drizzle-orm-docs get-started/expo-new + unpkg drizzle-orm@0.45.2/expo-sqlite/migrator.js]`

### Pattern 2: Versioned JSON envelope + indexed summary columns (STACK.md shape)
**What:** `chart_revisions` stores the full envelope as a `text({ mode: "json" }).$type<CalculateResponse>()` column; identity fields, `input_revision`, label, and timestamps are real indexed columns for list/sort/lookup without JSON parsing.
**When to use:** Every revision row — this IS the D-02 storage contract.
**Example:**
```typescript
// Source: drizzle-orm docs (sqlite column-types), adapted to LemAstra contract
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const charts = sqliteTable("charts", {
  id: text("id").primaryKey(), // uuid from expo-crypto
  label: text("label").notNull(),
  created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const chartRevisions = sqliteTable(
  "chart_revisions",
  {
    id: text("id").primaryKey(),
    chart_id: text("chart_id").notNull().references(() => charts.id),
    input_revision: text("input_revision").notNull(), // server sha256[:12] digest
    envelope: text("envelope", { mode: "json" }).$type<CalculateResponse>().notNull(),
    inputs: text("inputs", { mode: "json" }).$type<StoredCalculationInputs>().notNull(),
    identity: text("identity", { mode: "json" }).$type<StoredIdentity>().notNull(),
    created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("revisions_chart_input_idx").on(t.chart_id, t.input_revision), // D-06 dedupe
    index("revisions_chart_created_idx").on(t.chart_id, t.created_at),
  ]
);
```
`[VERIFIED: Context7 drizzle sqlite column-types + indexes-constraints]`

### Pattern 3: Save-time dedupe via input_revision (D-06)
**What:** On save, if the target chart's latest revision already has the new envelope's `provenance.input_revision`, do not append — surface "already saved / same basis" state instead. The unique index is the hard backstop; the lookup is the UX path.
**When to use:** Save CTA handler and revise-flow save.
**Why it works:** The digest is server-computed over normalized calculation inputs (Phase 2, CALC-03) — birth data, place, zone, time-resolution, confidence, and house system are all inside it, so identical digest ⇒ identical basis. The client never re-derives the digest.

### Pattern 4: Revision append = chart + revision rows in ONE transaction
**What:** `db.transaction((tx) => { insert revision; update charts.updated_at; })` — a revision can never exist without its chart's updated_at moving, and vice versa. Rename is a single-chart-metadata update; delete is `delete revisions where chart_id = ?; delete chart where id = ?` in one transaction (explicit cascade — see Pitfall 2).

### Pattern 5: Stored CalculateRequest inputs for revise prefill (D-08)
**What:** Persist the `CalculateRequest` (date, time, time_resolution, confidence, house_system, place {label, lat, lon}, iana_zone, zone_source) in the revision row. Revise navigates to `/birth` with these values prefilled, then the normal confirm → calculate → save chain runs.
**Why (codebase-verified):** `result.tsx`'s identity param carries only `{date, time, label, zone_source}` — it lacks lat/lon, iana_zone, and time_resolution, so the envelope+identity alone cannot reconstruct the birth flow. The confirm screen builds exactly this request (`buildRequest()` in `src/app/birth/confirm.tsx`); threading it to the result screen as one more param (or saving from a point where it's available) is the minimal change. `[VERIFIED: codebase]`

### Pattern 6: Export slug + capability-gated share
**What:** `lemastra-chart-<slug(label)>-<revision-id>.json` written with `new File(Paths.cache, name)`, shared via `shareAsync(file.uri, { mimeType: "application/json" })` behind `Sharing.isAvailableAsync()`. Slug = lowercase, non-alphanumerics collapsed to `-`, trimmed, length-capped; fallback `"chart"` when empty.
**Why:** Android's native module rejects non-`file://` and unreadable paths; cache-dir files are app-sandbox-scoped and shareable. Emoji/spaces in user labels must never reach the filesystem unsanitized.

### Pattern 7: Telemetry guardrail as test-enforced convention (D-16)
**What:** `redact(metadata)` allowlist utility (coarse fields only — ids without birth data, error codes, durations); a thin `logger` module is the only sanctioned log entry point. Tests assert: (a) no telemetry/analytics SDK appears in the dependency graph or import graph; (b) no `console.*` call sites outside `logger`/tests; (c) `redact()` strips envelope/birth-data-shaped values. Today's baseline is one `console.warn` in a test helper — trivially clean.

### Anti-Patterns to Avoid
- **Passing envelopes through router params for saved charts** — param size/truncation risk on native deep links and it re-introduces the in-memory-only pattern this phase replaces (T-02-23). Saved-chart routes take an **id** param and read from the repository. (Fresh-calculation result flow keeps its existing params — it's ephemeral.)
- **Re-calling the API on reopen** — violates D-02; the stored envelope IS the evidence.
- **Recomputing or trusting a client-derived revision digest** — the client compares server digests, never generates them.
- **Mutating a stored revision row** (label fix-ups, envelope migrations in place) — revisions are append-only; schema evolution adds NEW migration steps, never edits old rows.
- **String-concatenated SQL** — always Drizzle query builder / parameterized statements (expo-sqlite prepared statements).
- **Deleting the .db file for delete-all** — races the open connection and migration bookkeeping; wipe rows in a transaction instead (D-15).
- **Storing anything on auto-save/silent paths** — explicit save only (D-10, PRIV-01).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQL + typing + migrations | Hand-written SQL strings, manual `user_version` migration runner | Drizzle schema + `drizzle-kit generate` + `drizzle-orm/expo-sqlite/migrator` | Generated, journal-tracked, type-safe; D-01 locks it. Expo's own canonical pattern (PRAGMA user_version) exists inside expo-sqlite but Drizzle's journal is the richer, documented path here. |
| JSON column (de)serialization | `JSON.parse` sprinkled at call sites | `text({ mode: "json" }).$type<T>()` | One place, typed, consistent. |
| Random id generation | `Math.random`-based ids / custom RNG | `expo-crypto` (`randomUUID` / `getRandomValues`) | Cryptographic randomness; platform API. Formatting a UUIDv7 over `getRandomValues` is acceptable (formatting ≠ randomness). |
| File writing/share | Legacy `FileSystem.writeAsStringAsync` string API, custom share intents | `File`/`Paths` OO API + `expo-sharing.shareAsync` | Legacy API is the removed prior generation; Android share enforces file:// at the native module — reimplementing invites the exact rejection paths. |
| Envelope validation | Bespoke field checks | `calculateResponseSchema` (zod) | Single contract; parse-then-trust at save AND reopen. |
| Test SQL engine | A mock SQLite engine (hand-rolled `executeAsync` fake) | `node:sqlite` facade alias in vitest | A fake engine lies about SQL semantics (constraints, transactions, JSON). Real engine, zero deps. |

**Key insight:** every piece of this phase's hard machinery (typed SQL, migrations, JSON columns, share mechanics, crypto randomness, validation) already has a verified standard solution — the only genuinely new engineering is the revision-model logic itself (append/dedupe/cascade) and its tests.

## Common Pitfalls

### Pitfall 1: Envelope drift between zod schema and stored rows
**What goes wrong:** A later `calculateResponseSchema` change (e.g., new optional fields, stricter types — see quick task 260826-tob) makes old stored envelopes fail `parse` at reopen, bricking saved charts.
**Why it happens:** The schema is a live contract with the API; stored data is frozen at save time.
**How to avoid:** The risk is structural and accepted by D-02 (parse-then-trust): new schema additions must be backward-compatible with stored envelopes (additive optional fields only) — enforce with a fixture test that parses a **frozen historical envelope JSON** through the current schema on every run. If an incompatible schema change ever becomes necessary, that's a migration decision (new revision rows), not a silent reopen failure; reopen failure must surface a typed error, never a crash.
**Warning signs:** reopen redirect-to-/birth behavior on a chart that rendered fine last release.

### Pitfall 2: SQLite foreign_keys pragma is NOT reliably ON
**What goes wrong:** Schema declares `references(() => charts.id)` and the plan assumes `ON DELETE CASCADE`; SQLite ships with foreign_keys **OFF by default** unless explicitly enabled per connection — so cascade deletes silently do nothing.
**Why it happens:** Engine default; expo-sqlite's default FK state is not documented as ON (unverified — and `node:sqlite` definitely defaults OFF, so the test facade would diverge from device anyway).
**How to avoid:** **Explicit transactional cascade** (`delete revisions where chart_id = ?; delete charts where id = ?` inside one transaction). Works identically on device and in tests, no pragma dependency. Optionally also `PRAGMA foreign_keys = ON` on open as belt-and-braces integrity enforcement.
**Warning signs:** delete tests pass on device but orphan rows appear; or vice versa.

### Pitfall 3: Querying the repository before migrations complete
**What goes wrong:** Home mounts, list query fires against a not-yet-migrated (or not-yet-open) database → transient "no such table" errors, flaky first render.
**Why it happens:** DB open + `migrate()` are async; React mounts don't wait by default.
**How to avoid:** The lazy-singleton `getWorkspaceDb()` gate (Pattern 1) makes every repository method await the same promise; screens show a loading state until the first query resolves. If using `SQLiteProvider` instead, its `onInit`-before-children contract provides the same guarantee.
**Warning signs:** intermittent first-launch crashes in CI/manual runs.

### Pitfall 4: Duplicate saves / revision multiplication
**What goes wrong:** Tapping Save twice (or saving an identical re-calculation) creates two charts or spurious revisions.
**Why it happens:** No idempotency key on the save path; async label prompt re-entrancy.
**How to avoid:** D-06 dedupe — compare `provenance.input_revision` against the chart's latest revision (Pattern 3) + unique index backstop; disable Save CTA while pending; post-save state ("Saved ✓") per discretion. Saving the *same envelope under a different label* is a legitimate new chart identity — dedupe key is (chart, input_revision), not input_revision alone.

### Pitfall 5: Typed routes stale after adding /chart/saved + /chart/revision routes
**What goes wrong:** `tsc --noEmit` fails in CI on the new routes.
**Why it happens:** STATE.md Phase-1 decision: `.expo/types/router.d.ts` must be regenerated (dev-server boot) after route changes; `expo export` alone no longer regenerates it.
**How to avoid:** Plan explicitly sequences route addition → dev-server boot/typegen → `tsc`. Same for any `as-never` param casts (avoid; the draft-handoff precedent shows typed params can work).

### Pitfall 6: Export filename collisions and unsafe characters
**What goes wrong:** Labels with emoji/spaces/slashes break file creation or collide across charts.
**How to avoid:** Strict slug derivation (Pattern 6) + revision-id suffix makes names effectively unique; overwrite:true on re-export of the same revision; length cap (e.g. 40 chars) for filesystem limits.

### Pitfall 7: Android share sheet rejection of the export file
**What goes wrong:** `shareAsync` throws "Only local file URLs are supported".
**Why it happens:** Android's native module enforces `file://` scheme + readable path (source-verified); web share of local URIs is unsupported.
**How to avoid:** Always share `file.uri` from an OO-API `File` under `Paths.cache`/`Paths.document`; gate on `Sharing.isAvailableAsync()`; web shows the capability fallback state (D-03).

### Pitfall 8: node:sqlite facade drift from expo-sqlite semantics
**What goes wrong:** Tests pass against the facade but device behavior differs (or the facade asserts shapes expo-sqlite doesn't produce).
**Why it happens:** The facade is a hand-maintained adapter over `DatabaseSync`.
**How to avoid:** Implement exactly the source-verified drizzle call surface (`prepareSync`/`executeSync`→`{changes, lastInsertRowId}` + `getAllSync`/`getFirstSync`, `executeForRawResultSync`, plus `execSync` for DDL) and nothing more; a contract test pins the facade's return shapes. Keep repository code on the drizzle API (not raw expo-sqlite methods) so the facade surface stays minimal. Note node:sqlite is experimental-stability on Node 22 — pin awareness in CI (Node is toolchain-pinned).

### Pitfall 9: delete-all wiping non-personal flags (or the migrations journal)
**What goes wrong:** "Delete all data" also clears the disclosure acknowledgement (user re-onboarded) or drops migration bookkeeping tables.
**How to avoid:** D-15: wipe only personal-data tables (charts, chart_revisions) in a transaction; disclosure flags live in AsyncStorage (separate store, survives naturally); drizzle's migrations journal table is engine bookkeeping, not personal data.

### Pitfall 10: TanStack Query cache serving stale workspace after mutations
**What goes wrong:** Rename/delete/save completes but the list shows old state until refocus.
**How to avoid:** Standard invalidation map: save/rename/delete → invalidate `['charts']` list key + the chart's detail key; delete-all → invalidate all workspace keys. Repo already wires focusManager; staleTime 30s default is acceptable for this local data.

## Code Examples

### Revision save with dedupe + transactional append
```typescript
// Source: drizzle-orm docs (sqlite CRUD + transactions), adapted to the D-05/D-06 model
import { desc, eq } from "drizzle-orm";

async function saveRevision(db: WorkspaceDb, input: SaveRevisionInput) {
  const envelope = calculateResponseSchema.parse(input.envelope); // D-02 parse-then-trust
  const digest = envelope.provenance.input_revision;

  return db.transaction((tx) => {
    const latest = tx
      .select({ input_revision: chartRevisions.input_revision })
      .from(chartRevisions)
      .where(eq(chartRevisions.chart_id, input.chartId))
      .orderBy(desc(chartRevisions.created_at))
      .limit(1)
      .get();

    if (latest?.input_revision === digest) {
      return { appended: false as const }; // D-06: identical inputs ≠ new revision
    }

    tx.insert(chartRevisions)
      .values({
        id: newRevisionId(),
        chart_id: input.chartId,
        input_revision: digest,
        envelope,               // JSON-mode column serializes
        inputs: input.request,  // CalculateRequest for D-08 prefill (Pattern 5)
        identity: input.identity,
        created_at: new Date(),
      })
      .run();
    tx.update(charts)
      .set({ updated_at: new Date() })
      .where(eq(charts.id, input.chartId))
      .run();
    return { appended: true as const };
  });
}
```
`[VERIFIED: Context7 drizzle docs — API shapes; revision logic is phase design]`

### Explicit cascade delete (Pitfall 2)
```typescript
async function deleteChart(db: WorkspaceDb, chartId: string) {
  return db.transaction((tx) => {
    tx.delete(chartRevisions).where(eq(chartRevisions.chart_id, chartId)).run();
    tx.delete(charts).where(eq(charts.id, chartId)).run();
  });
}
```

### Export file + share (D-13)
```typescript
// Source: expo-file-system/expo-sharing SDK-57 source via Context7, adapted
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function exportChartRevision(revision: ExportPayload) {
  const name = `lemastra-chart-${slug(revision.label)}-${revision.id}.json`;
  const file = new File(Paths.cache, name); // cache: transient share artifact
  file.write(JSON.stringify(revision, null, 2)); // pretty-printed, provenance-complete
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: "application/json" });
  }
  return file;
}
```
`[VERIFIED: Context7 /expo/expo — File.write + Paths.cache + shareAsync options]`

### vitest expo-sqlite alias over node:sqlite (test facade core)
```typescript
// Source: node:sqlite verified locally on Node 22.22.3; surface = drizzle session.js (source-read)
import { DatabaseSync } from "node:sqlite";

export function openDatabaseSyncFacade(path: string) {
  const db = new DatabaseSync(path);
  return {
    prepareSync(sql: string) {
      const stmt = db.prepare(sql);
      return {
        executeSync(params: unknown[] = []) {
          const { changes, lastInsertRowId } = stmt.run(...(params as never[]));
          return {
            changes, lastInsertRowId,
            getAllSync: () => stmt.all(...(params as never[])),
            getFirstSync: () => stmt.get(...(params as never[])),
          };
        },
        executeForRawResultSync(params: unknown[] = []) {
          const run = stmt.run(...(params as never[])); // re-run for raw rows
          return { getAllSync: () => stmt.all(...(params as never[])) };
        },
      };
    },
    execSync: (sql: string) => db.exec(sql),
    closeSync: () => db.close(),
  };
}
// vitest.config.ts: alias expo-sqlite → this facade module (same pattern as the
// existing react-native facade), with a shared in-memory or tmp-file registry.
```
`[VERIFIED: local runtime check (node:sqlite executes unflagged) + unpkg drizzle-orm@0.45.2/expo-sqlite/session.js call surface]`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| expo-file-system legacy string API (`writeAsStringAsync`, `documentDirectory` constants, `getInfoAsync`) | OO API: `File`/`Directory`/`Paths` with `write`/`exists`/`delete`/`copy` | SDK 52+; current in SDK 57 | STACK.md already mandates OO; legacy imports must not appear. |
| `@react-native-community/async-storage` as the only local store | expo-sqlite (relational local-first) + Drizzle | Expo local-first guidance + STACK.md | Phase 3 introduces the first SQLite; AsyncStorage stays only for the non-personal disclosure flag. |
| Migrations hand-rolled via `PRAGMA user_version` | drizzle-kit journal + migrator (or SQLiteProvider `onInit`) | drizzle-kit `driver: 'expo'` support | Generated SQL + JS migration modules importable in-app. |
| `react-test-renderer` for RN tests | RNTL v14 `/pure` + test-renderer peer under vitest | RNTL v14 (repo Phase-1 decision) | New component tests follow `src/__tests__` RNTL patterns; IS_REACT_ACT_ENVIRONMENT owned by test author. |

**Deprecated/outdated:**
- Legacy expo-file-system API (above) — do not copy from old Stack Overflow answers.
- `jest`-oriented expo-sqlite mocks (`jest-expo` mocks) — this repo is vitest; use the alias-facade pattern instead.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Sharing.isAvailableAsync()` exists and is the standard capability gate on native (returns true on iOS/Android) | Pattern 6 / Pitfall 7 | Minor — wrap in try/catch; API is long-standing in expo-sharing |
| A2 | expo-sqlite's default journal mode / FK default is irrelevant to correctness because we use explicit transactions + explicit cascade | Pitfall 2 | None — recommendation is deliberately pragma-independent |
| A3 | `expo-crypto` is needed for ids (Hermes may not expose `crypto.randomUUID` globally on RN 0.86) | Standard Stack / Supporting | Low — if `crypto.randomUUID` exists on device, expo-crypto becomes optional; verify in a task checkpoint, prefer expo-crypto as the documented path either way |
| A4 | Drizzle `timestamp_ms` integer columns store/retrieve as `Date` objects symmetrically in the expo driver | Pattern 2 | Minor — fall back to integer epoch-ms columns with explicit conversion (pure functions, testable) |
| A5 | `drizzle-kit generate` with `driver: 'expo'` emits a JS `migrations` index compatible with `migrate(db, migrations)` import in an Expo bundle | Pattern 1 | Medium — docs show exactly this import (`./drizzle/migrations`); verify at Wave 0 and fall back to `useMigrations` hook wiring if the module shape differs |
| A6 | The one extra identity/copy extension ("request param") to the result screen fits within native router param limits (envelope already travels there today) | Pattern 5 | Low-Medium — request JSON is small (~300B); if param limits bite, save from a point where draft+request are available (confirm screen) instead |

## Open Questions (RESOLVED)

> All three questions were resolved during Phase-3 planning (2026-08-27). Each adopted recommendation below cites the plan that implements it.

1. **ID format: UUIDv4 vs UUIDv7/ULID for chart/revision ids** — RESOLVED
   - What we know: STACK.md says "UUIDv7 or ULID identifiers" for server artifacts; this phase's ids are client-local. List ordering uses `updated_at` (D-11), so time-ordered ids are NOT required for sort.
   - What was unclear: whether the project wants lexical-sortable local ids for future sync conflict handling.
   - Recommendation: `expo-crypto.randomUUID()` (v4) now — simplest documented path; UUIDv7 formatting can be layered later behind `ids.ts` (single swap point).
   - **RESOLVED — adopted:** `expo-crypto.randomUUID()` (UUIDv4). Implemented in 03-03 Task 1 (`src/lib/workspace/ids.ts`); a future UUIDv7 swap stays confined to that single module.
2. **Repository mount: lazy module singleton vs `SQLiteProvider` context** — RESOLVED
   - What we know: Both verified available; docs favor the provider; D-03 favors a thin module seam.
   - Recommendation: lazy module singleton (Pattern 1) — fewer React couplings, identical guarantees, easier to fake in tests.
   - **RESOLVED — adopted:** lazy module singleton. Implemented in 03-01 Task 3 (`src/lib/workspace/db.ts` — `getWorkspaceDb()` memoized promise per Pattern 1, with test-only reset).
3. **Where the Save CTA gets the CalculateRequest** (Pattern 5 / A6) — RESOLVED
   - What we know: confirm screen builds it; result screen has envelope+identity only.
   - Recommendation: thread `request` as one more result-screen param (smallest diff, no forked path).
   - **RESOLVED — adopted:** thread `request` as a third result-screen param (JSON of the built CalculateRequest + the draft's place-union branch). Implemented in 03-04 Task 2 (`src/app/birth/confirm.tsx` → `src/app/chart/result.tsx`); A6's ~300B size note still applies — confirm on device during end-of-phase UAT.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node (toolchain) | vitest, drizzle-kit, expo CLI | ✓ | 22.22.3 | — |
| node:sqlite (builtin) | repository integration tests | ✓ (unflagged, experimental warning) | Node 22.22.3 builtin | better-sqlite3 devDep (not needed) |
| expo-sqlite / expo-file-system / expo-sharing / expo-crypto | runtime data layer | ✗ (not yet installed — expected; this phase installs via `npx expo install`) | SDK-57 pins verified in bundledNativeModules | — |
| drizzle-orm / drizzle-kit | schema + migrations | ✗ (install this phase; registry-verified current) | 0.45.2 / 0.31.10 | — |
| FastAPI calculation service | revise flow re-calculation (dev runtime) | ✓ (Phase 2, `api/` + uv) | existing | — |
| iOS/Android simulator or device | manual UAT of persistence-across-restart, share sheet | not probed | — | unit/integration tests cover logic; device checks belong to /gsd-verify-work |

**Missing dependencies with no fallback:** none blocking — all installs are planned steps.
**Missing dependencies with fallback:** simulators/devices for manual verification → deferred to end-of-phase UAT (human_verify_mode: end-of-phase).

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` — this section defines the observable behavioral checkpoints from which a VALIDATION.md can be derived. Phase 3 is client-local: the pytest api suite is untouched (regression only); all new sampling is vitest.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Native Testing Library 14 `/pure` (existing) — plus real-SQL integration tests via the `node:sqlite` facade alias |
| Config file | `vitest.config.ts` (existing; gains the `expo-sqlite` alias) |
| Quick run command | `npx vitest run src/__tests__/<file>` |
| Full suite command | `npx vitest run && npx tsc --noEmit` (CI parity with `.github/workflows/ci.yml` test job) |

### Phase Requirements → Test Map
| Req ID | Behavior (observable checkpoint) | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WORK-01 | No account surface; first-chart flow still walkable with workspace list mounted | unit (RNTL, home) | `npx vitest run src/__tests__/home-workspace.test.tsx` | ❌ Wave 0 |
| WORK-02 | Save CTA → label prompt → repository.save persists chart+revision; envelope passes `calculateResponseSchema.parse` at save; label validation (empty/oversize rejected inline) | unit (RNTL result screen w/ fake repo) + integration (real SQL) | `npx vitest run src/__tests__/save-flow.test.tsx src/__tests__/workspace-repository.test.ts` | ❌ Wave 0 |
| WORK-03 | **Persistence across restart**: save → close db → reopen new handle from same file → list ordered `updated_at desc`, revision rows intact; reopen parses stored envelope and renders without any network call (mock fetch, assert zero calls) | integration (real SQL, tmp-file db) + unit (RNTL detail) | `npx vitest run src/__tests__/workspace-repository.test.ts src/__tests__/saved-chart-detail.test.tsx` | ❌ Wave 0 |
| WORK-04 | Changed inputs (different `input_revision`) append new revision; identical digest does NOT append (idempotent); **stored prior envelope bytes unchanged** after append (immutability: serialize-before vs serialize-after equal); History lists prior revisions read-only; revise prefills /birth from stored CalculateRequest inputs | integration + unit (RNTL history/revise) | `npx vitest run src/__tests__/workspace-repository.test.ts src/__tests__/revision-history.test.tsx src/__tests__/revise-prefill.test.tsx` | ❌ Wave 0 |
| WORK-05 | Rename updates label + `updated_at` only; revision rows byte-identical before/after; list reflects new label; invalid labels rejected | integration + unit | `npx vitest run src/__tests__/workspace-repository.test.ts src/__tests__/rename-control.test.tsx` | ❌ Wave 0 |
| WORK-06 | Delete-confirm dialog names chart + revision count; confirm removes chart AND all revisions in one transaction; cancel deletes nothing | integration + unit (RNTL dialog) | `npx vitest run src/__tests__/workspace-repository.test.ts src/__tests__/delete-confirm.test.tsx` | ❌ Wave 0 |
| WORK-07 | Export file content = pretty JSON of {envelope, identity, label, ids} (parse output and compare against stored revision); filename = `lemastra-chart-<slug>-<revision-id>.json`; slug sanitizes emoji/spaces/slashes; shareAsync called with `file://` uri + `application/json` | unit (facade-injected File/Sharing) | `npx vitest run src/__tests__/chart-export.test.ts` | ❌ Wave 0 |
| PRIV-01 | No persistence without explicit save (nothing written after calculate alone); repository module import graph contains no network/fetch usage | unit + source-scan test | `npx vitest run src/__tests__/privacy-local-default.test.ts` | ❌ Wave 0 |
| PRIV-03 | No analytics/telemetry SDK init: dependency graph test (package.json has no analytics dep; no telemetry import in src/) | unit (source-scan) | `npx vitest run src/__tests__/telemetry-guard.test.ts` | ❌ Wave 0 |
| PRIV-04 | `redact()` allowlist unit tests (envelope/birth-data-shaped values stripped); log call-site test (no `console.*` outside logger/tests) | unit | `npx vitest run src/__tests__/redact.test.ts src/__tests__/telemetry-guard.test.ts` | ❌ Wave 0 |
| PRIV-05 | Export-all file = one JSON containing every chart + all revisions + metadata (seed multi-chart multi-revision db, compare full structure) | integration | `npx vitest run src/__tests__/data-controls.test.tsx src/__tests__/workspace-repository.test.ts` | ❌ Wave 0 |
| PRIV-06 | Delete-all wipes charts+revisions rows (count → 0) in a transaction; disclosure AsyncStorage flag survives; confirm-gated in UI | integration + unit (RNTL /privacy) | `npx vitest run src/__tests__/data-controls.test.tsx src/__tests__/workspace-repository.test.ts` | ❌ Wave 0 |
| regression | Envelope schema still parses a **frozen historical envelope fixture** (Pitfall 1) | unit | `npx vitest run src/__tests__/envelope-fixture.test.ts` | ❌ Wave 0 |
| regression | Existing Phase-2 suites + api pytest suite still green (parse-then-trust surfaces unchanged) | CI | full suite command + existing api job | ✅ existing |

### Behavioral Checkpoints (for VALIDATION.md derivation)
The five success criteria map to these probe points, each with an automated sampling location:

1. **Save/browse/reopen without account** — probe: repository integration test doing open→save→**close→reopen**→list→read; sampling point: `workspace-repository.test.ts` restart block + RNTL home/detail renders with the fake repository (no auth context anywhere).
2. **Immutable revision semantics** — probe: append under changed digest; byte-equality assertion on prior revision's stored JSON; dedupe assertion on identical digest; sampling point: `workspace-repository.test.ts` revision block, asserted per mutation commit.
3. **Rename + confirmed deletion cascade** — probe: rename byte-equality on revisions; delete counts revisions removed = created, cancel path = no-op; sampling point: repository + dialog tests.
4. **Export correctness (single + all)** — probe: parse exported JSON and deep-compare against repository reads (provenance fields present: skill_revision, swisseph/tzdata/schema versions, input_revision); export-all covers seeded corpus exhaustively; sampling point: export tests.
5. **Privacy enforcement in code** — probe: telemetry guard (no SDK, no init, redact() allowlist, log call-site scan) + no-network-in-repository scan + disclosure-flag survival; sampling point: guard tests, wired into CI's vitest job (already mandatory).

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/<touched-area>` (target < 30 s)
- **Per wave merge:** `npx vitest run && npx tsc --noEmit` (+ gitleaks jobs run on push via CI — no secrets expected, but the expo-public-name rule keeps watching)
- **Phase gate:** full suite green before `/gsd-verify-work`; device UAT (real restart, real share sheet) is the end-of-phase human checkpoint.

### Wave 0 Gaps
- [ ] `scripts/vitest/expo-sqlite-facade/` + `vitest.config.ts` alias + facade contract test — enables every repository test (REQ: all)
- [ ] `src/lib/workspace/` skeleton: schema, repository interface, in-memory fake — enables every RNTL screen test
- [ ] `src/lib/redact.ts` + logger convention — enables telemetry-guard tests (PRIV-03/04)
- [ ] Frozen envelope fixture file (real CalculateResponse JSON, committed) — Pitfall 1 regression (REQ: WORK-02/03/04)
- [ ] `drizzle.config.ts` + first `drizzle-kit generate` run — proves the migration pipeline before feature tasks (A5)

*(Framework itself: existing — no install gap.)*

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: high`. This phase stores sensitive personal data (birth data, chart envelopes) on-device — V5 and storage posture are the live categories; V2/V3 are structurally N/A (accountless by design).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Accountless (WORK-01); no credentials exist |
| V3 Session Management | no | No sessions; no tokens on device this phase |
| V4 Access Control | yes (device boundary) | Data lives in the OS app sandbox (D-04); no cross-app exposure paths (export only via explicit user share); no `user_id`-style trust issues (single-user device) |
| V5 Input Validation | yes | zod parse-then-trust at save AND reopen (`calculateResponseSchema`); label bounds (non-empty, length cap) before persist; slug sanitization before filesystem; export JSON built only from validated repository reads |
| V6 Cryptography | no (documented deferral) | D-04: plain sandbox SQLite in v1 — explicit accepted decision, revisitable behind the repository seam; id randomness via `expo-crypto` (never `Math.random`) |
| V8 Data Protection (storage) | yes | Private-by-default: nothing persisted without explicit save (D-10); delete-all removes all personal rows (D-15); no secrets in the database (SecureStore scope unchanged); export files land in app-sandbox cache dir |
| V9 Communications | no new surface | Save/reopen/export never touch the network (test-enforced); calculation API usage unchanged from Phase 2 |
| V12 File Handling | yes | Export filename slug (no traversal/unsafe chars from user label); overwrite semantics explicit; cache-dir scoped |

### Known Threat Patterns for {Expo RN local storage}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via user input (labels, ids) | Tampering | Drizzle query builder / expo-sqlite prepared statements ONLY — never string-concatenated SQL (repo law; enforced by review + no raw-SQL convention outside drizzle calls) |
| Sensitive data in logs/telemetry (birth data, envelopes) | Information Disclosure | D-16: no SDK ships; `redact()` allowlist; log call-site test; retention §4 posture inherited by later Sentry phase |
| Tampering with stored revisions (silent basis change) | Tampering | Append-only revision rows; rename touches chart metadata only (D-05); byte-equality immutability tests; unique (chart, input_revision) index |
| Path traversal / unsafe filenames via label | Tampering/Elevation | Slug derivation (alphanumeric+dash, capped, fallback constant) before `File` construction |
| Orphaned personal data after deletion | Information Disclosure | Explicit transactional cascade (chart + revisions); delete-all wipes personal tables; export-all gives the user their data first (retention §5/§6) |
| Data remanence in exported files | Information Disclosure | Export files are user-initiated, user-owned share artifacts (documented in /privacy copy); cache-dir files are transient and sandbox-scoped |
| Schema-confusion reopen (stored data rendered unvalidated) | Tampering | Parse-then-trust at read: every repository read re-parses envelopes before render; failure = typed error surface, never partial render |

**Phase-specific security tasks for the planner:** (1) telemetry guard tests wired into CI vitest job; (2) repository no-network source-scan test; (3) slug sanitization unit tests; (4) byte-equality immutability tests in every mutation suite.

## Sources

### Primary (HIGH confidence)
- Context7 `/expo/expo` — expo-sqlite (openDatabaseAsync/Sync, statement + transaction APIs, SQLiteProvider/onInit, user_version canonical migration, WAL, SQLCipher), expo-file-system (File/Directory/Paths OO API, write/copy/delete), expo-sharing (shareAsync options, Android file:// enforcement in SharingModule.kt)
- Context7 `/drizzle-team/drizzle-orm-docs` — expo-sqlite wiring (`drizzle(SQLite.openDatabaseSync(...))`), drizzle.config `driver: 'expo'`, `useMigrations`, `text({mode:'json'}).$type<T>()`, indexes, drizzle-kit generate workflow
- unpkg drizzle-orm@0.45.2 — `expo-sqlite/driver.js`, `session.js` (sync-only call surface), `migrator.js` (imperative `migrate` + `useMigrations`) — source-read
- Local runtime — `node:sqlite` DatabaseSync executes unflagged on installed Node 22.22.3 (prepare/run/all/exec verified)
- npm registry — version + postinstall verification for all six packages; `node_modules/expo/bundledNativeModules.json` SDK-57 tilde pins
- Repo codebase — `api-schemas.ts` (contract), `result.tsx`/`confirm.tsx` (param + request construction), `index.tsx`, `privacy.tsx`, `use-disclosure.ts`, `query-client.tsx`, `provider-registry.json`, vitest.config.ts + RN shim, `docs/governance/retention-deletion-policy.md` §1/§4/§5/§6

### Secondary (MEDIUM confidence)
- Research-store digests (keys a53bd068…, d5288fb…, 161585b6…, d03e9ee…, 535a328…) — cached this session

### Tertiary (LOW confidence)
- None used — every claim above carries a tool-verified source or is logged in the Assumptions Log

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all six packages registry-verified current; Drizzle/Expo integration and exact driver call surface source-read; SDK-57 tilde pins read from the installed toolchain
- Architecture: HIGH — patterns are doc-verified API compositions over the locked D-01..D-16 decisions; the one extension (stored CalculateRequest for prefill) is codebase-verified necessity
- Pitfalls: HIGH/MEDIUM — FK-pragma and param-size items carry explicit pragma-independent/verify-first guidance; testing path runtime-verified but node:sqlite is experimental-stability (A4/A5/A6 tracked)
- Validation: HIGH — every requirement has an automatable checkpoint in the existing vitest substrate; device-only behaviors (share sheet, restart) explicitly routed to end-of-phase human verification

**Research date:** 2026-08-27
**Valid until:** 2026-09-27 (stable domain: SDK-pinned packages + slow-moving drizzle 0.45 line; re-check drizzle-orm/drizzle-kit if planning slips past then)
