import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import providerRegistryData from '@/data/provider-registry.json';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { DISCLOSURE_CTA, DISCLOSURE_HEADING, DISCLOSURE_INTRO, DISCLOSURE_PRIVACY_LINK } from './copy';

/**
 * Registry-driven one-time calculation disclosure (D-04, T-02-29/T-02-30).
 *
 * Renders the two locked Phase-2 provider entries from
 * `src/data/provider-registry.json` (filtered by id, registry order) using
 * the Phase-1 privacy.tsx card pattern: data-category chips, "When it
 * sends", "Retention", "Purpose". The component contains NO provider
 * content of its own — every name, status, category, trigger, retention,
 * and purpose string comes from the registry data at runtime, so the
 * notice can never drift from what governance documents claim (Phase-1
 * invariant, test-enforced by calculation-disclosure.test.tsx).
 *
 * The status note derives from `provider.status` and stays truthful on
 * both sides of the governed planned → active flip (Task 3 of this plan).
 */

/** The two locked provider ids whose flows the first calculation enables. */
export const CALCULATION_DISCLOSURE_PROVIDER_IDS = [
  'lemastra-calculation',
  'google-geocoding-timezone',
] as const;

export type CalculationDisclosureProps = {
  /** Fired by the "Got it — Calculate chart" CTA — persists the flag and proceeds. */
  onAcknowledge: () => void;
  testID?: string;
};

export function CalculationDisclosure({ onAcknowledge, testID }: CalculationDisclosureProps) {
  const theme = useTheme();

  const entries = CALCULATION_DISCLOSURE_PROVIDER_IDS.map((id) => {
    const entry = providerRegistryData.providers.find((provider) => provider.id === id);
    if (!entry) {
      throw new Error(`provider registry is missing the locked disclosure id: ${id}`);
    }
    return entry;
  });

  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <ThemedText type="default" accessibilityRole="header" style={styles.heading}>
        {DISCLOSURE_HEADING}
      </ThemedText>
      <ThemedText type="default">{DISCLOSURE_INTRO}</ThemedText>

      <View role="list" accessible style={styles.providers}>
        {entries.map((provider) => {
          const statusLabel =
            provider.status === 'planned' ? 'Planned — not yet active' : 'Active';
          return (
            <View
              key={provider.id}
              style={styles.providerCard}
              role="listitem"
              accessible
              accessibilityLabel={`${provider.name} — ${statusLabel}`}
            >
              <ThemedText type="default" style={styles.providerName}>
                {provider.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.providerStatus}>
                {statusLabel}
              </ThemedText>

              <ThemedText type="small" style={styles.fieldLabel}>
                Data it would receive:
              </ThemedText>
              <View style={styles.categories}>
                {provider.dataCategories.map((category) => (
                  <ThemedText key={category} type="code" style={styles.category}>
                    {category}
                  </ThemedText>
                ))}
              </View>

              <ThemedText type="small">
                {`When it sends: ${provider.transmissionTrigger}`}
              </ThemedText>

              <ThemedText type="small" style={styles.fieldLabel}>
                Retention:
              </ThemedText>
              <ThemedText type="small">{provider.retention}</ThemedText>

              <ThemedText type="small" style={styles.fieldLabel}>
                Purpose:
              </ThemedText>
              <ThemedText type="small">{provider.purpose}</ThemedText>

              {provider.notes ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {provider.notes}
                </ThemedText>
              ) : null}
            </View>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onAcknowledge}
        style={[styles.cta, { backgroundColor: theme.accent }]}
      >
        <ThemedText type="default" style={[styles.ctaLabel, { color: theme.background }]}>
          {DISCLOSURE_CTA}
        </ThemedText>
      </Pressable>

      <Pressable
        accessibilityRole="link"
        hitSlop={Spacing.two}
        onPress={() => router.push('/privacy')}
        style={styles.privacyLink}
      >
        <ThemedText type="linkPrimary">{DISCLOSURE_PRIVACY_LINK}</ThemedText>
      </Pressable>
    </View>
  );
}

/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = 'rgba(128, 128, 128, 0.4)';

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  heading: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600',
  },
  providers: {
    gap: Spacing.two,
  },
  providerCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HAIRLINE_BORDER_COLOR,
    backgroundColor: 'transparent',
    padding: Spacing.two,
    gap: Spacing.one,
  },
  providerName: {
    fontWeight: '600',
  },
  providerStatus: {
    fontWeight: '600',
  },
  fieldLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: Spacing.one,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  category: {
    borderRadius: 4,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.half,
    overflow: 'hidden',
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  cta: {
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontWeight: '600',
  },
  privacyLink: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
