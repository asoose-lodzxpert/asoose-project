import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ViewStyle } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const backgroundColor = useThemeColor({}, "surfaceSubtle");
  const shimmerColor = useThemeColor({}, "borderDefault");

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View
      style={[
        styles.container,
        { width: width as any, height, borderRadius },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            backgroundColor,
            opacity,
            borderRadius,
          },
        ]}
      />
    </View>
  );
}

interface SkeletonCardProps {
  style?: ViewStyle;
}

export function SkeletonCard({ style }: SkeletonCardProps) {
  const cardBg = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor: border },
        style,
      ]}
    >
      <Skeleton width={60} height={60} borderRadius={8} />
      <View style={styles.cardContent}>
        <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
}

interface SkeletonListProps {
  count?: number;
  cardStyle?: ViewStyle;
}

export function SkeletonList({ count = 3, cardStyle }: SkeletonListProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} style={cardStyle} />
      ))}
    </>
  );
}

interface SkeletonTextProps {
  lines?: number;
  style?: ViewStyle;
}

export function SkeletonText({ lines = 3, style }: SkeletonTextProps) {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? "70%" : "100%"}
          height={14}
          style={{ marginBottom: 8 }}
        />
      ))}
    </View>
  );
}

interface SkeletonStoreCardProps {
  style?: ViewStyle;
}

export function SkeletonStoreCard({ style }: SkeletonStoreCardProps) {
  const cardBg = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");

  return (
    <View
      style={[
        styles.storeCard,
        { backgroundColor: cardBg, borderColor: border },
        style,
      ]}
    >
      <Skeleton width="100%" height={120} borderRadius={8} />
      <View style={{ padding: 12 }}>
        <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={12} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
}

interface SkeletonRideCardProps {
  style?: ViewStyle;
}

export function SkeletonRideCard({ style }: SkeletonRideCardProps) {
  const cardBg = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");

  return (
    <View
      style={[
        styles.rideCard,
        { backgroundColor: cardBg, borderColor: border },
        style,
      ]}
    >
      <View style={styles.rideHeader}>
        <Skeleton width={120} height={18} />
        <Skeleton width={80} height={24} borderRadius={12} />
      </View>
      <View style={{ marginVertical: 12 }}>
        <Skeleton width="90%" height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="85%" height={14} />
      </View>
      <View style={styles.rideFooter}>
        <Skeleton width={100} height={12} />
        <Skeleton width={60} height={18} />
      </View>
    </View>
  );
}

interface SkeletonAddressCardProps {
  style?: ViewStyle;
}

export function SkeletonAddressCard({ style }: SkeletonAddressCardProps) {
  const cardBg = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");

  return (
    <View
      style={[
        styles.addressCard,
        { backgroundColor: cardBg, borderColor: border },
        style,
      ]}
    >
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.addressContent}>
        <Skeleton width="60%" height={16} style={{ marginBottom: 6 }} />
        <Skeleton width="90%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  shimmer: {
    width: "100%",
    height: "100%",
  },
  card: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  storeCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  rideCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  rideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rideFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addressCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: "center",
  },
  addressContent: {
    flex: 1,
    marginLeft: 12,
  },
});
