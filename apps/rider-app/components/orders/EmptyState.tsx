import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  const muted = useThemeColor({}, "textMuted");
  return (
    <View style={styles.emptyState}>
      <ThemedText style={{ color: muted, textAlign: "center", fontSize: 16 }}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    padding: 60,
    alignItems: "center",
  },
});
