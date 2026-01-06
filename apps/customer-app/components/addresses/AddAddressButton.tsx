import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";

export function AddAddressButton({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary: string;
}) {
  return (
    <Pressable
      style={[styles.addBtn, { borderColor: primary }]}
      onPress={onPress}
    >
      <IconSymbol name="plus" size={18} color={primary} />
      <ThemedText style={[styles.addText, { color: primary }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: "center",
  },
  addText: { marginLeft: 8, fontWeight: "600" },
});
