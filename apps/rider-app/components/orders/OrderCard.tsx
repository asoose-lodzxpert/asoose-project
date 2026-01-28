import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import { StyleSheet, View } from "react-native";

import type { CurrentJob } from "../../types/job";

import { IconSymbol } from "@/components/ui/icon-symbol";

interface OrderCardProps {
  order: CurrentJob;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  getStatusColor,
  getStatusLabel,
}) => {
  const surface = useThemeColor({}, "surfaceCard");
  const muted = useThemeColor({}, "textDisabled");
  const primaryText = useThemeColor({}, "textPrimary");

  return (
    <View style={[styles.card, { backgroundColor: surface }]}>
      {/* LEFT: Route + meta */}
      <View style={{ flex: 1, gap: 10 }}>
        {/* Locations */}
        <View style={styles.routeBlock}>
          <View style={styles.routeRow}>
            <IconSymbol name="circle.fill" size={10} color="#22C55E" />
            <ThemedText
              numberOfLines={1}
              style={[styles.locationText, { color: primaryText }]}
            >
              {order.pickupAddress?.address || "Pickup location"}
            </ThemedText>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.routeRow}>
            <IconSymbol name="mappin.circle.fill" size={14} color="#EF4444" />
            <ThemedText
              numberOfLines={1}
              style={[styles.locationText, { color: primaryText }]}
            >
              {order.dropoffAddress?.address || "Dropoff location"}
            </ThemedText>
          </View>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          <IconSymbol name="clock" size={14} color={muted} />
          <ThemedText style={[styles.metaText, { color: muted }]}>
            {/* createdAt is not in CurrentJob, fallback to assignedAt or pickedUpAt */}
            {order.assignedAt
              ? new Date(order.assignedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : order.pickedUpAt
                ? new Date(order.pickedUpAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "-"}
          </ThemedText>

          <View style={styles.metaDot} />

          <IconSymbol
            name={order.jobType === "ride" ? "car.fill" : "shippingbox.fill"}
            size={14}
            color={muted}
          />
          <ThemedText style={[styles.metaText, { color: muted }]}>
            {order.jobType === "ride" ? "Ride" : "Delivery"}
          </ThemedText>
        </View>
      </View>

      {/* RIGHT: Amount + Status */}
      <View style={styles.rightColumn}>
        <ThemedText style={styles.amountText}>
          ₦{order.earnings?.toLocaleString() || "0"}
        </ThemedText>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(order.status) },
            ]}
          />
          <ThemedText
            style={[styles.statusText, { color: getStatusColor(order.status) }]}
          >
            {getStatusLabel(order.status)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  /* Route */

  routeBlock: {
    gap: 6,
  },

  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  routeLine: {
    marginLeft: 7,
    height: 10,
    borderLeftWidth: 1,
    borderLeftColor: "#ccc",
    opacity: 0.5,
  },

  locationText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },

  /* Meta */

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  metaText: {
    fontSize: 12,
  },

  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#999",
  },

  /* Right side */

  rightColumn: {
    alignItems: "flex-end",
    gap: 6,
  },

  amountText: {
    fontSize: 15,
    fontWeight: "700",
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
