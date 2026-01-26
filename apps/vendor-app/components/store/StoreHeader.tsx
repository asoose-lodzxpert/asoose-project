import React, { useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from "@/context/AuthContext";

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

  const yellow = useThemeColor({}, "brandPrimary");
  const green = useThemeColor({}, "statusSuccess");
  const orange = useThemeColor({}, "statusPending");
  const red = useThemeColor({}, "statusError");
  const borderColor = useThemeColor({}, "borderDefault");
  const surfaceCard = useThemeColor({}, "surfaceCard");

  // Animation values
  const translateX = useRef(new Animated.Value(isOnline ? 1 : 0)).current;
  const backgroundAnim = useRef(new Animated.Value(isOnline ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: isOnline ? 1 : 0,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }),
      Animated.timing(backgroundAnim, {
        toValue: isOnline ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isOnline]);

  const thumbTranslateX = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  const switchBackgroundColor = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [borderColor, yellow],
  });

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
        <View style={styles.skeletonSwitch} />
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

      {/* Right: Compact Switch */}
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
        style={styles.switchPressable}
      >
        <Animated.View
          style={[
            styles.switchTrack,
            {
              backgroundColor: switchBackgroundColor,
              opacity: loading ? 0.7 : 1,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.switchThumb,
              { backgroundColor: surfaceCard },
              { transform: [{ translateX: thumbTranslateX }] },
            ]}
          >
            {loading && <ActivityIndicator size="small" color="#999" />}
          </Animated.View>
        </Animated.View>
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

  /* ===== Switch ===== */

  switchPressable: {
    marginLeft: 12,
  },

  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 2,
  },

  switchThumb: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
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

  skeletonSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ccc",
    opacity: 0.3,
  },
});
