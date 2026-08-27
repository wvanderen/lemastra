/**
 * One-time calculation-disclosure flag (D-04).
 *
 * Before the first chart calculation LemAstra shows what is sent (birth
 * data), where (the LemAstra calculation service), and that requests are
 * ephemeral compute-and-discard (retention-deletion-policy.md §1). After
 * the user acknowledges once, Calculate proceeds without re-asking.
 *
 * The flag is versioned: bumping the key re-shows the notice whenever the
 * disclosure content materially changes. Persistence is best-effort —
 * unavailable storage never blocks calculation.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export const CALCULATION_DISCLOSURE_KEY = "@lemastra:disclosure.calculation.v1";

export function useDisclosure(): { acknowledged: boolean; acknowledge: () => Promise<void> } {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(CALCULATION_DISCLOSURE_KEY)
      .then((value) => {
        if (mounted) {
          setAcknowledged(value === "true");
        }
      })
      .catch(() => undefined); // a read failure must never block calculation
    return () => {
      mounted = false;
    };
  }, []);

  const acknowledge = useCallback(async () => {
    setAcknowledged(true);
    try {
      await AsyncStorage.setItem(CALCULATION_DISCLOSURE_KEY, "true");
    } catch {
      // Safe-persist: an unavailable store degrades to re-showing the
      // notice next launch — never to blocking the Calculate flow.
    }
  }, []);

  return { acknowledged, acknowledge };
}
