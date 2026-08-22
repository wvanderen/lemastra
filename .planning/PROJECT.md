# LeMastra

## What This Is

LeMastra is a cross-platform personal astrology workspace for curious beginners and serious enthusiasts. Users calculate and save natal charts, inspect an interactive chart wheel and structured astrological evidence, analyze transits for a chosen moment, converse with a grounded AI interpreter, and turn the resulting analysis into a polished exportable report.

The product builds on `astrology-skill`, whose curated datasets and repeatable methodologies are intended to give language models a high-quality, consistent basis for readings. The longer vision connects personal timelines, animated sky movements, astrologers' observations, historical moments, and eventually aggregate social insight, but the first release establishes a trustworthy chart-first foundation.

## Core Value

Users can move from an accurately calculated chart and transparent astrological evidence to a high-quality, methodical AI interpretation they can inspect, discuss, and preserve as a report.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Users can enter birth data and calculate an accurate natal chart.
- [ ] Users can save and reopen natal charts in a personal workspace.
- [ ] Users can render and explore a clear chart wheel with placements, houses, and aspects.
- [ ] Users can choose a moment and compare its transits with a natal chart.
- [ ] Users can inspect the structured astrological evidence behind an analysis before interpretation.
- [ ] Users can chat about the selected chart and transit evidence using interpretations grounded in `astrology-skill` datasets and methodologies.
- [ ] Users can generate and export a polished report from their chart analysis and conversation.
- [ ] Beginners receive approachable guidance while experienced users can inspect technical detail through progressive disclosure.
- [ ] The core experience works across the supported React Native platforms.

### Out of Scope

- Advanced techniques beyond natal and transit analysis — deferred until the foundational calculation, evidence, interpretation, and reporting loop is trustworthy.
- Animated astrology calendar and continuously moving chart wheel — future evolution after static moment-based transit analysis.
- Personal event journaling tied to historical sky states — future timeline capability built on saved charts and moments.
- Public observations about past, present, or future moments — future publishing and learning layer.
- Social networking and aggregate analysis — valuable longer-term direction that introduces identity, privacy, moderation, and data-governance concerns beyond v1.
- Professional client-practice management — v1 is a personal workspace rather than an astrologer's CRM.

## Context

The project starts in a brand-new repository. The intended technical direction is React Native so the experience can span platforms while retaining a coherent visual and interaction model.

The interaction is deliberately chart-first. A user selects or calculates a chart, chooses a moment for transit analysis, examines the wheel and structured findings, and then asks the AI to interpret that evidence. The AI is not meant to improvise generic astrology: `astrology-skill` is a central product dependency and supplies high-quality reference datasets plus repeatable reading methodologies.

The audience spans astrology-curious individuals and serious enthusiasts. The interface therefore needs progressive disclosure: approachable explanations and guidance by default, with placements, aspects, timing details, methodology, and other technical evidence available rather than hidden.

The longer vision treats astrology as both a personal temporal record and a shared historical learning medium. Individuals could record what they were doing when something happened in the sky; astrologers could attach observations to moments; aggregated observations could reveal patterns worth studying. Those possibilities should inform extensibility without expanding the first release beyond natal charts, transits, grounded chat, and reports.

## Constraints

- **Tech stack**: Use React Native for the cross-platform client — explicitly chosen for the project direction.
- **Domain dependency**: Treat `dev/astrology-skill` as the authoritative starting point for interpretive datasets and repeatable methodologies — grounded analysis is the main differentiator.
- **Trust**: Keep calculated facts and structured astrological evidence distinguishable from generated interpretation — users should be able to see what a reading is based on.
- **Initial scope**: Center v1 on natal charts and transits — advanced techniques and temporal/social systems are deferred.
- **Audience**: Support both beginners and serious enthusiasts through progressive disclosure — neither accessibility nor technical transparency should eliminate the other.
- **Privacy readiness**: Avoid architecture that assumes birth data, personal events, or conversations are public — future social and aggregate uses require explicit consent and governance.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build a personal astrology workspace first | Establishes an immediately useful individual product before professional or social complexity | — Pending |
| Make the experience chart-first | Keeps evidence and user intent visible before AI interpretation | — Pending |
| Use `astrology-skill` as a core product foundation | High-quality datasets and repeatable methods are essential to accurate, coherent readings | — Pending |
| Scope the first release to natal charts plus transits | Creates a complete foundational and time-based workflow without prematurely adding every technique | — Pending |
| Serve beginners and serious enthusiasts through progressive disclosure | Broadens access while preserving the technical depth needed for trust and learning | — Pending |
| Use React Native | Supports the desired cross-platform UI direction from a shared client architecture | — Pending |
| Defer animated calendars, event timelines, historical observations, and social aggregation | Preserves the long-term vision while keeping v1 executable and privacy-conscious | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-22 after initialization*
