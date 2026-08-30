# Phase 5: Natal Transit Workspace - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-30
**Phase:** 5-Natal Transit Workspace
**Areas discussed:** Transit moment entry & defaults, Natal anchoring & immutability, Bi-wheel & contact inspection, Saved-transit workspace integration

---

## Transit moment entry & defaults

| Option | Description | Selected |
|--------|-------------|----------|
| Saved chart only (Recommended) | Transits launch from saved-chart detail + explore screens; the natal anchor always exists; fresh /chart/result has no transit entry | ✓ |
| Also fresh result | Allow launching from an unsaved result; snapshotting then requires saving the chart first | |
| You decide | Defer to planner on flow complexity vs. curiosity UX | |

**User's choice:** Saved chart only (Recommended)
**Notes:** Cleanest match to TRAN-06's "tied to an exact natal revision".

| Option | Description | Selected |
|--------|-------------|----------|
| Now preselected (Recommended) | Picker opens with "now" (device clock/timezone); full date/time editing for any other moment | ✓ |
| Always explicit | Picker opens empty; user enters date/time/timezone every time | |
| Last-used moment | Remember last-used moment per device (AsyncStorage pattern) | |

**User's choice:** Now preselected (Recommended)
**Notes:** Common case "what's active today" is one flow.

| Option | Description | Selected |
|--------|-------------|----------|
| Device + picker (Recommended) | Device timezone for "now"; explicit zone picker (Phase-2 zones list); birth zone one-tap shortcut | ✓ |
| Birth zone always | Calculator's own target-tz default; consistent per chart but wrong for relocated "now" | |
| Explicit on edit | Force explicit timezone choice when editing away from "now" | |

**User's choice:** Device + picker (Recommended)
**Notes:** None.

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit, like birth (Recommended) | Reuse Phase-2 civil-time classification + tricky-time picker; ambiguous → first/second pass; nonexistent → shifted with explanation | ✓ |
| Auto-shift + note | Nonexistent auto-shifts, ambiguous takes fold 0, visible note after calculation | |
| You decide | Planner decides based on calculator's wallclock_to_ut fold/gap behavior | |

**User's choice:** Explicit, like birth (Recommended)
**Notes:** Extends the BIRTH-03 "never silently choose" law to TRAN-01's "exact" moment.

---

## Natal anchoring & immutability

| Option | Description | Selected |
|--------|-------------|----------|
| Digest + drift check (Recommended) | input_revision match mandatory (mismatch = typed error); recomputed natal placements compared against stored envelope with visible drift warning | ✓ |
| Digest anchor only | Same-inputs digest check; position drift from skill/ephemeris version changes not compared | |
| No verification | Store whatever the calculator returns, anchored by id reference only | |

**User's choice:** Digest + drift check (Recommended)
**Notes:** CI's GATE-02 transit fixtures pin the same drift.

| Option | Description | Selected |
|--------|-------------|----------|
| Full envelope (Recommended) | Complete immutable response (natal + transit_chart + provenance) + anchor ids; reopen = parse-then-trust, zero joins | ✓ |
| Transit block + refs | Store only transit_chart + provenance + anchor ids; reopen joins stored natal revision | |
| You decide | Planner picks based on schema/migration shape | |

**User's choice:** Full envelope (Recommended)
**Notes:** Extends Phase 3 D-02's stored-envelope law to transit artifacts; duplication fine at personal scale.

| Option | Description | Selected |
|--------|-------------|----------|
| Independent snapshots (Recommended) | Each moment is its own immutable record; changing the moment = new calculation, never mutation | ✓ |
| Moment revision chain | Moments append as a revision chain with history, mirroring natal revise flow | |

**User's choice:** Independent snapshots (Recommended)
**Notes:** A moment isn't a correction of the previous moment.

| Option | Description | Selected |
|--------|-------------|----------|
| Latest + selectable (Recommended) | Latest revision by default; older revision's read-only view anchors to THAT revision; basis visible in transit header | ✓ |
| Latest only | Transits always anchor to latest; older revisions have no transit entry | |

**User's choice:** Latest + selectable (Recommended)
**Notes:** Prior snapshots always keep their original basis (immutability law).

---

## Bi-wheel & contact inspection

| Option | Description | Selected |
|--------|-------------|----------|
| Natal inner, transit outer (Recommended) | Standard convention; natal bodies/houses/zodiac anchor inside, transiting bodies outside, cross-chart chords between rings | ✓ |
| Transit inner, natal outer | Inverted arrangement; rare in practice | |
| You decide | Planner investigates mobile-density alternatives | |

**User's choice:** Natal inner, transit outer (Recommended)
**Notes:** Transits read against NATAL houses per the calculator; geometry module gains a second body ring.

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated route (Recommended) | New route composing the same Phase-4 blocks + transit chrome (moment header, contacts list); explore stays natal-only | ✓ |
| Mode in explore | Extend /chart/explore with a transit mode; shared surface, conditional complexity | |
| You decide | Planner picks routing shape | |

**User's choice:** Dedicated route (Recommended)
**Notes:** Id-style params only.

| Option | Description | Selected |
|--------|-------------|----------|
| Orb-sorted + dual facts (Recommended) | Flat tightest-orb-first list, exact flagged top; selection highlights both bodies + chord; fact panel shows transiting facts AND natal body's natal context | ✓ |
| Grouped by transit body | Contacts grouped under each transiting body; hides tightest cross-group contacts | |
| You decide | Researcher explores sorting alternatives with fixtures | |

**User's choice:** Orb-sorted + dual facts (Recommended)
**Notes:** Two-way wheel↔list sync per Phase 4 D-10 law.

| Option | Description | Selected |
|--------|-------------|----------|
| Plain motion kept (Recommended) | Simple keeps plain-language motion markers ("strengthening"/"easing") via evidence-vocabulary + glossary; orbs/degrees stay Technical-only | ✓ |
| Strict D-06 parity | Simple hides applying/separating entirely (only "exact now" visible) | |
| You decide | Planner drafts both vocabularies and picks with fixtures | |

**User's choice:** Plain motion kept (Recommended)
**Notes:** Applying/separating is core transit meaning, not deep-technical detail.

---

## Saved-transit workspace integration

| Option | Description | Selected |
|--------|-------------|----------|
| Chart detail section (Recommended) | "Transits" section inside saved-chart detail (moment label, date, anchor revision); home list stays charts-only | ✓ |
| Also home rows | Saved transits interleaved with charts in the home workspace list | |
| You decide | Planner decides placement based on list-query shape | |

**User's choice:** Chart detail section (Recommended)
**Notes:** Transits belong to their chart; identity = natal chart.

| Option | Description | Selected |
|--------|-------------|----------|
| Ephemeral-first (Recommended) | Calculate → inspect full bi-wheel/contacts → explicit "Save transit" CTA + label prompt with smart default (Phase 3 D-10 pattern) | ✓ |
| Auto-save anchored | Every calculation saved automatically once the chart exists | |

**User's choice:** Ephemeral-first (Recommended)
**Notes:** Nothing stored the user didn't ask to store.

| Option | Description | Selected |
|--------|-------------|----------|
| Allow + degrade honestly (Recommended) | Planet-to-planet contacts only, no angle contacts, no natal-house placement, explicit why-note (calculator degrades gracefully natively) | ✓ |
| Timed charts only | Block transit entry on untimed charts with an explanation | |

**User's choice:** Allow + degrade honestly (Recommended)
**Notes:** Phase 2 D-10 law; no invented noon chart.

| Option | Description | Selected |
|--------|-------------|----------|
| Both exports (Recommended) | Single-chart export includes snapshots; export-all includes every snapshot (PRIV-05 law); delete cascade already locked (Phase 3 D-14) | ✓ |
| Export-all only | Only export-all covers snapshots; single-chart export stays natal-only | |
| Neither | Snapshots excluded from both exports | |

**User's choice:** Both exports (Recommended)
**Notes:** Snapshots are provenance-complete full envelopes; exports stay machine-reusable.

---

## Agent's Discretion

Captured in CONTEXT.md: API contract shape (extend vs. new endpoint), transit input_revision derivation and drift-comparison semantics, bi-wheel geometry extension details, moment-picker component design, snapshot DB schema/dedupe, contacts-list scale handling, drift-warning presentation, transit golden fixture case selection, route naming, copy-deck/glossary structure.

## Deferred Ideas

None — discussion stayed within phase scope.
