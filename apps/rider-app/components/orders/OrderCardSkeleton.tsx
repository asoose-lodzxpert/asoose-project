import { useThemeColor } from "@/hooks/use-theme-color";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export function OrderCardSkeleton() {
  const cardBg = useThemeColor({}, "surfaceSubtle");
  const shimmerColor = useThemeColor({}, "borderDefault");

  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [shimmer]);

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const shimmerStyle = {
    opacity: shimmerOpacity,
    backgroundColor: shimmerColor,
  };

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Animated.View
          style={[styles.skeletonBox, styles.orderId, shimmerStyle]}
        />
        <Animated.View
          style={[styles.skeletonBox, styles.badge, shimmerStyle]}
        />
      </View>

      {/* From Location */}
      <View style={styles.locationRow}>
        <Animated.View
          style={[styles.skeletonBox, styles.icon, shimmerStyle]}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Animated.View
            style={[styles.skeletonBox, styles.label, shimmerStyle]}
          />
          <Animated.View
            style={[styles.skeletonBox, styles.text, shimmerStyle]}
          />
        </View>
      </View>

      {/* To Location */}
      <View style={styles.locationRow}>
        <Animated.View
          style={[styles.skeletonBox, styles.icon, shimmerStyle]}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Animated.View
            style={[styles.skeletonBox, styles.label, shimmerStyle]}
          />
          <Animated.View
            style={[styles.skeletonBox, styles.text, shimmerStyle]}
          />
        </View>
      </View>

      {/* Earnings */}
      <View style={styles.earningsRow}>
        <Animated.View
          style={[styles.skeletonBox, styles.earningsLabel, shimmerStyle]}
        />
        <Animated.View
          style={[styles.skeletonBox, styles.earningsAmount, shimmerStyle]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 20,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  earningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  skeletonBox: {
    borderRadius: 8,
  },
  orderId: {
    width: 120,
    height: 20,
  },
  badge: {
    width: 80,
    height: 28,
    borderRadius: 14,
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  label: {
    width: 40,
    height: 14,
  },
  text: {
    width: "90%",
    height: 18,
  },
  earningsLabel: {
    width: 70,
    height: 16,
  },
  earningsAmount: {
    width: 100,
    height: 24,
  },
});
