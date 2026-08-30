/**
 * Workspace typed errors — extracted from repository.ts (03-10 Task 1).
 *
 * Why a dedicated module: the DB gate (db.ts) must throw the typed
 * WorkspaceError on open/migrate/shape failures, but repository.ts
 * imports db.ts — a db.ts → repository.ts import would close a cycle.
 * This module imports NOTHING, so both sides (and every screen/hook/
 * test) can share the vocabulary. repository.ts re-exports both
 * bindings so every existing `from "@/lib/workspace/repository"`
 * import path keeps working unchanged.
 */

/**
 * Failure vocabulary for every workspace operation:
 * - OPEN_FAILED — the database could not be opened/migrated, or stored
 *   data failed its zod contract on read (Pitfall 1 typed reopen).
 * - SAVE_FAILED — a write transaction failed.
 * - NOT_FOUND — the requested chart/revision id does not exist.
 * - VALIDATION — envelope/label/inputs failed validation at save (D-02).
 * - UNAVAILABLE — the D-03 web gate: storage requires the native app.
 */
export type WorkspaceErrorCode =
  | "OPEN_FAILED"
  | "SAVE_FAILED"
  | "NOT_FOUND"
  | "VALIDATION"
  | "UNAVAILABLE";

/** Typed error for every workspace failure — mirrors ApiError's shape. */
export class WorkspaceError extends Error {
  readonly code: WorkspaceErrorCode;

  constructor(body: { code: WorkspaceErrorCode; message: string }) {
    super(body.message);
    this.name = "WorkspaceError";
    this.code = body.code;
  }
}
