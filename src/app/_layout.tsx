import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

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
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <QueryProvider>
        <AnimatedSplashOverlay />
        <Stack>
          <Stack.Screen name="index" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="birth" />
          <Stack.Screen name="birth/confirm" />
          <Stack.Screen name="chart/result" />
        </Stack>
      </QueryProvider>
    </ThemeProvider>
  );
}
