---
phase: 4
slug: semantic-chart-exploration
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-30
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 + @testing-library/react-native 14.0.1 (`/pure`, RN shim, act-queue laws) |
| **Config file** | `vitest.config.ts` (aliases: RN facade, expo-sqlite, device facades, + skia facade from 04-01) |
| **Quick run command** | `npx vitest run <file>` (e.g. `npx vitest run src/lib/chart-wheel/geometry.test.ts`) |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30–60 seconds full suite |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <target file(s)>` from the map below
- **After every plan wave:** Run `npm test` (full Phase 1–3 regression included)
- **Before `/gsd-verify-work`:** Full suite green + `npx tsc --noEmit` (after typed-routes regen)
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | (dep gate) | T-04-SC | Human verifies Skia npm registry page + Expo SDK 57 pin before install | manual checkpoint | npmjs.com + docs.expo.dev/versions/v57.0.0/sdk/skia + bundledNativeModules.json | n/a | ⬜ pending |
| 04-01-02 | 01 | 1 | WHEEL-01 | T-04-01/02 | Skia lands at Expo pin ~2.6.2; test graphs CanvasKit-free; GestureHandlerRootView added | config + suite | `npm test && npx tsc --noEmit` | ✅ (facade in-task) | ⬜ pending |
| 04-01-03 | 01 | 1 | WHEEL-01, WHEEL-03 | — | Geometry purity (no RN/Skia imports); unknown-time honesty; zoom-true hit math | unit (golden numeric) | `npx vitest run src/lib/chart-wheel/` | ❌ W0 → created in-task | ⬜ pending |
| 04-02-01 | 02 | 1 | EVID-01, A11Y-02 | T-04-04 | Interpretation kind unrenderable; non-hue-only style tokens | unit | `npx vitest run src/__tests__/evidence-vocabulary.test.ts` | ❌ W0 → created in-task | ⬜ pending |
| 04-02-02 | 02 | 1 | EVID-02 | T-04-03 | Preference value union-validated; safe-persist never blocks | unit (hook) | `npx vitest run src/__tests__/use-explore-mode.test.ts` | ❌ W0 → created in-task | ⬜ pending |
| 04-03-01 | 03 | 2 | WHEEL-02 | — | Facts render envelope values only (no invented values); A-UI-4 parity | component | `npx vitest run src/__tests__/fact-panel.test.tsx` | ❌ W0 → created in-task | ⬜ pending |
| 04-03-02 | 03 | 2 | WHEEL-02 | T-04-11 | Tap → hitTest → onSelect through pure math | component (facade) | `npx vitest run src/__tests__/wheel-selection.test.tsx` | ❌ W0 → created in-task | ⬜ pending |
| 04-03-03 | 03 | 2 | WHEEL-01 | T-04-05/06/07 | id-param law; unknown id → redirect; explicit-save-only; explore-route web zero-canvas (capability card) | component (route) | `npx vitest run src/__tests__/explore-route.test.tsx src/__tests__/mini-wheel-card.test.tsx && npx tsc --noEmit` | ❌ W0 → created in-task | ⬜ pending |
| 04-04-01 | 04 | 3 | WHEEL-04 | T-04-08 | Rows render emitted envelope fields only (no client recomputation) | component | `npx vitest run src/__tests__/evidence-lists.test.tsx` | ❌ W0 → created in-task | ⬜ pending |
| 04-04-02 | 04 | 3 | WHEEL-04, EVID-01 | T-04-09 | Loop-free selection; judgment/uncertainty sectional; verbatim reasons | component + unit | `npx vitest run src/__tests__/explore-surface.test.tsx` | ❌ W0 → created in-task | ⬜ pending |
| 04-05-01 | 05 | 4 | WHEEL-03 | T-04-10 | No React state per gesture frame; clamps; origin correctness | component (facade) | `npx vitest run src/__tests__/wheel-selection.test.tsx && npm test` | ✅ | ⬜ pending |
| 04-05-02 | 05 | 4 | WHEEL-03 | — | Tier monotonicity; denser packing at zoom; tier-not-scale in React state | unit + component | `npx vitest run src/__tests__/wheel-zoom.test.tsx src/lib/chart-wheel/collision.test.ts` | ❌ W0 → created in-task | ⬜ pending |
| 04-06-01 | 06 | 5 | EVID-02 | T-04-13 | Glossary = static deck content (never interpretation) | component + unit | `npx vitest run src/__tests__/explore-mode.test.tsx` | ❌ W0 → created in-task | ⬜ pending |
| 04-06-02 | 06 | 5 | EVID-02 | T-04-12 | Same-data-path (both modes from one envelope); persistence round-trip | component | `npx vitest run src/__tests__/explore-mode.test.tsx && npm test` | ✅ (from 04-06-01) | ⬜ pending |
| 04-07-01 | 07 | 6 | WHEEL-05, A11Y-01 | T-04-14/15 | Overlay ↔ list ↔ panel string parity; canvas a11y-hidden | component (parity) | `npx vitest run src/__tests__/wheel-a11y-parity.test.tsx` | ❌ W0 → created in-task | ⬜ pending |
| 04-07-02 | 07 | 6 | A11Y-02, A11Y-03, EVID-02 | T-04-16 | D-04 delivery: web /chart/result mounts evidence experience (zero canvas, row-press selection, mode flip); explore web keeps capability card; never-color-alone; font scaling preserved | component (Platform mock) | `npx vitest run src/__tests__/explore-web.test.tsx src/__tests__/wheel-a11y-parity.test.tsx` | ❌ W0 → created in-task | ⬜ pending |
| 04-07-03 | 07 | 6 | WHEEL-01..05, A11Y-01..03 | T-04-SC (carried) | On-device: glyphs (A1), gestures, screen reader, web card | manual checkpoint | see 04-07-PLAN Task 3 steps | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All Wave-0 gaps from 04-RESEARCH are assigned to plan tasks (nothing unassigned):

- [x] `scripts/vitest/skia-facade/index.ts` + vitest alias → 04-01 Task 2
- [x] `src/lib/chart-wheel/` pure module + golden fixtures (Timed `src/test/fixtures/frozen-natal-envelope.json` existing + new Unknown fixture) → 04-01 Task 3
- [x] Route + `GestureHandlerRootView` wiring → 04-01 Task 2 (root view) + 04-03 Task 3 (route)
- [x] On-device glyph spike (A1) → 04-07 Task 3 blocking checkpoint (fallback path pre-built in glyphs.ts)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Android/iOS glyph rendering (no tofu for ☊☋⚷⚸) | WHEEL-01 | Real system-font coverage untestable in CI; A1 assumption | 04-07-PLAN Task 3 step 2 |
| Pinch/pan/tap gesture feel inside the scrolling page | WHEEL-03 | Touch feel + ScrollView interaction need a real device | 04-07-PLAN Task 3 step 3 |
| VoiceOver/TalkBack overlay navigation + live-region announcements | A11Y-01, WHEEL-05 | Simulators cannot run screen readers | 04-07-PLAN Task 3 step 6 |
| Web evidence experience + capability card | A11Y-03, EVID-02 | Browser check beyond the Platform-mock test | 04-07-PLAN Task 3 step 7 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are declared manual checkpoints (2: legitimacy gate, on-device gate)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (all test files created in-task per Nyquist scaffold rule)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
