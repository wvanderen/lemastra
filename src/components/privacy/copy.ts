/**
 * Privacy-surface copy deck (03-UI-SPEC §"'Your data' section
 * (/privacy additions, D-15)") — the exact approved strings for the
 * /privacy user-controls section.
 *
 * Copy-deck law (chart/copy.ts discipline): components never paraphrase
 * these; tests assert them exactly. Every exported string is a label,
 * a helper over stored facts, or a structural marker — interpretation
 * prose is FORBIDDEN here by construction.
 *
 * Governance invariant (privacy.tsx module law, T-03-27): this section
 * adds USER CONTROLS ONLY — no provider or retention claims beyond the
 * registry's already-published strings. The intro's "no account and no
 * server copy" restates the registry's device-only retention posture
 * (trust-boundary display rule: private-by-default is visible, not just
 * true); the Phase-1 consistency tests stay the enforcement gate.
 *
 * Strings the workspace deck already owns are consumed from there —
 * never forked here: EXPORT_PENDING ("Creating file…" — one
 * export-pending vocabulary), EXPORT_ERROR_COPY / DELETE_ALL_ERROR_COPY
 * (§"Error states"), and the all-variant destructive dialog strings
 * (DELETE_ALL_HEADING/BODY/CONFIRM via DeleteConfirm).
 */

/** Section heading (Heading 24/600 — screen-title scale, A-3-UI-6). */
export const YOUR_DATA_HEADING = "Your data";

/**
 * Section intro (Label, textSecondary) — where data stays and what the
 * controls do. The privacy posture is stated, not implied.
 */
export const YOUR_DATA_INTRO =
  "Everything you save stays on this device — there's no account and no server copy. Export it as a file, or delete it.";

/** Card 1 label (Body/600, default text). */
export const EXPORT_ALL_DATA = "Export all data";

/** Card 1 helper (Label, textSecondary) — names the artifact. */
export const EXPORT_ALL_HELPER =
  "Creates one JSON file with every chart and revision saved on this device.";

/** Card 2 label (Body/600, ERROR text — the destructive trigger). */
export const DELETE_ALL_DATA = "Delete all data";

/** Card 2 helper (Label, textSecondary) — names scope + permanence. */
export const DELETE_ALL_HELPER =
  "Permanently removes every chart and revision on this device.";

/**
 * Post-wipe completion state — replaces the section's action cards
 * (Label, textSecondary; neutral, never a success hue).
 */
export const NO_PERSONAL_DATA = "No personal data is stored on this device.";

/** Web-disabled card helper (D-03 — capability state, not an error). */
export const WEB_DATA_HELPER = "Available in the LemAstra app on iOS or Android.";
