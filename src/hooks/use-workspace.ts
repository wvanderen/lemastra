import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getChartDetail,
  isWorkspaceStorageAvailable,
  listCharts,
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
 * it so the home list refreshes. Detail keys join per-chart on top of
 * the same constant.
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

/**
 * useWorkspaceCharts — the home list query (D-09/D-11) over the
 * repository seam. Ordering is the repository's (updated_at desc); the
 * component renders rows in the order received.
 *
 * On web the query never mounts (`enabled: false` — no storage code
 * path, D-03): `data` stays undefined and `available` is false, so
 * callers render the WebUnsupported card instead of the list.
 */
export function useWorkspaceCharts() {
  const available = isWorkspaceStorageAvailable();
  const query = useQuery({
    queryKey: CHARTS_QUERY_KEY,
    queryFn: () => listCharts(),
    enabled: available,
  });
  return { ...query, available };
}

/** Per-chart detail key — joins the list key (Pitfall 10 invalidation map). */
export function chartDetailQueryKey(chartId: string) {
  return [...CHARTS_QUERY_KEY, chartId] as const;
}

/**
 * useWorkspaceChart — the /chart/saved detail query (WORK-03): reads
 * the chart from the repository BY ID (the route passes nothing else —
 * never an envelope in router params) and re-parses the stored envelope
 * at the repository edge before anything renders (D-02). The stored
 * envelope IS the evidence — this query makes no network call.
 *
 * `null` data means "unknown chart id" (callers redirect home); a read
 * failure surfaces as a typed WorkspaceError (OPEN_FAILED). Local
 * reads are deterministic — no auto-retry.
 */
export function useWorkspaceChart(chartId: string) {
  return useQuery({
    queryKey: chartDetailQueryKey(chartId),
    queryFn: () => getChartDetail(chartId),
    enabled: chartId.length > 0 && isWorkspaceStorageAvailable(),
    retry: false,
  });
}
