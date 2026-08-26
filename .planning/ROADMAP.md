# Roadmap: LemAstra

## Overview

LemAstra advances through ten vertical slices: establish a lawful and private release boundary, produce trustworthy natal facts, preserve them locally, make them explorable, add transits, compile repeatable astrological evidence, generate grounded readings, sustain chart-scoped conversation, preserve the work as reports, and finally qualify the complete workflow on iOS and Android. Each phase leaves a coherent user capability while immutable artifacts and provenance carry trust forward.

## Phases

- [x] **Phase 1: Trust and Release Boundary** - Users can understand the supported product, providers, and privacy posture before sensitive data leaves their device. (completed 2026-08-23)
- [ ] **Phase 2: Trustworthy Natal Chart** - Users can resolve birth details and calculate a validated, provenance-rich natal chart.
- [ ] **Phase 3: Private Local Workspace** - Users can save, revise, reopen, export, and delete charts without an account.
- [ ] **Phase 4: Semantic Chart Exploration** - Users can explore the natal wheel and the same evidence through accessible beginner and technical views.
- [ ] **Phase 5: Natal Transit Workspace** - Users can calculate, inspect, save, and reopen a transit comparison tied to an exact natal revision.
- [ ] **Phase 6: Repeatable Reading Method** - Users can select a focus and inspect a reproducible `astrology-skill` reading plan before generation.
- [ ] **Phase 7: Grounded AI Reading** - Users can securely stream evidence-grounded readings through managed or BYO connections.
- [ ] **Phase 8: Chart-Scoped Conversation** - Users can continue, branch, and reopen conversations without losing their immutable evidence context.
- [ ] **Phase 9: Reproducible Reports** - Users can compose, export, save, and share polished reports that retain their full lineage.
- [ ] **Phase 10: Mobile Release Qualification** - Users can complete the accessible natal-to-report workflow on supported iOS and Android devices.

## Phase Details

### Phase 1: Trust and Release Boundary

**Goal:** Users can understand the supported product, providers, and privacy posture before sensitive data leaves their device.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** GATE-01, GATE-05, GATE-06, PRIV-07
**Success Criteria** (what must be TRUE):

  1. User can review accurate provider, retention, and transmission disclosures before enabling any remote feature.
  2. The supported release presents an approved Swiss Ephemeris licensing and distribution posture.
  3. The published iOS/Android privacy disclosures match the approved data and provider inventory.
  4. A security inspection confirms no calculation, model, database, or third-party service secret is present in either mobile client.

**Plans:** 7/7 plans complete

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Expo SDK 57 walking skeleton scaffold + test infrastructure (package legitimacy checkpoint)
- [x] 01-03-PLAN.md — Swiss Ephemeris licensing posture + license-path decision checkpoint (GATE-01)
- [x] 01-04-PLAN.md — Data/provider inventory, retention/deletion policy, privacy-policy content (GATE-05)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Provider registry (zod-validated) + Privacy & Data disclosure screen (PRIV-07 vertical slice)
- [x] 01-05-PLAN.md — Secret-isolation policy + gitleaks config + local scans incl. exported bundle (GATE-06)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-06-PLAN.md — Apple label worksheet + Play Data-safety CSV + governance/consistency tests (GATE-05/01)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-07-PLAN.md — CI gates (test/history/bundle scans) + phase approval records (GATE-01/05/06)

**UI hint:** yes

### Phase 2: Trustworthy Natal Chart

**Goal:** Users can resolve birth details and calculate a validated, provenance-rich natal chart.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** BIRTH-01, BIRTH-02, BIRTH-03, BIRTH-04, BIRTH-05, CALC-01, CALC-02, CALC-03, CALC-04, GATE-02
**Success Criteria** (what must be TRUE):

  1. User can enter birth data, confirm coordinates and historical timezone, and explicitly resolve ambiguous or nonexistent civil times.
  2. User can record birth-time confidence, and an unknown time produces only supported factors without an invented time.
  3. User receives a validated natal chart with visible assumptions and complete calculation/input version provenance.
  4. User receives specific recovery guidance when resolution, calculation, or schema validation fails.
  5. Supported natal math, civil-time ambiguity, unknown times, and representative high-latitude cases pass published reference fixtures. *(Per D-14, Phase 2's GATE-02 scope is natal-only — the transit fixture half completes in Phase 5; phase-end verification should not expect transit fixtures here.)*

**Plans:** 8/9 plans executed

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — API foundation: uv bootstrap, vendored skill submodule, calculator subprocess wrapper, civil-time classification (CALC-03/04, BIRTH-03)
- [x] 02-02-PLAN.md — Client deps (legitimacy checkpoint) + zod API contracts, fetch client, query provider, disclosure hook (BIRTH-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-03-PLAN.md — Calculate endpoint: provenance envelope, unknown-time contract, CALC-04 error taxonomy (CALC-02/03/04, BIRTH-05)
- [x] 02-05-PLAN.md — Client shared UI: accent/error tokens, option-card, error-banner, confidence + assumptions controls (BIRTH-04, CALC-02/04)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-04-PLAN.md — Places endpoints: geocoding search, historical timezone resolution + drift, zones list (BIRTH-02/03, CALC-04)
- [x] 02-06-PLAN.md — Birth form route: RHF+zod form, place type-ahead + manual fallback, home CTA (BIRTH-01/04)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-07-PLAN.md — GATE-02 golden fixture suite (9 cases through the API) + CI api job (GATE-02, CALC-01)
- [x] 02-08-PLAN.md — Confirm screen: resolved-offset card, tricky-time picker, one-time disclosure, registry activation flip (BIRTH-02/03)

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 02-09-PLAN.md — Result screen: placement list, assumptions card, expandable provenance, unavailable factors (CALC-02/03, BIRTH-05)

> **Wave-shape note (intentional deviation):** Waves 1–2 are foundation-heavy by design, not a slicing gap: the D-03 two-step contract requires the API chain (02-01 → 02-03 → 02-04) and the shared client vocabulary (02-02/02-05) to exist before screens consume them. The first walkable screen lands in Wave 3 (02-06); from there the user-visible slice runs unbroken through 02-08/02-09 (entry → confirm → calculate → result).

**UI hint:** yes

### Phase 3: Private Local Workspace

**Goal:** Users can preserve and control their astrology work locally without creating an account.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** WORK-01, WORK-02, WORK-03, WORK-04, WORK-05, WORK-06, WORK-07, PRIV-01, PRIV-03, PRIV-04, PRIV-05, PRIV-06
**Success Criteria** (what must be TRUE):

  1. User can calculate, label, save, browse, and reopen charts after an app restart without creating an account.
  2. User can revise birth details as a new immutable chart revision while prior analyses retain their original basis.
  3. User can rename or confirm deletion of a chart and its dependent local artifacts.
  4. User can export one chart's structured data and provenance or export/delete all locally stored personal data.
  5. Charts and later personal artifacts are local and private by default, while analytics, logs, and crash telemetry exclude or redact sensitive content and credentials.

**Plans:** TBD
**UI hint:** yes

### Phase 4: Semantic Chart Exploration

**Goal:** Users can explore the natal wheel and the same evidence through accessible beginner and technical views.
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** WHEEL-01, WHEEL-02, WHEEL-03, WHEEL-04, WHEEL-05, EVID-01, EVID-02, A11Y-01, A11Y-02, A11Y-03
**Success Criteria** (what must be TRUE):

  1. User can view a deterministic natal wheel and select planets, signs, houses, angles, and aspects to see exact facts.
  2. User can inspect dense or overlapping factors through zoom/selection and synchronized structured lists.
  3. User can switch between approachable summaries and technical detail derived from the same evidence.
  4. User can tell calculated fact, methodological judgment, generated interpretation, and uncertainty apart wherever they appear.
  5. User can navigate the core chart view with a screen reader and text scaling, without relying on color or interpreting the graphical wheel.

**Plans:** TBD
**UI hint:** yes

### Phase 5: Natal Transit Workspace

**Goal:** Users can calculate, inspect, save, and reopen a transit comparison tied to an exact natal revision.
**Mode:** mvp
**Depends on:** Phase 4
**Requirements:** TRAN-01, TRAN-02, TRAN-03, TRAN-04, TRAN-05, TRAN-06
**Success Criteria** (what must be TRUE):

  1. User can choose an exact transit date, time, and timezone and calculate an immutable, provenance-rich transit artifact.
  2. User can compare the transit moment with a selected natal revision in a synchronized bi-wheel.
  3. User can inspect transit-to-natal aspects, orbs, applying/separating state, exactness, and their natal context before interpretation.
  4. User can save and reopen a transit snapshot anchored to the exact natal and transit revisions.

**Plans:** TBD
**UI hint:** yes

### Phase 6: Repeatable Reading Method

**Goal:** Users can select a focus and inspect a reproducible `astrology-skill` reading plan before generation.
**Mode:** mvp
**Depends on:** Phase 5
**Requirements:** METH-01, METH-02, METH-03, METH-04, METH-05, METH-06, METH-07
**Success Criteria** (what must be TRUE):

  1. User can choose a question or focus and explicitly select visible natal or transit evidence for interpretation.
  2. User can inspect a repeatable reading plan from a pinned, integrity-addressed `astrology-skill` bundle, including factors, references, weights, omissions, and warnings.
  3. User can trace each planned interpretation to its chart factors and skill reference modules.
  4. User sees proportionate uncertainty for time confidence, missing evidence, conflicting testimony, or unavailable references.
  5. User can choose only supported tradition and tone controls, while all chart geometry remains deterministically calculated outside the model.

**Plans:** TBD
**UI hint:** yes

### Phase 7: Grounded AI Reading

**Goal:** Users can securely stream evidence-grounded readings through managed or BYO connections.
**Mode:** mvp
**Depends on:** Phase 6
**Requirements:** LLM-01, LLM-02, LLM-03, LLM-04, LLM-05, SAFE-01, SAFE-02, SAFE-03, PRIV-02, GATE-04
**Success Criteria** (what must be TRUE):

  1. User can choose LemAstra's managed connection or configure an OpenAI-compatible endpoint whose credential stays in platform secure storage.
  2. User can inspect and approve the bounded chart, plan, evidence, question, and conversation payload before it leaves the device.
  3. User can stream a schema-validated natal or transit reading that cites supplied evidence and records connection, model, methodology, warning, and self-check provenance.
  4. Generated readings resist instructions embedded in retrieved/user text, avoid deterministic or high-stakes guidance, and preserve uncertainty.
  5. Evaluation suites meet defined thresholds for evidence fidelity, methodology, uncertainty, safety, and beginner/technical consistency.

**Plans:** TBD
**UI hint:** yes

### Phase 8: Chart-Scoped Conversation

**Goal:** Users can continue, branch, and reopen conversations without losing their immutable evidence context.
**Mode:** mvp
**Depends on:** Phase 7
**Requirements:** CHAT-01, CHAT-02, CHAT-03, CHAT-04
**Success Criteria** (what must be TRUE):

  1. User can ask follow-up questions anchored to the exact chart, transit, plan, evidence, skill, and model identifiers of the reading.
  2. User can branch a conversation without changing the context or history of the earlier analysis.
  3. User can reopen locally saved conversations after restarting the app.
  4. User receives an explicit explanation when a response is refused, interrupted, invalid, or cannot be grounded in selected evidence.

**Plans:** TBD
**UI hint:** yes

### Phase 9: Reproducible Reports

**Goal:** Users can compose, export, save, and share polished reports that retain their full lineage.
**Mode:** mvp
**Depends on:** Phase 8
**Requirements:** REPT-01, REPT-02, REPT-03, REPT-04, REPT-05, REPT-06
**Success Criteria** (what must be TRUE):

  1. User can create a report from a selected chart analysis and chosen conversation content, then edit its title and included sections without mutating evidence.
  2. Report preview includes the relevant chart visual, synthesis, methodology, evidence references, uncertainty, and provenance.
  3. User can export a polished, readable PDF and save or share it through platform-native controls.
  4. Every report identifies the exact chart, evidence, skill, method, and model versions used through stable references or embedded copies.

**Plans:** TBD
**UI hint:** yes

### Phase 10: Mobile Release Qualification

**Goal:** Users can complete the accessible natal-to-report workflow on supported iOS and Android devices.
**Mode:** mvp
**Depends on:** Phase 9
**Requirements:** PLAT-01, PLAT-02, GATE-03
**Success Criteria** (what must be TRUE):

  1. User can complete birth entry, natal inspection, transit analysis, grounded reading, conversation, and report export on supported iOS devices.
  2. User can complete the same core workflow on supported Android devices.
  3. Raw input through chart, reading-plan, interpretation, and report artifacts passes cross-contract tests on the release candidates.
  4. The complete workflow preserves immutable provenance, private-by-default storage, accessible evidence alternatives, and recoverable errors across both platforms.

**Plans:** TBD
**UI hint:** yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Trust and Release Boundary | 7/7 | Complete    | 2026-08-23 |
| 2. Trustworthy Natal Chart | 8/9 | In Progress|  |
| 3. Private Local Workspace | 0/TBD | Not started | - |
| 4. Semantic Chart Exploration | 0/TBD | Not started | - |
| 5. Natal Transit Workspace | 0/TBD | Not started | - |
| 6. Repeatable Reading Method | 0/TBD | Not started | - |
| 7. Grounded AI Reading | 0/TBD | Not started | - |
| 8. Chart-Scoped Conversation | 0/TBD | Not started | - |
| 9. Reproducible Reports | 0/TBD | Not started | - |
| 10. Mobile Release Qualification | 0/TBD | Not started | - |

---
*Roadmap created: 2026-08-22*
