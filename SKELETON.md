# Walking Skeleton — LemAstra

**Phase:** 1
**Generated:** 2026-08-23

## Capability Proven End-to-End

A user opens the LemAstra app and lands on the Privacy & Data disclosure surface — every planned provider listed with its data categories, transmission trigger, and retention, rendered from a versioned, schema-validated registry, before any remote feature exists.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Expo SDK 57 (RN 0.86, React 19.2.3, New Architecture only) + Expo Router | Project constraint (PROJECT.md/STACK.md); Expo Router is the first-party router; no legacy-bridge escape hatch |
| Client language | TypeScript, strict mode | Chart/report schemas cannot tolerate silent field drift; types generated/validated at boundaries |
| Data layer (Phase 1) | Versioned bundled JSON registry (`src/data/provider-registry.json`) validated by zod | Disclosure content is the first real data the app consumes; single source feeds UI, store drafts, and tests |
| Local database | Deferred to Phase 3 (expo-sqlite + Drizzle per STACK.md) | Skeleton keeps the thinnest stack; nothing persists yet by design (local-first arrives with saved charts) |
| Auth | None in v1 core — account-less local-first; Supabase publishable-key integration is post-v1 | WORK-01: first value without an account; privacy posture: nothing leaves the device in Phase 1 |
| Backend | Deferred to Phase 2 (FastAPI + Python 3.12 container, pyswisseph subprocess, SE Professional/AGPL path recorded in `docs/governance/swiss-ephemeris-posture.md`) | Licensing gate recorded before the SE-containing artifact exists |
| Testing | Vitest + React Native Testing Library (+ zod schema/structural tests) | STACK.md testing stack; exit-code gate semantics ported from astrology-skill's quick_validate pattern |
| Secrets posture | gitleaks (history + working tree + exported bundle) with classification policy; CI gate | GATE-06: enforcement at build time, not review time |
| Deployment target | Local dev via `npx expo start` (documented in README); CI on GitHub Actions; store/console publication deferred to Phase 10 | Walking skeleton needs a documented full-stack run, not production hosting |
| Directory layout | Expo app at repo root (`app/` routes, `src/` data/schemas/tests, `docs/governance/` approval artifacts, `.github/workflows/` CI) | Registry + governance live beside the client so disclosures cannot drift from the app that renders them |

## Stack Touched in Phase 1

- [x] Project scaffold (Expo SDK 57 via create-expo-app default template, TypeScript strict, build, test runner) — plan 01-01
- [ ] Routing — /privacy disclosure screen as the app's landing route — plan 01-02 (Expo Router present from the default template; the /privacy landing route itself lands in 01-02)
- [ ] Data — registry JSON read + schema-validated at build/test time (database read/write deferred to Phase 3 by design) — plan 01-02
- [ ] UI — disclosure screen rendering registry data with accessibility roles/labels — plan 01-02
- [ ] Enforcement — CI (tests + secret scans) and documented local full run (`npx expo start`) — plans 01-01, 01-07

## Out of Scope (Deferred to Later Slices)

- Accounts, sync, cloud persistence (v2: SYNC-*)
- Web parity beyond what Expo web export gives for free (v2: WEB-01)
- Raw provider keys in-app (v2: KEY-01); BYO endpoint credentials (Phase 7, platform secure storage)
- Chart wheel, natal calculation, transits, readings, conversation, reports (Phases 2-9)
- Server-side PDF pipeline, analytics/telemetry, temporal/social features
- Store console publication of disclosure drafts (Phase 10); qualified legal review of licensing posture (scheduled before public/commercial beta per GATE-01)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Trustworthy Natal Chart — birth data → resolved place/timezone → validated, provenance-rich chart via the FastAPI calculation service (SE posture obligations activate; registry rows flip to active with disclosure updates as done-criteria)
- Phase 3: Private Local Workspace — save/browse/revise/export/delete charts locally (expo-sqlite + Drizzle; local DB layer lands here)
- Phase 4: Semantic Chart Exploration — wheel + beginner/technical evidence views
- Phase 5: Natal Transit Workspace — immutable transit artifacts
- Phase 6: Repeatable Reading Method — astrology-skill reading plans
- Phase 7: Grounded AI Reading — managed/BYO model connections (LLM-03 user-secret class activates)
- Phase 8: Chart-Scoped Conversation — branching, reopening conversations
- Phase 9: Reproducible Reports — compose/export/share PDFs with lineage
- Phase 10: Mobile Release Qualification — publish store disclosures (drafts from `docs/governance/disclosures/`), qualify iOS/Android workflow
