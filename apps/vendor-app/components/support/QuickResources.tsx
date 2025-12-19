// components/support/QuickResources.tsx
import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

export const QuickResources = () => {
  const background = useThemeColor({}, "surfaceCard");
  const primary = useThemeColor({}, "brandPrimary");

  type Item = { label: string; icon: IconSymbolName }[];

  const items: Item = [
    { label: "Contact Support", icon: "headphones" },
    { label: "Video Tutorials", icon: "play" },
    { label: "System Status", icon: "activity" },
  ];

  return (
    <View style={styles.row}>
      {items.map((i) => (
        <Pressable
          key={i.label}
          style={[styles.card, { backgroundColor: background }]}
        >
          <IconSymbol name={i.icon} size={24} color={primary} />
          <ThemedText type="defaultSemiBold" style={{ textAlign: "center" }}>
            {i.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
});
