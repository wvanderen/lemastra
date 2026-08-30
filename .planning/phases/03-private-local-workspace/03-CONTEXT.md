# Phase 3: Private Local Workspace - Context

**Gathered:** 2026-08-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can save a calculated chart locally with a chosen display label, browse and reopen saved charts after app restart, revise birth details as new immutable chart revisions (prior analyses keep their basis), rename charts, delete charts (with confirmation, including dependent local artifacts), and export one chart's structured data + provenance — all without an account. Private-by-default guarantees are made real: PRIV-05/06 export-all and delete-all controls, and PRIV-03/04 telemetry-exclusion posture enforced in code. Requirements: WORK-01..07, PRIV-01, PRIV-03, PRIV-04, PRIV-05, PRIV-06.

NOT in this phase: the interactive wheel and evidence views (Phase 4), transits (Phase 5), interpretation (Phase 6+), accounts/sync (v2), cloud storage (never in v1), web persistence adapter (deferred — native-first with adapter seam). The saved-chart detail remains the structured list view; the charts list is a workspace surface, not an evidence surface.

</domain>

<decisions>
## Implementation Decisions

### Storage Engine & Record Shape
- **D-01:** Local persistence uses **expo-sqlite + Drizzle ORM** per STACK.md — typed schema + migrations, versioned JSON envelopes with indexed summary columns (label, identity fields, revision id, timestamps). New deps installed via `npx expo install` (legitimacy/tilde-pin conventions from Phase 1).
- **D-02:** A saved chart revision stores the **full immutable calculation envelope** — the exact validated CalculateResponse (placements, provenance, unavailable/provisional factors) plus the identity/zone-source metadata the result screen carries. Reopening a saved chart **never re-calls the API**; the stored envelope IS the evidence (parse-then-trust via the existing `calculateResponseSchema`).
- **D-03:** **Native-first, adapter seam**: persistence targets iOS/Android. The data layer sits behind a thin repository interface so a web (IndexedDB) adapter can slot in later. Web shows a clear "saved charts require the app" state — no web storage spike this phase.
- **D-04:** **Plain SQLite in the OS app sandbox** — no SQLCipher/key management in v1. Encryption can be added later behind the same repository seam if the privacy posture demands it.

### Revision Model (WORK-04)
- **D-05:** A saved chart is **one identity with an immutable revision chain**: chart = UUID + display label; revisions append under it. Renaming (WORK-05) mutates chart metadata only — never a revision, never touching stored envelopes.
- **D-06:** **Any calculation-input change triggers a new revision** — birth data, resolved place/coordinates/zone, tricky-time resolution, time confidence, house system (formalizes Phase 2's D-11). Revision identity builds on the existing `input_revision` sha256[:12] digest. Identical inputs do not create a new revision.
- **D-07:** Opening a chart shows its **latest revision**; a History list in the chart detail shows prior revisions (date + what changed) and each opens **read-only**.
- **D-08:** **Revise = reuse the Phase-2 birth flow prefilled** with that revision's inputs → confirm → calculate → save appends the new revision. No forked edit path; the new calculation passes through the same validation/provenance chain.

### Workspace & Save UX
- **D-09:** **Home becomes the workspace**: the "Calculate a chart" CTA stays on top; saved charts are listed beneath; the empty state is the current hero. No new tab shell, no dedicated /charts route.
- **D-10:** **Explicit save with label prompt**: the result screen gains a "Save chart" CTA; tapping prompts for a display label (smart prefilled default, e.g. date · place), then saves. Nothing is stored the user didn't explicitly ask to store (private-by-default).
- **D-11:** Chart list rows show **label + identity line (date · place, same vocabulary as the result identity line) + confidence marker when not "Timed" + revision badge when >1 revision**, sorted most-recently-updated first.
- **D-12:** **Rename happens inline on the saved-chart detail screen** via a validated input (non-empty, reasonable length); the list refreshes on save.

### Export, Deletion & Telemetry
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning & research
- `.planning/research/STACK.md` — Client Storage section: expo-sqlite + Drizzle rationale, "versioned JSON envelopes plus indexed summary columns", web-SQLite spike caveat (resolved by D-03), SecureStore scope; Monorepo/API sections for revision-id and provenance conventions
- `.planning/REQUIREMENTS.md` — Phase 3 requirement definitions (WORK-01..07, PRIV-01/03/04/05/06)
- `.planning/ROADMAP.md` §"Phase 3: Private Local Workspace" — goal and success criteria
- `.planning/phases/02-trustworthy-natal-chart/02-CONTEXT.md` — carried decisions: input_revision digest (sha256[:12]), D-11 house-system-change-is-revision, D-12 provenance display, D-13 structured-list result view

### Governance (Phase 1 outputs that constrain this phase)
- `docs/governance/data-inventory.md` — recorded data flows; charts persist device-side only in v1
- `docs/governance/retention-deletion-policy.md` — retention/deletion rules the D-15 controls and export file must respect
- `docs/governance/secret-isolation-policy.md` — logging/redaction conventions relevant to D-16
- `src/data/provider-registry.json` — retention copy already promises "charts persist device-side only in v1, never server-side"; D-15's UI joins this registry-driven screen

### Existing code
- `src/app/chart/result.tsx` — parse-then-trust result screen; the envelope+identity param pattern D-02 stores and the surface D-10's Save CTA joins
- `src/app/index.tsx` — home screen D-09 extends into the workspace list
- `src/app/privacy.tsx` — the registry-driven disclosure screen D-15 extends with "Your data"
- `src/lib/api-schemas.ts` — `calculateResponseSchema`; the stored-envelope contract and reopen validation path
- `src/hooks/use-disclosure.ts` — existing AsyncStorage persistence precedent (disclosure flag survives delete-all per D-15)
- `src/components/chart/` + `src/components/birth/` — result-screen components reused by the saved-chart detail; birth flow reused by D-08's revise path
- `src/components/ui/option-card.tsx`, `error-banner.tsx`, `src/components/themed-text.tsx`, `src/constants/theme.ts` — themed primitives and copy-deck conventions for new surfaces

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `calculateResponseSchema` (zod) — validates envelopes at save time and parse-then-trust at reopen; single contract for stored data
- Result-screen components (`PlacementList`, `AssumptionsLine`, `ProvenanceDetails`, `UnavailableFactors`) — compose the saved-chart detail view unchanged
- Birth flow (`/birth`, `/birth/confirm`) — D-08 prefill target for revisions; the draft hand-off contract (birthFormSchema + resolve param) already exists
- `use-disclosure.ts` — versioned-key AsyncStorage pattern; the precedent for durable non-personal flags
- TanStack Query provider (`src/lib/query-client.tsx`) — chart list/queries wire into the existing client; persistence stays in SQLite (no query-cache persistence)
- vitest + RNTL `/pure` testing setup and CI gates (vitest+tsc, gitleaks, pytest api job) — new storage/repo/telemetry tests join these

### Established Patterns
- Expo ~57 tilde pins are authoritative; new deps (expo-sqlite, drizzle-orm, expo-sharing, expo-file-system) go through `npx expo install` with a legitimacy checkpoint
- Typed routes: regenerate after route changes before `tsc --noEmit`
- Copy decks per component (`copy.ts`) — new surfaces follow the same copy-deck discipline
- Registry-driven disclosure UI — D-15's "Your data" section must stay consistent with `src/data/provider-registry.json` and its governance tests
- Parse-then-trust: no screen renders unvalidated stored/param data

### Integration Points
- `src/app/index.tsx` — home gains the saved-charts list (D-09)
- `src/app/chart/result.tsx` — Save CTA + label prompt (D-10); saved-chart detail likely a new route reusing its components
- `/privacy` — "Your data" section (D-15)
- New data layer: Drizzle schema + migrations + repository module (adapter seam per D-03) — first SQLite code in the repo
- Router params carry full envelopes today (in-memory only, T-02-23) — saved-chart routes read from the repository by chart/revision id instead

</code_context>

<specifics>
## Specific Ideas

No specific external references or "make it like X" examples were given — decisions above are the source of truth.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Private Local Workspace*
*Context gathered: 2026-08-27*
