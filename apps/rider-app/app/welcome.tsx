import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function OnboardingScreen() {
  const router = useRouter();

  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const muted = useThemeColor({}, "textMuted");

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <ThemedText type="title" style={styles.appName}>
          Asoose Rider App
        </ThemedText>

        <ThemedText style={[styles.tagline, { color: muted }]}>
          Deliver. Earn. Succeed.
        </ThemedText>
      </View>

      <View style={styles.illustrationSection}>
        <Image
          source={require("@/assets/images/rider-image.png")}
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.features}>
          <Feature
            icon="calendar"
            title="Flexible Hours"
            description="Work on your schedule."
            color={primary}
          />

          <Feature
            icon="dollar-sign"
            title="Fast Payments"
            description="Weekly payouts, instant withdrawals."
            color={primary}
          />

          <Feature
            icon="clock.fill"
            title="Smart Routes"
            description="Optimized delivery paths."
            color={primary}
          />
        </View>

        <Pressable
          style={[styles.button, { backgroundColor: primary }]}
          onPress={() => router.push("/(auth)/signin")}
        >
          <ThemedText type="defaultSemiBold" style={{ color: textOnPrimary }}>
            Get Started
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

/* ---------------------------------- */
/* Feature Item */
/* ---------------------------------- */
function Feature({
  icon,
  title,
  description,
  color,
}: {
  icon: any;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: color }]}>
        <IconSymbol name={icon} size={20} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText style={styles.featureText}>{description}</ThemedText>
      </View>
    </View>
  );
}

/* ---------------------------------- */
/* Styles */
/* ---------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
  },

  header: {
    alignItems: "center",
  },

  logo: {
    width: 56,
    height: 56,
    marginBottom: 12,
  },

  appName: {
    fontSize: 28,
    fontWeight: "bold",
  },

  tagline: {
    marginTop: 4,
    fontSize: 14,
  },

  illustrationSection: {
    flex: 1, // ⬅️ fills middle space
    alignItems: "center",
    justifyContent: "center",
  },

  illustration: {
    width: "100%",
    height: "100%",
    maxHeight: 260,
  },

  bottomSection: {
    justifyContent: "flex-end",
    paddingBottom: 24,
  },

  features: { gap: 20, marginBottom: 32 },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 14 },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { fontSize: 13, opacity: 0.7, marginTop: 2 },
  button: {
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
