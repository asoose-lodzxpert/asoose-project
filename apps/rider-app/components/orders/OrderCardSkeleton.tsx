import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";

export function OrderCardSkeleton() {
  const cardBg = useThemeColor({}, "surfaceSubtle");
  const shimmerColor = useThemeColor({}, "borderDefault");

  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnimation]);

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Animated.View
          style={[
            styles.skeletonBox,
            styles.orderId,
            { backgroundColor: shimmerColor, opacity },
          ]}
        />
        <Animated.View
          style={[
            styles.skeletonBox,
            styles.badge,
            { backgroundColor: shimmerColor, opacity },
          ]}
        />
      </View>

      {/* From Location */}
      <View style={styles.locationRow}>
        <Animated.View
          style={[
            styles.skeletonBox,
            styles.icon,
            { backgroundColor: shimmerColor, opacity },
          ]}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Animated.View
            style={[
              styles.skeletonBox,
              styles.label,
              { backgroundColor: shimmerColor, opacity },
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonBox,
              styles.text,
              { backgroundColor: shimmerColor, opacity },
            ]}
          />
        </View>
      </View>

      {/* To Location */}
      <View style={styles.locationRow}>
        <Animated.View
          style={[
            styles.skeletonBox,
            styles.icon,
            { backgroundColor: shimmerColor, opacity },
          ]}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Animated.View
            style={[
              styles.skeletonBox,
              styles.label,
              { backgroundColor: shimmerColor, opacity },
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonBox,
              styles.text,
              { backgroundColor: shimmerColor, opacity },
            ]}
          />
        </View>
      </View>

      {/* Earnings */}
      <View style={styles.earningsRow}>
        <Animated.View
          style={[
            styles.skeletonBox,
            styles.earningsLabel,
            { backgroundColor: shimmerColor, opacity },
          ]}
        />
        <Animated.View
          style={[
            styles.skeletonBox,
            styles.earningsAmount,
            { backgroundColor: shimmerColor, opacity },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
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
