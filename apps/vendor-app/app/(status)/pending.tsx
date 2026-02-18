import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function PendingScreen() {
  const { user, signOut } = useAuth();
  const textSecondary = useThemeColor({}, "textSecondary");
  const statusPending = useThemeColor({}, "statusPending");

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <IconSymbol name="clock.fill" size={48} color={statusPending} />

        <ThemedText type="title" style={styles.title}>
          Review in Progress
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
          Hang tight, {user?.name?.split(" ")[0]}. We're reviewing your vendor
          account. This usually takes 24-48 hours.
        </ThemedText>

        <Pressable
          onPress={signOut}
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
    marginBottom: 40,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
