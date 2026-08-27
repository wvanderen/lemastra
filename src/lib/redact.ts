/**
 * Log redaction allowlist + the sanctioned logger (D-16 — PRIV-03/PRIV-04).
 *
 * THE LAW (docs/governance/retention-deletion-policy.md §4): birth data,
 * chart payloads/prose, user questions, and conversation content never
 * leave the device through logs or telemetry. This module makes that
 * posture mechanical instead of promised:
 *
 * - `redact()` is an ALLOWLIST (default-deny): only explicitly sanctioned
 *   coarse keys survive — error codes, durations, counts, chart/revision
 *   ids that carry no birth data. Everything else (envelope shapes like
 *   chart_data/provenance/placements, birth-data shapes like date/time/
 *   place/label/iana_zone, and any key the blocklist never anticipated)
 *   is dropped before any output call is possible.
 * - `logger` is the ONLY module in src/ permitted to touch the console
 *   global — enforced by src/__tests__/telemetry-guard.test.ts (threats
 *   T-03-04/T-03-05). Every logger call routes its metadata through
 *   redact() first; `message` must be a developer-authored compile-time
 *   string, never user or chart content.
 * - Phase 7+ telemetry (Sentry or equivalent): the SDK's beforeSend/scrub
 *   hook MUST route through redact() so the same allowlist guardrail is
 *   inherited, not retrofitted (03-02-PLAN key_links, T-03-05).
 */

/**
 * Coarse, non-sensitive keys that may appear in log metadata. Frozen
 * allowlist — extending it is a deliberate, review-visible act (never a
 * quiet fix to make a log line pass): new entries must carry no birth
 * data, chart payload, question, or prose.
 */
const ALLOWED_KEY_LIST = [
  "error_code",
  "duration_ms",
  "count",
  "attempt",
  "chart_id",
  "revision_id",
] as const;

/** The allowlist `redact()` enforces (allowlist, not blocklist — default-deny). */
export const ALLOWED_LOG_KEYS: ReadonlySet<string> = new Set<string>(ALLOWED_KEY_LIST);

/** JSON-safe primitive values a log line may carry. */
export type LogPrimitive = string | number | boolean | null;

/**
 * A redacted value: a primitive, or a one-level-deep object of primitives
 * (an allowlisted container that was shallow-filtered — never deeper).
 */
export type LogValue = LogPrimitive | Record<string, LogPrimitive>;

/** The shape `redact()` emits — every leaf passed the allowlist. */
export type RedactedMetadata = Record<string, LogValue>;

function isLogPrimitive(value: unknown): value is LogPrimitive {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/**
 * Filter a plain object ONE level deep with the same allowlist: only
 * allowlisted keys with primitive values survive. Deeper objects and
 * arrays are dropped wholesale — untrusted structure is never
 * deep-merged into log output.
 */
function shallowAllowlistedObject(value: object): Record<string, LogPrimitive> {
  const record = value as Record<string, unknown>;
  const filtered: Record<string, LogPrimitive> = {};
  for (const key of Object.keys(record)) {
    if (ALLOWED_LOG_KEYS.has(key) && isLogPrimitive(record[key])) {
      filtered[key] = record[key];
    }
  }
  return filtered;
}

/**
 * Redact log metadata down to the allowlist. Returns a NEW object; the
 * input is never mutated. Only explicitly sanctioned coarse keys with
 * primitive values (or a one-level allowlisted object of them) appear in
 * the output — the result can never contain a value the caller did not
 * explicitly sanction via ALLOWED_LOG_KEYS.
 */
export function redact(metadata: Record<string, unknown>): RedactedMetadata {
  const output: RedactedMetadata = {};
  for (const key of Object.keys(metadata)) {
    if (!ALLOWED_LOG_KEYS.has(key)) continue; // default-deny
    const value = metadata[key];
    if (isLogPrimitive(value)) {
      output[key] = value;
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      output[key] = shallowAllowlistedObject(value);
    }
    // Arrays, functions, bigint, symbols, undefined: dropped wholesale.
  }
  return output;
}

/** Signature every sanctioned log call shares. */
export type LogFn = (message: string, metadata?: Record<string, unknown>) => void;

/** The sanctioned logger — the only console-adjacent surface in src/. */
export type Logger = {
  readonly info: LogFn;
  readonly warn: LogFn;
  readonly error: LogFn;
};

/**
 * The single sanctioned output path (D-16). All metadata passes through
 * redact() before the console call; without metadata an empty redacted
 * payload is still passed so the flowing shape is always the redacted
 * one (the seam a Phase-7+ beforeSend hook inherits).
 */
export const logger: Logger = {
  info(message, metadata) {
    console.info(message, redact(metadata ?? {}));
  },
  warn(message, metadata) {
    console.warn(message, redact(metadata ?? {}));
  },
  error(message, metadata) {
    console.error(message, redact(metadata ?? {}));
  },
};
