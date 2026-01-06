import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";

export function AddressCard({
  address,
  border,
  primary,
  onEdit,
  onDelete,
}: any) {
  return (
    <View style={[styles.addressCard, { borderColor: border }]}>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.addressLabel}>{address.label}</ThemedText>
        <ThemedText style={styles.addressText}>{address.address}</ThemedText>
        {address.coordinates.lat && address.coordinates.lng && (
          <ThemedText style={styles.coords}>
            {address.coordinates.lat}, {address.coordinates.lng}
          </ThemedText>
        )}
      </View>
      <View style={styles.addressActions}>
        <Pressable style={{ marginRight: 12 }} onPress={onEdit}>
          <ThemedText style={{ color: primary, fontWeight: "600" }}>
            Edit
          </ThemedText>
        </Pressable>
        {address.label !== "Home" && address.label !== "Work" && (
          <Pressable onPress={onDelete}>
            <IconSymbol name="trash" size={20} color="#FF4D4F" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  addressLabel: { fontSize: 15, fontWeight: "600" },
  addressText: { fontSize: 14, marginTop: 4 },
  coords: { fontSize: 12, color: "#888", marginTop: 2 },
  addressActions: { flexDirection: "row", marginLeft: 12 },
});
