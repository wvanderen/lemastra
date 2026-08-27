import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { z } from "zod";

import { AssumptionsControl } from "@/components/birth/assumptions-control";
import { ConfidenceControl } from "@/components/birth/confidence-control";
import {
  BIRTH_DATE_ERROR,
  BIRTH_DATE_LABEL,
  BIRTH_DATE_PLACEHOLDER,
  BIRTH_FORM_CTA,
  BIRTH_FORM_TITLE,
  BIRTH_TIME_ERROR,
  BIRTH_TIME_LABEL,
  BIRTH_TIME_PLACEHOLDER,
  PRIVACY_LINK,
  UNKNOWN_TIME_FIELD_HELPER,
} from "@/components/birth/copy";
import { PlaceSearch, type PlaceSelection } from "@/components/birth/place-search";
import { ThemedText } from "@/components/themed-text";
import { ErrorBanner } from "@/components/ui/error-banner";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ApiError, postResolveTime } from "@/lib/api";
import {
  confidenceSchema,
  houseSystemSchema,
  placeCandidateSchema,
  type Confidence,
  type HouseSystem,
  type ResolveTimeResponse,
} from "@/lib/api-schemas";

/**
 * /birth — Birth entry form (BIRTH-01, BIRTH-04 client behavior).
 *
 * React Hook Form + zodResolver over a schema where `place` is the
 * discriminated union emitted by PlaceSearch (google candidate vs manual
 * entry) and `time` is conditionally required by confidence: Unknown
 * disables and clears the time field (D-09 side effect) and swaps its
 * helper to UNKNOWN_TIME_FIELD_HELPER; the other three states require a
 * time. Validation runs client-side (zod) BEFORE any navigation (T-02-21);
 * the server revalidates via pydantic (CALC_INVALID_INPUT path).
 *
 * "Review birth details" then runs the resolve-time call (D-03 step 1,
 * parse-then-trust per T-02-24) and navigates ONLY on success, carrying
 * the draft (form state + resolve response) as a JSON-stringified router
 * param (BIRTH-02, in-memory only — no persistence this phase, T-02-23).
 * Resolve failures render the ErrorBanner in place; PLACE_* codes
 * deep-link the PlaceSearch manual branch via its controlled branch prop.
 */

/** Matches the server's DATE_PATTERN (api/lemastra_api/schemas.py). */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Accepts both copy-deck time forms — "09:30" and "1430" (the time error
 * names both). The colon-less form is normalized before any network call.
 */
const TIME_INPUT_PATTERN = /^([01]\d|2[0-3]):?[0-5]\d$/;

/**
 * Noon reference for Unknown confidence (02-RESEARCH §"Unknown Birth
 * Time"): the D-10-compliant invocation passes 12:00 with
 * confidence=unknown — identical calculator output to --noon-for-unknown
 * minus provenance wording, and never a silently guessed time.
 */
const NOON_REFERENCE_TIME = "12:00";

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

/** Google branch of the place union — mirrors PlaceSearch's emission. */
const googlePlaceSchema = z.object({
  source: z.literal("google"),
  label: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  location_type: placeCandidateSchema.shape.location_type,
  place_id: z.string().optional(),
  partial_match: z.boolean().optional(),
});

/** Manual branch of the place union — mirrors PlaceSearch's emission. */
const manualPlaceSchema = z.object({
  source: z.literal("manual"),
  label: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  iana_zone: z.string().min(1),
  zone_source: z.literal("manual"),
});

/**
 * Rejects syntactically well-formed but nonexistent calendar dates:
 * JS `new Date` rolls 1990-02-31 over to March, so the round-trip through
 * UTC (date-only ISO strings parse at UTC midnight — no local-time drift)
 * must reproduce the exact input.
 */
function isValidCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Insert the colon in a colon-less 24-hour time ("1430" → "14:30"). */
export function normalizeTimeInput(value: string): string {
  return value.replace(/^(\d{2})(\d{2})$/, "$1:$2");
}

/**
 * Birth-form schema — exported for the 02-08 confirm screen's draft parsing
 * (the draft is JSON.stringify of exactly these values plus `resolve`).
 */
export const birthFormSchema = z
  .object({
    date: z.string().refine(isValidCalendarDate, { message: BIRTH_DATE_ERROR }),
    time: z.string().refine((value) => value === "" || TIME_INPUT_PATTERN.test(value), {
      message: BIRTH_TIME_ERROR,
    }),
    place: z.discriminatedUnion("source", [googlePlaceSchema, manualPlaceSchema]).nullable(),
    confidence: confidenceSchema,
    house_system: houseSystemSchema,
  })
  .superRefine((values, ctx) => {
    // Unknown needs no time (the field is disabled and cleared); every
    // other confidence requires one (BIRTH-04).
    if (values.confidence !== "Unknown" && values.time === "") {
      ctx.addIssue({ code: "custom", path: ["time"], message: BIRTH_TIME_ERROR });
    }
    // A place selection is required before resolution; PlaceSearch's own
    // empty-state copy ("Search for your birthplace") is the inline
    // guidance, so no additional form-level string is invented.
    if (values.place === null) {
      ctx.addIssue({ code: "custom", path: ["place"], message: "Select a birthplace." });
    }
  });

export type BirthFormValues = z.infer<typeof birthFormSchema>;

export default function BirthForm() {
  const theme = useTheme();

  // CALC_UNSUITABLE_HOUSE_SYSTEM deep-link landing (02-08): the confirm
  // screen's "Open Assumptions" action navigates here with openAssumptions=1;
  // the keyed remount lands the control expanded without touching form state.
  const params = useLocalSearchParams<{ openAssumptions?: string }>();
  const assumptionsOpen = params.openAssumptions === "1";

  const { control, handleSubmit, setValue, watch } = useForm<BirthFormValues>({
    resolver: zodResolver(birthFormSchema),
    defaultValues: {
      date: "",
      time: "",
      place: null,
      confidence: "Timed",
      house_system: "Whole Sign",
    },
  });

  // Controlled PlaceSearch branch so error-banner actions can deep-link
  // the manual fallback (the PLACE_* recovery path).
  const [placeBranch, setPlaceBranch] = useState<"search" | "manual">("search");

  const confidence = watch("confidence");
  const unknownTime = confidence === "Unknown";

  const resolve = useMutation({
    mutationFn: async (values: BirthFormValues) => {
      const place = values.place;
      // The zod resolver blocks a null place before mutate() can run; this
      // guard is the compile-time narrowing for that invariant.
      if (place === null) {
        throw new Error("A place selection is required before resolving.");
      }
      const time =
        values.confidence === "Unknown" ? NOON_REFERENCE_TIME : values.time;
      const response = await postResolveTime({
        lat: place.lat,
        lon: place.lon,
        local_date: values.date,
        local_time: normalizeTimeInput(time),
        // tz_override exists only on the manual branch (D-05): manual
        // entries carry their own IANA zone; google entries let the server
        // resolve it (D-07).
        ...(place.source === "manual" ? { tz_override: place.iana_zone } : {}),
      });
      return { values, response };
    },
    onSuccess: ({ values, response }) => {
      router.push({
        pathname: "/birth/confirm",
        params: { draft: JSON.stringify({ ...values, resolve: response }) },
      });
    },
  });

  const onConfidenceChange = (next: Confidence) => {
    setValue("confidence", next, { shouldValidate: true });
    // D-09 side effect: Unknown disables AND clears the time field — the
    // clear is not undone when switching back (a re-entered time is honest).
    if (next === "Unknown") {
      setValue("time", "");
    }
  };

  const resolveError = resolve.error instanceof ApiError ? resolve.error : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ThemedText type="default" accessibilityRole="header" style={styles.title}>
        {BIRTH_FORM_TITLE}
      </ThemedText>

      <View style={styles.fields}>
        <ThemedText type="small" style={styles.fieldLabel}>
          {BIRTH_DATE_LABEL}
        </ThemedText>
        <Controller
          control={control}
          name="date"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <View style={styles.fieldGroup}>
              <TextInput
                accessibilityLabel={BIRTH_DATE_LABEL}
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={BIRTH_DATE_PLACEHOLDER}
                style={[styles.textField, { color: theme.text }]}
                testID="birth-date-input"
                value={value}
              />
              {fieldState.error ? (
                <ThemedText type="small" style={{ color: theme.error }}>
                  {fieldState.error.message}
                </ThemedText>
              ) : null}
            </View>
          )}
        />

        <ThemedText type="small" style={styles.fieldLabel}>
          {BIRTH_TIME_LABEL}
        </ThemedText>
        <Controller
          control={control}
          name="time"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <View style={styles.fieldGroup}>
              <TextInput
                accessibilityLabel={BIRTH_TIME_LABEL}
                autoCorrect={false}
                editable={!unknownTime}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={BIRTH_TIME_PLACEHOLDER}
                style={[styles.textField, { color: theme.text }]}
                testID="birth-time-input"
                value={value}
              />
              {fieldState.error ? (
                <ThemedText type="small" style={{ color: theme.error }}>
                  {fieldState.error.message}
                </ThemedText>
              ) : null}
              {unknownTime ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {UNKNOWN_TIME_FIELD_HELPER}
                </ThemedText>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="place"
          render={({ field: { onChange, value } }) => (
            <PlaceSearch
              value={value}
              onChange={(place: PlaceSelection | null) =>
                setValue("place", place, { shouldValidate: true })
              }
              branch={placeBranch}
              onBranchChange={setPlaceBranch}
            />
          )}
        />

        <Controller
          control={control}
          name="confidence"
          render={({ field: { value } }) => (
            <ConfidenceControl value={value} onChange={onConfidenceChange} />
          )}
        />

        <Controller
          control={control}
          name="house_system"
          render={({ field: { value } }) => (
            <AssumptionsControl
              key={assumptionsOpen ? "assumptions-open" : "assumptions"}
              defaultExpanded={assumptionsOpen}
              value={value}
              onChange={(system: HouseSystem) =>
                setValue("house_system", system, { shouldValidate: true })
              }
            />
          )}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: resolve.isPending }}
        disabled={resolve.isPending}
        onPress={handleSubmit((values) => resolve.mutate(values))}
        style={[styles.cta, { backgroundColor: theme.accent }]}
      >
        <ThemedText type="default" style={[styles.ctaLabel, { color: theme.background }]}>
          {BIRTH_FORM_CTA}
        </ThemedText>
      </Pressable>

      {resolve.isError ? (
        <ErrorBanner
          code={resolveError?.code ?? null}
          message={resolveError?.message}
          houseSystem={watch("house_system")}
          onAction={() => setPlaceBranch("manual")}
        />
      ) : null}

      <Pressable
        accessibilityRole="link"
        hitSlop={Spacing.two}
        onPress={() => router.push("/privacy")}
        style={styles.footerLink}
      >
        <ThemedText type="linkPrimary">{PRIVACY_LINK}</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

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
  fields: {
    gap: Spacing.two,
  },
  fieldLabel: {
    fontWeight: "600",
    marginTop: Spacing.two,
  },
  fieldGroup: {
    gap: Spacing.one,
  },
  textField: {
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    minHeight: 48,
  },
  cta: {
    borderRadius: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.two,
  },
  ctaLabel: {
    fontWeight: "600",
  },
  footerLink: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});
