import * as Crypto from "expo-crypto";

/**
 * Workspace id generation (03-03 Task 1, Open Question 1 resolution).
 *
 * Chart and revision ids are UUIDv4 from expo-crypto's platform
 * `randomUUID` — cryptographic randomness from the platform API, never
 * `Math.random` (A3; research §"Don't Hand-Hand-rolled RNG"). UUIDv4 was
 * adopted over UUIDv7/ULID because list ordering rides `updated_at`
 * (D-11), not id lexigraphy; if time-ordered ids are ever wanted for
 * sync conflict handling, the swap stays confined to this single module.
 */

/** New immutable chart identity (D-05: one identity, many revisions). */
export function newChartId(): string {
  return Crypto.randomUUID();
}

/** New append-only revision id under an existing chart (D-06). */
export function newRevisionId(): string {
  return Crypto.randomUUID();
}
