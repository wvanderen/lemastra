/**
 * Evidence kinds — the shared trust vocabulary (D-14/D-15, EVID-01).
 *
 * LemAstra keeps calculated facts, methodological judgments, generated
 * interpretation, and uncertainty distinguishable EVERYWHERE they
 * appear. This module is the single definition site of that vocabulary:
 * every Phase-4 surface (wheel, lists, fact panel, assumptions) and the
 * Phase-6 reading output consume these kinds instead of inventing
 * parallel taxonomies.
 *
 * All four kinds are defined NOW, including copy and a11y phrasing for
 * the interpretation kind (phrases.ts) — but `renderableEvidenceKinds`
 * deliberately excludes it: nothing renders interpretation until
 * Phase 6 (D-15). The suite pins that seam.
 *
 * Pure data module: no React, no react-native, no Skia imports —
 * plain-Node testable and consumable by any renderer.
 */

/** The four evidence kinds (EVID-01). */
export type EvidenceKind =
  | "calculated"
  | "judgment"
  | "interpretation"
  | "uncertainty";

/**
 * Runtime mirror of the {@link EvidenceKind} union — the complete kind
 * list, interpretation included. Tests pin membership so the union and
 * this array can never drift apart.
 */
export const EVIDENCE_KINDS: readonly EvidenceKind[] = [
  "calculated",
  "judgment",
  "interpretation",
  "uncertainty",
];

/**
 * The kinds a surface may render THIS phase: calculated facts render
 * plain, judgments render as labeled sections, uncertainty renders as
 * cards/markers (D-13). The interpretation kind is ABSENT — defined for
 * Phase 6, rendered by no one until then (D-15).
 */
export const renderableEvidenceKinds: readonly EvidenceKind[] = [
  "calculated",
  "judgment",
  "uncertainty",
];

/** The subset of kinds a surface may render (element type of {@link renderableEvidenceKinds}). */
export type RenderableEvidenceKind = Exclude<EvidenceKind, "interpretation">;

/**
 * Type guard for the D-15 seam: renderers switch on this so an
 * interpretation value is unreachable in any render path this phase.
 */
export function isRenderableEvidenceKind(
  kind: EvidenceKind
): kind is RenderableEvidenceKind {
  return kind !== "interpretation";
}
