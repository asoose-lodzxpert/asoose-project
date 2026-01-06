import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

export const MenuEmptyState = () => {
  const primary = useThemeColor({}, "brandPrimary");
  return (
    <View style={styles.container}>
      <IconSymbol name="fork.knife" size={48} color={primary} />
      <ThemedText type="defaultSemiBold">No items yet</ThemedText>
      <ThemedText>Add your first menu item to get started</ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 64,
    gap: 8,
  },
});
