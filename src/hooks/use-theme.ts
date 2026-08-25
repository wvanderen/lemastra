/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();

  // useColorScheme() can return null (native module not yet loaded, web
  // without a preferred-scheme query) — anything other than an explicit
  // 'dark' resolves to the light palette so themed components always
  // receive a complete token set.
  const theme = scheme === 'dark' ? 'dark' : 'light';

  return Colors[theme];
}
