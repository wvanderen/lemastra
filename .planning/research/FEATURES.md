# Feature Landscape

**Domain:** Cross-platform personal natal and transit astrology workspace with grounded AI interpretation
**Project:** LemAstra
**Researched:** 2026-08-22
**Overall confidence:** HIGH for project-specific requirements; MEDIUM for ecosystem conventions

## Product Thesis

LemAstra should make one loop excellent: **calculate → inspect → select evidence → interpret → converse → preserve**. The category already establishes accurate natal charts, saved profiles, chart wheels, transit comparison, placements/aspect lists, and interpretations as expected capabilities. LemAstra's differentiator is not adding another horoscope feed; it is making the interpretive chain inspectable and repeatable through `astrology-skill`.

The chart is the primary object. AI is a grounded interpreter of calculated evidence, not the source of chart facts and not an oracle. Generated prose should always remain linked to the chart artefact, selected moment, method, source modules, and material uncertainty that produced it.

## Table Stakes

Features users expect. Missing these makes the product feel incomplete or untrustworthy.

| Feature | Why Expected | Complexity | v1 Recommendation |
|---|---|---:|---|
| Birth-data entry with place and timezone resolution | Accurate natal calculation begins with date, exact/approximate time, and place; timezone mistakes invalidate angles and houses | High | Required. Show resolved coordinates/timezone before calculation and record the source |
| Birth-time confidence | Untimed, approximate, rounded, or rectified times materially change what can be interpreted | Medium | Required. Make confidence explicit and propagate it into evidence, chat, and reports |
| Accurate natal chart calculation | The foundation of every downstream feature | High | Required. Validate output against known fixtures and retain calculation provenance |
| Saved chart workspace | Current apps support creating, editing, saving, favoriting, and reopening charts | Medium | Required. Personal chart first; support multiple private charts without becoming a client CRM |
| Interactive natal wheel | The wheel is the category's core visual and the user's evidence surface | High | Required. Crisp zoom/pan, tap targets, glyph legend, accessible labels, and responsive phone/tablet/web layout |
| Structured chart details | Serious users expect exact longitudes, houses, aspects, orbs, and relevant condition; beginners need plain-language labels | Medium | Required. Pair every visual factor with a list/table representation |
| Contextual factor inspection | Point-and-click interpretations are an established convention and prevent the wheel becoming decorative | Medium | Required. Tapping a planet, house, or aspect opens calculated facts first, concise meaning second |
| Natal/transit bi-wheel | Comparing a chosen sky moment to the natal chart is central to v1 timing analysis | High | Required. Visually distinguish natal and transiting bodies and transit-to-natal aspects |
| Transit moment picker | Users need “now” plus a precise past/future date, time, and timezone | Medium | Required. Keep v1 moment-based; presets for now, previous/next day, and explicit date/time |
| Ranked active transit list | A wheel alone is hard to scan, especially on a phone | Medium | Required. Sort by methodical relevance, then show orb and applying/exact/separating status when calculated |
| Evidence selection and analysis focus | Chart-first analysis requires the user to know what evidence the AI is reading and what question it answers | Medium | Required. Start from chart/moment, allow a question, show included factors, and let users inspect or exclude them |
| Grounded natal and transit interpretation | Interpretations are expected; `astrology-skill` makes quality and repeatability the core differentiator | High | Required. Route structured chart JSON through the skill's retrieval, weighting, synthesis, uncertainty, and self-check workflow |
| Chart-scoped conversation | Users need follow-up questions without losing chart, moment, or method context | High | Required. Every answer should retain an inspectable analysis context and distinguish observation from interpretation |
| Missing-data and uncertainty UX | The product must not silently invent houses, angles, timing passes, or other absent factors | Medium | Required. Explain what cannot be judged and offer a narrower valid reading |
| Report generation and export | Durable interpretation reports and shareable chart outputs are established paid/pro features | High | Required. Generate a canonical report envelope plus polished human-readable PDF/print output |
| Report provenance | A report should remain reproducible after the chat is over | Medium | Required. Attach/reference chart artefacts, reading type, timestamp, tradition, tone, question, scope and uncertainty; optionally include references used |
| Private-by-default local/account storage | Birth data and conversations are personal data; future social use must not be assumed | High | Required. Clear save/delete/export controls and no public visibility by default |
| Loading, failure, and recovery states | Calculation, geocoding, generation, and export can fail independently | Medium | Required. Preserve entered data, identify the failed stage, and allow retry without rebuilding the session |
| Cross-platform continuity | React Native is chosen specifically for a coherent experience across supported platforms | High | Required. Define the supported v1 platform matrix and preserve chart/report fidelity on each |

## Progressive Disclosure Contract

Supporting beginners and serious enthusiasts is a product contract, not a theme toggle.

| Layer | Beginner View | Technical Depth |
|---|---|---|
| Wheel | Named planets/signs, highlighted selected factor, concise legend | Exact degree, house, retrograde state, rulership/condition where supplied |
| Aspects | Plain-language relationship and visual emphasis | Aspect type, exact orb, applying/separating/exact, source values |
| Transits | “What is active and why it matters” | Transit-to-natal contact, natal promise, timing factor, rank/weight |
| Interpretation | Short synthesis with expandable sections | Factors used, scope limits, conflicting testimony, tradition mode, references used |
| Terminology | Inline definitions and “why this matters” | Unabridged glyphs, tables, source notes, calculation settings |

Do not create separate “beginner astrology” and “advanced astrology” products. Use one canonical chart/evidence model rendered at different depths so the two views cannot contradict each other.

## Differentiators

Features that can make LemAstra meaningfully better rather than merely category-complete.

| Feature | Value Proposition | Complexity | Recommendation |
|---|---|---:|---|
| Evidence-to-interpretation traceability | Users can see which calculated factors support a synthesis and where uncertainty enters | High | Core v1 differentiator. Show concise provenance, not private chain-of-thought |
| Repeatable reading plans | Similar questions over the same chart follow the same retrieval and weighting methodology | High | Core v1 differentiator. Store the plan as a structured internal artefact and expose an optional reading outline |
| Question-aware factor ranking | The same chart is analyzed differently for identity, vocation, relationships, or a current pressure without becoming a placement dump | High | Core v1 differentiator, constrained to skill-supported focus areas |
| Natal-promise-before-timing flow | Transit readings explicitly establish the natal pattern before describing the temporary trigger | Medium | Core v1 differentiator; make the two stages visually distinct |
| Confidence-aware interpretation | Birth-time quality, missing orbs, unsupported houses, and mixed testimony visibly constrain claims | Medium | Core v1 differentiator and trust requirement |
| Tradition and tone controls | Users can request classical, modern, or blended framing and practical, technical, psychological, poetic, or beginner-friendly language | Medium | Include in v1 as analysis settings, with sensible defaults and clear descriptions |
| Reproducible report artefact | Export contains the reading plus chart inputs, method metadata, scope, and uncertainty rather than prose detached from evidence | High | Core v1 differentiator; client-facing PDF can hide audit detail while archival JSON preserves it |
| Compare interpretation to source evidence | Selecting a report section highlights the underlying chart factors | High | Build after basic reporting if needed, but preserve stable IDs in v1 so it does not require a rewrite |
| Analysis snapshots | Save a chart + transit moment + question + evidence set + resulting conversation as one reopenable object | Medium | Strong v1 feature if schedule permits; otherwise save reports and add snapshots immediately after v1 |
| Learning in context | Definitions and technique explanations appear at the factor currently being inspected | Medium | Include lightweight v1 explanations; expand into structured learning later |

## Deliberate Anti-Features

Features to explicitly avoid in the first release.

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| Generic open-ended “ask the universe” chat | Encourages free-association, hides missing data, and undermines chart-first trust | Require a selected chart or analysis snapshot; show what evidence is in context |
| AI-calculated placements or inferred missing factors | Violates the skill's no-calculation boundary and creates silent factual errors | Calculate deterministically, validate structured JSON, and interpret only supplied factors |
| Placement-by-placement content dump | Produces long but incoherent readings and teaches users to ignore weighting | Rank factors by question, angularity/rulership, exactness, condition, and repeated testimony; synthesize tensions |
| Deterministic event prediction | Creates fear, false certainty, and high-stakes harm | Describe themes, timing windows, pressures, choices, and uncertainty |
| Medical, legal, financial, or relationship directives | Astrology should not become the sole basis for consequential decisions | Use explicit scope guardrails and encourage relevant professional support |
| Daily horoscope/feed as the home screen | Pulls the product toward engagement bait and away from the saved personal workspace | Open on charts/recent analyses; “current moment” is an intentional transit analysis action |
| Social profiles, public charts, or aggregate claims | Birth data, life events, and conversations create major consent, privacy, moderation, and research-validity obligations | Keep all data private; research a consent and governance model before any social phase |
| Professional client CRM | Multiplies permissions, consent, billing, and workflow scope before the personal loop is validated | Support multiple private charts only; add practitioner workflow in a later milestone |
| Every advanced technique at launch | Synastry, returns, profections, progressions, electional, horary, and mundane work each add UX and validation complexity | Ship natal + transits; add techniques as separate vertical slices against the same chart/evidence contracts |
| Fully animated calendar/wheel | Animation introduces continuous ephemeris queries, state synchronization, performance, and interaction complexity | Use a precise static moment picker first; retain a time-indexed model for later animation |
| Unlimited chart customization | Large configuration surfaces overwhelm beginners and delay trustworthy defaults | Offer a small opinionated v1 set: house system/tradition where supported, visible points, aspect density, light/dark |
| Exposing model chain-of-thought | It is not the same as evidence and is not a stable audit mechanism | Expose chart factors, source modules, reading outline, scope, uncertainty, and report provenance |
| Mandatory account before first chart | Adds friction before value and makes privacy posture harder to understand | Allow an ephemeral/private first chart where platform architecture permits, then explain the value of sync |

## Feature Dependencies

```text
Birth data + place/timezone resolution
  → deterministic natal calculation
  → validated canonical chart artefact
  → saved chart workspace
  → interactive wheel + structured evidence

Canonical natal chart + selected target moment
  → deterministic transit calculation
  → natal/transit bi-wheel + ranked contacts
  → analysis snapshot (question + selected evidence + settings)
  → astrology-skill reading plan
  → grounded interpretation
  → chart-scoped conversation
  → canonical report envelope
  → PDF/print/share rendering

Stable factor/report identifiers
  → report-section evidence highlighting
  → future timeline entries
  → future animated calendar
  → future consented social/aggregate analysis
```

## Recommended v1 Scope

Prioritize this vertical slice in order:

1. **Canonical chart contract and calculation trust** — birth input, timezone/place resolution, birth-time confidence, validation fixtures, provenance.
2. **Private chart workspace** — create, edit, save, reopen, delete, and export chart data.
3. **Chart evidence UI** — wheel, details, aspect list, contextual selection, legends, and progressive disclosure.
4. **Moment-based transits** — now/arbitrary moment, natal/transit bi-wheel, ranked transit-to-natal contacts, exactness and phase where calculated.
5. **Grounded analysis** — explicit question, evidence set, tradition/tone, reading-plan orchestration, synthesis, uncertainty and guardrails.
6. **Chart-scoped conversation** — follow-ups that retain the same snapshot and make context changes visible.
7. **Durable reports** — validated report envelope, polished PDF/print/share output, attached chart artefacts and provenance.
8. **Cross-platform hardening** — accessibility, responsive chart interactions, failure recovery, privacy controls, and fidelity tests on each supported platform.

### v1 Acceptance Shape

A user can enter reliable birth data, inspect the resolved inputs, calculate and save a natal chart, tap the wheel to inspect exact evidence, choose a transit moment, understand the strongest active contacts, ask a focused question, receive a methodical and uncertainty-aware interpretation, ask follow-ups within that same evidence context, then export a polished report that can be traced back to its chart artefacts.

## Defer to Later Milestones

| Feature | Why Deferred | Architectural Provision Now |
|---|---|---|
| Animated wheel and calendar | Requires performant continuous time navigation and temporal indexing | Treat transit moment as first-class, immutable data and keep wheel rendering independent of interpretation |
| Personal event journal | Requires timeline UX, sensitive note storage, and event/chart association | Stable chart, moment, and snapshot IDs |
| Historical astrologer observations | Requires publishing, attribution, discovery, and moderation | Versioned observation schema distinct from private notes |
| Aggregate pattern exploration | Requires explicit consent, privacy-preserving analysis, bias controls, and claims governance | Never overload private records with implicit public/analytics consent |
| Synastry, returns, profections, progressions | Each deserves its own input/evidence/UX validation | Keep reading type and chart artefact roles extensible |
| Horary, electional, mundane | Different question contracts and higher event-certainty risks | Reuse skill routing only after dedicated product safety and UX research |
| Professional practice tools | Client identity, permissions, delivery, and recordkeeping are separate product concerns | Report supports pseudonymous client labels and practitioner metadata without adding CRM workflows |

## Roadmap Implications

- Do not make “AI chat” an early standalone phase. It depends on trusted calculation, canonical chart artefacts, evidence selection, and the `astrology-skill` orchestration boundary.
- Build reports after the interpretation contract but before broad UX polish; the report schema forces provenance and uncertainty decisions that should shape saved analysis data.
- Give wheel rendering and evidence inspection their own phase. A visually attractive wheel without usable tap targets, legends, exact values, and list alternatives does not satisfy the chart-first promise.
- Treat transit analysis as a full vertical slice rather than “another chart type”: moment selection, bi-wheel, contact ranking, natal promise, timing language, and report persistence all need to connect.
- Flag future calendar/social phases for fresh research. Their privacy, moderation, data governance, and aggregate-inference risks are not extensions of ordinary chart storage.

## Sources

### Project and methodology sources — HIGH confidence

- [`PROJECT.md`](../PROJECT.md) — product intent, v1 boundary, audience, privacy posture.
- `dev/astrology-skill/SKILL.md` — controlled retrieval, weighting hierarchy, uncertainty handling, no-calculation boundary, ethics, and self-check.
- `dev/astrology-skill/assets/schemas/report_schema.json` — report provenance and artefact contract.
- `dev/astrology-skill/references/templates/report_template.md` — human-readable report structure.
- `dev/astrology-skill/references/reading_types/natal.md` and `transit.md` — natal and timing evidence priorities and data-quality limits.

### Current ecosystem sources — MEDIUM confidence (official pages, cross-checked)

- [Astro Gold for Android](https://www.astrogold.io/get-astro-gold/for-android/) — natal/transit charting, bi-wheels, aspect grids, beginners/legends, dynamic listings, interpretation reports, and advanced calculation controls.
- [Astro Gold for iOS](https://www.astrogold.io/get-astro-gold/for-ios/) — saved/favorite charts, zoomable wheels, chart details, local/iCloud files, sharing, and professional reports.
- [CHANI App](https://www.chani.com/app?view=home) — accessible personalized birth chart and current astrology experience.
- [CHANI Transits](https://chaninicholas.zendesk.com/hc/en-us/articles/4409909027731-Transits) — start/exact/end transit-window convention.
- [Astro.com chart settings FAQ](https://www.astro.com/faq/fq_fh_setup_n.htm?nho2=41) — persistent chart display defaults and configurable chart methods/objects.
- [TimePassages App Store listing](https://apps.apple.com/us/app/timepassages-astrology/id488946918) — current chart, transit, learning, and moon-cycle feature signals.

## Confidence Notes and Gaps

- **HIGH:** The feature recommendations derived from the explicit LemAstra scope and checked-in `astrology-skill` contracts.
- **MEDIUM:** Competitor-feature conventions, because official product pages are marketing documentation and do not establish actual usability or user satisfaction.
- A later product-design phase should run hands-on comparative testing of wheel interaction on small screens, report export flows, and beginner comprehension. Feature pages cannot validate these UX qualities.
- A later privacy/security phase should determine precise storage, sync, deletion, AI-provider retention, and consent requirements before implementation.
- A later monetization study should decide whether calculation, grounded chat, reports, or advanced techniques are paid; this research intentionally does not let competitor pricing define product scope.
