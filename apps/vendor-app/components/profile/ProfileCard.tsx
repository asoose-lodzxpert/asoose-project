import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ProfileData, VendorStatus } from "@/types/profile";

interface Props {
  data: ProfileData;
  onEditPicture?: () => void;
}

export const ProfileCard: React.FC<Props> = ({ data, onEditPicture }) => {
  const brandPrimary = useThemeColor({}, "brandPrimary");

  const getStatusColor = (status: VendorStatus) => {
    switch (status) {
      case "approved":
        return "#22c55e";
      case "pending":
        return "#fbbf24";
      case "suspended":
        return "#ef4444";
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.pictureContainer}>
        <Image
          source={
            data.profilePicture
              ? { uri: data.profilePicture }
              : require("@/assets/default-avatar.png")
          }
          style={styles.profilePicture}
        />
        <Pressable style={styles.editOverlay} onPress={onEditPicture}>
          <IconSymbol name="camera.fill" size={20} color="#fff" />
        </Pressable>
      </View>

      <ThemedText type="defaultSemiBold" style={styles.businessName}>
        {data.businessName}
      </ThemedText>
      <ThemedText style={styles.shopName}>{data.shopName}</ThemedText>
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(data.status) },
        ]}
      >
        <ThemedText style={{ color: "#fff" }}>
          {data.status.toUpperCase()}
        </ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    padding: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    gap: 12,
  },
  pictureContainer: {
    position: "relative",
  },
  profilePicture: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  editOverlay: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#0008",
    borderRadius: 16,
    padding: 6,
  },
  businessName: { fontSize: 18 },
  shopName: { color: "#6B7280" },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
