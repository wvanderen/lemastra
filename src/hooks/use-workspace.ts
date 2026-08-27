import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  saveChart,
  type SaveChartInput,
  type SaveChartResult,
} from "@/lib/workspace/repository";

/**
 * Workspace query hooks (03-04) — the screen-facing surface over the
 * D-03 repository seam.
 *
 * Mutations follow the repo's user-initiated POST-once posture
 * (T-02-32, confirm.tsx law): `retry: false` — a failed save is
 * surfaced to the UI, never silently retried. Tests inject fakes by
 * mocking the repository module (the seam every consumer shares).
 *
 * Query-key convention (03-RESEARCH Pitfall 10): `['charts']` is the
 * list key; every mutation that changes saved-chart state invalidates
 * it so the home list refreshes. Detail keys join per-chart in later
 * plans on top of this same constant.
 */

/** The saved-charts list query key (Pitfall 10 invalidation map). */
export const CHARTS_QUERY_KEY = ["charts"] as const;

/** useSaveChart — persists a calculated chart (D-10) via the repository. */
export function useSaveChart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveChartInput) => saveChart(input),
    // POST-once: no auto-retry — the error card owns recovery.
    retry: false,
    onSuccess: (_result: SaveChartResult) => {
      void queryClient.invalidateQueries({ queryKey: CHARTS_QUERY_KEY });
    },
  });
}
