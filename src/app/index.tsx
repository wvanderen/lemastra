import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  HOME_CTA,
  HOME_HEADING,
  HOME_SUBLINE,
  PRIVACY_LINK,
} from '@/components/birth/copy';
import { ThemedText } from '@/components/themed-text';
import { ChartList } from '@/components/workspace/chart-list';
import { HOME_CTA_WITH_CHARTS, SAVED_CHARTS_HEADING } from '@/components/workspace/copy';
import { WebUnsupported } from '@/components/workspace/web-unsupported';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useWorkspaceCharts } from '@/hooks/use-workspace';
import { useTheme } from '@/hooks/use-theme';

/**
 * Home (`/`) — the private workspace (D-09, WORK-01/03).
 *
 * The Phase-2 hero stays on top: heading, sub-line, the primary CTA
 * into the birth flow, and the privacy footer link. Phase 3 adds the
 * saved-charts list BENEATH the CTA:
 *
 * - Zero charts: the hero alone IS the empty state — no "Saved charts"
 *   heading renders, and the CTA keeps its "Calculate your first chart"
 *   label (A-3-UI-5: "your first" only while the workspace is empty).
 * - ≥1 chart: the CTA reads "Calculate a chart"; the "Saved charts"
 *   heading + rows render between the CTA and the footer.
 * - Web: workspace storage is native-only (D-03) — the capability card
 *   replaces the list and the storage query never mounts; the CTA and
 *   privacy link remain.
 * - Loading: nothing extra renders while the first list query resolves
 *   (local query, fast — no skeleton per 03-UI-SPEC).
 *
 * Rows navigate to /chart/saved?id= — the id-param law: a saved chart
 * is ALWAYS read from the repository by id, never carried in router
 * params (03-RESEARCH anti-pattern). Ordering belongs to the repository
 * (updated_at desc); this screen renders rows in the order received.
 *
 * No sign-in/account surface exists anywhere on this screen (WORK-01).
 */
export default function Home() {
  const theme = useTheme();
  const charts = useWorkspaceCharts();
  const items = charts.data ?? [];
  const hasCharts = items.length > 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <ThemedText type="default" accessibilityRole="header" style={styles.heading}>
          {HOME_HEADING}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {HOME_SUBLINE}
        </ThemedText>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/birth')}
        style={[styles.cta, { backgroundColor: theme.accent }]}
      >
        <ThemedText type="default" style={[styles.ctaLabel, { color: theme.background }]}>
          {hasCharts ? HOME_CTA_WITH_CHARTS : HOME_CTA}
        </ThemedText>
      </Pressable>

      {!charts.available ? (
        <WebUnsupported testID="home-web-unsupported" />
      ) : hasCharts ? (
        <View style={styles.listSection}>
          <ThemedText type="default" accessibilityRole="header" style={styles.sectionHeading}>
            {SAVED_CHARTS_HEADING}
          </ThemedText>
          <ChartList
            items={items}
            onOpen={(chartId) =>
              router.push({ pathname: '/chart/saved', params: { id: chartId } })
            }
          />
        </View>
      ) : null}

      <Pressable
        accessibilityRole="link"
        hitSlop={Spacing.two}
        onPress={() => router.push('/privacy')}
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
    paddingTop: Spacing.five,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  heading: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '600',
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
  listSection: {
    gap: Spacing.two,
  },
  // Section headings render at 24/600 (03-UI-SPEC typography table).
  sectionHeading: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600',
  },
  footerLink: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
