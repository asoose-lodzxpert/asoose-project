import React from "react";
import { View, StyleSheet, Image, Pressable, Linking } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function SuspendedScreen() {
  const { signOut } = useAuth();
  const primary = useThemeColor({}, "brandPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const statusError = useThemeColor({}, "statusError");

  const handleContactSupport = () => Linking.openURL("mailto:hello@asoose.com");

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={[styles.logo, { tintColor: statusError }]}
          resizeMode="contain"
        />

        <IconSymbol
          name="exclamationmark.triangle.fill"
          size={48}
          color={statusError}
        />

        <ThemedText type="title" style={styles.title}>
          Account Suspended
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
          Your vendor access has been restricted due to a policy violation. If
          you believe this is an error, please reach out to our team.
        </ThemedText>

        <Pressable
          onPress={handleContactSupport}
          style={[styles.mainButton, { backgroundColor: primary }]}
        >
          <ThemedText style={styles.buttonText}>Contact Security</ThemedText>
        </Pressable>

        <Pressable onPress={signOut} style={styles.secondaryButton}>
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
    width: 60,
    height: 60,
    marginBottom: 40,
    opacity: 0.5,
  },
  title: {
    fontSize: 24,
    marginTop: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 40,
  },
  mainButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: 12,
  },
});
