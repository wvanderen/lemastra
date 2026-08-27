import type { Confidence } from "@/lib/api-schemas";

/**
 * Workspace copy deck (03-UI-SPEC §"Copy Deck" home-workspace +
 * save-flow blocks + §"Error states" workspace rows).
 *
 * Exact approved strings for the D-09/D-11 home list, the D-03 web
 * degradation card, the D-10 save flow (CTA, prompt modal, saved/dedupe
 * states), and the workspace error classes consumed by ErrorCard.
 * Components never paraphrase these; tests assert them exactly
 * (chart/copy.ts law). `{…}` values interpolated from repository data
 * arrive at call sites and render verbatim — never reworded, never
 * invented (trust-boundary display rules).
 *
 * Interpretation prose is FORBIDDEN here by construction (T-02-34
 * discipline): every exported string is a label, a template over
 * stored facts, or a structural marker.
 */

/** Result-screen primary CTA (accent fill — this phase's primary action). */
export const SAVE_CTA = "Save chart";

/** Save-prompt modal heading (Body/600 — dialog headings stay subordinate). */
export const SAVE_PROMPT_HEADING = "Save this chart";

/** Label above the chart-name field. */
export const CHART_NAME_LABEL = "Chart name";

/** Save-prompt helper — where saved data stays (privacy visible, PRIV-01). */
export const SAVE_PROMPT_HELPER =
  "Saved charts stay on this device. Nothing is sent anywhere.";

/** Field error for an invalid label (A-3-UI-4 bounds: trimmed 1–60). */
export const LABEL_FIELD_ERROR = "Enter a name (up to 60 characters).";

/** Save-prompt confirm button (accent, disabled while invalid or pending). */
export const SAVE_PROMPT_CONFIRM = "Save chart";

/** Save-prompt cancel button (default-toned). */
export const SAVE_PROMPT_CANCEL = "Cancel";

/**
 * Post-save CTA state — neutral chip on backgroundSelected fill. The
 * checkmark never travels without the word "Saved" (no meaning by
 * glyph alone — a11y contract).
 */
export const SAVED_STATE = "Saved ✓";

/** Dedupe helper — the (chart, input_revision) pair already exists (D-06). */
export const DEDUPE_HELPER = "Already saved with these exact details.";

// ---------------------------------------------------------------------------
// Home workspace (03-UI-SPEC §"Copy Deck", Home workspace additions)
// ---------------------------------------------------------------------------

/** Home CTA once ≥1 chart is saved — "your first" only while empty (A-3-UI-5). */
export const HOME_CTA_WITH_CHARTS = "Calculate a chart";

/** Home section heading — renders ONLY when ≥1 saved chart exists (D-09). */
export const SAVED_CHARTS_HEADING = "Saved charts";

/** List-row identity line — "{date} · {place}" (result identity vocabulary, D-11). */
export function chartRowIdentity(date: string, placeLabel: string): string {
  return `${date} · ${placeLabel}`;
}

/**
 * Confidence chip marker — rendered ONLY when confidence ≠ "Timed"
 * (D-11 present-only slot; "Unknown" spells out "Unknown time").
 */
export function confidenceMarker(confidence: Confidence): string | null {
  if (confidence === "Timed") return null;
  if (confidence === "Unknown") return "Unknown time";
  return confidence; // "Approximate" | "Rectified" — marker equals the label
}

/** Revision-count chip — "{n} revisions", rendered ONLY when n > 1 (D-11). */
export function revisionsLabel(count: number): string {
  return `${count} revisions`;
}

/** Row a11y label — "{label}, {date}, {place}{, confidence}{, n revisions}. Opens the chart." */
export function chartRowA11yLabel(row: {
  label: string;
  date: string;
  placeLabel: string;
  confidence: Confidence;
  revisionCount: number;
}): string {
  const segments = [row.label, row.date, row.placeLabel];
  const marker = confidenceMarker(row.confidence);
  if (marker !== null) segments.push(marker);
  if (row.revisionCount > 1) segments.push(revisionsLabel(row.revisionCount));
  return `${segments.join(", ")}. Opens the chart.`;
}

/** Web degradation card heading (D-03 — capability state, not an error). */
export const WEB_UNSUPPORTED_HEADING = "Saved charts are available in the app";

/** Web degradation card body (A-3-UI-9 — states the privacy reason). */
export const WEB_UNSUPPORTED_BODY =
  "Charts are stored only on your device. Saving, reopening, and exporting work in the LemAstra app on iOS or Android.";

// ---------------------------------------------------------------------------
// Workspace error deck (03-UI-SPEC §"Error states")
// ---------------------------------------------------------------------------

/** Copy for one error card. `heading` is always present; the rest are optional. */
export interface WorkspaceErrorCopy {
  heading: string;
  body?: string;
  /** Recovery action label; rendered only when the card receives an `onAction`. */
  action?: string;
}

/** Storage save failed — the screen state is intact, retry is safe. */
export const SAVE_ERROR_COPY: WorkspaceErrorCopy = {
  heading: "Couldn't save the chart.",
  body: "Your chart is still open on this screen — nothing was lost. Try saving again.",
  action: "Try again",
};

/** Saved chart open failed — stored envelope failed its parse (typed, never a crash). */
export const OPEN_FAILED_ERROR_COPY: WorkspaceErrorCopy = {
  heading: "Couldn't open this saved chart.",
  body: "It was saved in a format this app version can't read. Your other charts are unaffected — try updating the app.",
};

/** Export failed — the file could not be created. */
export const EXPORT_ERROR_COPY: WorkspaceErrorCopy = {
  heading: "Couldn't create the export file.",
  body: "Try again. Your saved charts are unaffected.",
  action: "Try again",
};

/** Single-chart delete failed — nothing was removed. */
export const DELETE_ERROR_COPY: WorkspaceErrorCopy = {
  heading: "Couldn't delete this chart.",
  body: "Nothing was removed. Try again.",
  action: "Try again",
};

/** Delete-all failed — nothing was removed. */
export const DELETE_ALL_ERROR_COPY: WorkspaceErrorCopy = {
  heading: "Couldn't delete your data.",
  body: "Nothing was removed. Try again.",
  action: "Try again",
};
