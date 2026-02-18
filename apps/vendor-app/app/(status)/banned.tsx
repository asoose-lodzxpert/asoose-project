import React from "react";
import { View, StyleSheet, Image, Pressable, Linking } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function BannedScreen() {
  const { signOut } = useAuth();
  const textSecondary = useThemeColor({}, "textSecondary");
  const statusError = useThemeColor({}, "statusError");

  const handleContactSupport = () => Linking.openURL("mailto:hello@asoose.com");

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={[styles.logo, { tintColor: statusError, opacity: 0.3 }]}
          resizeMode="contain"
        />

        <IconSymbol name="hand.raised.fill" size={48} color={statusError} />

        <ThemedText type="title" style={styles.title}>
          Account Banned
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
          This account has been permanently banned for violating our Terms of
          Service. This decision is final.
        </ThemedText>

        <Pressable onPress={handleContactSupport} style={styles.supportLink}>
          <ThemedText
            style={{ color: textSecondary, textDecorationLine: "underline" }}
          >
            Contact Security
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={signOut}
          style={({ pressed }) => [
            styles.exitButton,
            { backgroundColor: statusError },
            pressed && { opacity: 0.8 },
          ]}
        >
          <ThemedText style={styles.exitText}>Sign Out</ThemedText>
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
    marginBottom: 24,
  },
  supportLink: {
    padding: 12,
    marginBottom: 40,
  },
  exitButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  exitText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
