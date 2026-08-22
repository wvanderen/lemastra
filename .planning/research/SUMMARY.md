# Project Research Summary

**Project:** LeMastra
**Domain:** Cross-platform personal astrology workspace with evidence-grounded AI interpretation
**Researched:** 2026-08-22
**Confidence:** MEDIUM-HIGH

## Executive Summary

LeMastra should be built as a private, chart-first astrology workspace, not as a generic astrology chatbot. The trustworthy product loop is: confirm birth place/time and uncertainty, calculate an immutable natal chart, inspect the wheel and structured evidence, calculate transits for a chosen moment, compile a repeatable `astrology-skill` reading plan, generate an evidence-grounded interpretation, and freeze the result into a reproducible report. Experts separate astronomical calculation, methodological weighting, and generated prose; LeMastra should expose that separation in both its architecture and UI.

The recommended implementation is an Expo SDK 57 / React Native 0.86 TypeScript client with a pure chart scene model rendered through React Native Skia, local SQLite persistence, and a small FastAPI/Python backend. The backend invokes the pinned `astrology-skill` calculator in an isolated process, validates every domain envelope, deterministically selects references and weights factors, then uses a server-side LLM adapter for schema-constrained chat and reports. Start local-first and mobile-first. Add Supabase Auth/Postgres/Storage when account sync is required rather than making cloud identity a prerequisite for first value.

The largest risks are not ordinary UI risks: Swiss Ephemeris licensing must be settled before a hosted or distributed commercial beta; historical civil-time ambiguity must never be silently guessed; birth data and reading conversations require data-minimizing privacy defaults; and fluent prose must not obscure provenance or uncertainty. These are Phase 1 gates. Calendar animation, event journaling, publishing, social features, aggregate research, advanced techniques, and professional CRM are compelling later directions, but must not expand v1 or smuggle public/analytics consent into private records.

## Key Findings

### Recommended Stack

Use the stable Expo line and let `expo install` resolve compatible native packages. Keep the client and domain service in a monorepo with generated contracts between them. Exact pins belong in scaffold lockfiles; current recommendations are directional until implementation verifies compatibility.

**Core technologies:**

- **Expo SDK 57 / React Native 0.86 / React 19.2 / strict TypeScript:** shared iOS, Android, and eventual web client on the New Architecture.
- **Expo Router:** universal navigation and deep links using Expo's supported routing boundary.
- **React Native Skia + Reanimated 4 + Gesture Handler:** interactive wheel, selection, snapshots, and a viable future animation path.
- **Pure TypeScript scene model:** deterministic rings, glyph anchors, labels, aspects, and hit regions shared conceptually by interactive and report renderers.
- **Expo SQLite, optionally Drizzle:** local-first charts, immutable artefact cache, drafts, migrations, and outbox; SecureStore holds only tokens and encryption keys.
- **TanStack Query + small Zustand store:** server state and ephemeral UI state without duplicating canonical entities.
- **Python 3.12 + FastAPI + Pydantic + `uv`:** authenticated orchestration API aligned with the existing Python skill tooling.
- **Pinned `pyswisseph`, `tzdata`, and `jsonschema`:** deterministic calculation, timezone behavior, and mandatory schema gates.
- **Official OpenAI SDK / Responses API behind a thin internal adapter:** streaming synthesis and structured outputs; keep keys server-side and pin/evaluate model changes.
- **Supabase Postgres/Auth/Storage with default-deny RLS:** recommended for account sync and private report storage when that capability ships, not necessarily for the first local workspace slice.
- **Container hosting:** required for the Python/native calculation subprocess; do not force this workload into edge-only functions.
- **Expo Print/Sharing plus canonical HTML/report JSON:** pragmatic v1 export; move rendering server-side only if cross-platform parity proves inadequate.

The source reports conflict slightly on report rendering: the stack report prefers client HTML-to-PDF initially, while architecture prefers canonical server rendering. Resolve this by treating the validated report manifest and HTML template as canonical, shipping native/web local rendering first, and adding a server renderer only if visual-regression tests show unacceptable divergence.

### Expected Features

**Must have (v1 table stakes):**

- Birth entry with user-confirmed coordinates, IANA timezone, DST ambiguity handling, and explicit birth-time confidence.
- Accurate, fixture-validated natal calculation with calculator, ephemeris, timezone, schema, and input provenance.
- Private chart workspace: create, edit through new revisions, save, reopen, delete, and export.
- Interactive, accessible natal wheel plus exact placements, houses, aspects, orbs, legends, and list/table alternatives.
- Contextual factor inspection showing calculated facts before interpretive meaning.
- Precise transit moment picker, natal/transit bi-wheel, and methodically ranked active contacts.
- Explicit evidence selection and question focus before AI analysis.
- `astrology-skill`-grounded natal/transit interpretation with uncertainty and missing-data behavior.
- Chart-scoped follow-up conversation anchored to immutable analysis context rather than raw chat history.
- Validated, polished report export whose archival representation retains chart, method, evidence, model, and uncertainty provenance.
- Progressive disclosure, accessibility, recovery by failed stage, privacy controls, and fidelity on the declared v1 platforms.

**Should have (competitive differentiators):**

- Evidence-to-interpretation traceability via stable factor and reference IDs.
- Persisted, repeatable reading plans and question-aware factor ranking.
- A visible natal-promise-before-timing structure for transit readings.
- Confidence-aware claims and consistent beginner/technical layers derived from one evidence graph.
- Tradition and tone controls constrained to supported methodologies.
- Reopenable analysis snapshots and lightweight learning in context.
- Report-section-to-evidence highlighting if schedule permits; stable IDs must be present regardless.

**Defer (v2+):**

- Animated calendar/wheel and continuous temporal navigation.
- Personal event journal and historical observation timeline.
- Publishing, social profiles, public charts, and aggregate pattern analysis.
- Synastry, returns, profections, progressions, horary, electional, and mundane techniques.
- Practitioner CRM, broad customization, feeds/daily engagement loops, and mandatory account onboarding.

**Explicit anti-features:** LLM-calculated geometry, open-ended “ask the universe” chat without a chart context, placement dumps, deterministic event prediction, high-stakes directives, exposed chain-of-thought, or automatic public/analytics use of private data.

### Architecture Approach

Use a functional core with provider-facing imperative shells and immutable artefact lineage. Raw input, calculated facts, reading plans, evidence bundles, generated readings, conversations, and reports are separate versioned resources. A change to birth time, coordinates, timezone, house system, ephemeris, orb policy, skill bundle, or method creates a new revision; it never mutates the basis of an existing reading.

**Major components:**

1. **Expo app shell and personal workspace** — navigation, private local persistence, forms, deletion/export, and optional sync boundary.
2. **Place/time resolver** — confirmed place, coordinates, historical IANA timezone, folds/gaps, and provider provenance behind a replaceable port.
3. **Chart domain package** — generated types, runtime validation, stable semantic IDs, selectors, and no ephemeris math.
4. **Wheel scene model and renderer** — pure geometry followed by Skia drawing, gestures, hit testing, semantic overlays, and report projection.
5. **Calculation API and isolated Python worker** — validate requests, run the pinned calculator with timeouts, validate output, attach provenance, and cache immutable artefacts.
6. **Evidence compiler** — route through the versioned skill bundle, rank supplied facts, select exact reference modules, persist reading plans, and carry uncertainty.
7. **Interpretation orchestrator** — reconstruct trusted context, call the model server-side, validate structured output, stream results, and run eval/self-check gates.
8. **Report service** — freeze a manifest, validate the report envelope, render/share a PDF, and retain hashes and lineage.
9. **Account/sync service (when needed)** — authenticated ownership, RLS, object storage, conflict handling, and deletion/export propagation.

The invariant data flow is: `confirmed birth input → deterministic calculation → validated ChartArtefact → wheel/evidence → immutable transit artefact → persisted ReadingPlan/EvidenceBundle → structured LLM synthesis → validated ReadingArtefact/ReportManifest → PDF projection`.

### Critical Risks and Mitigations

1. **Swiss Ephemeris license mismatch** — choose AGPL-compatible distribution or obtain the professional license and qualified review before public/commercial distribution; keep calculator code, notices, provenance, and secrets isolated.
2. **Civil-time errors** — store wall time, IANA zone, UTC instant, coordinates, timezone-data version, and confidence; detect folds/gaps; never default unknown time to noon; test DST and polar fixtures.
3. **Calculation/interpretation conflation** — the model selects and explains supplied facts but never computes placements, houses, aspects, or transits; schema failures become typed user-visible errors.
4. **Provenance hidden by fluent prose** — distinguish calculated fact, methodological judgment, and synthesis visually; attach factor/reference IDs, versions, uncertainty, model snapshot, and self-check to every artefact.
5. **Sensitive data leakage** — local-first storage, pseudonyms, explicit AI payload disclosure, vendor audit, redacted telemetry, no chart prose in analytics, defined retention/deletion, and `store: false` where appropriate.
6. **Decorative or inaccessible wheel** — build semantic scene geometry first, synchronize every visual element with an accessible list, and test dense charts, small screens, font scaling, contrast, and deterministic export.
7. **Stale chat as truth** — anchor every turn to immutable chart/transit/evidence/method IDs and rebuild bounded context; treat user and retrieved text as untrusted data.
8. **Safety overreach** — prohibit deterministic prediction and medical/legal/financial directives in reading plans and per-turn policy; surface uncertainty and redirect consequential decisions.
9. **Skill drift** — package `astrology-skill` as a pinned, integrity-addressed dependency, run its validation suite in CI, and record its version/hash on every analysis and report.

## Licensing, Privacy, and Provenance Gates

These conditions block beta/release rather than becoming post-launch cleanup:

- **License gate:** document commercial/open-source posture, Swiss Ephemeris license choice, counsel/qualified review, required source/notices, and deployment implications.
- **Privacy gate:** approve a data inventory and retention/deletion/export policy for birth data, questions, reports, geocoding, model providers, telemetry, and backups; complete Apple/Google disclosures.
- **Provider gate:** choose a geocoding/timezone provider only after confirming historical timezone accuracy, storage/caching terms, attribution, cost, and offline implications.
- **Provenance gate:** every saved chart, reading, and report records immutable input revision, calculator/ephemeris/tzdata/schema/skill/method/model versions, evidence IDs, warnings, and content hashes.
- **Quality gate:** golden charts and cross-contract tests pass; retrieval/generation evals demonstrate evidence fidelity, uncertainty, safety, and beginner/technical consistency.
- **Security gate:** no service/model keys in clients; authenticated server derives ownership; RLS is default-deny before cloud writes; telemetry scrubs sensitive payloads.

## Implications for Roadmap

Fine-grained phases are appropriate because correctness gates and user-facing vertical slices have distinct failure modes.

### Phase 1: Product, Licensing, Privacy, and Platform Gates
**Rationale:** Architecture and release posture depend on decisions that cannot safely be deferred.
**Delivers:** v1 platform matrix, Swiss Ephemeris decision, privacy/data-flow policy, provider shortlist, threat boundaries, and acceptance fixtures plan.
**Addresses:** cross-platform definition and private-by-default behavior.
**Avoids:** illegal distribution, accidental vendor disclosure, web-parity scope creep, and implicit social consent.

### Phase 2: Canonical Contracts and Domain Test Harness
**Rationale:** Every feature depends on stable artefacts and trustworthy fixtures.
**Delivers:** vendored/versioned schemas, strict product envelopes, generated TS types, stable IDs, golden natal/transit fixtures, and cross-language contract CI.
**Addresses:** calculation trust, provenance, missing-data semantics.
**Avoids:** one mutable “chart JSON,” silent schema drift, and irreproducible reports.

### Phase 3: Calculation and Civil-Time Service
**Rationale:** The client cannot become chart-first until deterministic facts exist.
**Delivers:** FastAPI boundary, place/time confirmation, isolated pinned calculator, timeout/error taxonomy, provenance, idempotency, and fixture validation.
**Addresses:** birth entry, natal calculation, time confidence.
**Avoids:** client/LLM calculation, DST mistakes, license-boundary drift.

### Phase 4: Local-First Personal Workspace
**Rationale:** Users need durable private value before AI or accounts.
**Delivers:** Expo shell, SQLite migrations/repository, create/save/reopen/revise/delete/export flows, and recovery states.
**Addresses:** private chart workspace and optional first-chart-without-account experience.
**Avoids:** SecureStore misuse, premature cloud dependency, mutable-history bugs.

### Phase 5: Semantic Wheel and Evidence Inspection
**Rationale:** This is the chart-first interaction foundation and should be proven independently from generation.
**Delivers:** pure scene model, Skia natal wheel, selection/hit testing, exact evidence lists, progressive disclosure, accessibility parity, and snapshots/golden tests.
**Addresses:** wheel, structured details, contextual factor inspection, learning basics.
**Avoids:** decorative wheel, contradictory beginner/technical views, inaccessible canvas-only UI.

### Phase 6: Transit Vertical Slice
**Rationale:** Transit analysis adds immutable moment and two-chart semantics before interpretation can be grounded.
**Delivers:** target moment picker, transit calculation, bi-wheel, transit-to-natal contacts, ranking, phase/exactness, natal-promise presentation, and saved analysis context.
**Addresses:** all moment-based timing table stakes.
**Avoids:** treating transits as another static chart or mixing chart revisions.

### Phase 7: `astrology-skill` Evidence Compiler and Evaluations
**Rationale:** The differentiator is the repeatable method, not the chat surface.
**Delivers:** pinned skill bundle, deterministic routing/reference selection, persisted ReadingPlan/EvidenceBundle, question-aware ranking, uncertainty, safety policy, and retrieval/eval corpus.
**Addresses:** traceability, repeatability, tradition/tone, confidence-aware analysis.
**Avoids:** corpus dumping, vector-search opacity, placement dumps, unsupported evidence.

### Phase 8: Grounded Analysis and Chart-Scoped Conversation
**Rationale:** Generation is safe and useful only after evidence compilation is stable.
**Delivers:** server-side model adapter, structured outputs, streaming, context forks, citations/evidence drawer, self-checks, refusal/safety behavior, and cost/rate controls.
**Addresses:** natal/transit interpretation and follow-up chat.
**Avoids:** generic oracle chat, stale history, client keys, high-stakes certainty.

### Phase 9: Reproducible Reports and Export
**Rationale:** Reports freeze the complete provenance contract and expose cross-platform rendering gaps.
**Delivers:** canonical report manifest/envelope, validated HTML/PDF, wheel projection, print/share/download, checksums, deletion/export semantics, and visual fixtures.
**Addresses:** polished durable reports and report provenance.
**Avoids:** prose detached from evidence and reports that cannot be regenerated.

### Phase 10: Accounts, Sync, and Cross-Platform Hardening
**Rationale:** Add cloud continuity after the local data model and deletion semantics are proven.
**Delivers:** Supabase Auth/Postgres/Storage, default-deny RLS, outbox/conflict handling, private signed assets, platform/accessibility/performance hardening, and store disclosures.
**Addresses:** cross-device continuity and release readiness.
**Avoids:** authorization by client-supplied IDs, sensitive telemetry, and premature sync complexity.

### Phase Ordering Rationale

- Licensing, privacy, contracts, and fixtures precede feature work because they constrain every downstream implementation choice.
- Calculation precedes visualization; visualization/evidence precedes transits; transits and deterministic reading plans precede chat.
- Reports follow interpretation because they freeze complete lineage; accounts follow local persistence because sync needs stable revision and deletion semantics.
- Stable `Moment`, artefact, evidence, and report IDs preserve the future calendar/timeline path without building social infrastructure in v1.

### Research Flags

**Needs focused phase research:**

- **Phase 1:** Swiss Ephemeris legal posture, geocoding/timezone terms, model retention, and supported-platform choice.
- **Phase 3:** historical civil-time edge cases, calculator concurrency/process behavior, and hosting feasibility.
- **Phase 5:** Skia web/CanvasKit performance, dense-label algorithms, hit testing, accessibility overlays, and report-renderer equivalence.
- **Phase 7:** current `astrology-skill` packaging/API, methodology eval design, and content licensing/provenance.
- **Phase 8:** current model snapshot, Structured Outputs/streaming behavior, privacy controls, prompt-injection defenses, and quality/cost thresholds.
- **Phase 9:** cross-platform PDF fidelity and font/image licensing.
- **Phase 10:** exact Supabase offline-sync, RLS, deletion propagation, and app-store disclosure implementation.

**Mostly standard patterns; research can be narrow:**

- **Phase 2:** JSON Schema/OpenAPI code generation and contract-test patterns are mature; research only upstream schema quirks.
- **Phase 4:** Expo Router/SQLite forms and repository patterns are documented; focus on migration and encryption decisions.
- **Phase 6:** product/domain semantics are documented in the skill; focus research on UI validation rather than broad ecosystem discovery.

Future calendar, publishing, social, and aggregate-research phases require fresh dedicated research before entering a roadmap milestone.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Expo/FastAPI boundaries are supported by official docs and match the inspected skill; exact pins, web behavior, hosting, and PDF parity require spikes. |
| Features | HIGH for scope; MEDIUM for market UX | v1 follows the explicit product vision and skill contracts; competitor evidence comes mostly from official marketing pages rather than hands-on testing. |
| Architecture | HIGH | All reports converge on immutable artefacts, isolated calculation, deterministic evidence compilation, server-mediated generation, and local-first UI. |
| Pitfalls | HIGH | Critical risks are supported by project code/contracts and official licensing, platform privacy, security, and API guidance. |

**Overall confidence:** MEDIUM-HIGH. The architecture and sequencing are strong; launch readiness depends on unresolved legal, privacy, provider, and platform decisions.

### Gaps to Address

- **Swiss Ephemeris posture:** qualified licensing decision before public/commercial beta.
- **Supported v1 platforms:** mobile-first is recommended; decide whether web is launch-critical before committing CanvasKit/report parity work.
- **Geocoding/timezone vendor:** compare historical accuracy, caching rights, attribution, privacy, and cost; Google is a candidate, not a settled choice.
- **Account timing:** determine whether multi-device sync is v1-required; local-first first-chart use should remain possible where practical.
- **Model privacy and quality:** settle retention/ZDR needs, model snapshot, eval thresholds, rate limits, and cost envelope.
- **Report renderer:** prove native/web output; adopt server rendering only if required by quality or delivery needs.
- **Local encryption:** select and test SQLite encryption/backup behavior per platform.
- **Monetization:** decide what is paid only after the trusted core loop is validated.
- **Hands-on UX evidence:** test competitor wheels, reports, and beginner comprehension during product design; marketing pages are insufficient.

## Sources

### Primary (HIGH confidence)

- [PROJECT.md](../PROJECT.md) — product intent, v1 scope, audience, and privacy constraints.
- [astrology-skill README](../../../astrology-skill/README.md), [skill doctrine](../../../astrology-skill/SKILL.md), [birth-to-chart design](../../../astrology-skill/docs/birth_to_chart_design.md), and [end-to-end workflow](../../../astrology-skill/docs/end_to_end.md) — calculation/interpretation boundary and end-to-end methodology.
- [chart input schema](../../../astrology-skill/assets/schemas/chart_input_schema.json), [reading plan schema](../../../astrology-skill/assets/schemas/reading_plan_schema.json), and [report schema](../../../astrology-skill/assets/schemas/report_schema.json) — canonical domain and provenance contracts.
- [birth-to-chart calculator](../../../astrology-skill/tools/birth_to_chart.py), [entry commands](../../../astrology-skill/entry_commands.py), and [chart diagram renderer](../../../astrology-skill/tools/chart_diagram.py) — current calculation, routing, validation, and rendering interfaces.

### Official External (HIGH confidence)

- [Astrodienst Swiss Ephemeris licensing](https://www.astro.com/swisseph/swephinfo_e.htm) and [professional license contract](https://www.astro.com/swisseph/secont_e.pdf) — licensing gate.
- [Expo SDK reference](https://docs.expo.dev/versions/latest/), [Expo Router](https://docs.expo.dev/router/introduction/), and [Expo storage guidance](https://docs.expo.dev/develop/user-interface/store-data/) — client platform, routing, and persistence.
- [React Native New Architecture](https://reactnative.dev/architecture/landing-page) — native compatibility baseline.
- [React Native Skia installation](https://shopify.github.io/react-native-skia/docs/getting-started/installation/) and [Canvas](https://shopify.github.io/react-native-skia/docs/canvas/overview/) — renderer compatibility and accessibility implications.
- [OpenAI API compatibility](https://platform.openai.com/docs/api-reference/backward-compatibility) and [data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint) — model pinning/evals and retention review.
- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/) and [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469) — platform disclosure obligations.
- [OWASP LLM Prompt Injection guidance](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf) — untrusted-content and context defenses.
- [Google Geocoding policies](https://developers.google.com/maps/documentation/geocoding/policies) — provider-specific caching/attribution constraints.

### Secondary (MEDIUM confidence)

- [Astro Gold Android](https://www.astrogold.io/get-astro-gold/for-android/) and [iOS](https://www.astrogold.io/get-astro-gold/for-ios/) — established wheel, chart, transit, and report conventions.
- [CHANI](https://www.chani.com/app?view=home) and [CHANI transit windows](https://chaninicholas.zendesk.com/hc/en-us/articles/4409909027731-Transits) — approachable personalized astrology and timing-window conventions.
- [Astro.com chart settings](https://www.astro.com/faq/fq_fh_setup_n.htm?nho2=41) and [TimePassages App Store listing](https://apps.apple.com/us/app/timepassages-astrology/id488946918) — configuration and current feature signals.

---
*Research completed: 2026-08-22*
*Ready for requirements and roadmap: yes, subject to Phase 1 gates*
