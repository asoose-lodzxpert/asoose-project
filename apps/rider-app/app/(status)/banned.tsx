import React from "react";
import { View, StyleSheet, Image, Pressable, Linking } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function BannedScreen() {
  const { user, logout } = useAuth();
  const textSecondary = useThemeColor({}, "textSecondary");
  const statusError = useThemeColor({}, "statusError");

  const handleContactSupport = () => {
    Linking.openURL("mailto:hello@asoose.com");
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <IconSymbol name="close" size={48} color={statusError} />

        <ThemedText type="title" style={styles.title}>
          Account Banned
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
          Your rider account has been permanently banned due to serious policy
          violations.
        </ThemedText>

        <ThemedText style={[styles.info, { color: textSecondary }]}>
          This decision is typically final. If you believe this is an error,
          please contact support for review.
        </ThemedText>

        <Pressable
          onPress={handleContactSupport}
          style={({ pressed }) => [
            styles.contactButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <ThemedText style={{ color: textSecondary }}>
            Contact Support
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={logout}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
        >
          <ThemedText style={{ color: textSecondary }}>Sign Out</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 40,
  },
  content: {
    alignItems: "center",
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  info: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  contactButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
