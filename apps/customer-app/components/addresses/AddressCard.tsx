import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";
import { Address } from "@/types/address";

interface AddressCardProps {
  address: Address;
  border: string;
  primary: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function AddressCard({
  address,
  border,
  primary,
  onEdit,
  onDelete,
}: AddressCardProps) {
  // Determine icon based on label
  const getIcon = () => {
    switch (address.label.toLowerCase()) {
      case "home":
        return "house.fill";
      case "work":
        return "bag"; // or "briefcase"
      default:
        return "mappin.circle.fill";
    }
  };

  const isSystemLabel = address.label === "Home" || address.label === "Work";

  return (
    <View style={[styles.card, { borderColor: border }]}>
      <View style={[styles.iconContainer, { backgroundColor: primary + "10" }]}>
        <IconSymbol name={getIcon()} size={20} color={primary} />
      </View>

      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          {address.label}
        </ThemedText>
        <ThemedText numberOfLines={1} style={styles.addressLine}>
          {address.address}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onEdit} style={styles.actionBtn}>
          <IconSymbol name="pencil" size={18} color={primary} />
        </Pressable>

        {!isSystemLabel && (
          <Pressable onPress={onDelete} style={styles.actionBtn}>
            <IconSymbol name="trash" size={18} color="#EF4444" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "transparent",
    marginBottom: 4,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  label: {
    fontSize: 16,
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 13,
    opacity: 0.6,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
  },
});
