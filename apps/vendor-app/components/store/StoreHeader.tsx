import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Pressable, Animated } from "react-native";
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
  loading,
}) => {
  const { user } = useAuth();
  const yellow = useThemeColor({}, "brandPrimary");
  const green = useThemeColor({}, "statusSuccess");
  const orange = useThemeColor({}, "statusPending");
  const red = useThemeColor({}, "statusError");
  const borderColor = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");
  const surfaceCard = useThemeColor({}, "surfaceCard");

  // Animation values
  const translateX = useRef(new Animated.Value(isOnline ? 1 : 0)).current;
  const backgroundColor = useRef(new Animated.Value(isOnline ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: isOnline ? 1 : 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(backgroundColor, {
        toValue: isOnline ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isOnline]);

  const thumbTranslateX = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 34],
  });

  const switchBackgroundColor = backgroundColor.interpolate({
    inputRange: [0, 1],
    outputRange: [borderColor, yellow],
  });

  // Get status color and text
  const getStatusInfo = () => {
    switch (user?.status) {
      case "ACTIVE":
        return { color: green, text: "Verified", icon: "✓" };
      case "PENDING":
        return { color: orange, text: "Pending", icon: "⏳" };
      case "SUSPENDED":
        return { color: red, text: "Suspended", icon: "⏸" };
      case "BANNED":
        return { color: red, text: "Banned", icon: "✕" };
      default:
        return { color: borderColor, text: "Unknown", icon: "?" };
    }
  };

  const statusInfo = getStatusInfo();

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.left}>
          <View>
            <View
              style={{
                width: 120,
                height: 20,
                backgroundColor: borderColor,
                borderRadius: 4,
                opacity: 0.3,
                marginBottom: 4,
              }}
            />
            <View
              style={{
                width: 80,
                height: 16,
                backgroundColor: borderColor,
                borderRadius: 4,
                opacity: 0.3,
              }}
            />
          </View>
        </View>
        <View
          style={{
            width: 60,
            height: 28,
            backgroundColor: borderColor,
            borderRadius: 14,
            opacity: 0.3,
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View>
          <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>
            {storeName}
          </ThemedText>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusInfo.color + "20" },
              ]}
            >
              <ThemedText style={{ fontSize: 10, marginRight: 2 }}>
                {statusInfo.icon}
              </ThemedText>
              <ThemedText
                style={{
                  color: statusInfo.color,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {statusInfo.text}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      {/* Animated Switch */}
      <Pressable onPress={onToggleOnline} style={styles.switchPressable}>
        <Animated.View
          style={[
            styles.switchTrack,
            {
              backgroundColor: switchBackgroundColor,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.switchThumb,
              {
                backgroundColor: surfaceCard,
                transform: [{ translateX: thumbTranslateX }],
              },
            ]}
          >
            {isOnline && (
              <View style={styles.checkIcon}>
                <ThemedText style={{ color: yellow, fontSize: 12 }}>
                  ✓
                </ThemedText>
              </View>
            )}
          </Animated.View>
          <ThemedText
            style={[
              styles.switchLabel,
              {
                color: isOnline ? surfaceCard : textSecondary,
                opacity: isOnline ? 1 : 0.7,
              },
            ]}
          >
            {isOnline ? "OPEN" : "CLOSED"}
          </ThemedText>
        </Animated.View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  switchPressable: {
    marginLeft: 8,
  },
  switchTrack: {
    width: 70,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumb: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  checkIcon: {
    justifyContent: "center",
    alignItems: "center",
  },
  switchLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
  },
});
