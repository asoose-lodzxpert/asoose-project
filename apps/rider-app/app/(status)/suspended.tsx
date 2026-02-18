import React from "react";
import { View, StyleSheet, Image, Pressable, Linking } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function SuspendedScreen() {
  const { user, logout } = useAuth();
  const textSecondary = useThemeColor({}, "textSecondary");
  const statusError = useThemeColor({}, "statusError");
  const primary = useThemeColor({}, "brandPrimary");

  const handleContactSupport = () => {
    Linking.openURL("mailto:support@asoose.com");
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <IconSymbol name="alert-circle" size={48} color={statusError} />

        <ThemedText type="title" style={styles.title}>
          Account Suspended
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
          Your rider account has been temporarily suspended. This may be due to
          a policy violation or pending investigation.
        </ThemedText>

        <ThemedText style={[styles.info, { color: textSecondary }]}>
          If you believe this is a mistake, please contact our support team for
          assistance.
        </ThemedText>

        <Pressable
          onPress={handleContactSupport}
          style={[styles.supportButton, { backgroundColor: primary }]}
        >
          <IconSymbol name="headphones" size={20} color="#fff" />
          <ThemedText style={styles.supportButtonText}>
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
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
  },
  supportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
