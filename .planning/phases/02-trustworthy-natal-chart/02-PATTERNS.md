# Phase 2: Trustworthy Natal Chart - Pattern Map

**Mapped:** 2026-08-25
**Files analyzed:** 34 (new/modified, grouped into families)
**Analogs found:** 17 exact/structural in-repo + 1 external canonical (calculator) — all backend `api/` files are greenfield (first Python in repo) and map to structural analogs only

> **Consistency with Phase 1 (`01-PATTERNS.md`):** this map preserves the established conventions — expo ~57 tilde pins via `npx expo install` (T-01-SC), typed-routes regeneration landmine (dev-server boot before `tsc --noEmit`), registry-driven disclosures (no hardcoded provider strings), exit-code gate semantics (fail hard / warn soft), secret classification (`EXPO_PUBLIC_*` non-secret only; server secrets in gitignored `.env*`), vitest+RNTL `/pure` component tests. Phase 1's greenfield notes are now analogs: `privacy.tsx`, `provider-registry.ts`, `registry.test.ts`, `privacy-screen.test.tsx`, and `ci.yml` are the canonical in-repo patterns this phase extends.

## File Classification

### A. API service (new `api/` — greenfield, first backend code in repo)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `api/pyproject.toml` + `uv.lock` | config (build/deps) | n/a | `.env.example` header-comment convention + RESEARCH.md §Standard Stack pins | structure-match (greenfield) |
| `api/.env.example` | config | n/a | `.env.example` (root) | exact (convention) |
| `api/README.md` | doc | n/a | `README.md` (root, scaffolded) | structure-match |
| `api/lemastra_api/__init__.py` | package marker | n/a | — | greenfield |
| `api/lemastra_api/main.py` | route (app factory) | request-response | no direct analog — greenfield; RESEARCH.md §3 layout | none (greenfield) |
| `api/lemastra_api/settings.py` | config | n/a (env reads) | `.env.example` key-naming convention | structure-match |
| `api/lemastra_api/schemas.py` | model (pydantic request/response) | transform (validate) | `src/schemas/provider-registry.ts` (zod contract style) + EXT `astrology-skill/assets/schemas/chart_input_schema.json` | structure-match |
| `api/lemastra_api/errors.py` | middleware/utility (error taxonomy) | request-response | `src/schemas/provider-registry.ts` closed-enum style (error_code enum) | structure-match |
| `api/lemastra_api/provenance.py` | utility | transform (assemble versions) | EXT `chart_input_schema.json` field-documentation style | structure-match |
| `api/lemastra_api/routes/places.py` | route | request-response (geocoder proxy) | no direct analog — greenfield | none (greenfield) |
| `api/lemastra_api/routes/charts.py` | route | request-response → subprocess | no direct analog — greenfield | none (greenfield) |
| `api/lemastra_api/services/geocoding.py` | service | request-response (httpx → Google) | no direct analog — greenfield | none (greenfield) |
| `api/lemastra_api/services/civil_time.py` | service/utility (pure) | transform (classify/resolve) | no direct analog — greenfield; verified algorithm in RESEARCH.md §DST | none (greenfield) |
| `api/lemastra_api/services/calculator.py` | service | file-I/O + subprocess (batch) | no direct analog — greenfield; EXT `tools/birth_to_chart.py` is the wrapped contract | none (greenfield) |
| `api/tests/conftest.py` | test (fixtures) | n/a | `vitest.config.ts` setupFiles role + `src/test/setup.ts` | structure-match |
| `api/tests/test_civil_time.py` | test | transform (pure fn table) | `src/schemas/registry.test.ts` (dense parse/reject matrix) | structure-match |
| `api/tests/test_calculator_client.py` | test | subprocess | `src/schemas/registry.test.ts` (gate semantics) | structure-match |
| `api/tests/test_places.py`, `test_calculate.py`, `test_errors.py` | test (integration, TestClient) | request-response | `src/__tests__/privacy-screen.test.tsx` (render→assert→gate) | structure-match |
| `api/tests/test_golden.py` | test (parametrized golden suite) | batch (digest compare) | `src/schemas/registry.test.ts` mutation/rejection gate style | structure-match |
| `api/tests/fixtures/golden/cases/*.json` (+ `README.md`) | test data | file-I/O | `src/data/provider-registry.json` (versioned JSON contract style) | structure-match |
| `vendor/astrology-skill` (git submodule @ `660d992`) + `.gitmodules` | config (vendored dep) | n/a | EXT sibling checkout `/Users/eggfam/dev/astrology-skill` | exact (same tree, pinned) |

### B. Client routes (expo-router)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/index.tsx` (modify: CTA → /birth) | route | n/a (nav) | itself / `src/app/_layout.tsx` Stack registration | exact |
| `src/app/birth.tsx` | route/component (form) | request-response (search) + transform (validation) | `src/app/privacy.tsx` | exact |
| `src/app/birth/confirm.tsx` | route/component | request-response (resolve-time → calculate) | `src/app/privacy.tsx` | exact |
| `src/app/chart/result.tsx` | route/component | transform (envelope → list) | `src/app/privacy.tsx` (registry-driven list render) | exact |

### C. Client components

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/birth/confidence-control.tsx` | component | event-driven (state) | `src/components/themed-text.tsx` (typed props + theme) | role-match |
| `src/components/birth/place-search.tsx` | component | request-response (debounced) | `src/app/privacy.tsx` StyleSheet pattern | role-match |
| `src/components/birth/tricky-time-picker.tsx` | component | event-driven (choice) | `src/components/themed-text.tsx` | role-match |
| `src/components/chart/placement-list.tsx` | component | transform (render facts) | `src/app/privacy.tsx` map-over-data list | exact |
| `src/components/chart/assumptions-line.tsx` | component | transform | `src/app/privacy.tsx` `sectionIntro` style | exact |
| `src/components/chart/provenance-details.tsx` | component | transform (expandable) | `src/app/privacy.tsx` card pattern | exact |
| `src/components/chart/unavailable-factors.tsx` | component | transform (render gaps) | `src/app/privacy.tsx` banner/card pattern | exact |

### D. Client lib / hooks / providers

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/api.ts` | utility (fetch client) | request-response | no direct analog — first fetch wrapper | none (greenfield) |
| `src/lib/api-schemas.ts` | utility (zod response contracts) | transform (parse-then-trust) | `src/schemas/provider-registry.ts` | exact |
| `src/lib/query-client.tsx` | provider | request-response (server state) | `src/app/_layout.tsx` (provider wrapping pattern) | role-match |
| `src/hooks/use-disclosure.ts` | hook | file-I/O (AsyncStorage flag) | `src/hooks/use-theme.ts` | exact |
| `src/data/provider-registry.json` (modify: status `planned`→`active` ×2) | model | file-I/O | itself + `src/schemas/registry.test.ts` gate that must be updated in lockstep | exact |
| `package.json` (modify: RHF, @hookform/resolvers, @tanstack/react-query, async-storage — via `npx expo install`) | config | n/a | existing tilde-pin set | exact (convention) |

### E. CI / config

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.github/workflows/ci.yml` (modify: add `api` job) | config (CI) | batch | existing `test` / `gitleaks` jobs in same file | exact |
| Client tests in `src/__tests__/` (birth-form, confirm, picker, confidence, result components, api-schemas) | test | file-I/O (render+assert) | `src/__tests__/privacy-screen.test.tsx` + `src/schemas/registry.test.ts` | exact |

## Pattern Assignments

### A1. `api/lemastra_api/main.py`, `routes/places.py`, `routes/charts.py`, `services/geocoding.py`, `services/calculator.py`, `services/civil_time.py`, `settings.py`, `errors.py`, `provenance.py`, `schemas.py` (FastAPI service — greenfield)

**No direct analog — first backend code in the repo.** The layout, endpoint contracts, error taxonomy, provenance envelope, and subprocess wrapper are fully specified in `02-RESEARCH.md` §"FastAPI Service Skeleton" (lines 271–337), §"Calculator Integration Contract" (lines 176–242), and §"DST Gap/Overlap Handling" (lines 382–429) — the planner should treat RESEARCH.md as the pattern source (it was verified by executing the real calculator). Structural anchors:

**Closed-enum + per-field documentation convention** (mirror in `schemas.py` pydantic models AND `errors.py` error_code enum) — analog `src/schemas/provider-registry.ts` lines 19–26:

```typescript
export const providerStatusSchema = z
  .enum(["planned", "active"])
  .describe(
    "Whether the provider's remote flow is enabled. 'planned' = the flow " +
      "does not exist yet and the provider receives nothing; 'active' = the " +
      "flow is live. Flipping to active requires updating the registry, the " +
      "data inventory, and the retention policy first (retention-deletion-policy.md §7)."
  );
```

**D-11 selector vocabulary — copy EXACTLY** (verbatim from the wrapped calculator, EXT `/Users/eggfam/dev/astrology-skill/tools/birth_to_chart.py` lines 181–192; the pydantic/zod house-system enums must equal these labels):

```python
# House system name → Swiss Ephemeris house letter.
HOUSE_SYSTEMS: dict[str, bytes] = {
    "Whole Sign": b"W",
    "Placidus": b"P",
    "Regiomontanus": b"R",
    "Koch": b"K",
    "Equal": b"A",
    "Campanus": b"C",
    "Porphyrius": b"O",
    "Morinus": b"M",
    "Alcabitius": b"B",
    "Topocentric": b"T",
}
```

**Subprocess wrapper contract (RESEARCH.md-verified, planner copies from RESEARCH.md §"Wrapper isolation contract" lines 236–242):** one `asyncio.create_subprocess_exec` per request, `--input <tempfile>` JSON mode (never flags — argparse trap), `--validate` always, `asyncio.wait_for(..., timeout=10)` + `kill()` → `CALC_TIMEOUT`, stdin from DEVNULL, never `shell=True`, minimal inherited env (strip `GOOGLE_API_KEY`). Exit-code mapping: 0 → success; 2 + stderr `FAIL:` → `CALC_INVALID_INPUT` (pass the field-naming message through); 1 / traceback → `CALC_ENGINE_ERROR`, unless stderr contains `swisseph.houses` → `CALC_UNSUITABLE_HOUSE_SYSTEM`.

**Error body shape (CALC-04):** `{error: {code, message, recoverable: true, hint?}}` — machine-readable code enum + human recovery hint, mirroring the closed-enum convention above.

### A2. `api/pyproject.toml`, `api/.env.example`, `api/README.md`, `.gitmodules`, `vendor/astrology-skill` (config)

**Analog:** root `.env.example` — header comment establishes the secret/non-secret boundary; `api/.env.example` repeats the convention for `GOOGLE_API_KEY=` (server-only) + `LEMASTRA_CALC_TIMEOUT_S` + `LEMASTRA_ALLOW_ORIGINS`. Verbatim from `.env.example` lines 1–9:

```bash
# LemAstra environment template — NON-SECRET VALUES ONLY.
#
# EXPO_PUBLIC_ variables are inlined in PLAIN TEXT into the shipped JS bundle
# (https://docs.expo.dev/guides/environment-variables/). Secrets (API keys,
# service keys, tokens) must NEVER be placed in EXPO_PUBLIC_* or any .env file
# committed to this repository — server-side credentials live only in backend
# deployment configuration.

EXPO_PUBLIC_API_URL=
```

`pyproject.toml`: `requires-python = ">=3.12,<3.13"`; exact pins `pyswisseph==2.10.3.2`, `tzdata==2026.3`, locked `jsonschema`/`fastapi`/`uvicorn`; commit `uv.lock`; `[tool.pytest.ini_options]` for the test suite. Submodule: `git submodule add https://github.com/wvanderen/astrology-skill.git vendor/astrology-skill` then checkout `660d992` (RESEARCH.md §Vendoring, lines 244–269).

### A3. `api/tests/*` + `api/tests/fixtures/golden/` (pytest suite)

**Analog (gate semantics + dense validation matrix):** `src/schemas/registry.test.ts` — valid-parse assertions plus mutation/rejection table; port this discipline to pytest. Excerpt (lines 65–69 and 110–113):

```typescript
  it("rejects a provider whose status is outside the enum", () => {
    const enabled = { ...validProvider, status: "enabled" };
    expect(() => providerRegistrySchema.parse(registryWith([enabled]))).toThrow();
  });
...
    it.each([0, -2, 1.5, "2"])("rejects %s", (value) => {
      const malformed = { ...validProvider, introducedInPhase: value };
      expect(() => providerRegistrySchema.parse(registryWith([malformed]))).toThrow();
    });
```

pytest equivalents: `test_civil_time.py` = parametrized classification table (normal/ambiguous/nonexistent × zones — dense, pure, milliseconds); `test_golden.py` = parametrize over `fixtures/golden/cases/*.json`, compare **field digests not whole documents** (`source_notes` embeds version strings — whitelist); absent-key assertions for unknown-time (`assert "ascendant" not in chart_data`, not falsy checks). Fixture case JSON follows the versioned-data style of `src/data/provider-registry.json` (`schemaVersion` + documented fields; case schema in RESEARCH.md lines 517–533). `conftest.py` provides: TestClient fixture, temp skill-input helper, geocoder stub (recorded Google JSON — never live).

### B. `src/app/birth.tsx`, `src/app/birth/confirm.tsx`, `src/app/chart/result.tsx` (routes)

**Analog:** `src/app/privacy.tsx` — the repo's only screen; new screens copy its structure (default export, `ScrollView` + `StyleSheet`, accessibility roles, registry-driven content). Imports + registry-driven core (lines 1–21):

```typescript
import { ScrollView, StyleSheet, Text, View } from "react-native";

import providerRegistryData from "@/data/provider-registry.json";

/**
 * Privacy & Data disclosure screen (PRIV-07).
 *
 * Renders the bundled provider registry — the same versioned data that
 * feeds the store-disclosure drafts — so what users read can never drift
 * from what governance documents claim. Every provider name, category,
 * trigger, retention, and purpose string comes from the registry: this
 * component must contain no provider content of its own.
 */
export default function PrivacyScreen() {
  const registry = providerRegistryData;
  const anyProviderActive = registry.providers.some(
    (provider) => provider.status === "active"
  );
```

List-render pattern for `placement-list.tsx` / `unavailable-factors.tsx` (lines 41–53):

```typescript
      <View role="list" accessible>
        {registry.providers.map((provider) => {
          const statusLabel =
            provider.status === "planned"
              ? "Planned — not yet active"
              : "Active";
          return (
            <View
              key={provider.id}
              style={styles.card}
              role="listitem"
              accessible
              accessibilityLabel={`${provider.name} — ${statusLabel}`}
            >
```

**Route registration:** add `<Stack.Screen name="birth" />`, `<Stack.Screen name="birth/confirm" />`, `<Stack.Screen name="chart/result" />` following `src/app/_layout.tsx` lines 19–22:

```typescript
      <Stack>
        <Stack.Screen name="index" />
        <Stack.Screen name="privacy" />
      </Stack>
```

⚠️ **Phase-1 landmine (carried forward):** typed routes regenerate only via dev-server boot — after adding routes, run `npx expo start` once locally before `tsc --noEmit`; CI's existing flow in `ci.yml` lines 44–60 already handles this — do not touch it.

**Disclosure content on `confirm.tsx` (D-04)** MUST be registry-driven exactly like the excerpt above: read `lemastra-calculation` + `google-geocoding-timezone` from `provider-registry.json` — no hardcoded disclosure strings (the `disclosures-consistency.test.ts` invariant from Phase 1).

### C. `src/components/birth/*`, `src/components/chart/*` (components)

**Analog:** `src/components/themed-text.tsx` — typed props union + `useTheme()` + conditional style arrays (lines 6–17):

```typescript
export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
```

Confidence control: four-state typed union `'timed' | 'approximate' | 'rectified' | 'unknown'` mapped to the calculator's capitalized labels (`Timed | Approximate | Unknown | Rectified` — RESEARCH.md §1). `provenance-details.tsx` expandable section reuses the `privacy.tsx` card + `fieldLabel`/`fieldValue` style pair (lines 134–144). StyleSheet conventions (borderRadius 8, padding 12, gap 4, fontSize ladder) come from `privacy.tsx` lines 86–166.

### D1. `src/lib/api-schemas.ts` (zod response contracts)

**Analog:** `src/schemas/provider-registry.ts` in full — same conventions: `.describe()` on every field (schema doubles as contract doc), closed enums via `z.enum([...])` with literal vocabularies (house systems from the calculator excerpt above; `error_code` enum mirroring `errors.py`), `z.infer` type exports (lines 96–97):

```typescript
export type Provider = z.infer<typeof providerSchema>;
export type ProviderRegistry = z.infer<typeof providerRegistrySchema>;
```

Tests copy `src/schemas/registry.test.ts`: parse the documented success envelope, reject every malformed variant (mutation helper pattern, lines 32–41).

### D2. `src/hooks/use-disclosure.ts` (AsyncStorage one-time flag)

**Analog:** `src/hooks/use-theme.ts` — small exported hook, `@/` alias imports, doc-comment (full file, lines 1–14):

```typescript
/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'unspecified' ? 'light' : scheme;

  return Colors[theme];
}
```

Same shape: `useDisclosure()` → `{ acknowledged, acknowledge }` backed by AsyncStorage key `@lemastra:disclosure.calculation.v1`.

### D3. `src/lib/api.ts`, `src/lib/query-client.tsx` (fetch client + query provider)

**No direct analog — first network code in the client.** Base-URL resolution (`process.env.EXPO_PUBLIC_API_URL ?? platform default`; Android emulator `10.0.2.2`) per RESEARCH.md §CORS/local-dev (lines 328–332). `query-client.tsx` wraps the app in the provider — follow `_layout.tsx`'s provider-wrap shape (`ThemeProvider value={...}` wrapping children, lines 17–24). Parse-then-trust: every response passes through `api-schemas.ts` zod parse before render.

### D4. `src/data/provider-registry.json` (modify: status flip)

**Analog:** itself. Flip `lemastra-calculation` (line 7) and `google-geocoding-timezone` (line 28) from `"status": "planned"` → `"active"` in the same plan that wires the flows. Locked vocabulary excerpt (lines 4–8):

```json
    {
      "id": "lemastra-calculation",
      "name": "LemAstra Calculation Service",
      "status": "planned",
      "introducedInPhase": 2,
```

⚠️ **Governed act (registry schema description, provider-registry.ts lines 21–25):** the flip requires data-inventory + retention-policy to already match — RESEARCH.md verified they do (§Pitfall 9). Tests that must move in lockstep: `registry.test.ts` "marks every provider as planned" (lines 50–55 — update to assert exactly these two active) and `privacy-screen.test.tsx` banner test (lines 71–78 — banner disappears once any provider is active; the test already guards this with an early return).

### E. `.github/workflows/ci.yml` (modify: add `api` job)

**Analog:** the existing `test` job (lines 27–62) — same structure: checkout → toolchain setup with cache → install → gate commands. New job per RESEARCH.md §CI wiring (lines 544–560):

```yaml
  api:
    name: API tests + golden fixtures (pytest)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { submodules: true }        # vendored astrology-skill
      - uses: astral-sh/setup-uv@v5       # [ASSUMED: action tag — verify at plan time]
        with: { python-version: "3.12", enable-cache: true }
      - run: uv sync --locked             # reproducible from committed uv.lock
        working-directory: api
      - run: uv run pytest -q
        working-directory: api
```

Preserve the file's header-comment convention (documented gate rationale per job) and `permissions: contents: read` least-privilege top-level. No Google key in CI — geocoder tests use recorded fixtures.

### F. `src/__tests__/` client tests (birth-form, confirm, pickers, result components)

**Analog:** `src/__tests__/privacy-screen.test.tsx` — the mandatory RNTL `/pure` pattern. Verbatim skeleton (lines 1–31):

```typescript
import type { render as rtlRender, within as rtlWithin } from "@testing-library/react-native/pure";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

// Acquired in beforeAll (not a static import): RNTL requires react-native
// at import time, and the RN test shim only seeds require.cache when the
// setupFile has run — which happens after collection but before hooks.
type RenderResult = Awaited<ReturnType<typeof rtlRender>>;
let render: typeof rtlRender;
let within: typeof rtlWithin;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  ({ render, within, cleanup } = await import("@testing-library/react-native/pure"));
});

// RNTL's `/pure` entry skips automatic cleanup — unmount after every test
// so repeated renders don't leak into later text queries.
afterEach(async () => {
  await cleanup();
});
```

Also copy its derivation discipline: assertions derive from input data (registry → screen; here: API envelope fixture → rendered list), never hardcoded UI strings where the data is the source. Schema-only tests (api-schemas) follow `registry.test.ts` instead — plain `vitest` imports, no RNTL. Test config (`vitest.config.ts`, `src/test/setup.ts`, RN shim) is unchanged — new tests just land in `src/**/*.{test,spec}.{ts,tsx}`.

## Shared Patterns

### Registry-driven disclosure content (Phase 1 Pattern A, extended)
**Source:** `src/data/provider-registry.json` + `src/app/privacy.tsx` lines 1–21
**Apply to:** `birth/confirm.tsx` one-time notice (D-04), any UI that names a provider. Content comes from registry entries `lemastra-calculation` / `google-geocoding-timezone` — locked ids (also fixed by `src/schemas/registry.test.ts` lines 9–16 `CANONICAL_PROVIDER_IDS`). Never hardcode disclosure strings; the Phase 1 consistency tests enforce this.

### Closed enums with documented vocabularies
**Source:** `src/schemas/provider-registry.ts` lines 19–26 (`z.enum` + `.describe`)
**Apply to:** `api/schemas.py` (house_system, confidence, time_resolution.mode), `api/errors.py` (error_code), `src/lib/api-schemas.ts` (mirror all of them client-side). Vocabularies trace to the calculator: house systems verbatim from `HOUSE_SYSTEMS` (excerpt above), confidence from `Timed | Approximate | Unknown | Rectified`.

### Exit-code gates, fail hard / warn soft (Phase 1 Pattern B, extended to pytest)
**Source:** `src/schemas/registry.test.ts` (mutation/rejection gates) + `ci.yml` ("no step may swallow failures", line 3)
**Apply to:** all pytest modules; golden digest mismatches, absent-key assertions, and error-code matrix failures must fail CI. The `api` CI job joins `test`/`gitleaks`/`bundle-scan` as a fourth gate.

### Parse-then-trust at every boundary
**Source:** `src/schemas/registry.test.ts` parse/reject discipline (Phase 1) + RESEARCH.md triple-gate (calculator `--validate` → pydantic edge → zod client)
**Apply to:** `api/schemas.py`, `src/lib/api-schemas.ts`, and their test pairs. Validation is never optional (STACK.md).

### Secret isolation (Phase 1 Pattern D, extended to backend)
**Source:** `.env.example` header + `ci.yml` gitleaks jobs
**Apply to:** `api/.env.example` (non-secret placeholders only), `GOOGLE_API_KEY` only in gitignored `api/.env`, never logged, never in `EXPO_PUBLIC_*`, stripped from subprocess env. Server logs redact birth payloads (retention §1).

### Expo dependency discipline
**Source:** `package.json` tilde pins (expo ~57.0.15 line)
**Apply to:** the four new client deps — install via `npx expo install react-hook-form @hookform/resolvers @tanstack/react-query @react-native-async-storage/async-storage` so Expo selects compatible versions (T-01-SC).

### Typed-routes regeneration (Phase 1 landmine, still live)
**Source:** `ci.yml` lines 37–60 comment block
**Apply to:** adding `/birth`, `/birth/confirm`, `/chart/result` — regenerate via dev-server boot before typecheck; keep the CI flow untouched.

## No Analog Found

True greenfield — planner should follow `02-RESEARCH.md` patterns (all verified by execution) rather than codebase excerpts:

| File | Role | Data Flow | Reason / Guidance |
|------|------|-----------|-------------------|
| `api/lemastra_api/main.py` + `routes/*` | route | request-response | First FastAPI code in repo. App factory, CORS allowlist, `/api/v1/health`, endpoint contracts: RESEARCH.md §3 (lines 271–337). |
| `api/lemastra_api/services/calculator.py` | service | subprocess file-I/O | Subprocess wrapper contract: RESEARCH.md lines 236–242 (timeout, argv, env stripping, exit-code map). |
| `api/lemastra_api/services/civil_time.py` | service | transform | Verified PEP 495 classification algorithm: RESEARCH.md lines 388–403 (copy the code verbatim as the starting point). |
| `api/lemastra_api/services/geocoding.py` | service | request-response | Google request/response shapes + status→error_code map: RESEARCH.md §Geocoding (lines 341–380). |
| `src/lib/api.ts` | utility | request-response | First fetch wrapper; base-URL/platform-default resolution: RESEARCH.md lines 328–332. |
| `api/lemastra_api/provenance.py` | utility | transform | Structured provenance envelope fields: RESEARCH.md lines 306–322 (skill_revision via git rev-parse, importlib.metadata tzdata, parsed swe.version). |

## Metadata

**Analog search scope:** full tracked tree (`git ls-files`, 63 non-planning files); external: `/Users/eggfam/dev/astrology-skill` (canonical refs only — HOUSE_SYSTEMS verbatim; the full contract lives in RESEARCH.md which executed the tool)
**Files scanned:** 13 in-repo analogs read in full/targeted (privacy.tsx, provider-registry.ts/.json, registry.test.ts, privacy-screen.test.tsx, _layout.tsx, index.tsx, use-theme.ts, themed-text.tsx, ci.yml, vitest.config.ts, .env.example, package.json) + 1 external targeted read (birth_to_chart.py L178–197)
**Early stop:** all client files map to 4 strong in-repo analogs (privacy.tsx, provider-registry.ts, registry.test.ts, privacy-screen.test.tsx); all backend files are greenfield with RESEARCH.md as the verified pattern source — further codebase search has nothing to find
**Pattern extraction date:** 2026-08-25
