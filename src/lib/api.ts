import { Platform } from "react-native";

import {
  calculateResponseSchema,
  placeSearchResponseSchema,
  resolveTimeResponseSchema,
  zonesResponseSchema,
  errorSchema,
  type CalculateResponse,
  type ErrorCode,
  type HouseSystem,
  type PlaceSearchResponse,
  type ResolveTimeResponse,
  type TimeResolutionMode,
  type ZonesResponse,
} from "./api-schemas";
import type { ZodType } from "zod";

/**
 * Typed fetch client for the LemAstra API service (local dev, D-02).
 *
 * Parse-then-trust (T-02-06): every response — success or error — passes
 * through its zod contract BEFORE anything is returned to calling code.
 * Malformed data throws loudly instead of flowing into components.
 *
 * Base URL resolution follows 02-RESEARCH.md §CORS/local-dev:
 * EXPO_PUBLIC_API_URL (plain-text inlined, non-secret by construction — see
 * .env.example) wins when set; otherwise the platform default. The Android
 * emulator reaches the host machine via the 10.0.2.2 loopback alias, not
 * localhost.
 */

const ANDROID_EMULATOR_BASE = "http://10.0.2.2:8000";
const DEFAULT_BASE = "http://localhost:8000";

/**
 * Resolve the API base URL. Pure (env + platform passed in) so the
 * platform-default matrix is testable without touching global state.
 */
export function resolveBaseUrl(apiUrl: string | undefined, platformOs: string): string {
  if (apiUrl && apiUrl.length > 0) {
    return apiUrl.replace(/\/+$/, "");
  }
  return platformOs === "android" ? ANDROID_EMULATOR_BASE : DEFAULT_BASE;
}

function baseUrl(): string {
  return resolveBaseUrl(process.env.EXPO_PUBLIC_API_URL, Platform.OS);
}

/**
 * Typed error thrown for every non-2xx API response. Carries the parsed
 * CALC-04 `code`, the server's user-facing `message`, and the optional
 * recovery `hint` so the UI can render the matching error banner.
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly recoverable: boolean;
  readonly hint?: string;

  constructor(body: {
    code: ErrorCode;
    message: string;
    recoverable: boolean;
    hint?: string;
  }) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.recoverable = body.recoverable;
    this.hint = body.hint;
  }
}

// ---------------------------------------------------------------------------
// Request payloads (server revalidates via pydantic — these are the shapes
// the birth-flow screens assemble; see 02-RESEARCH.md §endpoint table)
// ---------------------------------------------------------------------------

export interface PlaceSearchRequest {
  query: string;
}

export interface ResolveTimeRequest {
  lat: number;
  lon: number;
  local_date: string;
  local_time: string;
  tz_override?: string;
}

export interface CalculateRequest {
  date: string;
  time?: string;
  time_resolution?: {
    mode: TimeResolutionMode;
    /**
     * Fold=1 UTC offset in seconds — required by the server for second_pass
     * (derived from the resolve payload's option.utc vs the entered wall
     * time; the UI never re-derives offsets from its own DST rules).
     */
    offset_seconds?: number;
    /** Shifted HH:MM wall time — required by the server for shifted mode. */
    wall_time?: string;
  };
  confidence: "Timed" | "Approximate" | "Unknown" | "Rectified";
  house_system: HouseSystem;
  place: { label: string; lat: number; lon: number };
  iana_zone: string;
  zone_source: "google" | "manual";
}

// ---------------------------------------------------------------------------
// Core: fetch + parse-then-trust
// ---------------------------------------------------------------------------

async function request<T>(path: string, schema: ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, init);
  const body: unknown = await response.json();

  if (!response.ok) {
    const parsed = errorSchema.parse(body);
    throw new ApiError(parsed.error);
  }

  return schema.parse(body);
}

function postJson<T>(path: string, payload: unknown, schema: ZodType<T>): Promise<T> {
  return request(path, schema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/** POST /api/v1/places/search — geocoding candidates for the type-ahead (D-05). */
export function postPlaceSearch(body: PlaceSearchRequest): Promise<PlaceSearchResponse> {
  return postJson("/api/v1/places/search", body, placeSearchResponseSchema);
}

/** POST /api/v1/places/resolve-time — offset + DST classification for the confirm screen (D-06/D-07/D-08). */
export function postResolveTime(body: ResolveTimeRequest): Promise<ResolveTimeResponse> {
  return postJson("/api/v1/places/resolve-time", body, resolveTimeResponseSchema);
}

/** POST /api/v1/charts/calculate — the confirmed-birth-data chart calculation (D-03 step 2). */
export function postCalculate(body: CalculateRequest): Promise<CalculateResponse> {
  return postJson("/api/v1/charts/calculate", body, calculateResponseSchema);
}

/** GET /api/v1/meta/zones — sorted IANA zones for the manual-fallback picker. */
export function fetchZones(): Promise<ZonesResponse> {
  return request("/api/v1/meta/zones", zonesResponseSchema);
}
