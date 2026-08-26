import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { z } from "zod";

import { birthFormSchema, normalizeTimeInput } from "@/app/birth";
import { CalculationDisclosure } from "@/components/birth/calculation-disclosure";
import {
  CONFIDENCE_OPTIONS,
  CONFIRM_BACK_LINK,
  CONFIRM_BIRTHPLACE_LABEL,
  CONFIRM_CALCULATING,
  CONFIRM_COORDINATES_LABEL,
  CONFIRM_CTA,
  CONFIRM_OFFSET_LABEL_LABEL,
  CONFIRM_TIME_ZONE_LABEL,
  CONFIRM_TITLE,
  DRIFT_NOTE,
  ZONE_SOURCE_GOOGLE,
  ZONE_SOURCE_MANUAL,
  confirmBirthSummary,
  confirmCoordinates,
  confirmOffsetValue,
} from "@/components/birth/copy";
import { TrickyTimePicker } from "@/components/birth/tricky-time-picker";
import { ThemedText } from "@/components/themed-text";
import { ErrorBanner } from "@/components/ui/error-banner";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useTheme } from "@/hooks/use-theme";
import { ApiError, postCalculate, type CalculateRequest } from "@/lib/api";
import {
  resolveTimeResponseSchema,
  type TimeResolutionMode,
} from "@/lib/api-schemas";

/**
 * /birth/confirm — the BIRTH-02 confirmation screen (trust hinge of the
 * flow).
 *
 * Parses the draft param (form state + resolve response) with zod BEFORE
 * render — the same contract /birth built (birthFormSchema + the resolve
 * payload), so unvalidated data never reaches the screen; a missing or
 * malformed draft redirects to /birth.
 *
 * Shows the resolved place card (D-06 historical offset + zone source +
 * drift note), forces the D-08 explicit choice for ambiguous/nonexistent
 * civil times before Calculate, intercepts the first calculation with the
 * registry-driven D-04 disclosure (useDisclosure versioned flag), runs the
 * user-initiated calculate mutation (no auto-retry — T-02-32), renders
 * CALC-04 recovery banners, and navigates to /chart/result on success.
 */

/** The draft hand-off contract: /birth's form values plus its resolve response. */
export const confirmDraftSchema = birthFormSchema.extend({
  resolve: resolveTimeResponseSchema.describe(
    "The parse-then-trust resolve-time response /birth already received (D-03 step 1)."
  ),
});

export type ConfirmDraft = z.infer<typeof confirmDraftSchema>;

/**
 * Fold=1 offset in seconds for a second_pass choice (server contract:
 * offset_seconds is required for second_pass). Derived ONLY from
 * server-supplied data — the option's UTC instant vs the entered wall time
 * (T-02-31: the UI never re-derives offsets from its own DST rules; the
 * server revalidates the mode).
 */
function secondPassOffsetSeconds(utc: string, wallDate: string, wallTime: string): number {
  const utcMs = Date.parse(utc);
  const wallMs = Date.parse(`${wallDate}T${normalizeTimeInput(wallTime)}:00Z`);
  return Math.round((wallMs - utcMs) / 1000);
}

/** Render a server-provided UTC instant as HH:MM in the server-resolved IANA zone. */
function wallTimeInZone(utc: string, ianaZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ianaZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(utc));
}

export default function ConfirmScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ draft?: string }>();

  const draft = useMemo(() => {
    if (!params.draft) return null;
    try {
      return confirmDraftSchema.parse(JSON.parse(params.draft));
    } catch {
      return null;
    }
  }, [params.draft]);

  useEffect(() => {
    if (!draft) router.replace("/birth");
  }, [draft]);

  const { acknowledged, acknowledge } = useDisclosure();
  const [disclosureVisible, setDisclosureVisible] = useState(false);
  const [resolution, setResolution] = useState<TimeResolutionMode | null>(null);

  const classification = draft?.resolve.resolved.classification ?? "normal";
  const tricky = classification !== "normal";

  const displayTime = useMemo(
    () =>
      draft && draft.confidence !== "Unknown" ? normalizeTimeInput(draft.time) : "",
    [draft]
  );

  const buildRequest = (): CalculateRequest => {
    if (!draft) throw new Error("buildRequest requires a parsed draft");
    const place = draft.place;
    if (place === null) throw new Error("the draft schema guarantees a place selection");

    let time_resolution: CalculateRequest["time_resolution"];
    if (resolution) {
      const option = draft.resolve.resolved.options.find((o) => o.mode === resolution);
      if (!option) throw new Error(`the resolve payload lacks the chosen option: ${resolution}`);
      if (resolution === "second_pass") {
        time_resolution = {
          mode: resolution,
          offset_seconds: secondPassOffsetSeconds(option.utc, draft.date, draft.time),
        };
      } else if (resolution === "shifted") {
        time_resolution = {
          mode: resolution,
          wall_time: wallTimeInZone(option.utc, draft.resolve.iana_zone),
        };
      } else {
        time_resolution = { mode: resolution };
      }
    }

    return {
      date: draft.date,
      time: draft.confidence === "Unknown" ? undefined : normalizeTimeInput(draft.time),
      time_resolution,
      confidence: draft.confidence,
      house_system: draft.house_system,
      place: { label: place.label, lat: place.lat, lon: place.lon },
      iana_zone: draft.resolve.iana_zone,
      zone_source: draft.resolve.zone_source,
    };
  };

  // User-initiated POST-once mutation: mutations do not auto-retry
  // (T-02-32 — silent re-calculation is forbidden by the loading/failure
  // contract).
  const calculate = useMutation({
    mutationFn: (request: CalculateRequest) => postCalculate(request),
    onSuccess: (envelope) => {
      if (!draft) return;
      router.push({
        pathname: "/chart/result",
        params: {
          envelope: JSON.stringify(envelope),
          identity: JSON.stringify({
            date: draft.date,
            time: displayTime,
            label: draft.place?.label ?? "",
            // Zone resolution travels with the identity so the result
            // screen can render the CALC-03 place-resolution row
            // (zone source + provider — 02-09).
            zone_source: draft.resolve.zone_source,
          }),
        },
      });
    },
  });

  const blockedByChoice = tricky && resolution === null;
  const ctaDisabled = blockedByChoice || calculate.isPending || disclosureVisible;

  const onCalculatePress = () => {
    if (!acknowledged) {
      setDisclosureVisible(true);
      return;
    }
    calculate.mutate(buildRequest());
  };

  const onDisclosureAcknowledge = async () => {
    await acknowledge();
    setDisclosureVisible(false);
    calculate.mutate(buildRequest());
  };

  const calculateError = calculate.error instanceof ApiError ? calculate.error : null;

  if (!draft) return null;

  const confidenceHelper = CONFIDENCE_OPTIONS.find(
    (option) => option.value === draft.confidence
  )?.helper;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ThemedText type="default" accessibilityRole="header" style={styles.title}>
        {CONFIRM_TITLE}
      </ThemedText>

      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.cardRow}>
          <ThemedText type="small" style={styles.fieldLabel}>
            {CONFIRM_BIRTHPLACE_LABEL}
          </ThemedText>
          <ThemedText type="default">{draft.place?.label}</ThemedText>
        </View>
        <View style={styles.cardRow}>
          <ThemedText type="small" style={styles.fieldLabel}>
            {CONFIRM_COORDINATES_LABEL}
          </ThemedText>
          <ThemedText type="code">
            {confirmCoordinates(draft.place?.lat ?? 0, draft.place?.lon ?? 0)}
          </ThemedText>
        </View>
        <View style={styles.cardRow}>
          <ThemedText type="small" style={styles.fieldLabel}>
            {CONFIRM_TIME_ZONE_LABEL}
          </ThemedText>
          <ThemedText type="code">{draft.resolve.iana_zone}</ThemedText>
        </View>
        <View style={styles.cardRow}>
          <ThemedText type="small" style={styles.fieldLabel}>
            {CONFIRM_OFFSET_LABEL_LABEL}
          </ThemedText>
          <ThemedText type="default">
            {confirmOffsetValue(
              draft.resolve.resolved.offset_label,
              draft.resolve.google?.timeZoneName
            )}
          </ThemedText>
        </View>
        {draft.resolve.drift ? (
          <ThemedText type="small" themeColor="textSecondary">
            {DRIFT_NOTE}
          </ThemedText>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          {draft.resolve.zone_source === "google" ? ZONE_SOURCE_GOOGLE : ZONE_SOURCE_MANUAL}
        </ThemedText>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {confirmBirthSummary(draft.date, displayTime, draft.confidence)}
      </ThemedText>

      {tricky ? (
        <TrickyTimePicker
          resolved={draft.resolve}
          date={draft.date}
          time={normalizeTimeInput(draft.time)}
          value={resolution}
          onChange={setResolution}
        />
      ) : null}

      <View style={styles.confidenceSummary}>
        <ThemedText type="small" style={styles.fieldLabel}>
          {draft.confidence}
        </ThemedText>
        {confidenceHelper ? (
          <ThemedText type="small" themeColor="textSecondary">
            {confidenceHelper}
          </ThemedText>
        ) : null}
      </View>

      {disclosureVisible ? (
        <CalculationDisclosure onAcknowledge={onDisclosureAcknowledge} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: ctaDisabled }}
          disabled={ctaDisabled}
          onPress={onCalculatePress}
          style={[styles.cta, { backgroundColor: theme.accent }]}
          testID="confirm-calculate-cta"
        >
          {calculate.isPending ? (
            <ActivityIndicator
              color={theme.background}
              testID="confirm-calculating-indicator"
            />
          ) : null}
          <ThemedText type="default" style={[styles.ctaLabel, { color: theme.background }]}>
            {calculate.isPending ? CONFIRM_CALCULATING : CONFIRM_CTA}
          </ThemedText>
        </Pressable>
      )}

      {calculate.isError ? (
        <ErrorBanner
          code={calculateError?.code ?? null}
          message={calculateError?.message}
          houseSystem={draft.house_system}
          onAction={
            calculateError?.code === "CALC_UNSUITABLE_HOUSE_SYSTEM"
              ? () =>
                  router.navigate({
                    pathname: "/birth",
                    params: { openAssumptions: "1" },
                  })
              : calculateError?.code === "CALC_TIMEOUT" ||
                  calculateError?.code === "CALC_ENGINE_ERROR"
                ? () => calculate.mutate(buildRequest())
                : undefined
          }
        />
      ) : null}

      <Pressable
        accessibilityRole="link"
        hitSlop={Spacing.two}
        onPress={() => router.back()}
        style={styles.backLink}
      >
        <ThemedText type="linkPrimary">{CONFIRM_BACK_LINK}</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingTop: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardRow: {
    gap: Spacing.one,
  },
  fieldLabel: {
    fontWeight: "600",
  },
  confidenceSummary: {
    gap: Spacing.one,
  },
  cta: {
    borderRadius: 8,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  ctaLabel: {
    fontWeight: "600",
  },
  backLink: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});
