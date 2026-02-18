import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "./themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ModifierGroupSelection } from "@/types/cart";

interface CartItemModifiersProps {
  modifierGroups?: ModifierGroupSelection[];
}

export const CartItemModifiers: React.FC<CartItemModifiersProps> = ({
  modifierGroups,
}) => {
  const textMuted = useThemeColor({}, "textMuted");
  const primary = useThemeColor({}, "brandPrimary");

  if (!modifierGroups || modifierGroups.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {modifierGroups.map((group) => (
        <View key={group.id} style={styles.group}>
          <ThemedText style={[styles.groupName, { color: textMuted }]}>
            {group.name}:
          </ThemedText>
          <ThemedText style={[styles.modifiers, { color: primary }]}>
            {group.selectedModifiers
              .map((m) => `${m.name}${m.price > 0 ? ` (+₦${m.price})` : ""}`)
              .join(", ")}
          </ThemedText>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  group: {
    marginBottom: 4,
  },
  groupName: {
    fontSize: 11,
    fontWeight: "500",
  },
  modifiers: {
    fontSize: 11,
    marginTop: 2,
  },
});
