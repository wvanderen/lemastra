import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  HOME_CTA,
  HOME_HEADING,
  HOME_SUBLINE,
  PRIVACY_LINK,
} from '@/components/birth/copy';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Home (`/`) — the entry point of the first walkable user slice
 * (02-UI-SPEC §"Copy Deck", Home): heading, sub-line, the primary CTA
 * into the birth flow (/birth), and the privacy link.
 *
 * Replaces the Phase-1 redirect-to-/privacy landing (01-02): the
 * disclosure screen remains one tap away instead of being the front door.
 */
export default function Home() {
  const theme = useTheme();

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
          {HOME_CTA}
        </ThemedText>
      </Pressable>

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
  footerLink: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
