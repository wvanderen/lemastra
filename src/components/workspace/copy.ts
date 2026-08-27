/**
 * Workspace copy deck (03-UI-SPEC §"Copy Deck" save-flow block +
 * §"Error states" workspace rows).
 *
 * Exact approved strings for the D-10 save flow (CTA, prompt modal,
 * saved/dedupe states) and the workspace error classes consumed by
 * ErrorCard. Components never paraphrase these; tests assert them
 * exactly (chart/copy.ts law). `{…}` values interpolated from
 * repository data arrive at call sites and render verbatim — never
 * reworded, never invented (trust-boundary display rules).
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
