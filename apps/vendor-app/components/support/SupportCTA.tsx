import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

export const SupportCTA = () => {
  const primary = useThemeColor({}, "brandPrimary");

  return (
    <Pressable style={[styles.button, { backgroundColor: primary }]}>
      <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
        Chat with us
      </ThemedText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
});
