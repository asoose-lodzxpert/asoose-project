import React from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";

export function AddressModalHeader({
  onBack,
  primary,
}: {
  onBack: () => void;
  primary: string;
}) {
  return (
    <View style={styles.modalHeader}>
      <Pressable style={styles.backBtn} onPress={onBack}>
        <IconSymbol name="chevron.left" size={24} color={primary} />
      </Pressable>
      <ThemedText type="title">Search Address</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backBtn: { marginRight: 12, padding: 4 },
});
