# Phase 3: Private Local Workspace - Pattern Map

**Mapped:** 2026-08-27
**Files analyzed:** 26 (19 new, 7 modified)
**Analogs found:** 20 / 26 (6 have no codebase analog — first SQLite/data-layer code in the repo; RESEARCH.md §Patterns + §Code Examples governs those)

> **Foundational fact for the planner:** the repo has **zero existing persistence code beyond AsyncStorage** (`use-disclosure.ts`) and **no SQLite/Drizzle/file-export code anywhere** (verified: no `src/lib/workspace/`, no `drizzle*`). The strongest analogs are therefore *discipline* analogs — parse-then-trust (`result.tsx`/`api.ts`), typed contracts with `.describe()` docs (`api-schemas.ts`), card/list components (`placement-list.tsx`, `privacy.tsx`), interrupt-prompt (`calculation-disclosure.tsx`), copy decks (`copy.ts` per component), and the vitest facade-alias machinery (`react-native-shim.ts` + `vitest.config.ts`). Where no analog exists, RESEARCH.md §Architecture Patterns 1–7 and §Code Examples are the canonical source (they were source-verified against drizzle 0.45.2 / expo SDK 57).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/workspace/schema.ts` (new) | model | CRUD | `src/lib/api-schemas.ts` (contract-docs discipline; table shape = RESEARCH Pattern 2) | discipline-match |
| `src/lib/workspace/repository.ts` (new) | service (repository) | CRUD | `src/lib/api.ts` (typed boundary + typed errors) | role-match |
| `src/lib/workspace/db.ts` (new) | config | startup/lazy-init | `src/lib/query-client.tsx` (lazy singleton) | role-match |
| `src/lib/workspace/ids.ts` (new) | utility | — | none (expo-crypto is new) | none |
| `src/lib/workspace/label.ts` (new) | utility | transform | `src/app/birth.tsx` (input validation + normalization) | role-match |
| `src/lib/workspace/revision-diff.ts` (new) | utility | transform | `src/components/chart/copy.ts` (fact formatters) | role-match |
| `src/lib/workspace/export.ts` (new) | service | file-I/O | none (first file write/share; RESEARCH Pattern 6 + Code Example) | none |
| `src/lib/redact.ts` (new) | utility | transform | none (new guardrail; RESEARCH Pattern 7) | none |
| `src/components/workspace/chart-list.tsx` (new) | component | request-response (query render) | `src/components/chart/placement-list.tsx` + `src/app/privacy.tsx` (list semantics) | exact |
| `src/components/workspace/save-prompt.tsx` (new) | component | request-response | `src/components/birth/calculation-disclosure.tsx` (inline interrupt card w/ CTA) | exact |
| `src/components/workspace/rename-control.tsx` (new) | component | request-response | `src/app/birth.tsx` (validated TextInput) | role-match |
| `src/components/workspace/revision-history.tsx` (new) | component | request-response | `src/components/chart/placement-list.tsx` | exact |
| `src/components/workspace/delete-confirm.tsx` (new) | component | request-response | `src/components/birth/calculation-disclosure.tsx` | exact |
| `src/components/workspace/data-controls.tsx` (new) | component | request-response | `src/components/birth/calculation-disclosure.tsx` + `src/app/privacy.tsx` | role-match |
| `src/components/workspace/copy.ts` (new) | config (copy deck) | — | `src/components/chart/copy.ts` | exact |
| `src/hooks/use-workspace.ts` (new) | hook | CRUD (query/mutation) | `src/app/birth/confirm.tsx` (useMutation usage) + `src/lib/query-client.tsx` | role-match |
| `src/app/chart/saved.tsx` (new) | route (screen) | request-response | `src/app/chart/result.tsx` | exact |
| `src/app/chart/revision.tsx` (new) | route (screen, read-only) | request-response | `src/app/chart/result.tsx` | exact |
| `src/app/index.tsx` (mod) | route (screen) | request-response | itself + `privacy.tsx` list pattern | exact |
| `src/app/chart/result.tsx` (mod) | route (screen) | request-response | itself + `confirm.tsx` CTA/mutation pattern | exact |
| `src/app/privacy.tsx` (mod) | route (screen) | request-response | itself (extend with section) | exact |
| `src/app/birth.tsx` (mod) | route (screen/form) | request-response | itself (add prefill param handling) | exact |
| `src/app/_layout.tsx` (mod) | route (layout) | — | itself (register `chart/saved`, `chart/revision`) | exact |
| `drizzle.config.ts` + `drizzle/` (new) | config | — | none (RESEARCH Standard Stack + A5) | none |
| `scripts/vitest/expo-sqlite-facade/` + `vitest.config.ts` alias (new/mod) | test infra | — | `scripts/vitest/react-native-shim.ts` + `vitest.config.ts` | exact |
| `src/__tests__/*.test.{ts,tsx}` (~14 new) | test | — | `result-screen.test.tsx` (RNTL), `governance-docs.test.ts` (source-scan), `api-schemas.test.ts` (zod unit) | exact |

## Pattern Assignments

### `src/lib/workspace/repository.ts` (service/repository, CRUD)

**Analog:** `src/lib/api.ts` — the repo's existing "typed boundary module": a lib file exporting typed functions over an untrusted boundary, with a typed error class and parse-then-trust at every edge. The repository is the same shape with SQLite instead of fetch. **Critically: copy the discipline, not the network** — PRIV-01's no-network test scans this module's import graph (RESEARCH §PRIV-01), so `fetch`/`api.ts` imports are forbidden here.

**Module-doc convention** (api.ts lines 19–31 → repository.ts header): open with a block comment naming the phase decision, the trust law, and the boundary:
```typescript
/**
 * Workspace repository (D-03 adapter seam) — the ONLY persistence module.
 *
 * Parse-then-trust (D-02): every envelope passes through
 * calculateResponseSchema.parse at save AND at read; stored data is
 * frozen at save time and re-validated before render.
 *
 * This module contains no network code (PRIV-01, test-enforced): the
 * stored envelope IS the evidence — reopen never re-calls the API.
 */
```

**Typed error class** (api.ts lines 56–73 — `ApiError`): mirror this pattern for a `WorkspaceError` (typed reopen failures, per Pitfall 1 "reopen failure must surface a typed error, never a crash"):
```typescript
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly recoverable: boolean;
  readonly hint?: string;
  constructor(body: { code: ErrorCode; message: string; recoverable: boolean; hint?: string }) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    ...
  }
}
```

**Function-per-operation exports** (api.ts lines 141–159): plain named functions (`saveChart`, `listCharts`, `getLatestRevision`, `renameChart`, `deleteChart`, `exportAll`, `deleteAll`), each parsing through a schema at the edge — no class hierarchy, no singletons leaking from this file (the singleton lives in `db.ts`). Save/dedupe/cascade transaction bodies: RESEARCH.md §Code Examples lines 397–447 (source-verified drizzle API) — copy those verbatim as the starting point.

---

### `src/lib/workspace/schema.ts` (model, CRUD)

**Analog (discipline):** `src/lib/api-schemas.ts` — every field carries `.describe()` so the schema doubles as contract reference (lines 8–20 state this convention explicitly). Apply the same to Drizzle columns where the constraint isn't self-evident (e.g. `input_revision` = "server sha256[:12] digest — the client never re-derives it (D-06)").
**Table shape:** RESEARCH.md §Pattern 2 (lines 273–299) is the verified starting schema (`charts` + `chart_revisions`, `text({ mode: "json" }).$type<T>()` columns, `uniqueIndex` on `(chart_id, input_revision)`, `index` on `(chart_id, created_at)`). Types (`CalculateResponse`) import from `@/lib/api-schemas` — the stored contract is the API contract (D-02), do not duplicate it.

---

### `src/lib/workspace/db.ts` (config, lazy-init + migration gate)

**Analog:** `src/lib/query-client.tsx` — the repo's lazy-singleton precedent:
```typescript
// query-client.tsx lines 23–31 — create once per mount via lazy initializer
const [queryClient] = useState(
  () => new QueryClient({ defaultOptions: { queries: { retry: 2, staleTime: 30_000 } } })
);
```
For a non-React module, use the memoized-promise form from RESEARCH.md §Pattern 1 (lines 247–264): `let dbPromise ... dbPromise ??= (async () => { open → drizzle() → migrate() → return })()`. Every repository method awaits the same promise (Pitfall 3 gate). Module-header comment style: copy `query-client.tsx` lines 5–16 (what/why/mounted-where).

---

### `src/lib/workspace/label.ts` (utility, transform)

**Analog:** `src/app/birth.tsx` input-validation block — regex + pure function + fail-closed, colocated and exported for tests:
```typescript
// birth.tsx lines 57–64, 104–113 — the validation idiom to mirror
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_INPUT_PATTERN = /^([01]\d|2[0-3]):?[0-5]\d$/;

/** Rejects syntactically well-formed but nonexistent calendar dates... */
function isValidCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Insert the colon in a colon-less 24-hour time ("1430" → "14:30"). */
export function normalizeTimeInput(value: string): string {
  return value.replace(/^(\d{2})(\d{2})$/, "$1:$2");
}
```
Pattern to copy: a `labelSchema` (zod, min(1) + length cap — bounds are agent discretion per CONTEXT) and pure `slugify(label)` (lowercase, non-alphanumerics → `-`, trimmed, ~40-char cap, `"chart"` fallback — RESEARCH Pattern 6/Pitfall 6). Pure + exported = unit-testable without React, exactly like `normalizeTimeInput`.

**Smart-default label:** build on `resultIdentityLine` from `@/components/birth/copy` (lines 283–290) — the D-10 default is "date · place", which is that function's segment vocabulary.

---

### `src/lib/workspace/revision-diff.ts` (utility, transform)

**Analog:** `src/components/chart/copy.ts` — pure fact-formatters over structured inputs, exported with doc comments, no React:
```typescript
// chart/copy.ts lines 24–34 — the formatter idiom
export function housePhrase(house: number): string {
  return `House ${house}`;
}
export function motionLabel(motion: string): string {
  return motion.charAt(0).toUpperCase() + motion.slice(1);
}
```
"What changed" summaries are pure functions diffing two stored `CalculateRequest` inputs (date/time/place/zone/confidence/house_system) into copy-deck strings — template-over-facts only, never interpretation (same T-02-34 discipline stated in copy.ts lines 14–18).

---

### `src/hooks/use-workspace.ts` (hook, CRUD)

**Analog:** `src/app/birth/confirm.tsx` — the repo's only existing TanStack Query usage; copy its mutation posture exactly:
```typescript
// confirm.tsx lines 153–176 — user-initiated POST-once mutation (T-02-32)
// User-initiated POST-once mutation: mutations do not auto-retry
const calculate = useMutation({
  mutationFn: (request: CalculateRequest) => postCalculate(request),
  onSuccess: (envelope) => { router.push({ pathname: "/chart/result", params: {...} }); },
});
```
For the workspace: `useMutation` with **`retry: false`** (T-02-32 convention), query keys `['charts']` for the list + per-chart detail keys, and the invalidation map from RESEARCH Pitfall 10 (save/rename/delete → invalidate list + detail; delete-all → invalidate all). Query defaults (staleTime 30s) already come from `query-client.tsx` line 29 — do not override per-hook without cause. Queries/mutations call the repository interface only (D-03 seam), so tests inject a fake — same seam logic as `api.ts` being mocked in screen tests today.

---

### `src/app/chart/saved.tsx` + `src/app/chart/revision.tsx` (route, request-response)

**Analog:** `src/app/chart/result.tsx` — the exact screen skeleton to copy: parse-then-trust guard, redirect-on-missing, composed result components.

**Param → parse → redirect guard** (result.tsx lines 40–59) — but with an **id** param + repository read instead of an envelope param (RESEARCH anti-pattern: never route envelopes for saved charts):
```typescript
const params = useLocalSearchParams<{ envelope?: string; identity?: string }>();
const parsed = useMemo(() => {
  if (!params.envelope || !params.identity) return null;
  try {
    return {
      identity: identitySchema.parse(JSON.parse(params.identity)),
      envelope: calculateResponseSchema.parse(JSON.parse(params.envelope)),
    };
  } catch { return null; }
}, [params.envelope, params.identity]);
useEffect(() => { if (!parsed) router.replace("/birth"); }, [parsed]);
if (!parsed) return null;
```
For `/chart/saved`: `useLocalSearchParams<{ chartId?: string }>` → repository `getLatestRevision` → `calculateResponseSchema.parse` (parse-then-trust at reopen, D-02) → same redirect-to-home shape (typed error surface per Pitfall 1). Body composes `PlacementList`, `AssumptionsLine`, `ProvenanceDetails`, `UnavailableFactors` unchanged (result.tsx lines 73–95) + `RevisionHistory`, `RenameControl`, `DeleteConfirm`, export CTA. `/chart/revision` is the read-only variant (no mutation controls).

**Screen layout constants** (result.tsx lines 100–112): every screen ends with the same `StyleSheet.create` block — `padding: Spacing.three, gap: Spacing.three, maxWidth: MaxContentWidth, width: "100%", alignSelf: "center"`.

---

### `src/app/chart/result.tsx` (modified — Save CTA, D-10)

**Analog for the CTA itself:** `confirm.tsx` lines 279–297 — the repo's CTA idiom (Pressable, `accessibilityRole="button"`, `accessibilityState={{ disabled }}`, accent background, pending state, `testID`):
```tsx
<Pressable
  accessibilityRole="button"
  accessibilityState={{ disabled: ctaDisabled }}
  disabled={ctaDisabled}
  onPress={onCalculatePress}
  style={[styles.cta, { backgroundColor: theme.accent }]}
  testID="confirm-calculate-cta"
>
  {calculate.isPending ? <ActivityIndicator color={theme.background} ... /> : null}
  <ThemedText type="default" style={[styles.ctaLabel, { color: theme.background }]}>
    {calculate.isPending ? CONFIRM_CALCULATING : CONFIRM_CTA}
  </ThemedText>
</Pressable>
```
Also per RESEARCH Pattern 5 / A6: this screen gains a third param (`request` — the CalculateRequest built by `confirm.tsx`'s `buildRequest()` lines 117–151, threaded through `router.push` at lines 160–174) so the Save path can persist inputs for D-08 revise prefill. Parse it with a zod schema beside the existing `identitySchema` (result.tsx lines 31–38 is the local-schema precedent).

---

### `src/app/index.tsx` (modified — workspace list, D-09)

**Analog:** itself (keep hero + CTA at top, lines 26–44) + `src/app/privacy.tsx` list block (lines 41–81) for the list semantics:
```tsx
// privacy.tsx lines 41–44 + 48–54 — role="list"/"listitem" + a11y label per row
<View role="list" accessible>
  {registry.providers.map((provider) => (
    <View key={provider.id} style={styles.card} role="listitem" accessible
      accessibilityLabel={`${provider.name} — ${statusLabel}`}>
```
Home mounts `ChartList` beneath the CTA (empty state = existing hero stays; list renders only when charts exist). Row identity line reuses `resultIdentityLine` vocabulary (D-11: "same vocabulary as the result identity line"). Route into `/chart/saved` on row press with an id param.

---

### `src/app/privacy.tsx` (modified — "Your data" section, D-15)

**Analog:** itself — add a `DataControls` section after the provider list, same section/copy structure (title + intro + cards, lines 20–81). Constraint (privacy.tsx lines 5–13 + `disclosures-consistency.test.ts`): this screen renders **registry-driven content with no provider content of its own** — the "Your data" section's copy must join the same discipline (copy deck in `src/components/workspace/copy.ts`, retention wording consistent with `src/data/provider-registry.json` + `docs/governance/retention-deletion-policy.md`; the registry consistency tests are the enforcement analog).

---

### `src/components/workspace/save-prompt.tsx`, `delete-confirm.tsx`, `data-controls.tsx` (component, request-response)

**Analog:** `src/components/birth/calculation-disclosure.tsx` — the repo's interrupt/confirmation card pattern:
```tsx
// calculation-disclosure.tsx lines 33–37, 50–55, 115–123 — controlled interrupt card
export type CalculationDisclosureProps = {
  onAcknowledge: () => void;   // controlled: parent owns state + persistence
  testID?: string;
};
<View style={[styles.card, { backgroundColor: theme.backgroundElement }]}
  accessibilityLiveRegion="polite" testID={testID}>
  ...
  <Pressable accessibilityRole="button" onPress={onAcknowledge}
    style={[styles.cta, { backgroundColor: theme.accent }]}>
    <ThemedText type="default" style={[styles.ctaLabel, { color: theme.background }]}>
      {DISCLOSURE_CTA}
    </ThemedText>
  </Pressable>
```
Copy: controlled props (`onConfirm`/`onCancel` + `testID`), inline card (the repo has **no Alert/modal usage anywhere** — the disclosure renders in-flow replacing the CTA, confirm.tsx lines 276–297; follow that, not `Alert.alert`), `accessibilityLiveRegion="polite"`, Phase-2 card treatment (radius 8 + `HAIRLINE_BORDER_COLOR` hairline, calculation-disclosure.tsx lines 137–147). `save-prompt` adds a validated `TextInput` (see rename-control below). `delete-confirm` renders chart name + revision count in the card body (D-14 copy from the workspace copy deck).

---

### `src/components/workspace/chart-list.tsx` + `revision-history.tsx` (component, list render)

**Analog:** `src/components/chart/placement-list.tsx` — the exact list-component skeleton:
```tsx
// placement-list.tsx lines 48–68 — typed readonly props, role=list/listitem,
// per-row a11y label, themed row cards, present-only slots
export type PlacementListProps = { placements: readonly Placement[] };
export function PlacementList({ placements }: PlacementListProps) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText type="default" accessibilityRole="header" style={styles.heading}>
        {PLACEMENTS_HEADING}
      </ThemedText>
      <View role="list" accessible style={styles.list}>
        {placements.map((placement) => (
          <View key={...} style={[styles.row, { backgroundColor: theme.backgroundElement }]}
            role="listitem" accessible accessibilityLabel={placementA11yLabel({...})}>
```
Also copy its **present-only slot rule** (lines 86–93: dignity renders only when present — "never a dash placeholder"): the confidence marker renders only when ≠ "Timed", the revision badge only when revisions > 1 (D-11). Rows are Pressables with `hitSlop={Spacing.two}` (index.tsx lines 46–48). Ordering comes from the repository query (`updated_at desc`), not from the component.

---

### `src/components/workspace/rename-control.tsx` (component, validated input)

**Analog:** `src/app/birth.tsx` — TextInput + validation + disabled-until-valid CTA. The RHF/Controller machinery (birth.tsx lines 1–7) is available but heavy for a single field; the minimal form is a controlled TextInput + `labelSchema.safeParse` gating the save button, mirroring birth.tsx's client-validate-before-act law (lines 44–47: "Validation runs client-side (zod) BEFORE any navigation… the server revalidates"). For rename, the repository revalidates bounds on write. Copy birth.tsx's inline error-text pattern (`BIRTH_DATE_ERROR` shown beside the field) rather than `ErrorBanner` (that's for CALC-04 codes only — error-banner.tsx lines 10–24).

---

### `src/components/workspace/copy.ts` (config, copy deck)

**Analog:** `src/components/chart/copy.ts` — exact structural conventions to replicate:
- Header doc declaring the copy-deck law (chart/copy.ts lines 3–18: "Components never paraphrase these; tests assert them exactly… every exported string is a label, a template over calculated facts, or a structural marker").
- `SCREAMING_SNAKE` constants for fixed strings; small pure functions for templated values (`housePhrase`, `assumptionsValue` — lines 24–34, 82–89).
- Derived display maps with raw-id fallback (`FACTOR_LABELS` + `factorLabel`, lines 145–157) — the idiom for any "what changed" field-name mapping shared with `revision-diff.ts`.

---

### `scripts/vitest/expo-sqlite-facade/` + `vitest.config.ts` alias (test infra)

**Analog:** the existing react-native facade machinery — this is the *strongest* infra analog in the repo; the expo-sqlite facade deliberately mirrors it:

**Config-time facade write + alias** (vitest.config.ts lines 12–23, 41–47):
```typescript
// Written here at CONFIG time — vite transforms test modules in the main
// process before any worker (and thus before the setupFile) runs, so the
// alias target must exist and stay lazy (no raw require at import time).
const facadeDir = path.join(dirname, "node_modules/.cache/lemastra-vitest-rn");
fs.mkdirSync(facadeDir, { recursive: true });
fs.writeFileSync(path.join(facadeDir, "rn-require-facade.cjs"), lazyFacadeSource(...), "utf8");
// ...
resolve: { alias: [
  { find: /^@\/assets\/(.*)$/, ... }, { find: /^@\/(.*)$/, ... },
  { find: /^react-native$/, replacement: path.join(facadeDir, "rn-require-facade.cjs") },
] }
```
Add `{ find: /^expo-sqlite$/, replacement: <facade module> }` to this alias list — same slot, same reasoning. Shim design notes to read before writing the facade: `scripts/vitest/react-native-shim.ts` lines 1–38 (problem/solution/identity rationale — "both the Vitest module graph and native CJS requires share one module instance"). Facade *surface*: exactly the drizzle-session call list in RESEARCH.md §Code Examples lines 468–499 (`prepareSync`/`executeSync`/`getAllSync`/`getFirstSync`/`executeForRawResultSync`/`execSync`/`closeSync` over `node:sqlite` `DatabaseSync`) — implement nothing more (Pitfall 8), and pin it with a contract test.

---

### `src/__tests__/*.test.{ts,tsx}` (~14 new test files)

Three existing test archetypes cover every new test in the Validation Architecture table:

**1. RNTL screen/component test** — `src/__tests__/result-screen.test.tsx`: copy its full scaffold verbatim:
```typescript
// result-screen.test.tsx lines 39–69 — router mock, hoisted params, /pure dynamic import
const routerMock = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), navigate: vi.fn() }));
const paramsState = vi.hoisted(() => ({ value: {} as Record<string, string | string[]> }));
vi.mock("expo-router", () => ({ router: routerMock, useLocalSearchParams: () => paramsState.value }));
let render: typeof rtlRender; ...
beforeAll(async () => {
  ({ render, userEvent, cleanup, act } = await import("@testing-library/react-native/pure"));
  ({ default: ResultScreen } = await import("@/app/chart/result"));
});
afterEach(async () => { await cleanup(); vi.clearAllMocks(); paramsState.value = {}; });
```
Also copy its fixture discipline (lines 75–159: typed `CalculateResponse` builders with a full `PROVENANCE` block) and its `expectInOrder` document-order assertion helper (lines 176–195) for D-11/D-07 list-order tests. Screen tests for saved/revision routes mock the **repository** (via the D-03 seam) instead of params-carried envelopes. `IS_REACT_ACT_ENVIRONMENT` is already owned by `src/test/setup.ts` (line 20) — do not re-set it in files.

**2. Source-scan / guard test** — `src/__tests__/governance-docs.test.ts` + `disclosures-consistency.test.ts`: node:fs reads + fail-hard assertions, with the header comment naming the threat:
```typescript
// governance-docs.test.ts lines 14–19 — fail-hard by design
const GOVERNANCE_DIR = new URL("../../docs/governance/", import.meta.url);
function readGovernanceDoc(fileName: string): string {
  // A missing file throws ENOENT here — the test fails hard, by design.
  return readFileSync(new URL(fileName, GOVERNANCE_DIR), "utf8");
}
```
This is the archetype for `telemetry-guard.test.ts` (no analytics dep in package.json, no `console.*` outside logger/tests — RESEARCH Pattern 7), the repository no-network scan (PRIV-01), and the frozen-envelope fixture regression (Pitfall 1).

**3. Pure unit test** — `src/lib/api-schemas.test.ts` (zod schema edge cases): the archetype for `label.ts` (slug/bounds), `redact.test.ts`, `revision-diff`, and the facade contract test. Repository integration tests are new-shaped (real SQL via the facade; save → close → reopen per WORK-03) but live in the same vitest node environment — no new framework config beyond the alias.

---

## Shared Patterns

### Parse-then-trust (applies to EVERY file touching envelope data)
**Sources:** `src/app/chart/result.tsx` lines 43–57, `src/lib/api.ts` lines 117–127, stated as law in `api-schemas.ts` lines 17–19.
**Apply to:** repository save AND every read (D-02), both new routes, export payload construction, and the frozen-fixture regression test. Malformed stored data → typed error + redirect, never partial render.

### Themed component conventions (all new components)
**Source:** `src/components/chart/placement-list.tsx`, `src/components/birth/calculation-disclosure.tsx`
- `useTheme()` for surfaces; row/card = `borderRadius: 8`, `borderWidth: 1`, `borderColor: "rgba(128, 128, 128, 0.4)"` (`HAIRLINE_BORDER_COLOR` — declared locally in each file, 5 files already do this), `backgroundColor: theme.backgroundElement`
- Text via `ThemedText` with `type` + `themeColor="textSecondary"` for secondary; code-ish values use `type="code"` (confirm.tsx lines 220–228)
- `role="list"`/`"listitem"` + `accessible` + per-row `accessibilityLabel` (privacy.tsx lines 41–54); headings `accessibilityRole="header"`
- CTAs: `minHeight: 48`, accent background, background-colored 600-weight label, `testID`, disabled state via `accessibilityState` (confirm.tsx lines 279–297); links: `minHeight: 44` + `hitSlop={Spacing.two}` (index.tsx lines 46–53)
- Spacing from `@/constants/theme` (`Spacing.one/two/three/four`, `MaxContentWidth`); screen-level layout block copied from result.tsx lines 100–112

### Copy-deck discipline (every new UI surface)
**Source:** `src/components/chart/copy.ts` lines 3–18. All user-facing strings in `src/components/workspace/copy.ts`; components never paraphrase; tests assert exact strings; `{…}` stored/server values render verbatim, never reworded.

### Router discipline (all route work)
**Source:** `src/app/birth/confirm.tsx` lines 91–102 + `_layout.tsx`.
- Params are JSON-stringified payloads parsed with a local zod schema before render; malformed → `router.replace` back to the flow root; `if (!parsed) return null`
- New routes must be registered in `_layout.tsx`'s `<Stack>` (lines 27–31) **and** followed by dev-server typegen before `tsc --noEmit` (Pitfall 5)
- Saved-chart routes take **id params only** — never envelopes (RESEARCH anti-pattern)

### Typed-error + fail-closed module design (data layer)
**Source:** `src/lib/api.ts` (`ApiError`), `src/app/birth.tsx` (`isValidCalendarDate` — reject well-formed-but-wrong), `governance-docs.test.ts` (fail-hard reads). Apply to: `WorkspaceError`, label bounds, slug sanitization, reopen failures.

## No Analog Found

Files with no close codebase match — planner should build from RESEARCH.md patterns (all source-verified there) and the discipline analogs above:

| File | Role | Data Flow | Reason / Governing Source |
|------|------|-----------|---------------------------|
| `src/lib/workspace/schema.ts` | model | CRUD | First SQLite code in repo. RESEARCH §Pattern 2 (verified drizzle sqliteTable shape); docs discipline from `api-schemas.ts` |
| `src/lib/workspace/repository.ts` (transaction bodies) | service | CRUD | No existing transactional store. RESEARCH §Code Examples lines 397–447 (save/dedupe, cascade delete) |
| `src/lib/workspace/db.ts` (open+migrate) | config | lazy-init | No DB lifecycle precedent. RESEARCH §Pattern 1 (`openDatabaseSync` + `drizzle()` + imperative `migrate()`, A5 fallback `useMigrations`) |
| `src/lib/workspace/ids.ts` | utility | — | No id-generation code exists. RESEARCH §Standard Stack Supporting (expo-crypto `randomUUID`; Open Question 1 recommends v4 now) |
| `src/lib/workspace/export.ts` | service | file-I/O | First file write/share in repo. RESEARCH §Pattern 6 + §Code Example lines 450–465 (`File`/`Paths` OO API + `shareAsync` + `isAvailableAsync`) |
| `src/lib/redact.ts` | utility | transform | No logging/redaction code exists (baseline: zero `console.*` in src). RESEARCH §Pattern 7 (allowlist redact + logger convention) |
| `drizzle.config.ts` + `drizzle/` | config | — | No codegen config precedent. RESEARCH §Standard Stack (`dialect: 'sqlite'`, `driver: 'expo'`) + Wave 0 gap item |

## Metadata

**Analog search scope:** `src/app/**`, `src/components/**` (birth, chart, ui), `src/hooks`, `src/lib`, `src/__tests__`, `src/test`, `scripts/vitest`, `vitest.config.ts`, `package.json`, `src/constants/theme.ts`, `src/data/provider-registry.json` (via tests)
**Files scanned:** ~30 read; full reads of 14 primary analogs
**Pattern extraction date:** 2026-08-27
**Key negative findings (verified):** no SQLite/Drizzle/persistence module, no file-export code, no modal/Alert usage (interrupts are inline cards), no logging/redaction utility, no UUID generation, no existing `role="dialog"` — the confirmation UX analog is `calculation-disclosure.tsx`'s in-flow card.
