import React from "react";
import { View, StyleSheet, Image, Pressable, Linking } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function ClosedPermanentlyScreen() {
  const { signOut } = useAuth();
  const textSecondary = useThemeColor({}, "textSecondary");
  const statusError = useThemeColor({}, "statusError");

  const handleContactSupport = () =>
    Linking.openURL("mailto:compliance@asoose.com");

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={[styles.logo, { tintColor: "#999", opacity: 0.4 }]}
          resizeMode="contain"
        />

        <IconSymbol name="lock.fill" size={48} color={statusError} />

        <ThemedText type="title" style={styles.title}>
          Store Permanently Closed
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
          Your vendor access has ended. You may still contact compliance
          regarding final statements or payout data.
        </ThemedText>

        <Pressable onPress={handleContactSupport} style={styles.linkButton}>
          <ThemedText style={{ color: statusError, fontWeight: "600" }}>
            Contact Compliance
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={signOut}
          style={({ pressed }) => [
            styles.exitButton,
            pressed && { opacity: 0.7 },
          ]}
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
    width: 60,
    height: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 22,
    marginTop: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 32,
  },
  linkButton: {
    padding: 12,
    marginBottom: 20,
  },
  exitButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
