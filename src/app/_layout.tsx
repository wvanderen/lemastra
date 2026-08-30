import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { QueryProvider } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync();

/**
 * Root layout: a plain stack — home (`/`) opens the birth flow, which
 * hands off to the confirmation screen (02-08) and the minimal result
 * screen (deepened in 02-09). The privacy disclosure screen remains a
 * direct route.
 *
 * The TanStack Query provider (02-02) wraps the whole tree: /birth and
 * its PlaceSearch already consume queries/mutations, so every screen
 * mounts inside one client (focusManager ↔ AppState wiring included).
 *
 * GestureHandlerRootView (04-01, Pitfall 2): RNGH 2.x requires this
 * wrapper at the app root or every Phase-4 wheel gesture silently
 * no-ops. No RNGH gesture existed before Phase 4, so this wrapper is
 * behavior-neutral for existing screens.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryProvider>
          <AnimatedSplashOverlay />
          <Stack>
            <Stack.Screen name="index" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="birth" />
            <Stack.Screen name="birth/confirm" />
            <Stack.Screen name="chart/result" />
            <Stack.Screen name="chart/saved" />
            <Stack.Screen name="chart/revision" />
            <Stack.Screen name="chart/explore" />
          </Stack>
        </QueryProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
