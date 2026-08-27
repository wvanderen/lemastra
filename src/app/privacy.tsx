import { ScrollView, StyleSheet, Text, View } from "react-native";

import { DataControls } from "@/components/privacy/data-controls";
import providerRegistryData from "@/data/provider-registry.json";

/**
 * Privacy & Data disclosure screen (PRIV-07).
 *
 * Renders the bundled provider registry — the same versioned data that
 * feeds the store-disclosure drafts — so what users read can never drift
 * from what governance documents claim. Every provider name, category,
 * trigger, retention, and purpose string comes from the registry: this
 * component must contain no provider content of its own.
 */
export default function PrivacyScreen() {
  const registry = providerRegistryData;
  const anyProviderActive = registry.providers.some(
    (provider) => provider.status === "active"
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title} accessibilityRole="header">
        Privacy &amp; Data
      </Text>

      {!anyProviderActive && (
        <View style={styles.banner} accessibilityRole="summary">
          <Text style={styles.bannerText}>
            No remote feature is enabled yet. Nothing is sent anywhere: no data
            currently leaves your device.
          </Text>
        </View>
      )}

      <Text style={styles.sectionIntro}>
        The services below are part of the supported product plan. Each one
        lists what it would receive, when it would send, for how long the data
        is kept, and why — before anything is ever enabled.
      </Text>

      <View role="list" accessible>
        {registry.providers.map((provider) => {
          const statusLabel =
            provider.status === "planned"
              ? "Planned — not yet active"
              : "Active";
          return (
            <View
              key={provider.id}
              style={styles.card}
              role="listitem"
              accessible
              accessibilityLabel={`${provider.name} — ${statusLabel}`}
            >
              <Text style={styles.providerName}>{provider.name}</Text>
              <Text style={styles.providerStatus}>{statusLabel}</Text>

              <Text style={styles.fieldLabel}>Data it would receive:</Text>
              <View style={styles.categories}>
                {provider.dataCategories.map((category) => (
                  <Text key={category} style={styles.category}>
                    {category}
                  </Text>
                ))}
              </View>

              <Text style={styles.fieldValue}>
                {`When it sends: ${provider.transmissionTrigger}`}
              </Text>

              <Text style={styles.fieldLabel}>Retention:</Text>
              <Text style={styles.fieldValue}>{provider.retention}</Text>

              <Text style={styles.fieldLabel}>Purpose:</Text>
              <Text style={styles.fieldValue}>{provider.purpose}</Text>

              {provider.notes && <Text style={styles.notes}>{provider.notes}</Text>}
            </View>
          );
        })}
      </View>

      {/* "Your data" user controls (D-15, 03-08) — user controls ONLY:
          provider disclosure content above stays 100% registry-driven. */}
      <DataControls />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
  },
  banner: {
    backgroundColor: "#1c4e3f",
    borderRadius: 8,
    padding: 12,
  },
  bannerText: {
    color: "#eafff4",
    fontSize: 15,
    lineHeight: 21,
  },
  sectionIntro: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.85,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.4)",
    padding: 12,
    gap: 4,
  },
  providerName: {
    fontSize: 17,
    fontWeight: "600",
  },
  providerStatus: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    opacity: 0.6,
    marginTop: 6,
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 19,
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  category: {
    fontSize: 12,
    fontFamily: "monospace",
    backgroundColor: "rgba(128, 128, 128, 0.2)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  notes: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.65,
    marginTop: 6,
  },
});
