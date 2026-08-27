---
phase: 01-trust-and-release-boundary
verified: 2026-08-24T15:05:00Z
status: passed
score: 7/7 must-haves verified
behavior_unverified: 0
behavior_unverified_items: []
overrides_applied: 0
deferred:
  - truth: "Store privacy disclosures are published on App Store Connect / Play Console"
    addressed_in: "Phase 10"
    evidence: "ROADMAP Phase 10 'Mobile Release Qualification'; apple-labels.md §3 and privacy-policy.md hosting note set publication at Phase 10; STATE.md blocker '[Phase 1 — resolved]: … store publication deferred to Phase 10'"
  - truth: "Bundle secret scan covers native iOS/Android export bundles"
    addressed_in: "Phase 10"
    evidence: "ci.yml bundle-scan coverage note: 'extend with expo export --platform ios and --platform android' when platform-conditional code first appears; greenfield Phase 1 has no platform-conditional code"
  - truth: "CHF 700 Professional License contract executed and qualified legal review completed"
    addressed_in: "none (external business action, tracked in STATE.md)"
    evidence: "STATE.md blocker '[Phase 1 — resolved-to-scheduled]': contract execution (O1) and qualified review remain scheduled before public/commercial beta (GATE-01 trigger point); posture doc §5 Purchase status honestly records 'not yet executed'"
human_verification:
  - test: "Run `npm install && npx expo start`, open the app on web (w), iOS simulator (i), or Android (a)"
    expected: "The app opens directly on the Privacy & Data screen: all six providers (LemAstra Calculation Service, Google Geocoding + Time Zone APIs, Hosting Provider, OpenAI Responses API, Supabase, Sentry) each show name, 'Planned — not yet active' label, data categories, 'When it sends' trigger, Retention, Purpose; a banner reading 'No remote feature is enabled yet… no data currently leaves your device' appears at the top"
    why_human: "Deferred end-of-phase UAT item from plan 01-02 (human_verify_mode: end-of-phase). Automated substitutes exist (component tests + dist/privacy.html static render, both verified), but the interactive device walk-through — the MVP user-flow proof — has not been performed by a human"
    result: "PASS — user-confirmed all platforms, 2026-08-24 (01-UAT.md test 1)"
  - test: "Add a GitHub origin remote, push, and confirm the first CI run"
    expected: "test / gitleaks / bundle-scan jobs all green on the initial push (see behavior_unverified_items above for the full expectation)"
    why_human: "No git remote exists; CI execution cannot be observed from the repository"
    result: "PASS — user-confirmed, 2026-08-24 (01-UAT.md test 2)"
---

# Phase 1: Trust and Release Boundary — Verification Report

**Phase Goal:** Users can understand the supported product, providers, and privacy posture before sensitive data leaves their device.
**Verified:** 2026-08-23T17:43:34Z
**Status:** human_needed
**Re-verification:** No — initial verification

> **MVP mode note (goal-format discrepancy).** ROADMAP.md declares `Mode: mvp`, but the goal line is not in `As a…, I want…, so that…` template form (`user-story.validate` → `valid: false` on the goal line). Every PLAN.md in the phase carries the same goal as a **valid** user story — "As a prospective LemAstra user, I want to understand the supported product, its providers, and its privacy posture, so that I know what leaves my device before any remote feature is enabled" (`valid: true`, slots extracted) — so MVP verification proceeded against that story. **Recommendation:** run `/gsd mvp-phase 01` (or `/gsd-phase` edit) to reformat the ROADMAP goal line so future MVP tooling resolves it directly. This is a formatting discrepancy, not a goal failure.

## User Flow Coverage

User story: «As a prospective LemAstra user, I want to understand the supported product, its providers, and its privacy posture, so that I know what leaves my device before any remote feature is enabled.»

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| Open the app | App lands on the Privacy & Data screen | `src/app/index.tsx:9` (`<Redirect href="/privacy" />`); fresh `npx expo export --platform web` (exit 0, run by verifier) statically renders the disclosures in `dist/privacy.html` | ✓ (automated; interactive device walk-through deferred to human UAT) |
| Review providers | Six provider cards, each with name, Planned label, categories, "When it sends", Retention, Purpose | `src/app/privacy.tsx:42-80` renders every field from the imported registry; `src/__tests__/privacy-screen.test.tsx` asserts registry-parity rendering (4/4 green, verifier re-run) | ✓ |
| Observe nothing-active banner | Banner states no remote feature is enabled and no data currently leaves the device | `src/app/privacy.tsx:26-33` (computed from `status === "active"` absence); banner text present in `dist/privacy.html` (verifier grep) | ✓ |
| Outcome: know what leaves the device before anything is enabled | All providers `planned`; nothing transmits; disclosures match governance docs | `provider-registry.json` — all 6 providers `"planned"`; schema enum closed at `planned|active`; gitleaks scans (history/tree/bundle) clean | ✓ |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | User can review accurate provider, retention, and transmission disclosures before enabling any remote feature (SC1 / PRIV-07) | ✓ VERIFIED | `src/app/privacy.tsx` imports `@/data/provider-registry.json` (zero hardcoded provider strings) and renders name/status/categories/trigger/retention/purpose/notes per provider; landing redirect at `src/app/index.tsx`; 13 schema-gate tests + 4 component tests green (verifier re-ran suite: 29/29); retention strings reference `retention-deletion-policy.md` by §; fresh web export renders disclosures in `dist/privacy.html` |
| 2 | The supported release presents an approved Swiss Ephemeris licensing and distribution posture (SC2 / GATE-01) | ✓ VERIFIED | `docs/governance/swiss-ephemeris-posture.md`: five required sections; decision = Professional License option-a with rationale and rejected alternative; verbatim server-calling-app clause cited to `secont_e.pdf`; obligations O1–O6 (incl. pyswisseph O5 boundary, astrology-skill vendoring O6); Approval Record names decision maker, decision date 2026-08-23, product approval **Approved**, qualified review honestly **scheduled before public/commercial beta**, purchase status honestly "not yet executed". Five-section structure enforced by `governance-docs.test.ts` — fail-direction proven live by verifier (heading removal → 1 test failed; restore → green) |
| 3 | Published iOS/Android privacy disclosures match the approved data and provider inventory (SC3 / GATE-05) | ✓ VERIFIED | `apple-labels.md`: current answer "Data Not Collected" + prepared rows for all six provider ids within Apple's official taxonomy (draft "Other Data" normalized to official "Other Data Types", delta documented); `play-data-safety.csv`: Google's official 5-column template header, rectangular, overview `PSL_DATA_COLLECTION_COLLECTS_PERSONAL_DATA` = FALSE matching all-planned registry; `data-inventory.md` covers all six ids with approval line (Approved 2026-08-23); `disclosures-consistency.test.ts` enforces registry↔worksheet↔inventory id parity and overview-answer↔activation-state match (green, verifier re-run) |
| 4 | A security inspection confirms no calculation, model, database, or third-party service secret is present in either mobile client (SC4 / GATE-06) | ✓ VERIFIED | Verifier-executed scans with repo `.gitleaks.toml`: `gitleaks git .` (40 commits, exit 0), `gitleaks dir .` (exit 0), fresh `npx expo export --platform web` → `gitleaks dir dist/` (2.07 MB, exit 0); **fail-closed proven**: fixture with `EXPO_PUBLIC_SUPABASE_KEY` → `expo-public-secret-name` fired, exit 1; `.gitignore` ignores `.env*` with `!.env.example` (only `.env.example` tracked, non-secret-only); three-class policy + rationale-contract `.gitleaksignore` (zero entries). Coverage note: web export only for greenfield Phase 1 (no platform-conditional code) — documented with extension trigger |
| 5 | Walking skeleton: Expo SDK 57 app exports a web bundle; test infrastructure green; secret-hygiene defaults (01-01) | ✓ VERIFIED | Verifier re-ran fresh `expo export --platform web` (exit 0) and `npm test` (29/29, 5 files); `package.json`: expo ~57.0.15, vitest ^4.1.11, RNTL ^14.0.1, zod ^4.4.3; `app.json`: LemAstra identity + `NSPrivacyAccessedAPICategoryUserDefaults`/CA92.1; tsconfig strict; README Local development section; `npx expo start` interactive boot itself is the deferred human UAT item |
| 6 | Governance drift protection: malformed registry/docs/drafts break the build (01-02/01-06) | ✓ VERIFIED | `registry.test.ts` rejects out-of-enum status, missing fields, bad `introducedInPhase`, wrong schemaVersion (all asserted via thrown parses, suite green); `governance-docs.test.ts` + `disclosures-consistency.test.ts` read docs from disk and throw on missing/paranet mismatch — verifier mutation check confirmed fail-hard (posture section removal → non-zero exit) |
| 7 | CI runs tests + full-history secret scan + exported-bundle scan, all exit-nonzero-on-findings (01-07) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `.github/workflows/ci.yml`: valid YAML (parsed), three jobs (test / gitleaks / bundle-scan), `fetch-depth: 0`, checksum-verified pinned gitleaks 8.30.1, zero `continue-on-error`, wired to repo `.gitleaks.toml`; every gate command proven locally by verifier (including fail-closed gitleaks). **But `git remote -v` is empty — the workflow has never executed on GitHub Actions.** Routed to Human Verification |

**Score:** 6/7 truths verified (1 present, behavior-unverified)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Store disclosure publication (console transcription + policy URL) | Phase 10 | ROADMAP Phase 10 "Mobile Release Qualification"; apple-labels.md §3, privacy-policy.md hosting note, STATE.md blockers |
| 2 | iOS/Android export bundle scans | Phase 10 (trigger-based) | ci.yml coverage note — extend when platform-conditional code first appears |
| 3 | SE contract execution (O1) + qualified legal review | External business action before public/commercial beta | STATE.md "resolved-to-scheduled" blocker; posture §5 Purchase status; GATE-01's own trigger point is the beta boundary |

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `src/app/privacy.tsx` (plan wrote `app/privacy.tsx`) | Disclosure screen rendering the registry | ✓ VERIFIED | 166 lines; imports registry; banner + full per-provider facts; documented path deviation `app/` → `src/app/` (scaffold template reality) |
| `src/data/provider-registry.json` | Versioned disclosure source of truth | ✓ VERIFIED | schemaVersion 1; 6 providers, all `planned`; contains `lemastra-calculation` |
| `src/schemas/provider-registry.ts` | zod schema + inferred types | ✓ VERIFIED | Exports `providerRegistrySchema`, `ProviderRegistry`, `Provider`; closed status enum; `.describe()` on all fields |
| `src/schemas/registry.test.ts` | Schema validation gate | ✓ VERIFIED | 13 tests incl. enum/missing-field/type rejections |
| `src/__tests__/privacy-screen.test.tsx` | Component gate: registry-parity rendering | ✓ VERIFIED | 4 tests, green |
| `src/__tests__/governance-docs.test.ts` | Structural gate | ✓ VERIFIED | 5-section posture + 4 doc existence; fail-hard proven |
| `src/__tests__/disclosures-consistency.test.ts` | Consistency gate | ✓ VERIFIED | id parity, CSV header/rectangularity, overview↔activation rule |
| `docs/governance/swiss-ephemeris-posture.md` | GATE-01 five-section posture | ✓ VERIFIED | Contains "requests calculation from a server" clause verbatim; approval record complete |
| `docs/governance/data-inventory.md` | GATE-05 inventory | ✓ VERIFIED | 6 provider ids, Current posture statement, approval line |
| `docs/governance/retention-deletion-policy.md` | Retention decisions | ✓ VERIFIED | ephemeral compute-and-discard, 14-day redacted logs, beforeSend, §7 update rule, approval line |
| `docs/governance/privacy-policy.md` | Public policy source | ✓ VERIFIED | GitHub Pages hosting note, on-device statements ("on your device"), effective-date placeholder |
| `docs/governance/secret-isolation-policy.md` | Three-class classification | ✓ VERIFIED | publishable/service_role/secure-storage/EXPO_PUBLIC all present; approval footer |
| `docs/governance/disclosures/apple-labels.md` | Apple label worksheet | ✓ VERIFIED | "Data Not Collected" + all six ids, official taxonomy only |
| `docs/governance/disclosures/play-data-safety.csv` | Play CSV draft | ✓ VERIFIED | Official header, 4 rows, zero-collection truth |
| `.gitleaks.toml` / `.gitleaksignore` | Scanner config + allowlist contract | ✓ VERIFIED | `expo-public-secret-name` rule (proven to fire); rationale-contract header, zero entries |
| `.github/workflows/ci.yml` | Three-gate CI | ✓ VERIFIED (structure) | See Truth 7 for execution caveat |
| `package.json`, `app.json`, `vitest.config.ts`, `.env.example`, `SKELETON.md`, `.gitignore`, `README.md`, `tsconfig.json` | Skeleton artifacts (01-01) | ✓ VERIFIED | All present + substantive (tool + manual checks) |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `src/app/privacy.tsx` | `src/data/provider-registry.json` | static import `@/data/provider-registry.json` | ✓ WIRED | privacy.tsx:3; component contains zero provider strings (verified by read) |
| `src/schemas/registry.test.ts` | `src/schemas/provider-registry.ts` | parses via `providerRegistrySchema` | ✓ WIRED | registry.test.ts:4 |
| `app.json` | Expo build (CNG) | `expo.ios.privacyManifests` | ✓ WIRED | app.json:13-16 |
| `.gitignore` | git working tree | ignores `.env*` (with `!.env.example`) | ✓ WIRED | .gitignore:36-37; tool's literal-pattern miss was a regex artifact — content verified; `git ls-files` shows only `.env.example` tracked |
| `disclosures-consistency.test.ts` | `src/data/provider-registry.json` | imports registry, asserts parity | ✓ WIRED | test imports + parse verified |
| `.gitleaks.toml` | CI scans | same config local + CI | ✓ WIRED | ci.yml uses repo config (`--config .gitleaks.toml` / gitleaks-action auto-pickup) |
| `docs/governance/swiss-ephemeris-posture.md` | `.planning/STATE.md` | blockers updated | ✓ WIRED | STATE.md "[Phase 1 — resolved-to-scheduled]" entry |
| `ci.yml` | `package.json` toolchain | npm ci + vitest + tsc + expo export | ✓ WIRED | Verified in workflow read |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `src/app/privacy.tsx` | `registry.providers` | static import of `provider-registry.json` (6 entries, zod-gated) | Yes — real registry content | ✓ FLOWING |
| `dist/privacy.html` | SSG render of /privacy | fresh `expo export` (verifier-run) | Yes — banner + provider names present in output | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full test suite | `npm test` | 29/29 across 5 files | ✓ PASS |
| Registry gate rejects malformed data | suite includes 8 rejection tests | green (asserted throws) | ✓ PASS |
| Fresh web export | `rm -rf dist && npx expo export --platform web` | exit 0; dist/*.html produced | ✓ PASS |
| History secret scan | `gitleaks git . --redact` | 40 commits, no leaks, exit 0 | ✓ PASS |
| Working-tree secret scan | `gitleaks dir . --redact` | no leaks, exit 0 | ✓ PASS |
| Bundle secret scan (fresh) | `gitleaks dir dist/ --redact` | no leaks, exit 0 | ✓ PASS |
| Gate fails closed (positive control) | fixture `EXPO_PUBLIC_SUPABASE_KEY` + `gitleaks dir` | `expo-public-secret-name` fired, exit 1 | ✓ PASS |
| Drift gate trips on mutation | posture §5 heading removed → `vitest run governance-docs` | 1 failed / non-zero; restored → green | ✓ PASS |
| CI workflow parses | js-yaml load | valid | ✓ PASS |
| CI executes on GitHub | (requires remote + push) | repo has **no remote** — never run | ? SKIP → human item |

### Probe Execution

No `scripts/*/tests/probe-*.sh` probes are declared by this phase's plans. Not a migration/tooling phase declaring probes. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| PRIV-07 | 01-01, 01-02 | User can review current provider, retention, and data-transmission disclosures before enabling remote features | ✓ SATISFIED | Truth 1: screen + registry + tests + landing redirect |
| GATE-01 | 01-03, 01-06, 01-07 | Approved Swiss Ephemeris licensing/distribution posture recorded before public/commercial beta | ✓ SATISFIED | Truth 2: five-section posture, product-approved 2026-08-23, qualified review scheduled-before-beta (requirement's trigger point); contract execution tracked in STATE.md |
| GATE-05 | 01-04, 01-06, 01-07 | Approved data inventory, retention/deletion policy, provider inventory, accurate Apple and Google privacy disclosures | ✓ SATISFIED | Truths 3: inventory + policy + drafts + approvals + consistency gates; console publication is Phase 10 (deferred) |
| GATE-06 | 01-01, 01-05, 01-07 | No model/calculation/database/third-party service secret shipped in mobile clients | ✓ SATISFIED | Truth 4: verifier-run scans clean + fail-closed proven + .env hygiene + CI wiring |

Orphaned requirements: none — REQUIREMENTS.md maps exactly GATE-01, GATE-05, GATE-06, PRIV-07 to Phase 1 (traceability table rows all "Complete"), matching the declared set.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `src/data/provider-registry.json` + `docs/governance/data-inventory.md` | — | **Vocabulary drift:** registry renders 3 category slugs (`account-identifier`, `synced-artifacts`, `crash-diagnostics`) for supabase/sentry that are NOT defined in inventory §3's 11-slug list, violating the schema's own declared contract ("a category may not be used in any disclosure unless it is defined there"). Flagged in 01-02 SUMMARY for 01-06 alignment; never closed — the consistency gate checks provider **ids** only, not slugs | ⚠️ Warning | Low user impact (all affected providers are post-v1 `planned`), but it is a live inconsistency inside the phase's single-source-of-truth mechanism. Fix: extend inventory §3 with the three slugs (or drop them) and add a slug-vocabulary assertion to `disclosures-consistency.test.ts` |
| `.planning/…/01-04-SUMMARY.md` | 112 | **Summary evidence inaccuracy:** claims Task 3 grep gate `on-device` PASSED, but `privacy-policy.md` contains zero hyphenated `on-device` matches (phrasing is "on your device") | ⚠️ Warning | Content intent satisfied ("What stays on your device" section); SUMMARY claim does not reproduce — evidence-hygiene issue only |
| `.planning/ROADMAP.md` (Phase 1 goal line) | — | MVP-mode goal not in user-story template (see report header) | ⚠️ Warning | Valid user story exists in all PLANs; recommend reformatting the ROADMAP goal line |
| governance docs (several) | — | "Placeholder" markers (openai retention, effective date, policy URL, contact) | ℹ️ Info | All intentional, phase-gated policy placeholders with explicit resolution triggers (Phase 7 re-verification / Phase 10 publication) — not stubs |

No TBD/FIXME/XXX debt markers in any phase-modified file. No stub implementations: the disclosure screen fully renders; no empty returns or console-only handlers.

### Human Verification Required

### 1. MVP user-flow walk-through (deferred end-of-phase UAT from plan 01-02)

**Test:** Run `npm install && npx expo start`; open on web (`w`), iOS simulator (`i`), or Android (`a`)
**Expected:** App opens directly on the Privacy & Data screen; all six providers listed, each with "Planned — not yet active" label, data categories, "When it sends" trigger, Retention, Purpose; banner "No remote feature is enabled yet. … no data currently leaves your device." visible
**Why human:** Interactive device rendering is the MVP user-flow proof; automated substitutes (component tests, static export) cover the render path but not the live boot experience

### 2. First CI execution

**Test:** Add a GitHub origin remote, push the branch, observe the GitHub Actions run
**Expected:** `test`, `gitleaks`, and `bundle-scan` jobs all green (incl. the expo dev-server typegen step and gitleaks-action on ubuntu); a scratch-branch secret-suggestive `EXPO_PUBLIC_…KEY` name turns the scans red
**Why human:** No git remote exists — the workflow has never executed; runner-specific behavior is unobservable from the repo

### Gaps Summary

No must-have truth failed; no artifact is missing, stub, or unwired. The phase goal is substantively achieved in the codebase: the disclosure surface exists and renders validated registry data as the app's landing route; the SE licensing posture is recorded with an honest approval record; store disclosure drafts match the inventory under test-enforced parity; and secret scans (history, tree, fresh bundle) are clean with fail-closed behavior proven.

Two items keep this from `passed`: (1) the deferred MVP user-flow UAT (device walk-through) and (2) the never-executed CI pipeline (no git remote) — both routed to human verification above. One substantive warning deserves near-term follow-up: the three registry category slugs undefined in the inventory vocabulary (a small, self-contained fix that closes the phase's last known consistency drift).

---

_Verified: 2026-08-23T17:43:34Z_
_Verifier: the agent (gsd-verifier)_
