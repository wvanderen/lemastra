import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * TanStack Query provider for React Native (STACK.md query wiring).
 *
 * - Creates the QueryClient once per mount (lazy useState initializer —
 *   never per render).
 * - Wires focusManager to AppState visibility per the official TanStack
 *   Query React Native guidance, so queries refetch on return-to-foreground
 *   only when the app is actually active.
 *
 * Mounted in src/app/_layout.tsx by plan 02-06 — screens import their
 * mutations/queries through this single provider.
 */

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === "active");
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Screen plans (02-06+) tune per-query defaults; these are the
        // conservative floor for local dev.
        defaultOptions: {
          queries: { retry: 2, staleTime: 30_000 },
        },
      })
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => subscription.remove();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default QueryProvider;
