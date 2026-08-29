import type { Confidence } from "@/lib/api-schemas";
import type { WorkspaceErrorCode } from "@/lib/workspace/repository";

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
// Saved-chart detail (/chart/saved)
// ---------------------------------------------------------------------------

/**
 * Loading state while the first detail query resolves — content renders
 * only after the stored envelope has been re-parsed (parse-then-trust,
 * T-03-17: never a first-render race, never a partial render).
 */
export const LOADING_CHART = "Loading chart…";

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

/**
 * Save-error code caption — a fixed structural prefix joined with the
 * closed WorkspaceErrorCode machine enum (template-over-fact, same law
 * as the deck's other interpolated entries). The failure CLASS reaches
 * the screen so a report quoting it identifies the failure without
 * console access; the code token ONLY — never the engine message
 * (message bodies may carry SQL fragments and stay in redact()-filtered
 * logs per 03-10).
 */
export function saveErrorCodeLine(code: WorkspaceErrorCode): string {
  return `Error code: ${code}`;
}

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

// ---------------------------------------------------------------------------
// Rename (D-12) — inline title swap on /chart/saved
// ---------------------------------------------------------------------------

/** Inline rename trigger beside the saved-chart title (Label/600 default text — A-3-UI-8, never accent). */
export const RENAME_ACTION = "Rename";

/** Rename confirm (Label/600 default text — accent stays reserved, A-3-UI-8). */
export const RENAME_SAVE = "Save name";

/** Rename cancel (Label, textSecondary). */
export const RENAME_CANCEL = "Cancel";

// LABEL_FIELD_ERROR (above) is shared by the save prompt and the inline
// rename — one bound, one error string (A-3-UI-4).

// ---------------------------------------------------------------------------
// Deletion (D-14/D-15) — the shared destructive-confirm dialog copy
// ---------------------------------------------------------------------------

/** Chart-variant heading — names the chart being deleted (curly quotes per UI-SPEC). */
export function deleteChartHeading(label: string): string {
  return `Delete “${label}”?`;
}

/** Chart-variant body — names the revision count, permanence, and can't-undo (T-03-19). */
export function deleteChartBody(revisionCount: number): string {
  return `This permanently removes this chart and its ${revisionCount} saved revision(s) from this device. This can't be undone.`;
}

/** Chart-variant confirm — full action label (a11y contract). */
export const DELETE_CHART_CONFIRM = "Delete chart";

/** Shared dialog cancel — default-toned, always available. */
export const DELETE_CANCEL = "Cancel";

/** Pending state on the confirm button while a delete is in flight (D-14). */
export const DELETING = "Deleting…";

/** Delete-all heading (D-15 — rendered by the all variant, reused by 03-08). */
export const DELETE_ALL_HEADING = "Delete all your data?";

/** Delete-all body — scope, permanence, and the surviving non-personal preference. */
export const DELETE_ALL_BODY =
  "This permanently removes every saved chart and revision stored on this device by LemAstra. This can't be undone. Your privacy acknowledgement preference stays.";

/** Delete-all confirm — full action label (a11y contract). */
export const DELETE_ALL_CONFIRM = "Delete everything";

// ---------------------------------------------------------------------------
// Data actions card (/chart/saved end-of-screen card, D-13/D-14)
// ---------------------------------------------------------------------------

/** Export action row label (Body/600, default text). */
export const EXPORT_CHART_DATA = "Export chart data";

/** Export helper — what the file contains (Label, textSecondary). */
export const EXPORT_CHART_HELPER =
  "Creates a JSON file with this chart's full data and provenance.";

/** Export pending state on the trigger (the deck's export-pending literal). */
export const EXPORT_PENDING = "Creating file…";

/** Delete helper — the cascade scope with the revision count (Label, textSecondary). */
export function deleteChartActionHelper(revisionCount: number): string {
  return `Removes this chart and its ${revisionCount} revision(s) from this device.`;
}

// ---------------------------------------------------------------------------
// "What changed" vocabulary (D-07, A-3-UI-7) — the fixed 8-item phrase set
// consumed by revision-diff.ts. Pure input diffs → these exact phrases;
// never a raw JSON diff, never an invented interpretation (T-03-24).
// ---------------------------------------------------------------------------

/** The chart's chronologically first revision — no predecessor to diff. */
export const WHAT_CHANGED_ORIGINAL_DETAILS = "Original details";

/** Birth date field changed (single-field phrase). */
export const WHAT_CHANGED_BIRTH_DATE = "Birth date changed";

/** Birth time field changed (single-field phrase). */
export const WHAT_CHANGED_BIRTH_TIME = "Birth time changed";

/** Place selection changed (normalized summary or union branch). */
export const WHAT_CHANGED_BIRTHPLACE = "Birthplace changed";

/** Zone identity or zone-resolution source changed. */
export const WHAT_CHANGED_TIME_ZONE = "Time zone changed";

/** The D-08 tricky-time resolution choice changed. */
export const WHAT_CHANGED_TIME_ZONE_RESOLUTION = "Time-zone resolution changed";

/** Birth-time confidence changed. */
export const WHAT_CHANGED_TIME_CONFIDENCE = "Time confidence changed";

/** Requested house system changed. */
export const WHAT_CHANGED_HOUSE_SYSTEM = "House system changed";

/** Fallback when multiple fields differ — the closed vocabulary's last item. */
export const WHAT_CHANGED_DETAILS = "Details changed";

// ---------------------------------------------------------------------------
// History section (/chart/saved, D-07)
// ---------------------------------------------------------------------------

/** History section heading — renders ONLY when >1 revision exists. */
export const HISTORY_HEADING = "History";

/** Chip on the newest History row alone; that row is non-navigational. */
export const LATEST_CHIP = "Latest";

/** History row text — "{date} · {what changed}" (the marker body reuses it). */
export function historyLine(date: string, phrase: string): string {
  return `${date} · ${phrase}`;
}

/** Row a11y label — "{date}, {what changed}{, Latest}. Opens a read-only version." */
export function historyRowA11yLabel(date: string, phrase: string, latest: boolean): string {
  return `${date}, ${phrase}${latest ? `, ${LATEST_CHIP}` : ""}. Opens a read-only version.`;
}

// ---------------------------------------------------------------------------
// Read-only revision view (/chart/revision, D-07)
// ---------------------------------------------------------------------------

/** Marker-card heading on the read-only earlier-revision route. */
export const READ_ONLY_MARKER_HEADING = "Earlier version — read-only";

/** Back link at the end of the read-only revision view. */
export const BACK_TO_HISTORY = "Back to History";

// ---------------------------------------------------------------------------
// Revise flow (D-08) — prefill path + Save new version
// ---------------------------------------------------------------------------

/** /birth screen title in revise mode (fields otherwise identical to Phase 2). */
export const REVISE_TITLE = "Revise birth details";

/** Assumptions action on the saved detail — launches the revise flow. */
export const REVISE_ACTION = "Revise birth details";

/** Revise helper — the WORK-04 trust language, visible not implied. */
export const REVISE_HELPER =
  "Creates a new version with your edits. The current one stays in History.";

/** Result-screen Save CTA when launched from a saved chart (appends a revision). */
export const SAVE_NEW_VERSION_CTA = "Save new version";
