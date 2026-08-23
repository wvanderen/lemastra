---
phase: 1
slug: trust-and-release-boundary
status: active
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-22
updated: 2026-08-23
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Native Testing Library (+ zod for schema gates, gitleaks for secret gates) |
| **Config file** | `vitest.config.ts` — Wave 0 installs (plan 01-01 Task 3); repo is greenfield |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit && gitleaks git . --redact && gitleaks dir . --redact && npx expo export --platform web && gitleaks dir dist/ --redact` |
| **Estimated runtime** | ~20-40s quick; ~60-120s full (expo export dominates) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` (+ task-specific automated verify)
- **After every plan wave:** Run the full suite command (adds history scan + bundle scan)
- **Before `/gsd-verify-work`:** Full suite must be green; human checkpoints closed
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | GATE-06 | T-01-SC | Package legitimacy confirmed before install | manual checkpoint | — (checkpoint:human-verify) | n/a | ⬜ pending |
| 01-01-02 | 01 | 1 | PRIV-07/GATE-06 | T-01-01 | .env* ignored; bundle exports; SDK 57 pinned | build | `npx expo export --platform web && test -d dist` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | PRIV-07 | — | Test infra green under strict TS | unit | `npx vitest run && npx tsc --noEmit` | ❌ W0 (smoke) | ⬜ pending |
| 01-02-01 | 02 | 2 | PRIV-07 | T-01-04 | Registry schema-validated; closed status enum | unit | `npx vitest run src/schemas` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 2 | PRIV-07 | T-01-03 | Screen renders registry data only | unit/component | `npx vitest run src/__tests__/privacy-screen.test.tsx` | ❌ W0 | ⬜ pending |
| 01-02-03 | 02 | 2 | PRIV-07 | — | Landing route = disclosure surface | build | `npx vitest run && npx tsc --noEmit && npx expo export --platform web` | n/a | ⬜ pending |
| 01-03-01 | 03 | 1 | GATE-01 | — | License path decision recorded | manual checkpoint | — (checkpoint:decision) | n/a | ⬜ pending |
| 01-03-02 | 03 | 1 | GATE-01 | T-01-05 | Posture has 5 sections + server-calling clause | structural grep | `grep -c '^## [1-5]\.' docs/governance/swiss-ephemeris-posture.md` | ❌ W0 (01-06) | ⬜ pending |
| 01-04-01 | 04 | 1 | GATE-05 | T-01-07 | Inventory covers all 6 registry ids | structural grep | `grep -q 'lemastra-calculation' docs/governance/data-inventory.md` | n/a | ⬜ pending |
| 01-04-02 | 04 | 1 | GATE-05 | T-01-08 | Retention decisions concrete | structural grep | `grep -q 'compute-and-discard' docs/governance/retention-deletion-policy.md` | n/a | ⬜ pending |
| 01-04-03 | 04 | 1 | GATE-05 | — | Policy content + hosting decision | structural grep | `grep -q 'GitHub Pages' docs/governance/privacy-policy.md` | n/a | ⬜ pending |
| 01-05-01 | 05 | 2 | GATE-06 | T-01-11 | Classification policy 3 classes | structural grep | `grep -q 'publishable' docs/governance/secret-isolation-policy.md` | n/a | ⬜ pending |
| 01-05-02 | 05 | 2 | GATE-06 | T-01-09 | gitleaks config + clean scans | scanner | `gitleaks git . --redact && gitleaks dir . --redact` | ❌ W0 | ⬜ pending |
| 01-05-03 | 05 | 2 | GATE-06 | T-01-09 | Exported bundle secret-free | scanner | `npx expo export --platform web && gitleaks dir dist/ --redact` | n/a | ⬜ pending |
| 01-06-01 | 06 | 3 | GATE-05 | T-01-13 | Apple worksheet within taxonomy | structural grep | grep gate (all 6 provider ids + Data Not Collected) | n/a | ⬜ pending |
| 01-06-02 | 06 | 3 | GATE-05 | T-01-13 | Play CSV valid + template-shaped | parse check | `node -e` CSV rectangularity check | n/a | ⬜ pending |
| 01-06-03 | 06 | 3 | GATE-01/05 | T-01-12/14 | Governance + consistency gates | unit | `npx vitest run src/__tests__/governance-docs.test.ts src/__tests__/disclosures-consistency.test.ts` | ❌ W0 | ⬜ pending |
| 01-07-01 | 07 | 4 | GATE-06 | T-01-15 | CI: test + gitleaks + bundle-scan jobs | structural check | `node -e` workflow key check | ❌ W0 | ⬜ pending |
| 01-07-02 | 07 | 4 | GATE-01/05 | — | Governance set approval | manual checkpoint | — (checkpoint:human-verify) | n/a | ⬜ pending |
| 01-07-03 | 07 | 4 | GATE-01/05 | T-01-17 | Approval records honest (review scheduled) | grep + unit | `grep -q 'Approved' docs/governance/*.md` + vitest | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` + `@testing-library/react-native` + `zod` install & `vitest.config.ts` — plan 01-01 Task 3 (framework; repo is greenfield)
- [ ] `src/__tests__/smoke.test.ts` — proves runner green (01-01 Task 3)
- [ ] `src/schemas/registry.test.ts` — PRIV-07 schema enforcement (01-02 Task 1)
- [ ] `src/__tests__/privacy-screen.test.tsx` — PRIV-07 rendering (01-02 Task 2)
- [ ] `src/__tests__/governance-docs.test.ts` — GATE-01/05 structural gate (01-06 Task 3)
- [ ] `src/__tests__/disclosures-consistency.test.ts` — GATE-05 registry↔drafts parity (01-06 Task 3)
- [ ] `.gitleaks.toml` + `.gitleaksignore` — GATE-06 local gate (01-05 Task 2)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Expo scaffold packages are the official Expo team packages | GATE-06 (supply chain) | Registry heuristics cannot judge publisher intent | checkpoint 01-01-01: verify npmjs.com pages for expo/create-expo-app/expo-template-default |
| Swiss Ephemeris license path choice (business intent) | GATE-01 | Closed vs open source is a business decision, not verifiable | checkpoint 01-03-01: select option-a (Professional) or option-b (AGPL) |
| Governance set substance approval | GATE-01/05 | Approval authority belongs to the product owner | checkpoint 01-07-02: review posture, inventory, policy, disclosures; approve or correct |
| Disclosure screen visually renders on device | PRIV-07 | Visual/interactive confirmation | `npx expo start` → app opens on Privacy & Data listing 6 providers with nothing-active banner |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner contract complete 2026-08-23; execution sign-off pending
