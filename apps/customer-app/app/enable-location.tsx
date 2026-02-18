import React, { useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { router } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

/* ---------------------------------- */
/* Screen */
/* ---------------------------------- */
export default function EnableLocationScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const muted = useThemeColor({}, "textMuted");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------------------------- */
  /* Request Permission */
  /* ---------------------------------- */
  const requestPermission = async () => {
    setLoading(true);
    setError(null);

    const { status } = await Location.requestForegroundPermissionsAsync();

    setLoading(false);

    if (status !== Location.PermissionStatus.GRANTED) {
      setError(
        "Location permission is required to continue. You can enable it later in settings.",
      );
      return;
    }

    router.replace({ pathname: "/" } as any); // continue to app
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Illustration */}
      <View style={styles.illustration}>
        <View style={styles.mapGrid}>
          <IconSymbol name="map.fill" size={120} color="#F3F4F6" />
        </View>

        <View style={[styles.pin, { backgroundColor: primary }]}>
          <IconSymbol name="location.fill" size={28} color="#000" />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Enable Location
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: muted }]}>
          We need your location to power essential features
        </ThemedText>

        {/* Value Props */}
        <View style={styles.list}>
          <ValueItem
            icon="map.marker"
            text="Find nearby stores and services"
            color={primary}
          />

          <ValueItem
            icon="car"
            text="Accurate ride pickups and navigation"
            color={primary}
          />
          <ValueItem
            icon="package"
            color={primary}
            text="Precise delivery drop-off locations"
          />
        </View>

        {/* Privacy */}
        <View style={styles.privacyBox}>
          <IconSymbol name="shield" size={18} color="#2563EB" />
          <ThemedText style={styles.privacyText}>
            Your location is only used while you’re using the app. You can
            change this anytime in your device settings.
          </ThemedText>
        </View>

        {/* Error */}
        {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
      </View>

      {/* CTA */}
      <Pressable
        style={[styles.button, { backgroundColor: primary }]}
        onPress={requestPermission}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <ThemedText style={styles.buttonText}>Enable Location</ThemedText>
        )}
      </Pressable>
    </ThemedView>
  );
}

/* ---------------------------------- */
/* Components */
/* ---------------------------------- */
function ValueItem({
  icon,
  text,
  color,
}: {
  icon: any;
  text: string;
  color: string;
}) {
  return (
    <View style={styles.valueItem}>
      <IconSymbol name={icon} size={20} color={color} />
      <ThemedText style={styles.valueText}>{text}</ThemedText>
    </View>
  );
}

/* ---------------------------------- */
/* Styles */
/* ---------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  illustration: {
    marginTop: 60,
    alignItems: "center",
  },
  mapGrid: {
    opacity: 0.6,
  },
  pin: {
    position: "absolute",
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  content: {
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    fontSize: 15,
  },
  list: {
    gap: 14,
    marginTop: 8,
  },
  valueItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  valueText: {
    fontSize: 15,
  },
  privacyBox: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "flex-start",
  },
  privacyText: {
    fontSize: 13,
    color: "#1E3A8A",
    flex: 1,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    textAlign: "center",
  },
  button: {
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
});
