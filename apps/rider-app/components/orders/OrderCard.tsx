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
      <View style={{ flex: 1, gap: 12 }}>
        {/* Locations */}
        <View style={styles.routeBlock}>
          <View style={styles.routeRow}>
            <View style={styles.labelContainer}>
              <ThemedText style={styles.stepLabel}>PICK UP</ThemedText>
            </View>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <IconSymbol name="circle.fill" size={10} color="#22C55E" />
              <ThemedText
                numberOfLines={2}
                style={[styles.locationText, { color: primaryText }]}
              >
                {order.pickupAddress?.street ||
                  order.pickupAddress?.address ||
                  "Pickup location"}
              </ThemedText>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.routeRow}>
            <View style={styles.labelContainer}>
              <ThemedText style={styles.stepLabel}>DROP OFF</ThemedText>
            </View>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <IconSymbol name="mappin.circle.fill" size={14} color="#EF4444" />
              <ThemedText
                numberOfLines={2}
                style={[styles.locationText, { color: primaryText }]}
              >
                {order.dropoffAddress?.street ||
                  order.dropoffAddress?.address ||
                  "Dropoff location"}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Meta info */}
        <View style={styles.metaRow}>
          <View style={styles.typeBadge}>
            <IconSymbol
              name={order.jobType === "ride" ? "car.fill" : "shippingbox.fill"}
              size={12}
              color={muted}
            />
            <ThemedText style={[styles.metaText, { color: muted }]}>
              {order.jobType === "ride" ? "Ride" : "Delivery"}
            </ThemedText>
          </View>
          
          <View style={styles.metaDot} />
          
          <ThemedText style={[styles.metaText, { color: muted }]}>
            {new Date(
              order.createdAt || order.assignedAt || Date.now()
            ).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </ThemedText>
        </View>
      </View>

      {/* RIGHT: Amount + Status */}
      <View style={styles.rightColumn}>
        <View style={styles.earningsContainer}>
          <ThemedText style={[styles.earnLabel, { color: muted }]}>YOU EARN</ThemedText>
          <ThemedText style={styles.amountText}>
            ₦{order.earnings?.toLocaleString() || "0"}
          </ThemedText>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + "20" }]}>
          <ThemedText
            style={[styles.statusText, { color: getStatusColor(order.status) }]}
          >
            {getStatusLabel(order.status).toUpperCase()}
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
    gap: 8,
  },

  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  labelContainer: {
    width: 65,
    paddingVertical: 2,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    alignItems: "center",
  },

  stepLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
  },

  routeLine: {
    marginLeft: 32,
    height: 12,
    borderLeftWidth: 1.5,
    borderLeftColor: "#E5E7EB",
    borderStyle: "dashed",
  },

  locationText: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },

  /* Meta */

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  metaText: {
    fontSize: 12,
    fontWeight: "500",
  },

  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },

  /* Right side */

  rightColumn: {
    alignItems: "flex-end",
    gap: 12,
    justifyContent: "space-between",
    alignSelf: "stretch",
  },

  earningsContainer: {
    alignItems: "flex-end",
  },

  earnLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
  },

  amountText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
});
