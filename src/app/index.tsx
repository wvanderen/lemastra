import { Redirect } from 'expo-router';

/**
 * Landing surface: the Privacy & Data disclosure screen (PRIV-07). A
 * prospective user sees the provider/data disclosures before any remote
 * feature exists.
 */
export default function Index() {
  return <Redirect href="/privacy" />;
}
