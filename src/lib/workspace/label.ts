import { z } from "zod";

/**
 * Workspace label utilities (03-03 Task 1) — the D-10 save-prompt
 * vocabulary: a validated display label, its export-filename slug, and
 * the smart prefilled default.
 *
 * Pure functions + one zod schema, colocated and exported exactly like
 * birth.tsx's validation block (fail-closed pure-function idiom): no
 * React, no storage, trivially unit-testable. The repository revalidates
 * the label bounds on every write; the UI validates before asking.
 */

/** Longest accepted display label (D-10 / A-3-UI-4 bound). */
export const LABEL_MAX_LENGTH = 60;

/** Longest slug segment used in export filenames (Pitfall 6 cap). */
export const SLUG_MAX_LENGTH = 40;

/** Filename fragment when a label has no alphanumeric content at all. */
export const SLUG_FALLBACK = "chart";

/**
 * A chart display label: trimmed, 1–60 characters. Empty and
 * whitespace-only labels are rejected (rename/save CTAs stay disabled
 * until valid; the repository revalidates on write).
 */
export const labelSchema = z
  .string()
  .trim()
  .min(1, "Enter a name for this chart.")
  .max(LABEL_MAX_LENGTH, `Keep the name under ${LABEL_MAX_LENGTH + 1} characters.`);

/**
 * Sanitize a label into an export-filename slug (Pattern 6 / Pitfall 6):
 * lowercase; every non-alphanumeric RUN collapses to a single dash;
 * dashes trimmed; capped at SLUG_MAX_LENGTH with no trailing dash after
 * the cut; falls back to SLUG_FALLBACK when nothing survives. Path
 * separators, emoji, and whitespace can therefore never reach the
 * filesystem.
 */
export function slugify(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
  return slug.length > 0 ? slug : SLUG_FALLBACK;
}

/**
 * Smart prefilled label for the D-10 save prompt: "date · place" — the
 * same segment vocabulary and separator as the result screen's identity
 * line (resultIdentityLine), so a saved chart's default name reads like
 * the identity it will list under (D-11).
 */
export function smartDefaultLabel(date: string, placeLabel: string): string {
  return `${date} · ${placeLabel}`;
}
