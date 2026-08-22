# Pitfalls Research

**Project:** LemAstra
**Researched:** 2026-08-22  
**Scope:** Greenfield React Native natal/transit workspace grounded in `astrology-skill`

## Critical Risks

### 1. Treating Swiss Ephemeris licensing as an implementation detail

The current calculator in `astrology-skill/tools/birth_to_chart.py` uses `pyswisseph`. Astrodienst explicitly requires developers using Swiss Ephemeris to choose AGPL or its professional license before distributing software or activating a public service; its professional app license also treats an app that calls a server-side Swiss Ephemeris calculator as an app containing Swiss Ephemeris. A separate process is a helpful engineering boundary, but it is not by itself a reliable commercial-license escape hatch.

**Avoidance:** Make licensing a Phase 1 product decision. Either accept an AGPL-compatible product, obtain the appropriate professional license, or select and validate a calculation engine with compatible terms. Obtain legal review before public distribution; do not infer the product's obligations solely from the repository's internal containment rationale.

**Source:** [Astrodienst Swiss Ephemeris licensing](https://www.astro.com/swisseph/swephinfo_e.htm), [professional license contract](https://www.astro.com/swisseph/secont_e.pdf)

### 2. Conflating astronomical calculation with interpretation

`astrology-skill` has a deliberate no-calculation boundary: the calculator produces chart JSON; the entry gate validates and routes it; the skill retrieves references, weights factors, synthesizes, and self-checks. Letting the LLM derive placements, aspects, house positions, or transit geometry destroys repeatability and makes errors hard to diagnose.

**Avoidance:** Preserve separate, versioned contracts for raw birth/moment input, computed chart facts, reading plans, conversations, and reports. The model may select and explain computed factors, never invent missing geometry. Refuse or visibly degrade readings when required data is absent.

### 3. Underestimating civil-time ambiguity

Birth charts depend on the historical offset at a place and instant, not merely today's timezone or a numeric offset. Ambiguous/nonexistent local times around DST transitions, historical timezone changes, uncertain birth times, coordinate errors, and high-latitude house-system behavior can materially change angles and houses.

**Avoidance:** Store the original local date/time, IANA timezone, coordinates, resolved UTC instant, timezone-data version, calculator version, ephemeris mode, house system, zodiac mode, and birth-time confidence. Detect DST folds/gaps and require an explicit choice. Never silently default an unknown birth time to noon. Build golden fixtures against independent chart sources, including DST boundaries and polar latitudes.

### 4. Hiding provenance behind fluent prose

A polished LLM answer can sound more certain than its evidence. Retrieval does not guarantee correctness, and model behavior changes between snapshots. Users need to distinguish calculated fact, retrieved doctrine, synthesis, uncertainty, and conversational speculation.

**Avoidance:** Materialize the existing reading-plan and report schemas. Attach factor IDs and reference-module IDs to generated sections; expose a “why this?” evidence view; preserve uncertainty and self-check results. Use pinned model snapshots where available, schema-constrained intermediate output, and an evaluation corpus drawn from `astrology-skill` forward tests. Official OpenAI guidance notes that model prompting behavior varies and recommends pinned versions plus evals.

**Source:** [OpenAI API backward compatibility](https://platform.openai.com/docs/api-reference/backward-compatibility), [Structured Outputs API reference](https://platform.openai.com/docs/api-reference/responses-streaming/response/refusal/delta)

### 5. Sending intimate data to third parties by default

Exact birth date, time, and coordinates can be identifying. Free-form questions and reports may contain relationships, sexuality, health, finances, trauma, or beliefs. Sending these to model, analytics, crash-reporting, geocoding, or observability vendors creates a much larger privacy surface than a typical chart calculator.

**Avoidance:** Use local-first storage and minimize off-device payloads. Separate display names from chart facts; support pseudonyms; redact logs; do not place chart content in analytics. Show exactly what will be sent before AI analysis, define retention/deletion behavior, audit every SDK, and make future aggregate/social use opt-in and purpose-specific. Apple requires disclosure of app and third-party collection; Google requires disclosure even for pseudonymous and many ephemeral off-device flows.

**Source:** [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/), [Google Play Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469)

### 6. Storing whole charts or reports in token storage

Secure key-value stores are for secrets and small credentials, not chart databases. Expo warns that large SecureStore payloads can fail on underlying platforms.

**Avoidance:** Store encryption keys and auth tokens in SecureStore; store charts, messages, evidence, and reports in a versioned SQLite schema (with encryption selected deliberately). Design migrations and export/deletion from the first persisted schema.

**Source:** [Expo SecureStore](https://docs.expo.dev/versions/v55.0.0/sdk/securestore/), [Expo SQLite](https://docs.expo.dev/versions/v55.0.0/sdk/sqlite/)

## Product and UX Failure Modes

### 7. Building the wheel as decoration

If the wheel is only a static image, it cannot support the chart-first promise or future temporal animation. If it is built too early without a stable coordinate/layout model, aspect hit-testing, label collisions, accessibility, and report rendering will force a rewrite.

**Avoidance:** Define a renderer-independent chart scene model first. Give every body, cusp, aspect, and ring a stable semantic ID; separate geometry/layout from drawing; support zoom/selection and a synchronized accessible list. Test dense charts, small screens, font scaling, screen readers, dark mode, and deterministic SVG/PDF export.

### 8. Progressive disclosure becoming two inconsistent products

Beginner summaries and technical views can contradict each other if generated separately. Conversely, exposing every dignity, orb, and timing factor at once overwhelms newcomers.

**Avoidance:** Generate both views from one evidence graph and reading plan. Use layers—summary, key factors, full evidence/method—not separate interpretations. Preserve terminology and factor priority across layers.

### 9. Chat history becoming the source of truth

Long conversations accumulate corrections, stale chart versions, and user assertions. Replaying raw chat as model context can cause the current reading to use an old transit moment or treat user text as computed evidence; it also increases cost and prompt-injection exposure.

**Avoidance:** Anchor every turn to immutable chart and analysis-version IDs. Rebuild model context from trusted structured state plus a bounded conversation summary. Treat retrieved files and user content as untrusted data, not instructions; retrieval alone does not eliminate prompt injection.

**Source:** [OWASP LLM Top 10: Prompt Injection](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf)

### 10. Presenting astrology as deterministic medical, legal, financial, or safety advice

Timing readings can invite consequential decisions, and personalized fluent language raises perceived authority. A generic disclaimer at onboarding will not address risky prompts during use.

**Avoidance:** Encode scope guardrails in the reading plan and per-turn policy. Use uncertainty language, avoid inevitability and diagnosis, redirect high-stakes requests toward qualified help, and test adversarial prompts. Make interpretive tradition and assumptions visible.

## Architecture Traps

### 11. Shipping the Python CLI directly inside mobile apps without an explicit feasibility spike

The skill content is portable Markdown/JSON, but the optional calculator is Python and `pyswisseph` includes native code. Embedding that stack into iOS/Android complicates builds, updates, licensing, sandbox behavior, and Expo compatibility.

**Avoidance:** Spike the boundary before committing architecture. Likely choices are a licensed server-side calculation service, a separately validated mobile-native/WASM engine, or a custom native module. Keep the canonical chart schema independent so calculation engines can be swapped and compared.

### 12. Copying `astrology-skill` into the app without version governance

Bundled references, schemas, prompt fragments, code, and report formats can drift independently. A report may become irreproducible if it records only prose and not the skill/calculator/model versions.

**Avoidance:** Package the skill as a versioned, integrity-addressed content artifact. Run its validation suite in LemAstra CI, pin a version, record content hash and schema version on each analysis/report, and define an upgrade/migration process. Do not mutate published interpretations silently.

### 13. Designing future social aggregation into the v1 data model as accidental consent

An internal `public` flag is not enough for birth data and personal-event histories. Aggregates can remain re-identifiable, and interpretations may reveal sensitive attributes even when names are removed.

**Avoidance:** Keep v1 private by default and model consent, purpose, visibility, revocation, and provenance as future requirements. Treat aggregate research as a separate governed subsystem with minimum cohort sizes and disclosure-risk review, not a query over production personal records.

## Testing Gaps to Prevent

- Calculation golden tests must cover planets, angles, houses, aspects, applying/separating status, timezone transitions, unknown time, and transit-to-natal comparisons.
- Schema-contract tests must run across calculator → router → reading plan → report, including forward/backward compatibility.
- Retrieval evals must verify cited modules exist, factors are supported by chart data, primary/secondary weighting follows doctrine, and missing resources are named.
- Generation evals must assess evidence fidelity, uncertainty, contradictions, harmful certainty, beginner clarity, and technical-view consistency—not only prose quality.
- Wheel visual-regression and accessibility tests must include dense aspect sets and deterministic export.
- Privacy tests must verify deletion, export, log redaction, vendor payload minimization, and no chart content in analytics.

## Phase Implications

1. Resolve calculation licensing, canonical contracts, provenance, privacy posture, and platform feasibility before feature-heavy UI work.
2. Validate the natal calculation pipeline with golden fixtures before building transit analysis or AI interpretation.
3. Build the semantic chart scene model before polishing the wheel.
4. Integrate retrieval planning and evidence displays before conversational generation.
5. Add reports only after chart, evidence, and interpretation artifacts are versioned and reproducible.
6. Keep calendar animation and social aggregation outside v1, but preserve stable moment IDs and versioned chart artifacts so they remain possible.
