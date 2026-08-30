# Phase 3: Private Local Workspace - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-27
**Phase:** 3-Private Local Workspace
**Areas discussed:** Storage engine & record shape, Revision model (WORK-04), Workspace & save UX, Export/deletion/telemetry

---

## Storage Engine & Record Shape

| Option | Description | Selected |
|--------|-------------|----------|
| expo-sqlite + Drizzle | STACK recommendation: typed schema + migrations, versioned JSON envelopes with indexed summary columns; grows through phases 5–9 | ✓ |
| expo-sqlite raw | Same durability, hand-written migrations and typed row mappers, more manual discipline | |
| AsyncStorage JSON | Simplest, no new deps, but no queries/indexes/migrations — STACK warns it becomes fragile | |

| Option | Description | Selected |
|--------|-------------|----------|
| Full immutable envelope | Store exact validated CalculateResponse + identity; reopen never touches the API; provenance can never drift | ✓ |
| Inputs only, recompute | Smaller storage but reopening requires the API and results can drift; weaker WORK-04 basis | |
| Envelope + raw inputs | Envelope plus birth-input JSON for revision diffs; slightly larger records | |

| Option | Description | Selected |
|--------|-------------|----------|
| Native-first, adapter seam | Target iOS/Android; repository interface leaves a slot for a later IndexedDB adapter; web shows a clear unsupported state | ✓ |
| Prove web SQLite now | Run the STACK-flagged spike on expo-sqlite web behavior before building | |
| Web adapter now | Ship IndexedDB persistence for web alongside native SQLite | |

| Option | Description | Selected |
|--------|-------------|----------|
| Plain SQLite in sandbox | Rely on OS app sandbox; no key lifecycle; SQLCipher can be added later behind the same seam | ✓ |
| Encrypted (SQLCipher) | Stronger at-rest story but adds key management and has no web SecureStore | |

**User's choice:** All four recommended options.
**Notes:** None provided beyond selections.

---

## Revision Model (WORK-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Chart with revision chain | One UUID + label per chart; revisions appended immutably; rename acts on the chart | ✓ |
| Standalone entries | Every calculation is its own entry; simplest model, list fills with near-duplicates | |
| Chain + visible sub-entries | Chain like recommended, plus optional per-revision list rows | |

| Option | Description | Selected |
|--------|-------------|----------|
| Any input change | Birth data, place/coords/zone, tricky-time resolution, confidence, house system (D-11) → new revision; label changes are metadata | ✓ |
| Birth data only | Fewer revisions but contradicts D-11 and the changed-input rule | |
| Every save | Full audit timeline but no-op entries clutter history | |

| Option | Description | Selected |
|--------|-------------|----------|
| Latest + history list | Newest revision opens; History entry lists prior revisions (date + what changed), each openable read-only | ✓ |
| Last-viewed revision | Opens the revision last explicitly viewed | |
| Latest only, history hidden | Prior revisions exist only to preserve future analyses' basis | |

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse birth flow prefilled | "Revise birth details" re-enters the Phase-2 flow prefilled → confirm → calculate → save appends | ✓ |
| Inline edit form | Dedicated edit form bypassing confirm/calculate; forks the hardened validation path | |
| Re-enter + detect | User re-enters everything; app detects identity and offers to attach as revision | |

**User's choice:** All four recommended options.
**Notes:** None provided beyond selections.

---

## Workspace & Save UX

| Option | Description | Selected |
|--------|-------------|----------|
| Home = workspace list | CTA on top, saved charts beneath, empty state is the current hero | ✓ |
| Dedicated /charts route | Home stays a launcher; adds a navigation hop | |
| Tab navigation | Bottom tabs with Home/Charts/Privacy; better suited to Phase 4+ | |

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit save + label prompt | "Save chart" CTA with prefilled label prompt; nothing stored unasked | ✓ |
| Auto-save everything | Every calculation saves immediately; weaker fit for private-by-default | |
| Prompt on exit | Save/discard prompt on leaving the result screen; interruptive | |

| Option | Description | Selected |
|--------|-------------|----------|
| Label + identity + badges | Label, date · place identity line, confidence marker, revision badge; sorted most-recently-updated | ✓ |
| Label + date only | Minimal rows, more tapping to disambiguate | |
| Rows with placement summary | Rich rows with Sun/Moon/Rising; duplicates Phase 4 evidence-view role | |

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on chart detail | Tap-the-label rename with validated input; list refreshes | ✓ |
| List row action | Long-press/swipe rename; hidden and less accessible | |
| Both | Detail rename plus row action; most build+test surface | |

**User's choice:** All four recommended options.
**Notes:** None provided beyond selections.

---

## Export, Deletion & Telemetry

| Option | Description | Selected |
|--------|-------------|----------|
| JSON file + share sheet | Pretty-printed envelope+identity+label JSON file via expo-sharing; provenance-complete | ✓ |
| Clipboard copy | No new deps but no file artifact | |
| JSON + readable summary | Adds a human-readable projection duplicating Phase 4 work | |

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm dialog | Names chart, revision count, dependent-artifact removal — then deletes | ✓ |
| Type-to-confirm | Heavier guard; arguably overkill for recalculable data | |
| Undo window | Immediate delete + snackbar undo; complex with an immutable store | |

| Option | Description | Selected |
|--------|-------------|----------|
| Extend /privacy screen | "Your data" section: export-all (single JSON) + delete-all (confirm → wipe DB); flags may survive | ✓ |
| New settings screen | Standard convention but a new top-level surface this phase | |
| Hidden diagnostic | Least discoverable; weak for a privacy promise | |

| Option | Description | Selected |
|--------|-------------|----------|
| No SDK + enforced posture | No telemetry SDK; tests enforce no-init/no-sensitive-logging; redact() utility lands for Phase 7+ | ✓ |
| Add Sentry now | Real crash visibility earlier but adds provider activation + governance churn mid-phase | |
| Docs only | Weakest guarantee; no code-level enforcement | |

**User's choice:** All four recommended options.
**Notes:** None provided beyond selections.

---

## the agent's Discretion

- Drizzle schema/migration details within expo-sqlite
- Repository interface shape and mounting
- Save-state ergonomics and duplicate-save prevention on the result screen
- Smart-default label derivation, duplicate-label handling, label validation bounds
- "What changed" derivation for revision history rows
- Saved-chart detail layout reusing Phase-2 result components
- Export file mechanics (expo-file-system OO API) and share fallbacks
- Test integration with the existing vitest + RNTL setup

## Deferred Ideas

None — discussion stayed within phase scope.
