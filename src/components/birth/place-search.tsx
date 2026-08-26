import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Keyboard, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ErrorBanner } from "@/components/ui/error-banner";
import { OptionCard } from "@/components/ui/option-card";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ApiError, fetchZones, postPlaceSearch } from "@/lib/api";
import type { PlaceCandidate } from "@/lib/api-schemas";

import {
  LATITUDE_ERROR,
  LATITUDE_LABEL,
  LONGITUDE_ERROR,
  LONGITUDE_LABEL,
  PLACE_APPROXIMATE_NOTE,
  PLACE_CHANGE_ACTION,
  PLACE_EMPTY_BODY,
  PLACE_EMPTY_HEADING,
  PLACE_LABEL,
  PLACE_MANUAL_ACTION,
  PLACE_SEARCH_INSTEAD_ACTION,
  PLACE_SEARCH_PLACEHOLDER,
  PLACE_SEARCHING,
  PLACE_NAME_PLACEHOLDER,
  TIME_ZONE_ERROR,
  TIME_ZONE_LABEL,
  TIME_ZONE_SEARCH_PLACEHOLDER,
} from "./copy";

/**
 * D-05 debounced place type-ahead with the always-available manual fallback.
 *
 * Search branch: a ≥300 ms debounced, ≥3-character-guarded query through
 * `postPlaceSearch` (T-02-22), rendering at most five candidate cards.
 * Zero-results and provider-unavailable states render inline from the
 * error-banner vocabulary, each offering the manual action. Selecting a
 * candidate dismisses the keyboard and emits the google branch of the
 * discriminated place union.
 *
 * Manual branch: place name + zod-bounds-validated latitude/longitude +
 * a searchable IANA-zone picker backed by `fetchZones` (so client and
 * server never disagree on zone vocabulary). A complete valid entry emits
 * the manual branch of the union — `tz_override` material for
 * `postResolveTime` (`zone_source: "manual"`).
 *
 * The persistent toggle swaps branches WITHOUT losing either branch's
 * entered state (both live in this component's state for its lifetime).
 */

/** Debounce window (T-02-22: ≥300 ms between type-ahead requests). */
export const PLACE_SEARCH_DEBOUNCE_MS = 300;

/** Minimum characters before a query fires (T-02-22: ≥3). */
const MIN_QUERY_LENGTH = 3;

/** Maximum candidate cards rendered (T-02-22: 5-card cap). */
const MAX_CANDIDATES = 5;

/** Maximum zone rows rendered per filter (searchable picker remains usable). */
const MAX_ZONE_ROWS = 12;

/** Card hairline carried forward from the Phase-1 privacy.tsx card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

/** Selected Google candidate — the google branch of the place union. */
export type GooglePlaceSelection = {
  source: "google";
  label: string;
  lat: number;
  lon: number;
  location_type: PlaceCandidate["location_type"];
  place_id?: string;
  partial_match?: boolean;
};

/** Complete manual entry — the manual branch of the place union. */
export type ManualPlaceSelection = {
  source: "manual";
  label: string;
  lat: number;
  lon: number;
  iana_zone: string;
  zone_source: "manual";
};

/** Discriminated place union consumed by the birth form's zod schema. */
export type PlaceSelection = GooglePlaceSelection | ManualPlaceSelection;

export type PlaceSearchProps = {
  /** Current selection; `null` = nothing resolved yet. */
  value: PlaceSelection | null;
  /** Emits a complete selection, or `null` when a selection is cleared/invalidated. */
  onChange: (value: PlaceSelection | null) => void;
  /** Controlled branch (the birth form drives it for banner deep-links); uncontrolled when omitted. */
  branch?: "search" | "manual";
  onBranchChange?: (branch: "search" | "manual") => void;
  testID?: string;
};

/** Manual-branch draft state (raw field text; validated on change). */
type ManualFields = {
  label: string;
  lat: string;
  lon: string;
  zone: string | null;
};

/** Parse a coordinate string within bounds; `null` when empty or invalid. */
function parseCoordinate(raw: string, min: number, max: number): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

export function PlaceSearch({
  value,
  onChange,
  branch: branchProp,
  onBranchChange,
  testID,
}: PlaceSearchProps) {
  const theme = useTheme();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [internalBranch, setInternalBranch] = useState<"search" | "manual">("search");
  const branch = branchProp ?? internalBranch;
  const [manual, setManualState] = useState<ManualFields>({
    label: "",
    lat: "",
    lon: "",
    zone: null,
  });
  const [zoneFilter, setZoneFilter] = useState("");

  // Deferred timer state (not a loop): every keystroke re-arms one timeout;
  // only the latest survives to update the debounced query.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), PLACE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const search = useQuery({
    queryKey: ["place-search", debounced],
    queryFn: () => postPlaceSearch({ query: debounced }),
    enabled: branch === "search" && debounced.length >= MIN_QUERY_LENGTH,
    retry: false,
  });

  const zones = useQuery({
    queryKey: ["meta-zones"],
    queryFn: fetchZones,
    enabled: branch === "manual",
    staleTime: 5 * 60_000,
  });

  const setBranch = (next: "search" | "manual") => {
    setInternalBranch(next);
    onBranchChange?.(next);
  };

  /** Update manual-branch fields (functional — safe under batched changes). */
  const setManual = (patch: Partial<ManualFields>) => {
    setManualState((current) => ({ ...current, ...patch }));
  };

  // Emission is derived from state (never a stale closure): when the manual
  // entry becomes complete and valid, emit the manual union branch; when a
  // previously-emitted manual selection becomes incomplete, retract it.
  // `onChange`/`value` are intentionally not deps — this effect must run only
  // when the manual entry itself changes, or parent echoes would re-trigger it.
  useEffect(() => {
    if (branch !== "manual") return;
    const lat = parseCoordinate(manual.lat, -90, 90);
    const lon = parseCoordinate(manual.lon, -180, 180);
    const label = manual.label.trim();
    if (label !== "" && lat !== null && lon !== null && manual.zone !== null) {
      onChange({
        source: "manual",
        label,
        lat,
        lon,
        iana_zone: manual.zone,
        zone_source: "manual",
      });
    } else if (value?.source === "manual") {
      onChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, manual]);

  const selectCandidate = (candidate: PlaceCandidate) => {
    Keyboard.dismiss();
    onChange({ source: "google", ...candidate });
  };

  const resolvedGoogle = value?.source === "google" ? value : null;
  const approximate =
    resolvedGoogle !== null &&
    (resolvedGoogle.location_type === "APPROXIMATE" || resolvedGoogle.partial_match === true);

  const latError =
    manual.lat.trim() !== "" && parseCoordinate(manual.lat, -90, 90) === null;
  const lonError =
    manual.lon.trim() !== "" && parseCoordinate(manual.lon, -180, 180) === null;
  const coordinatesValid =
    parseCoordinate(manual.lat, -90, 90) !== null &&
    parseCoordinate(manual.lon, -180, 180) !== null;
  const zoneError =
    manual.label.trim() !== "" && coordinatesValid && manual.zone === null;

  const zoneMatches = (zones.data?.zones ?? [])
    .filter((zone) => zone.toLowerCase().includes(zoneFilter.trim().toLowerCase()))
    .slice(0, MAX_ZONE_ROWS);

  return (
    <View style={styles.group} testID={testID}>
      <ThemedText type="small" style={styles.fieldLabel}>
        {PLACE_LABEL}
      </ThemedText>

      {branch === "manual" ? (
        <View style={styles.manualFields}>
          <TextInput
            accessibilityLabel={PLACE_LABEL}
            onChangeText={(text) => setManual({ label: text })}
            placeholder={PLACE_NAME_PLACEHOLDER}
            style={[styles.textField, { color: theme.text }]}
            testID="manual-place-name"
            value={manual.label}
          />
          <ThemedText type="small" style={styles.fieldLabel}>
            {LATITUDE_LABEL}
          </ThemedText>
          <TextInput
            accessibilityLabel={LATITUDE_LABEL}
            onChangeText={(text) => setManual({ lat: text })}
            placeholder={`${LATITUDE_LABEL} (−90 to 90)`}
            style={[styles.textField, { color: theme.text }]}
            testID="manual-latitude"
            value={manual.lat}
          />
          {latError ? (
            <ThemedText type="small" style={{ color: theme.error }}>
              {LATITUDE_ERROR}
            </ThemedText>
          ) : null}
          <ThemedText type="small" style={styles.fieldLabel}>
            {LONGITUDE_LABEL}
          </ThemedText>
          <TextInput
            accessibilityLabel={LONGITUDE_LABEL}
            onChangeText={(text) => setManual({ lon: text })}
            placeholder={`${LONGITUDE_LABEL} (−180 to 180)`}
            style={[styles.textField, { color: theme.text }]}
            testID="manual-longitude"
            value={manual.lon}
          />
          {lonError ? (
            <ThemedText type="small" style={{ color: theme.error }}>
              {LONGITUDE_ERROR}
            </ThemedText>
          ) : null}
          <ThemedText type="small" style={styles.fieldLabel}>
            {TIME_ZONE_LABEL}
          </ThemedText>
          {zoneError ? (
            <ThemedText type="small" style={{ color: theme.error }}>
              {TIME_ZONE_ERROR}
            </ThemedText>
          ) : null}
          <TextInput
            accessibilityLabel={TIME_ZONE_SEARCH_PLACEHOLDER}
            onChangeText={setZoneFilter}
            placeholder={TIME_ZONE_SEARCH_PLACEHOLDER}
            style={[styles.textField, { color: theme.text }]}
            testID="zone-filter"
            value={zoneFilter}
          />
          {zoneMatches.map((zone) => (
            <OptionCard
              key={zone}
              label={zone}
              selected={manual.zone === zone}
              onPress={() => setManual({ zone })}
              testID={`zone-${zone}`}
            />
          ))}
        </View>
      ) : resolvedGoogle !== null ? (
        <View
          style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: HAIRLINE_BORDER_COLOR }]}
        >
          <ThemedText type="default" style={styles.selectedLabel}>
            {resolvedGoogle.label}
          </ThemedText>
          <ThemedText type="code">{`${resolvedGoogle.lat}°, ${resolvedGoogle.lon}°`}</ThemedText>
          {approximate ? (
            <ThemedText type="small" themeColor="textSecondary">
              {PLACE_APPROXIMATE_NOTE}
            </ThemedText>
          ) : null}
          <Pressable
            accessibilityRole="button"
            hitSlop={Spacing.two}
            onPress={() => onChange(null)}
            style={styles.changeAction}
          >
            <ThemedText type="linkPrimary">{PLACE_CHANGE_ACTION}</ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.searchFields}>
          <TextInput
            accessibilityLabel={PLACE_LABEL}
            onChangeText={setQuery}
            placeholder={PLACE_SEARCH_PLACEHOLDER}
            style={[styles.textField, { color: theme.text }]}
            testID="place-search-input"
            value={query}
          />
          {search.isPending && debounced.length >= MIN_QUERY_LENGTH ? (
            <ThemedText type="small" themeColor="textSecondary">
              {PLACE_SEARCHING}
            </ThemedText>
          ) : null}
          {query.trim().length < MIN_QUERY_LENGTH ? (
            <View style={styles.emptyState}>
              <ThemedText type="small" style={styles.emptyHeading}>
                {PLACE_EMPTY_HEADING}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {PLACE_EMPTY_BODY}
              </ThemedText>
            </View>
          ) : null}
          {search.isError ? (
            <ErrorBanner
              code={search.error instanceof ApiError ? search.error.code : null}
              query={debounced}
              onAction={() => setBranch("manual")}
            />
          ) : null}
          {search.data
            ? search.data.candidates.slice(0, MAX_CANDIDATES).map((candidate) => (
                <Pressable
                  key={candidate.place_id ?? candidate.label}
                  accessibilityRole="button"
                  onPress={() => selectCandidate(candidate)}
                  style={[
                    styles.card,
                    { backgroundColor: theme.backgroundElement, borderColor: HAIRLINE_BORDER_COLOR },
                  ]}
                >
                  <ThemedText type="default">{candidate.label}</ThemedText>
                  <ThemedText type="code">{`${candidate.lat}°, ${candidate.lon}°`}</ThemedText>
                </Pressable>
              ))
            : null}
        </View>
      )}

      {/* Persistent toggle — manual is reachable from EVERY search state. */}
      <Pressable
        accessibilityRole="button"
        hitSlop={Spacing.two}
        onPress={() => setBranch(branch === "manual" ? "search" : "manual")}
        style={styles.toggle}
      >
        <ThemedText type="linkPrimary">
          {branch === "manual" ? PLACE_SEARCH_INSTEAD_ACTION : PLACE_MANUAL_ACTION}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
  },
  fieldLabel: {
    fontWeight: "600",
  },
  textField: {
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    minHeight: 48,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    minHeight: 48,
  },
  selectedLabel: {
    fontWeight: "600",
  },
  changeAction: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  emptyState: {
    gap: Spacing.one,
  },
  emptyHeading: {
    fontWeight: "600",
  },
  manualFields: {
    gap: Spacing.two,
  },
  searchFields: {
    gap: Spacing.two,
  },
  toggle: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
});
