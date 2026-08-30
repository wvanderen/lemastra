# Requirements: LemAstra

**Defined:** 2026-08-22
**Core Value:** Users can move from an accurately calculated chart and transparent astrological evidence to a high-quality, methodical AI interpretation they can inspect, discuss, and preserve as a report.

## v1 Requirements

### Birth Data and Natal Calculation

- [x] **BIRTH-01**: User can enter a birth date, local birth time, and birthplace to start a natal chart.
- [x] **BIRTH-02**: User can review and confirm the resolved latitude, longitude, and IANA timezone before calculation.
- [x] **BIRTH-03**: User is asked to resolve an ambiguous or nonexistent civil time rather than having the app silently choose one.
- [x] **BIRTH-04**: User can mark a birth time as timed, approximate, rectified, or unknown.
- [x] **BIRTH-05**: User with an unknown birth time can calculate only the factors supported by that uncertainty, without a silently invented noon time.
- [x] **CALC-01**: User can calculate a natal chart whose placements, angles, houses, aspects, and related supported factors pass the product's reference fixtures.
- [x] **CALC-02**: User can see the calculation assumptions used for a chart, including house system, zodiac mode, ephemeris mode, and relevant orb policy.
- [x] **CALC-03**: Every calculated chart records its input revision and calculator, ephemeris, timezone-data, and schema versions.
- [x] **CALC-04**: User receives a specific recoverable error when place/time resolution, calculation, or schema validation fails.

### Personal Workspace

- [x] **WORK-01**: User can calculate and inspect a first chart without creating an account.
- [x] **WORK-02**: User can save a chart locally with a chosen display label.
- [x] **WORK-03**: User can browse and reopen locally saved charts after restarting the app.
- [x] **WORK-04**: User can revise birth details by creating a new immutable chart revision without changing the basis of existing analyses or reports.
- [x] **WORK-05**: User can rename a locally saved chart.
- [x] **WORK-06**: User can delete a locally saved chart and its dependent local artifacts after confirming the action.
- [x] **WORK-07**: User can export the structured data and provenance for a saved chart.

### Chart Wheel and Evidence

- [x] **WHEEL-01**: User can view a deterministic natal chart wheel representing the calculated planets, signs, houses, angles, and supported aspects.
- [ ] **WHEEL-02**: User can select a visual chart factor and see its exact calculated facts.
- [x] **WHEEL-03**: User can zoom or otherwise inspect a dense wheel without losing access to overlapping factors.
- [ ] **WHEEL-04**: User can inspect placements, houses, aspects, orbs, and relevant motion in structured lists or tables synchronized with the wheel.
- [ ] **WHEEL-05**: User can access every meaningful wheel factor through a non-visual semantic representation.
- [x] **EVID-01**: User can distinguish calculated facts, methodological judgments, generated interpretation, and uncertainty in the interface.
- [x] **EVID-02**: User can move between beginner-friendly summaries and technical detail derived from the same underlying evidence.

### Transit Analysis

- [ ] **TRAN-01**: User can choose an exact transit date, time, and timezone.
- [ ] **TRAN-02**: User can calculate an immutable transit artifact with the same calculation provenance standards as a natal chart.
- [ ] **TRAN-03**: User can compare a selected natal chart and transit moment in a synchronized bi-wheel.
- [ ] **TRAN-04**: User can inspect transit-to-natal contacts with aspect, orb, applying/separating state, and exactness where supported.
- [ ] **TRAN-05**: User can see how active transit evidence relates to the natal chart before requesting interpretation.
- [ ] **TRAN-06**: User can save and reopen a transit-analysis snapshot anchored to exact natal and transit revisions.

### Methodical Analysis

- [ ] **METH-01**: User can choose a question or focus and select relevant visible evidence before requesting an interpretation.
- [ ] **METH-02**: The app creates a repeatable reading plan using a pinned, integrity-addressed `astrology-skill` bundle.
- [ ] **METH-03**: A reading plan records primary and secondary factors, selected reference modules, weighting notes, missing resources, and synthesis warnings.
- [ ] **METH-04**: User can see which chart factors and `astrology-skill` reference modules support an interpretation.
- [ ] **METH-05**: The interpretation pipeline does not ask the language model to calculate placements, houses, aspects, or transit geometry.
- [ ] **METH-06**: User is shown proportionate uncertainty when birth-time confidence, missing factors, conflicting testimony, or missing references limit a reading.
- [ ] **METH-07**: User can choose among only those interpretive tradition and tone controls supported by the pinned methodology.

### LLM Connection and Conversation

- [ ] **LLM-01**: User can request analysis through a LemAstra-managed model connection without supplying a provider key.
- [ ] **LLM-02**: User can configure an OpenAI-compatible endpoint they control and use it instead of the managed connection.
- [ ] **LLM-03**: The app stores a BYO endpoint credential in platform secure storage and never includes it in logs, analytics, exports, or sync.
- [ ] **LLM-04**: User can inspect the bounded chart, reading-plan, evidence, question, and conversation context that will leave the device before a model request.
- [ ] **LLM-05**: User can stream a schema-validated natal or transit interpretation from the selected connection.
- [ ] **CHAT-01**: User can ask follow-up questions within a conversation anchored to immutable chart, transit, reading-plan, evidence, skill, and model identifiers.
- [ ] **CHAT-02**: User can start a new conversational branch without mutating the context of an earlier analysis.
- [ ] **CHAT-03**: User can reopen locally saved conversations after restarting the app.
- [ ] **CHAT-04**: User receives an explicit explanation when model output is refused, interrupted, invalid, or cannot be grounded in the selected evidence.
- [ ] **SAFE-01**: Generated content avoids deterministic claims and does not present astrology as medical, legal, financial, or emergency guidance.
- [ ] **SAFE-02**: Retrieved skill content and user-authored text are treated as data rather than trusted model instructions.
- [ ] **SAFE-03**: Each saved interpretation records connection type, model identifier, methodology version, evidence identifiers, warnings, and self-check results.

### Reports

- [ ] **REPT-01**: User can create a report from a chosen chart analysis and selected conversation content.
- [ ] **REPT-02**: User can preview and edit report title and included sections without changing the underlying evidence artifacts.
- [ ] **REPT-03**: A report includes the relevant chart visual, synthesized reading, methodology, evidence references, uncertainty notes, and provenance.
- [ ] **REPT-04**: User can export a polished PDF whose content remains readable on the declared v1 platforms.
- [ ] **REPT-05**: User can share or save an exported report through platform-native controls.
- [ ] **REPT-06**: Every report retains stable references or embedded copies sufficient to identify the exact chart, evidence, skill, method, and model versions used.

### Privacy, Accessibility, and Mobile Quality

- [x] **PRIV-01**: Charts, conversations, analyses, and reports are private and local by default.
- [ ] **PRIV-02**: The app sends only the user-approved bounded payload to the selected calculation, place/time, or model provider.
- [x] **PRIV-03**: Birth data, chart content, questions, conversations, and report prose are excluded from product analytics.
- [x] **PRIV-04**: Logs and crash telemetry redact provider credentials and sensitive astrology payloads.
- [x] **PRIV-05**: User can export all personal data stored locally by the app.
- [x] **PRIV-06**: User can delete all personal data stored locally by the app.
- [x] **PRIV-07**: User can review current provider, retention, and data-transmission disclosures before enabling remote calculation or model features.
- [ ] **PLAT-01**: User can complete the natal-to-report core workflow on supported iOS devices.
- [ ] **PLAT-02**: User can complete the natal-to-report core workflow on supported Android devices.
- [ ] **A11Y-01**: User can navigate the core workflow with platform screen-reader support.
- [x] **A11Y-02**: User can use the core workflow with supported text scaling and without relying on color alone.
- [ ] **A11Y-03**: User can access chart evidence and transit contacts without interpreting the graphical wheel.

### Release Gates

- [x] **GATE-01**: The project records an approved Swiss Ephemeris licensing and distribution posture before public or commercial beta.
- [x] **GATE-02**: Golden natal and transit fixtures cover supported calculations, civil-time ambiguity, unknown birth time, and representative high-latitude behavior.
- [ ] **GATE-03**: Cross-contract tests verify raw input through chart, reading plan, interpretation, and report artifacts.
- [ ] **GATE-04**: Evaluation suites meet defined thresholds for evidence fidelity, methodology adherence, uncertainty, safety, and beginner/technical consistency.
- [x] **GATE-05**: The release has an approved data inventory, retention/deletion policy, provider inventory, and accurate Apple and Google privacy disclosures.
- [x] **GATE-06**: No model, calculation, database, or third-party service secret is shipped in the mobile clients.

## Definition of Done

The v1 milestone is releasable when every v1 requirement is mapped to one roadmap phase, implemented, automatically or manually verified as appropriate, and committed; all release gates pass; and a user can complete the chart-first natal/transit-to-report workflow on supported iOS and Android devices without an account.

## v2 Requirements

### Accounts and Sync

- **SYNC-01**: User can create an optional account and synchronize private charts across devices.
- **SYNC-02**: User can synchronize analyses, conversations, and reports across devices with explicit conflict handling.
- **SYNC-03**: User can delete their cloud account and propagate deletion through primary storage and backups according to policy.

### Additional Platforms and Connections

- **WEB-01**: User can complete the core workflow in a supported web browser with wheel, storage, accessibility, and report fidelity comparable to mobile.
- **KEY-01**: Expert user can connect directly to a supported model provider using a raw API key stored only on the device after acknowledging the security tradeoff.

### Temporal Exploration

- **TIME-01**: User can scrub through an interactive calendar and see the chart wheel animate across time.
- **TIME-02**: User can attach private personal-event observations to exact moments and sky states.
- **TIME-03**: User can explore a chronological history of saved personal events and astrological conditions.

### Advanced Astrology

- **TECH-01**: User can analyze synastry using the same evidence-grounded workflow.
- **TECH-02**: User can analyze solar returns and annual profections.
- **TECH-03**: User can use additional supported timing and reading techniques after each passes dedicated calculation and methodology evaluation.

### Publishing and Social Learning

- **SOCL-01**: Astrologer can publish a sourced observation about a past, present, or future moment.
- **SOCL-02**: User can explore public astrological observations on a historical timeline.
- **SOCL-03**: Consenting users can contribute governed, purpose-specific data to aggregate research.
- **SOCL-04**: User can understand, grant, revoke, and audit consent separately for publication and aggregate use.

## Out of Scope

| Feature | Reason |
|---------|--------|
| LLM-calculated chart geometry | Violates the deterministic calculation boundary and makes readings irreproducible |
| Unscoped oracle chat | The product is chart-first and evidence-grounded rather than a generic astrology chatbot |
| Deterministic event prediction | Creates false certainty and conflicts with the methodology's uncertainty requirements |
| Medical, legal, financial, or emergency direction | Astrology must not be presented as qualified high-stakes advice |
| Public-by-default charts or observations | Birth data, questions, and personal timelines require explicit future consent and governance |
| Advertising or sale of intimate chart/conversation data | Conflicts with the private, trust-centered product value |
| Practitioner CRM in the initial product line | LemAstra begins as a personal workspace, not client-practice management software |
| Mandatory account before first value | Conflicts with the local-first personal workspace strategy |

## Traceability

Every v1 requirement maps to exactly one roadmap phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BIRTH-01 | Phase 2 | Complete |
| BIRTH-02 | Phase 2 | Complete |
| BIRTH-03 | Phase 2 | Complete |
| BIRTH-04 | Phase 2 | Complete |
| BIRTH-05 | Phase 2 | Complete |
| CALC-01 | Phase 2 | Complete |
| CALC-02 | Phase 2 | Complete |
| CALC-03 | Phase 2 | Complete |
| CALC-04 | Phase 2 | Complete |
| WORK-01 | Phase 3 | Complete |
| WORK-02 | Phase 3 | Complete |
| WORK-03 | Phase 3 | Complete |
| WORK-04 | Phase 3 | Complete |
| WORK-05 | Phase 3 | Complete |
| WORK-06 | Phase 3 | Complete |
| WORK-07 | Phase 3 | Complete |
| WHEEL-01 | Phase 4 | Complete |
| WHEEL-02 | Phase 4 | Pending |
| WHEEL-03 | Phase 4 | Complete |
| WHEEL-04 | Phase 4 | Pending |
| WHEEL-05 | Phase 4 | Pending |
| EVID-01 | Phase 4 | Complete |
| EVID-02 | Phase 4 | Complete |
| TRAN-01 | Phase 5 | Pending |
| TRAN-02 | Phase 5 | Pending |
| TRAN-03 | Phase 5 | Pending |
| TRAN-04 | Phase 5 | Pending |
| TRAN-05 | Phase 5 | Pending |
| TRAN-06 | Phase 5 | Pending |
| METH-01 | Phase 6 | Pending |
| METH-02 | Phase 6 | Pending |
| METH-03 | Phase 6 | Pending |
| METH-04 | Phase 6 | Pending |
| METH-05 | Phase 6 | Pending |
| METH-06 | Phase 6 | Pending |
| METH-07 | Phase 6 | Pending |
| LLM-01 | Phase 7 | Pending |
| LLM-02 | Phase 7 | Pending |
| LLM-03 | Phase 7 | Pending |
| LLM-04 | Phase 7 | Pending |
| LLM-05 | Phase 7 | Pending |
| CHAT-01 | Phase 8 | Pending |
| CHAT-02 | Phase 8 | Pending |
| CHAT-03 | Phase 8 | Pending |
| CHAT-04 | Phase 8 | Pending |
| SAFE-01 | Phase 7 | Pending |
| SAFE-02 | Phase 7 | Pending |
| SAFE-03 | Phase 7 | Pending |
| REPT-01 | Phase 9 | Pending |
| REPT-02 | Phase 9 | Pending |
| REPT-03 | Phase 9 | Pending |
| REPT-04 | Phase 9 | Pending |
| REPT-05 | Phase 9 | Pending |
| REPT-06 | Phase 9 | Pending |
| PRIV-01 | Phase 3 | Complete |
| PRIV-02 | Phase 7 | Pending |
| PRIV-03 | Phase 3 | Complete |
| PRIV-04 | Phase 3 | Complete |
| PRIV-05 | Phase 3 | Complete |
| PRIV-06 | Phase 3 | Complete |
| PRIV-07 | Phase 1 | Complete |
| PLAT-01 | Phase 10 | Pending |
| PLAT-02 | Phase 10 | Pending |
| A11Y-01 | Phase 4 | Pending |
| A11Y-02 | Phase 4 | Complete |
| A11Y-03 | Phase 4 | Pending |
| GATE-01 | Phase 1 | Complete |
| GATE-02 | Phase 2 | Complete |
| GATE-03 | Phase 10 | Pending |
| GATE-04 | Phase 7 | Pending |
| GATE-05 | Phase 1 | Complete |
| GATE-06 | Phase 1 | Complete |

**Coverage:**

- v1 requirements: 72 total
- Mapped to phases: 72
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-22*
*Last updated: 2026-08-22 after roadmap creation*
