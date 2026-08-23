<!-- GSD:project-start source:PROJECT.md -->

## Project

**LemAstra**

LemAstra is a cross-platform personal astrology workspace for curious beginners and serious enthusiasts. Users calculate and save natal charts, inspect an interactive chart wheel and structured astrological evidence, analyze transits for a chosen moment, converse with a grounded AI interpreter, and turn the resulting analysis into a polished exportable report.

The product builds on `astrology-skill`, whose curated datasets and repeatable methodologies are intended to give language models a high-quality, consistent basis for readings. The longer vision connects personal timelines, animated sky movements, astrologers' observations, historical moments, and eventually aggregate social insight, but the first release establishes a trustworthy chart-first foundation.

**Core Value:** Users can move from an accurately calculated chart and transparent astrological evidence to a high-quality, methodical AI interpretation they can inspect, discuss, and preserve as a report.

### Constraints

- **Tech stack**: Use React Native for the cross-platform client — explicitly chosen for the project direction.
- **Domain dependency**: Treat `dev/astrology-skill` as the authoritative starting point for interpretive datasets and repeatable methodologies — grounded analysis is the main differentiator.
- **Trust**: Keep calculated facts and structured astrological evidence distinguishable from generated interpretation — users should be able to see what a reading is based on.
- **Initial scope**: Center v1 on natal charts and transits — advanced techniques and temporal/social systems are deferred.
- **Audience**: Support both beginners and serious enthusiasts through progressive disclosure — neither accessibility nor technical transparency should eliminate the other.
- **Privacy readiness**: Avoid architecture that assumes birth data, personal events, or conversations are public — future social and aggregate uses require explicit consent and governance.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommendation in One Sentence

## Recommended Stack

### Cross-Platform Client

| Technology | Version / policy | Purpose | Why |
|---|---|---|---|
| Expo | SDK 57 stable line | React Native application platform for iOS, Android, and web | Expo SDK 57 maps to React Native 0.86, React 19.2.3, and React Native Web 0.21. Use the stable SDK line, never a canary, and let `npx expo install` select compatible native-package versions. Expo's build, update, routing, storage, print, and sharing modules reduce native glue substantially. |
| React Native | 0.86 via Expo 57 | Shared UI runtime | This is the project constraint. Expo SDK 55+ is New-Architecture-only, so every dependency must support the New Architecture. Do not design an escape hatch to the legacy bridge. |
| TypeScript | Expo template default; strict mode | Client implementation and shared API types | Strict TypeScript is essential around chart/report schemas, where silently omitted or renamed factors would undermine trust. Generate types from OpenAPI/JSON Schema rather than manually duplicating contracts. |
| Expo Router | `~57.0.x` via `expo install` | File-based navigation on native and web | It is Expo's first-party router for React Native and web. On SDK 56+, import navigation APIs through Expo Router rather than application-level `@react-navigation/*` imports. |
| React Native Skia | current Expo-compatible stable | Interactive chart wheel, aspect lines, selection/highlighting, animation foundation, image snapshots | Skia provides a performant declarative canvas, works with gestures/Reanimated, can snapshot the canvas for reports, and has web support through CanvasKit. It is a better long-term fit than a static SVG renderer for a future animated wheel. Current releases require RN >=0.79 and React >=19, which Expo 57 satisfies. |
| React Native Reanimated | 4.x Expo-compatible | Wheel rotation, transitions, progressive disclosure animations | Skia's current native integration requires Reanimated >=4 and Worklets >=0.7. Keep animation values on the UI thread; do not rerender the whole wheel through React state on every gesture frame. |
| React Native Gesture Handler | Expo-compatible | Pan, pinch, rotate, hit-testing interaction shell | Standard gesture layer for native React Native; combine with Skia coordinate/hit-test logic and accessibility overlays. |
| TanStack Query | latest stable v5 | Server state, mutation retries, request deduplication, cache invalidation | It supports React Native directly. Wire `focusManager` to `AppState` and `onlineManager` to native connectivity; persist only non-sensitive, versioned query results that are safe to retain offline. |
| Zustand | latest stable 5.x | Small amount of ephemeral client UI state | Use for selected planet/aspect, wheel viewport, open panels, draft report options. Do not duplicate server entities or the canonical chart in a global store. |
| React Hook Form + Zod | latest compatible stable | Birth-data and report-option forms, client validation | A birth form has interdependent optionality (unknown vs approximate time, timezone, coordinates). Zod gives readable client errors, but the server remains authoritative and revalidates everything. |

### Client Storage and Device APIs

| Technology | Version / policy | Purpose | Why |
|---|---|---|---|
| `expo-sqlite` | Expo 57 compatible | Local-first cache for saved charts, computed evidence, report drafts, and pending mutations | Expo recommends SQLite for local-first persistence and supports migrations, prepared statements, and optional SQLCipher on native. Store versioned JSON envelopes plus indexed summary columns. Web SQLite support must be proven in an early spike; use an IndexedDB-backed adapter if its production behavior is inadequate. |
| Drizzle ORM | latest stable compatible with Expo SQLite | Typed local schema and migrations | Expo documents a first-class Drizzle integration and development tooling. It is useful once the local schema exceeds a few tables. Avoid adopting Prisma's Expo support for v1 because Expo still describes it as early access. |
| `expo-secure-store` | Expo-compatible | Refresh/session tokens and a local database encryption key | SecureStore uses Android Keystore-backed encrypted preferences and iOS Keychain, but is for small secrets, not charts or conversations. It has no web equivalent; web authentication should use the Supabase-supported browser session mechanism. |
| `expo-file-system` | Expo-compatible | Temporary wheel snapshots and report files | Use the current object-oriented API rather than legacy/deprecated methods. |
| `expo-print` | Expo-compatible | Native HTML-to-PDF generation and print preview | It is the simplest native v1 path from a canonical report JSON + HTML template to PDF. Keep report content canonical as JSON so PDF is a projection, not the source of truth. |
| `expo-sharing` | Expo-compatible (`~57.0.x`) | Native share sheet for exported PDF | Native local-file sharing is supported. Web cannot share a local URI and Web Share availability is limited, so web should download the PDF or share a server URL after capability detection. |

### Backend and Domain Runtime

| Technology | Version / policy | Purpose | Why |
|---|---|---|---|
| Python | 3.12, pinned in container | Domain/API runtime | `astrology-skill` requires Python 3.10+ and its existing scripts are Python. Python 3.12 is a conservative production target with broad binary-wheel compatibility; do not jump to a new interpreter until `pyswisseph` has been exercised in CI on it. |
| FastAPI | current stable, lock exact transitive versions | Authenticated JSON/SSE API | Natural wrapper for Python scripts, JSON Schema/OpenAPI, streaming, and validation. It lets the client consume a typed service without embedding Python in the app. Build from an official Python image; the old `tiangolo/uvicorn-gunicorn-fastapi` base image is deprecated. |
| Pydantic | current FastAPI-compatible v2 | Request/response models and domain-envelope validation | Mirror `birth_to_chart` inputs and the chart/report schemas at the API edge. Preserve the repository's JSON Schema validation as a second domain gate rather than trusting only generated models. |
| `uv` | latest stable; lockfile committed | Python dependency and container builds | Provides reproducible resolution for API dependencies plus `pyswisseph`, `tzdata`, and `jsonschema`. The upstream tool already advertises `uv run` metadata. |
| `pyswisseph` | `>=2.10.3.2`, exact version locked | Swiss Ephemeris calculations | This is the calculator dependency already specified by `astrology-skill`. Keep it exclusively in the calculation service/process, record its version and ephemeris mode in provenance, and regression-test against known charts. |
| `tzdata` | `>=2024.1`, current version locked | Deterministic IANA timezone fallback | Already required by the calculator so `zoneinfo` behaves consistently across minimal containers and platforms. Update deliberately and rerun historical timezone fixtures. |
| `jsonschema` | `>=4.18`, current version locked | Deep gate for chart and report envelopes | Already used by `astrology-skill`'s optional `--validate` and report gate. In production, validation is not optional: every calculated chart and saved report should pass the canonical schema. |
| OpenAI official Python SDK + Responses API | latest stable SDK; pin model snapshot/config independently | Streaming grounded analysis and structured reading/report output | Keep API credentials on the server. Use streaming for chat and Structured Outputs for the reading plan/report envelope. Pin the production model snapshot and evaluate changes before promotion because model behavior can change across snapshots. |

### Data and Managed Infrastructure

| Technology | Version / policy | Purpose | Why |
|---|---|---|---|
| Supabase Postgres | managed current stable | Users, charts, transit moments, conversations, reports, provenance, and consent records | The domain is relational and audit-heavy. Postgres gives durable constraints and future analytics without committing v1 to an event/social platform. Supabase provides a documented Expo client, Auth, Storage, and row-level authorization. |
| Supabase Auth | current hosted service / `@supabase/supabase-js` | Email magic link/password and later social login | Auth tokens integrate with Postgres RLS. The FastAPI service should verify Supabase JWTs and derive user identity server-side; never accept `user_id` as authorization. |
| Supabase Row Level Security | enabled on every user-data table | Privacy boundary | Birth data, questions, and reports are sensitive. Default-deny ownership policies should exist before the client can write production data. Publishable keys may be in the app; service-role and OpenAI keys may not. |
| Supabase Storage | current hosted service | Generated PDFs and optional chart images | Prefer private buckets and short-lived signed URLs. Store canonical report JSON in Postgres/object storage separately from the rendered PDF so reports can be regenerated. |
| Container hosting (Fly.io, Render, Railway, Cloud Run, or equivalent) | one Linux container, one process initially | FastAPI + Python calculation runtime | The critical requirement is a reproducible image capable of installing `pyswisseph` and invoking a subprocess, not a specific vendor. Start with one process per container and horizontal replicas. Do not use edge-function-only hosting for this Python/native dependency path. |
| Sentry | current Expo + Python SDKs | Crash/error tracing across client, API, calculation, and LLM stages | Attach correlation IDs and stage metadata, but scrub birth data, user questions, chart payloads, and generated prose by default. |
| PostHog or privacy-conscious equivalent | optional after consent model | Product analytics | Do not block v1 on analytics. If added, capture coarse workflow events, never raw birth details or reading text. |

### Location and Timezone Resolution

| Technology | Version / policy | Purpose | Why |
|---|---|---|---|
| Google Geocoding API + Time Zone API, called through FastAPI | current REST APIs | Convert a selected birthplace into authoritative coordinates and resolve an IANA zone for the birth timestamp | The Time Zone API explicitly accepts latitude/longitude and a timestamp and returns timezone ID plus UTC/DST offsets. Keeping calls server-side protects keys and lets the API persist the exact selected label, coordinates, timezone ID, provider, and lookup timestamp as provenance. |

## `astrology-skill` Integration Contract

### How to package it

- Bring `astrology-skill` into the backend as a versioned Git dependency, submodule, or published internal package. Record its commit/version on every chart, reading, and report. Do not copy individual Markdown reference files into ad hoc prompts.
- Run `tools/birth_to_chart.py` as a subprocess with JSON input/stdout and a hard timeout. This matches the repository's intended license/process isolation and prevents calculator globals such as ephemeris configuration from contaminating concurrent API requests. Use a bounded worker pool if calculation load becomes material.
- Run `entry_commands.py --route` and `--report` as mandatory gates. Treat nonzero exits, schema failures, missing provenance, and uncertainty warnings as typed errors surfaced to the UI.
- Move the skill workflow into a backend orchestration module that deterministically identifies and loads only the referenced Markdown modules. The LLM should receive the validated chart, explicit user question, reading plan, selected excerpts, and output schema—not unrestricted access to the whole corpus.
- Store separately: raw user input, immutable calculated chart JSON, route/reading plan, exact references used, model/prompt/skill versions, generated prose, self-check, and final report envelope. This makes a reading reproducible and auditable.
- Never ask the LLM to calculate placements, aspects, houses, dignity, sect, lots, or transits. It interprets facts emitted by the calculator and names missing evidence.

### Licensing gate (critical)

## Chart Wheel Strategy

- Input: validated chart JSON plus display preferences.
- Output: deterministic primitives—rings, cusps, glyph anchors, aspect chords, labels, hit regions, and z-order.
- Renderer A: Skia interactive canvas for the app.
- Renderer B: SVG/HTML projection for reports and golden tests (or reuse the Python SVG renderer during the transition).

## Grounded Chat and Report Generation

## Report Export

- Native v1: render a shared HTML template, include a Skia snapshot or deterministic SVG wheel, call `expo-print` to create PDF, then `expo-sharing`.
- Web v1: render the same printable HTML and offer browser print/download. Do not assume `expo-sharing` can share local web files.
- Later, if byte-identical output across platforms becomes a requirement, move PDF rendering to a server-side HTML-to-PDF worker and return a signed Storage URL. Do not add that operational surface until visual parity is actually needed.

## API and Schema Tooling

- FastAPI owns OpenAPI; generate a TypeScript client (for example with `openapi-typescript`) in CI and fail on uncommitted drift.
- Keep the authoritative astrology JSON Schemas vendored/versioned with the backend. Generate TypeScript types from them, but validate at runtime on both boundaries.
- Use UUIDv7 or ULID identifiers generated server-side and immutable revision IDs for calculated charts. A changed house system, birth time, coordinates, timezone, ephemeris version, or orb policy creates a new revision.
- Use ISO-8601 timestamps with offsets for events and preserve IANA zone names separately. Store calculation instants as UTC plus source-zone metadata.

## Testing and Quality Stack

| Tool | Purpose | Required emphasis |
|---|---|---|
| Vitest + React Native Testing Library | Client units and component behavior | Forms, progressive disclosure, evidence selection, report states, accessibility list parity. |
| Maestro | iOS/Android end-to-end smoke tests | Create chart, reopen it, choose transit moment, stream analysis, export report. Prefer a small stable suite over brittle exhaustive UI scripts. |
| Playwright | Web end-to-end and report visual checks | Web wheel loading/CanvasKit, auth, responsive layout, printable report. |
| Pytest | API/domain integration | Subprocess timeouts, schema gates, JWT ownership, skill routing, report validation, licensing notices in build artifact. |
| Existing `astrology-skill` smoke/validation/benchmark suite | Domain regression | Run against the exact vendored skill revision before deployment. Add fixtures for every supported house/time confidence path. |
| Golden chart fixtures | Cross-renderer correctness | Assert geometry facts and selected screenshots for natal/transit overlays; never use screenshots alone to test calculation. |
| LLM eval set | Grounding and methodology | Score unsupported claims, reference coverage, factor weighting, uncertainty language, report-schema validity, and reproducibility across pinned model changes. |

## Monorepo Layout

## Alternatives Considered

| Category | Recommended | Alternative | Why not now |
|---|---|---|---|
| Mobile framework | Expo / React Native | Bare React Native CLI | Bare RN adds native build/configuration work without helping the domain service. Skia is supported by Expo development builds. |
| Wheel renderer | React Native Skia | `react-native-svg` | SVG is simpler for a static first wheel and remains useful for reports, but Skia better supports dense interactive drawing and the future animated calendar. Keep pure geometry so the renderer can change. |
| Backend | FastAPI/Python | Node/NestJS plus a Python microservice | The authoritative tooling is already Python. A second application runtime would add contracts and deployment before scale requires it. |
| Backend platform | Container service | Supabase Edge Functions only | Edge functions do not naturally host the existing Python/native `pyswisseph` subprocess. Use Supabase for data/auth and a container for domain compute. |
| Database/auth | Supabase/Postgres | Firebase | The product benefits from relational provenance, immutable revisions, RLS, and future aggregate SQL analysis. |
| Local database | Expo SQLite + Drizzle | AsyncStorage only | Charts, messages, revisions, and offline queues need transactions, indexes, and migrations. Async key/value storage becomes fragile quickly. |
| LLM retrieval | Skill-directed deterministic retrieval | Vector DB / hosted file search | The skill already contains explicit routing, weighting, and a small curated corpus. Semantic retrieval would reduce determinism and auditability without proven need. |
| LLM provider abstraction | Thin internal adapter around Responses API | LangChain/LlamaIndex from day one | Frameworks add moving parts without solving the core requirement, which is deterministic domain routing and strict provenance. Add an adapter seam, not a framework. |
| PDF | Expo Print + shared HTML | Dedicated server PDF pipeline | Native export is sufficient for v1; server rendering is justified only when cross-platform byte/visual parity or email delivery becomes required. |
| Geocoding | Google server-side Geocoding + Time Zone APIs | Mapbox Geocoding v6 | Google supplies the two-part coordinate + historical timestamp timezone workflow. Mapbox is viable, but stored results require permanent-geocoding terms and still need a timezone resolver. |
| Analytics | Minimal/none initially | Full event/session replay | Birth data and reading conversations are unusually sensitive; analytics taxonomy and consent must precede collection. |

## Installation Sketch

# Client

# API

## Implementation Order Implied by the Stack

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Expo / React Native foundation | HIGH | Current official Expo documentation specifies SDK 57, RN/React mapping, New Architecture, Router, storage, build, and update behavior. |
| Skia wheel renderer | MEDIUM | Official support and compatibility are clear; LemAstra still needs a spike for web CanvasKit load time, label density, hit testing, accessibility overlays, and report projection. |
| FastAPI + Python domain boundary | HIGH | Directly matches the inspected `astrology-skill` tools and official FastAPI container guidance. |
| Supabase data/auth | MEDIUM-HIGH | Official Expo/Auth/RLS paths are mature; offline synchronization policy and web local persistence still require product-specific design. |
| Grounded LLM orchestration | MEDIUM | The API capabilities are documented, but model choice, cost, retention posture, prompt packaging, and quality thresholds require dedicated eval work. |
| PDF export | MEDIUM | Native primitives are documented; pixel-consistent cross-platform output must be proven with report fixtures. |
| Swiss Ephemeris licensing | MEDIUM | Official and package sources confirm AGPL/professional-license paths, but the exact obligations for the intended distribution require qualified review. |

## Sources

### First-party project sources

- `/Users/eggfam/dev/astrology-skill/SKILL.md`
- `/Users/eggfam/dev/astrology-skill/README.md`
- `/Users/eggfam/dev/astrology-skill/docs/birth_to_chart_design.md`
- `/Users/eggfam/dev/astrology-skill/tools/README.md`
- `/Users/eggfam/dev/astrology-skill/tools/requirements.txt`
- `/Users/eggfam/dev/astrology-skill/assets/schemas/chart_input_schema.json`
- `/Users/eggfam/dev/astrology-skill/assets/schemas/report_schema.json`
- `/Users/eggfam/dev/astrology-skill/docs/report_format.md`

### Official external sources

- [Expo SDK reference and version mapping](https://docs.expo.dev/versions/latest/)
- [Expo Router](https://docs.expo.dev/versions/latest/sdk/router/)
- [Expo New Architecture guidance](https://docs.expo.dev/guides/new-architecture/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo local-first guidance](https://docs.expo.dev/guides/local-first/)
- [Expo SecureStore](https://docs.expo.dev/versions/v55.0.0/sdk/securestore/)
- [Expo Print](https://docs.expo.dev/versions/v57.0.0/sdk/print/)
- [Expo Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [EAS runtime versions](https://docs.expo.dev/eas-update/runtime-versions/)
- [React Native Skia installation and compatibility](https://shopify.github.io/react-native-skia/docs/getting-started/installation/)
- [React Native Skia web support](https://shopify.github.io/react-native-skia/docs/getting-started/web/)
- [React Native Skia Canvas and snapshots](https://shopify.github.io/react-native-skia/docs/canvas/overview/)
- [TanStack Query React Native compatibility](https://tanstack.com/query/latest/docs/framework/react/installation)
- [TanStack Query persistence](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient)
- [Supabase Expo React Native quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)
- [Supabase Auth and RLS](https://supabase.com/docs/guides/auth)
- [FastAPI container deployment](https://fastapi.tiangolo.com/deployment/docker/)
- [FastAPI background-task caveat](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- [OpenAI API authentication and server-side key guidance](https://platform.openai.com/docs/api-reference/backward-compatibility)
- [OpenAI Responses streaming reference](https://platform.openai.com/docs/api-reference/responses-streaming/response/refusal/delta)
- [OpenAI API data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint)
- [Google Time Zone API](https://developers.google.com/maps/documentation/timezone/overview)
- [Google Geocoding API](https://developers.google.com/maps/documentation/geocoding/overview)
- [Mapbox Geocoding v6 storage rules](https://docs.mapbox.com/api/search/geocoding/)
- [pyswisseph package metadata and license](https://pypi.org/project/pyswisseph/)
- [Swiss Ephemeris documentation and licensing paths](https://www.astro.com/swisseph-download/doc/swisseph.pdf)

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
