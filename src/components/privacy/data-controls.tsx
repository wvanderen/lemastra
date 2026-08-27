import {
  QueryClient,
  QueryClientContext,
  QueryClientProvider,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useContext, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  DELETE_ALL_ERROR_COPY,
  EXPORT_ERROR_COPY,
  EXPORT_PENDING,
} from "@/components/workspace/copy";
import { DeleteConfirm } from "@/components/workspace/delete-confirm";
import { ErrorCard } from "@/components/workspace/error-card";
import { WebUnsupported } from "@/components/workspace/web-unsupported";
import { Spacing } from "@/constants/theme";
import { CHARTS_QUERY_KEY } from "@/hooks/use-workspace";
import { useTheme } from "@/hooks/use-theme";
import { exportAllDataFile } from "@/lib/workspace/export";
import {
  deleteAllData,
  exportAllData,
  isWorkspaceStorageAvailable,
} from "@/lib/workspace/repository";

import {
  DELETE_ALL_DATA,
  DELETE_ALL_HELPER,
  EXPORT_ALL_DATA,
  EXPORT_ALL_HELPER,
  NO_PERSONAL_DATA,
  WEB_DATA_HELPER,
  YOUR_DATA_HEADING,
  YOUR_DATA_INTRO,
} from "./copy";

/**
 * "Your data" section (D-15 / PRIV-05/06) — the /privacy user controls:
 * export-all (one JSON file with the complete corpus through the
 * capability-gated share sheet) and delete-all (the shared all-variant
 * destructive confirm → transactional wipe).
 *
 * Governance law (privacy.tsx module law, T-03-27): this section adds
 * user controls ONLY — every provider/retention claim on the screen
 * stays registry-driven. Its strings live in the privacy copy deck and
 * the workspace deck's all-variant/error classes; nothing is invented.
 *
 * Mutation law: the hooks are LOCAL (confirm.tsx precedent) —
 * use-workspace.ts is owned by the 03-07 wave and is not modified
 * here; delete success invalidates the shared ['charts'] key (Pitfall
 * 10) so the home list and any open detail refresh. The disclosure
 * acknowledgement (AsyncStorage) is non-personal and is never touched
 * by this flow — it SURVIVES delete-all (D-15 / Pitfall 9).
 *
 * Provider-optional mount: /privacy renders inside the app's root
 * QueryProvider, but the section tolerates provider-less renders (the
 * Phase-1 privacy screen tests render bare) by supplying a local
 * fallback client — under the app provider the ANCESTOR client wins,
 * preserving the shared invalidation map.
 */

export type DataControlsProps = {
  testID?: string;
};

export function DataControls({ testID }: DataControlsProps) {
  const ancestorClient = useContext(QueryClientContext);
  // Lazy per-mount fallback — only used when no ancestor client exists.
  const [fallbackClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
  );

  useEffect(() => {
    // A fallback client we created is ours to clear on unmount; the
    // ancestor client is never touched here.
    if (!ancestorClient) return () => void fallbackClient.clear();
    return undefined;
  }, [ancestorClient, fallbackClient]);

  return (
    <QueryClientProvider client={ancestorClient ?? fallbackClient}>
      <DataControlsSection testID={testID} />
    </QueryClientProvider>
  );
}

function DataControlsSection({ testID }: { testID?: string }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const available = isWorkspaceStorageAvailable();

  const [confirmVisible, setConfirmVisible] = useState(false);

  // Export-all: corpus read → ONE pretty file → capability-gated share.
  // POST-once (T-02-32 law) — a failed export surfaces to the error
  // card, never silently retried.
  const exportAll = useMutation({
    mutationFn: async () => exportAllDataFile(await exportAllData()),
    retry: false,
  });

  // Delete-all: the transactional wipe behind DeleteConfirm variant
  // "all"; success invalidates ['charts'] (Pitfall 10) and swaps the
  // section to the completion state.
  const deleteAll = useMutation({
    mutationFn: () => deleteAllData(),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHARTS_QUERY_KEY });
    },
  });

  // Failure closes the modal; the error card owns recovery ("Nothing
  // was removed. Try again." — the 03-06 pattern). Success closes it
  // too: the section stays mounted (unlike the saved-detail's
  // dismiss-on-success), so the modal must make way for the completion
  // state.
  useEffect(() => {
    if (deleteAll.isError || deleteAll.isSuccess) setConfirmVisible(false);
  }, [deleteAll.isError, deleteAll.isSuccess]);

  const wiped = deleteAll.isSuccess;

  return (
    <View style={styles.section} testID={testID}>
      <ThemedText type="default" accessibilityRole="header" style={styles.heading}>
        {YOUR_DATA_HEADING}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {YOUR_DATA_INTRO}
      </ThemedText>

      {wiped ? (
        // Completion state — replaces the section's action cards
        // (neutral text, real rendered text so outcomes are announced).
        <ThemedText
          type="small"
          themeColor="textSecondary"
          accessibilityLiveRegion="polite"
          testID="data-controls-empty"
        >
          {NO_PERSONAL_DATA}
        </ThemedText>
      ) : (
        <View style={styles.cards}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !available || exportAll.isPending }}
            disabled={!available || exportAll.isPending}
            onPress={() => exportAll.mutate()}
            style={[styles.card, { backgroundColor: theme.backgroundElement }]}
            testID="data-controls-export"
          >
            <ThemedText type="default" style={styles.cardLabel}>
              {exportAll.isPending ? EXPORT_PENDING : EXPORT_ALL_DATA}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {available ? EXPORT_ALL_HELPER : WEB_DATA_HELPER}
            </ThemedText>
          </Pressable>

          {/* Destructive trigger — error text AND the word "Delete";
              deletion itself only ever happens behind the confirm modal
              (no swipe, no long-press, T-03-28). */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !available }}
            disabled={!available}
            onPress={() => setConfirmVisible(true)}
            style={[styles.card, { backgroundColor: theme.backgroundElement }]}
            testID="data-controls-delete"
          >
            <ThemedText type="default" style={[styles.cardLabel, { color: theme.error }]}>
              {DELETE_ALL_DATA}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {available ? DELETE_ALL_HELPER : WEB_DATA_HELPER}
            </ThemedText>
          </Pressable>
        </View>
      )}

      {/* Share sheet unavailable — the capability state, not an error
          (D-03/D-13 vocabulary; the deck's only approved capability
          copy). */}
      {exportAll.data?.status === "unavailable" ? <WebUnsupported /> : null}

      {/* Export failure — the exact error deck with a working retry. */}
      {exportAll.isError ? (
        <ErrorCard
          heading={EXPORT_ERROR_COPY.heading}
          body={EXPORT_ERROR_COPY.body}
          actionLabel={EXPORT_ERROR_COPY.action}
          onAction={() => exportAll.mutate()}
          testID="data-controls-export-error"
        />
      ) : null}

      {/* Delete failure — nothing was removed; retry re-runs the
          confirmed wipe directly (03-06 decision). */}
      {deleteAll.isError ? (
        <ErrorCard
          heading={DELETE_ALL_ERROR_COPY.heading}
          body={DELETE_ALL_ERROR_COPY.body}
          actionLabel={DELETE_ALL_ERROR_COPY.action}
          onAction={() => deleteAll.mutate()}
          testID="data-controls-delete-error"
        />
      ) : null}

      <DeleteConfirm
        visible={confirmVisible}
        variant="all"
        label=""
        revisionCount={0}
        pending={deleteAll.isPending}
        onConfirm={() => deleteAll.mutate()}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
    // Section separation from the provider list above (lg scale).
    marginTop: Spacing.four,
  },
  // Heading 24/600 — the section-heading scale (A-3-UI-6).
  heading: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
  },
  cards: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    padding: Spacing.three,
    gap: Spacing.one,
    minHeight: 48,
    justifyContent: "center",
  },
  cardLabel: {
    fontWeight: "600",
  },
});
