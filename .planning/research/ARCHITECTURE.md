# Architecture Patterns

**Domain:** Cross-platform personal astrology workspace with grounded AI interpretation
**Researched:** 2026-08-22
**Confidence:** HIGH for boundaries and sequencing; MEDIUM for the final hosting and geocoding vendors

## Recommended Architecture

Build a **local-first React Native client backed by a small server-side orchestration API and a separately deployed Python calculation worker**. Keep one canonical, versioned chart artefact flowing through calculation, visualization, evidence selection, interpretation, and report generation. The client should never calculate astronomical positions itself and the model should never derive chart factors.

```text
React Native / Expo client
  ├─ local workspace (SQLite; private charts, cached results, drafts)
  ├─ chart wheel (pure TypeScript geometry -> Skia renderer)
  ├─ evidence inspector + chat + report UI
  └─ sync/outbox boundary (initially optional)
                     │ HTTPS, authenticated, idempotent commands
                     ▼
Application API / orchestrator
  ├─ chart, analysis, conversation, and report resources
  ├─ provenance ledger + authorization
  ├─ deterministic evidence compiler
  ├─ LLM adapter (keys and prompts remain server-side)
  └─ job/status + streaming endpoints
              │                              │
              ▼                              ▼
Python calculation worker               Durable data services
  astrology-skill/tools/                 Postgres + object storage
  birth_to_chart.py                      (when account sync ships)
  Swiss Ephemeris
              │
              ▼
Versioned ChartArtefact JSON -> astrology-skill route/retrieval methodology
```

This separation deliberately preserves the existing `astrology-skill` doctrine:

1. The Python worker computes geometry and records provenance.
2. The application validates and stores the immutable chart artefact.
3. A deterministic evidence compiler selects and ranks facts plus exact skill references.
4. The LLM synthesizes only from that evidence package and emits a structured result.
5. Reports retain the exact chart, evidence, methodology, model, and uncertainty metadata used.

Do **not** embed Python or Swiss Ephemeris in the React Native app for v1. It complicates iOS/Android builds, makes updates and licensing harder, and encourages calculation logic to diverge by platform. The separate-process boundary already established by `astrology-skill` is the clean product boundary too.

## Component Boundaries

| Component | Responsibility | Communicates With |
|---|---|---|
| App shell and navigation | Universal routes, authentication boundary, deep links, layout, accessibility | Feature modules |
| Personal workspace | Chart list, create/edit flow, local persistence, sync state, deletion/export | Local repository; application API |
| Place/time resolver | User-confirmed place selection, latitude/longitude, IANA timezone, DST ambiguity handling | Geocoding/timezone provider through API; calculation request builder |
| Chart domain package | TypeScript types, schema validation, canonical IDs, display selectors; no ephemeris math | All client features; shared contracts |
| Wheel scene model | Pure functions converting canonical longitudes, cusps, aspects, and selections into drawable primitives | Chart domain package; wheel renderer |
| Wheel renderer | Skia drawing, hit testing, zoom/rotation, selection, snapshots; no astrology semantics | Scene model; evidence inspector |
| Calculation API | Validates raw input, resolves idempotency, queues/executes calculation, returns artefact | Python worker; artefact store |
| Python calculation worker | Runs pinned `birth_to_chart.py`/Swiss Ephemeris in an isolated process; never interprets | Calculation API |
| Evidence compiler | Builds a persisted `ReadingPlan` and citation-ready evidence bundle from supplied facts and skill modules | Chart artefact; versioned astrology-skill bundle |
| Interpretation orchestrator | Sends only the evidence bundle and user question to the model; validates structured output; streams prose | Evidence compiler; LLM provider; conversation store |
| Report service | Freezes a report manifest, renders HTML/PDF, stores export and checksum | Chart/evidence/reading artefacts; object storage |
| Account/sync service | Auth, row-level ownership, encrypted transport, deletion/export, device sync | Client outbox; Postgres/object store |

Use feature-oriented client modules (`charts`, `transits`, `wheel`, `evidence`, `chat`, `reports`) over a global layer-by-type hierarchy. Each feature may call domain/application interfaces, but UI components must not directly call persistence, ephemeris, or model SDKs.

## Canonical Data Contracts

Treat the current `astrology-skill/assets/schemas/*.json` files as upstream domain contracts, but place a stricter product envelope around them. `chart_data` currently allows additional properties and many inner fields are optional; that flexibility is useful for a skill but too permissive as a database contract.

```typescript
type Provenance = {
  producer: "astrology-skill/tools/birth_to_chart.py" | "external";
  producerVersion: string;
  skillBundleVersion: string;
  schemaVersion: string;
  calculatedAt: string;          // timezone-aware ISO-8601
  ephemeris: { engine: "Swiss Ephemeris"; mode: "Moshier" | "se1"; version: string };
  inputHash: string;             // hash normalized calculation input, not raw secrets
  warnings: string[];
};

type ChartArtefact = {
  id: string;
  revision: number;
  readingType: "natal" | "transit";
  subjectId: string;
  input: BirthInputSnapshot;     // encrypted/private; includes explicit confidence
  chart: ChartInputSchema;       // verbatim validated skill contract
  provenance: Provenance;
  contentHash: string;
};

type EvidenceBundle = {
  id: string;
  chartArtefactIds: string[];
  readingPlan: ReadingPlanSchema;
  facts: EvidenceFact[];         // stable IDs + exact paths into source artefacts
  references: ReferenceExcerpt[];// module ID, version/hash, bounded excerpt or digest
  methodologyVersion: string;
  uncertainty: string[];
};

type ReadingArtefact = {
  id: string;
  evidenceBundleId: string;
  userQuestion: string;
  structuredReading: ReportSchema["reading"];
  model: { provider: string; model: string; snapshot?: string; promptVersion: string };
  selfCheck: ReportSchema["self_check"];
  createdAt: string;
};
```

Rules:

- Persist degrees as numeric absolute longitude `[0, 360)` plus the derived sign/degree provided by the calculator. Rendering uses absolute longitude; it never recomputes astrology.
- A transit analysis references both an immutable natal artefact revision and an immutable transit artefact/moment. Recalculation creates a new revision rather than mutating evidence under an old reading.
- Store instants in UTC and retain the IANA zone and original wall-clock input separately. Never reduce a birthplace to a numeric UTC offset; historical DST rules matter.
- Require explicit `birth_time_confidence`; when unknown, preserve the calculator's omission of angles/houses/sect and surface that limitation in UI and analysis.
- Give every evidence fact a stable identifier such as `chart:{id}:placement:Saturn` or `transit:{id}:contact:Jupiter:square:Mars`. Chat citations and wheel selections point to these IDs.
- Version schemas and methodology independently. A schema migration must not silently reinterpret an existing reading.

## Data Flow

### Natal calculation

```text
Birth form
 -> user confirms place + timezone + time confidence
 -> normalized CalculationRequest + idempotency key
 -> API validates input
 -> isolated Python worker invokes birth_to_chart.py
 -> validate against chart_input_schema.json
 -> attach provenance + hash, save immutable ChartArtefact
 -> client caches artefact in SQLite
 -> scene model renders wheel and evidence panels
```

Geocoding is input assistance, not authority. Save the confirmed label, coordinates, provider/place identifier, timezone, and confirmation timestamp. The user must be able to edit coordinates/timezone before calculation. Provider terms affect whether returned geocoding content may be cached; hide that policy behind a `PlaceResolver` port so a vendor change does not touch chart logic.

### Transit analysis and grounded chat

```text
Natal revision + chosen target instant/location
 -> calculation worker returns transit_chart + timing_factors
 -> evidence compiler validates and ranks supplied factors
 -> ReadingPlan is persisted before generation
 -> LLM receives question + bounded evidence + selected skill references
 -> structured output validation
 -> prose streams to client
 -> ReadingArtefact links every claim/citation to evidence IDs
```

The chat history is not the ground truth. Each message is attached to an `analysis_context_id` identifying the chart revisions, transit moment, evidence bundle, tradition, tone, and methodology version. When context changes, start a new analysis context or explicitly fork it. This prevents a long conversation from accidentally mixing charts.

### Report generation

Freeze a `ReportManifest` that references the chart artefacts, reading plan, evidence bundle, generated reading, references used, self-check, and visual theme. Validate it with the skill's report gate. Render canonical HTML/PDF server-side for consistent pagination and fonts; use a wheel snapshot generated from the same scene-model fixture (or a server SVG renderer proven equivalent). Client-side share sheets distribute the finished file. Reports must remain reproducible even after a chart or prompt is edited.

## Trust and Provenance Model

The UI should visually distinguish three layers:

| Layer | Example | Required provenance |
|---|---|---|
| Calculated fact | Saturn at 14.2° Pisces; Jupiter square natal Mars at 1.3° orb | Calculator/version, ephemeris mode/version, input revision, timestamp |
| Methodological judgment | This exact/applying contact outranks a loose background transit | Skill bundle/module IDs, reading plan, weighting note |
| Generated interpretation | Narrative meaning and practical synthesis | Evidence bundle ID, model/snapshot, prompt/method version, self-check |

Never present model prose inside the same component style as calculated evidence. The evidence drawer should be reachable from a paragraph or claim, not merely available on a separate technical screen. Preserve warnings and refusals as first-class structured fields. Log model request IDs and latency for operations, but avoid logging raw birth data or private conversation text by default.

Use pinned model snapshots where consistency matters and maintain an evaluation corpus of fixed chart artefacts/questions. OpenAI notes that prompting behavior may vary between snapshots and recommends pinned versions plus evals for consistency. API keys must remain server-side; official guidance explicitly says not to expose them in apps or browsers.

## Offline and Server Tradeoffs

| Capability | Offline | Server-backed recommendation |
|---|---|---|
| Open saved charts and reports | Full, from SQLite/files | Optional sync later |
| Inspect wheel/evidence | Full | None required after artefact download |
| Edit drafts/notes | Full with outbox | Sync on reconnect |
| Calculate a new chart | Not in v1 | Required Python worker; cache by normalized input hash |
| Generate AI analysis/chat | No | Required to protect keys, enforce grounding, validate output, and audit provenance |
| Export existing report | Full for cached PDF | Canonical generation requires server initially |

This is **local-first, not offline-only**. Store user-owned metadata, chart artefacts, conversation summaries, and cached reports in `expo-sqlite`, which persists across app restarts. Store only authentication/session secrets in secure platform storage; do not put chart bodies in SecureStore key-value entries. Add an explicit sync state (`local`, `pending`, `synced`, `conflict`, `deleted`) and client-generated IDs now, even if v1 launches on one device. That keeps future accounts/sync additive.

For the first vertical slice, a synchronous calculation endpoint is acceptable if it reliably completes within the platform timeout. Model generation and PDF rendering should use job records with resumable status/streaming so an app backgrounding does not lose work. Commands must be idempotent.

## Wheel Architecture

Prefer **React Native Skia** for the interactive wheel, with a pure, framework-independent scene model. Skia supports a dedicated canvas renderer, UI-thread sizing/animation, snapshots, and overlays for accessibility; current official compatibility requires React Native 0.79+/React 19 and adds roughly 6 MB iOS / 4 MB Android / 2.9 MB web, which is an acceptable trade for the project's central visual surface.

Do not reuse the Python SVG generator as the interactive UI implementation. Use it as a **golden reference**: feed identical canonical fixtures to Python SVG and the TypeScript scene model, compare angular placement/labels, and keep it as a fallback report renderer. The shared scene model should output rings, cusps, bodies, labels, aspect lines, hit regions, and semantic descriptions. Gestures alter view state (rotation, zoom, highlighted factor), never chart data.

Accessibility requires a parallel semantic representation: a selectable list/table of placements, houses, and aspects synchronized with visual highlighting. Canvas alone is insufficient; Skia's docs recommend overlaying accessible views for internal elements.

## Patterns to Follow

### Pattern 1: Functional core, imperative shell

Keep normalization, validation, evidence selection, scene construction, and report manifest creation pure and fixture-testable. Network calls, SQLite, Python processes, and model streams are adapters around them. This provides deterministic tests for the trust-critical path.

### Pattern 2: Artefact lineage, not mutable blobs

Charts, evidence bundles, readings, and reports are immutable revisions connected by IDs and hashes. User-facing records can point at the latest revision, but a generated reading always points at the exact inputs it used.

### Pattern 3: Ports around volatile providers

Define interfaces for `ChartCalculator`, `PlaceResolver`, `InterpretationModel`, `ReportRenderer`, and `SyncRepository`. Vendor-specific payloads never leak into domain types. This is particularly important for geocoding storage restrictions, LLM provider evolution, and potential future ephemeris licensing choices.

### Pattern 4: Server-mediated model execution

Compile the evidence bundle first, pass it through a strict schema, then call the model with structured output and validate again. Treat streaming text as provisional until the final structured artefact passes. Never let model tool calls write or modify calculated chart fields.

## Anti-Patterns to Avoid

### One undifferentiated "chart JSON" document
**Why bad:** Raw personal input, computed geometry, interpretation, and UI state acquire different privacy and lifecycle rules. Mutations destroy reproducibility.
**Instead:** Separate private birth inputs, immutable calculated artefacts, evidence bundles, readings, and reports.

### LLM receives the entire skill repository and chat history
**Why bad:** Increases cost and noise, weakens retrieval discipline, and makes provenance vague.
**Instead:** Deterministically select the minimum modules prescribed by `SKILL.md`, persist their IDs/hashes, and send a bounded evidence package.

### Client-side API keys or direct model calls
**Why bad:** Secrets can be extracted and there is no reliable authorization, budget control, grounding gate, or audit trail.
**Instead:** All model calls go through the application API.

### Calculations in JavaScript for "instant" previews
**Why bad:** Creates a second ephemeris/orb/house implementation whose results can disagree with reports.
**Instead:** Show pending state, cache canonical calculations, and animate/interpolate only already-calculated display states. Future calendar animation should request sampled canonical frames/events rather than becoming a second authority.

### Premature social schema
**Why bad:** Consent, pseudonymization, moderation, deletion, cohort privacy, and research claims are product problems, not a few public columns.
**Instead:** Add stable private `Moment` and `Observation` entities later, default-private with explicit publication snapshots; design aggregate pipelines only after governance requirements exist.

## Evolution Path Without Overbuilding

1. **V1 private workspace:** local chart library, server calculation, static natal/transit moments, grounded chat, reproducible reports.
2. **Calendar:** introduce `Moment` (`instant`, zone, location scope) and a calculation cache keyed by moment/config. Generate ephemeris event indexes and sparse keyframes server-side; interpolate only display rotation between verified samples.
3. **Personal timeline:** add encrypted/private `Observation` linked to a `Moment`, chart revision, and optional evidence bundle. Keep journaling independent from public publishing.
4. **Publishing:** create immutable, redacted `Publication` snapshots from observations. Never flip a private row to public in place.
5. **Aggregate research:** derive consent-scoped, de-identified datasets through a separate pipeline with minimum cohort sizes, withdrawal/deletion propagation, method documentation, and explicit limits on causal claims.

These future entities need stable IDs and timestamps, but v1 does not need feeds, followers, moderation, analytics warehouses, or event-sourcing infrastructure.

## Dependency and Build Order

1. **Contract and fixture foundation** — copy/version upstream schemas, define strict envelopes, curate golden natal/transit fixtures, add cross-language contract tests.
2. **Calculation service** — containerize the pinned Python tool, settle Swiss Ephemeris licensing/deployment, implement timezone/place confirmation and provenance.
3. **Local chart workspace** — Expo app shell, SQLite repository, create/save/reopen flows, sync-ready IDs without remote sync complexity.
4. **Wheel scene model and renderer** — pure geometry first, Skia interaction second, accessible evidence list and golden comparisons.
5. **Transit artefacts and evidence compiler** — immutable natal/transit references, factor IDs, reading plans, reference selection and uncertainty.
6. **Grounded chat** — server model adapter, structured outputs, streaming, evaluation fixtures, rate/cost controls.
7. **Reports** — frozen manifest, validation gate, canonical PDF rendering, sharing and deletion/export semantics.
8. **Accounts/sync only when needed for multi-device/private cloud use** — auth, Postgres ownership rules, encrypted transport, conflict handling.

The roadmap should not begin with AI chat. Until canonical calculation, schema validation, provenance, and evidence IDs exist, there is nothing trustworthy to ground it on.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---|---|---|---|
| Chart calculation | One isolated worker; cache by normalized hash | Queue + horizontal workers; rate limits | Regional queues, hot ephemeris data, autoscaling, strict tenancy |
| LLM generation | Synchronous/streaming API with limits | Job records, quotas, prompt caching where privacy allows | Multi-provider routing, eval-gated model changes, abuse/cost controls |
| Storage | SQLite plus simple Postgres/object store | Indexed ownership and artefact tables; lifecycle jobs | Partitioned metadata, object retention tiers, deletion pipeline |
| Reports | On-demand worker | Queue and deduplicate manifests | Cached immutable exports via CDN with signed URLs |
| Calendar | On-demand moments | Precomputed event indexes per configuration | Shared ephemeris-event cache, personalized overlays |
| Social/aggregate | Out of scope | Explicit publishing/moderation design | Separate consent and de-identification pipeline; privacy review |

## Deployment and Licensing Decision Flag

`pyswisseph` / Swiss Ephemeris licensing is a phase-zero architecture gate, not a packaging footnote. The current tool documents a dual AGPL/professional-license choice and isolates that code under `tools/`. Before a hosted or distributed commercial product ships, obtain counsel or the appropriate professional license and document whether network use or mobile distribution changes obligations. Keep the calculator as its own deployable unit until that decision is settled.

## Sources

### Project-primary sources (HIGH confidence)

- [`astrology-skill` README](file:///Users/eggfam/dev/astrology-skill/README.md), `SKILL.md`, `docs/birth_to_chart_design.md`, `docs/end_to_end.md`
- `assets/schemas/chart_input_schema.json`, `reading_plan_schema.json`, and `report_schema.json`
- `tools/birth_to_chart.py` and `tools/chart_diagram.py`

### Official external sources (HIGH confidence unless noted)

- [React Native: About the New Architecture](https://reactnative.dev/architecture/landing-page) — New Architecture default since RN 0.76 and direct JSI/native integration.
- [React Native: Native Platform](https://reactnative.dev/docs/native-platform) — current native module/component boundaries and legacy API guidance.
- [Expo Router introduction](https://docs.expo.dev/router/introduction/) — universal file-based routing across Android, iOS, and web.
- [Expo: Store data](https://docs.expo.dev/develop/user-interface/store-data/) — SQLite persistence, SecureStore, FileSystem, and the unencrypted nature of AsyncStorage.
- [React Native Skia: Installation](https://shopify.github.io/react-native-skia/docs/getting-started/installation/) — compatibility, Expo support, and binary size impact.
- [React Native Skia: Canvas](https://shopify.github.io/react-native-skia/docs/canvas/overview/) — UI-thread canvas sizing, snapshots, and accessibility overlays.
- [OpenAI API authentication/reference](https://platform.openai.com/docs/api-reference/backward-compatibility) — server-side key secrecy, model snapshot variability, and eval/pinning guidance.
- [OpenAI API data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint) — provider retention behavior must be reviewed before sending private birth/chat data.
- [Google Geocoding policies](https://developers.google.com/maps/documentation/geocoding/policies) — example of provider-specific caching, attribution, and privacy-policy constraints; final provider remains undecided (MEDIUM confidence recommendation).

## Open Questions for Phase-Specific Research

- Final commercial/open-source licensing posture for Swiss Ephemeris and whether the existing AGPL isolation is sufficient for the intended distribution model.
- Which geocoding/timezone provider permits the required storage and offline behavior at acceptable cost; Google is not automatically recommended because its caching rules are restrictive.
- Whether v1 requires web parity. Skia supports web, but wasm/loading and unsupported APIs add testing cost; mobile-first is the safer default.
- Exact backend/hosting vendor and account-sync timing. The boundaries above remain valid whether the API runs on containers, functions plus jobs, or a managed application host.
- Privacy retention policy for model prompts/responses and whether a zero-data-retention arrangement is required before launch.
