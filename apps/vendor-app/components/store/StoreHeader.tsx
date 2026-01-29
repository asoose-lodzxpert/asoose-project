import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";

import * as Haptics from "expo-haptics";
import { IconSymbol } from "../ui/icon-symbol";

interface Props {
  storeName: string;
  isOnline: boolean;
  onToggleOnline: () => void;
  loading?: boolean;
}

export const StoreHeader: React.FC<Props> = ({
  storeName,
  isOnline,
  onToggleOnline,
  loading = false,
}) => {
  const { user } = useAuth();

  const green = useThemeColor({}, "statusSuccess");
  const orange = useThemeColor({}, "statusPending");
  const red = useThemeColor({}, "statusError");
  const borderColor = useThemeColor({}, "borderDefault");
  const surfaceCard = useThemeColor({}, "surfaceCard");

  // Status badge info
  const getStatusInfo = () => {
    switch (user?.status) {
      case "ACTIVE":
        return { color: green, text: "Verified" };
      case "PENDING":
        return { color: orange, text: "Pending" };
      case "SUSPENDED":
        return { color: red, text: "Suspended" };
      case "BANNED":
        return { color: red, text: "Banned" };
      default:
        return { color: borderColor, text: "Unknown" };
    }
  };

  const statusInfo = getStatusInfo();

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1 }}>
          <View style={styles.skeletonLineLarge} />
          <View style={styles.skeletonLineSmall} />
        </View>
        <View style={styles.skeletonToggle} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Left: Store Info */}
      <View style={styles.left}>
        <ThemedText type="defaultSemiBold" style={styles.storeName}>
          {storeName}
        </ThemedText>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusInfo.color + "20" },
          ]}
        >
          <ThemedText
            style={{ color: statusInfo.color, fontSize: 12, fontWeight: "600" }}
          >
            {statusInfo.text}
          </ThemedText>
        </View>
      </View>

      {/* Right: Circular Toggle Button */}
      <Pressable
        disabled={loading}
        onPress={() => {
          if (!loading) {
            if (!isOnline) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else {
              Haptics.selectionAsync();
            }
            onToggleOnline();
          }
        }}
        style={styles.togglePressable}
      >
        <View
          style={[
            styles.toggleCircle,
            {
              backgroundColor: isOnline ? green : red,
              opacity: loading ? 0.7 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <IconSymbol name="power-on" size={20} color="#fff" />
          )}
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },

  left: {
    flex: 1,
  },

  storeName: {
    fontSize: 18,
    marginBottom: 4,
  },

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  togglePressable: {
    marginLeft: 12,
  },

  toggleCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },

  /* ===== Skeleton ===== */

  skeletonLineLarge: {
    width: 140,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#ccc",
    opacity: 0.3,
    marginBottom: 6,
  },

  skeletonLineSmall: {
    width: 80,
    height: 14,
    borderRadius: 4,
    backgroundColor: "#ccc",
    opacity: 0.3,
  },

  skeletonToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ccc",
    opacity: 0.3,
  },
});
