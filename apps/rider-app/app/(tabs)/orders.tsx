import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import { RelativePathString, useRouter } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { OrderCardSkeleton } from "@/components/orders/OrderCardSkeleton";
import {
  getAllOrders,
  type CombinedOrder,
  type OrderStatus,
} from "@/services/orders.service";
import Toast from "react-native-toast-message";

/* ---------------------------------- */
/* Types */
/* ---------------------------------- */

type OrderTab = "pending" | "active" | "completed";

/* ---------------------------------- */
/* Main Component */
/* ---------------------------------- */

export default function OrdersScreen() {
  const router = useRouter();

  const surface = useThemeColor({}, "surfaceBackground");
  const cardBg = useThemeColor({}, "surfaceSubtle");
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");

  const [activeTab, setActiveTab] = useState<OrderTab>("active");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<CombinedOrder[]>([]);

  // Fetch orders from backend
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      // Determine status filter based on tab
      let statusFilter: string | undefined;
      if (activeTab === "pending") {
        statusFilter = "PENDING,REQUESTED,ASSIGNED";
      } else if (activeTab === "active") {
        statusFilter = "ACCEPTED,PICKED_UP,IN_PROGRESS";
      } else if (activeTab === "completed") {
        statusFilter = "DELIVERED,COMPLETED,CANCELLED,REJECTED";
      }

      const response = await getAllOrders(statusFilter);
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
      Toast.show({
        type: "error",
        text1: "Failed to fetch orders",
        text2: "Please try again",
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Fetch on mount and when tab changes
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case "PENDING":
      case "REQUESTED":
      case "ASSIGNED":
        return "#F59E0B"; // Orange
      case "ACCEPTED":
      case "PICKED_UP":
        return "#3B82F6"; // Blue
      case "IN_PROGRESS":
        return "#8B5CF6"; // Purple
      case "DELIVERED":
      case "COMPLETED":
        return success || "#10B981"; // Green
      case "CANCELLED":
      case "REJECTED":
        return danger; // Red
      default:
        return muted;
    }
  };

  const getStatusLabel = (status: OrderStatus): string => {
    switch (status) {
      case "PENDING":
        return "Pending";
      case "REQUESTED":
        return "Requested";
      case "ASSIGNED":
        return "Assigned";
      case "ACCEPTED":
        return "Accepted";
      case "PICKED_UP":
        return "Picked Up";
      case "IN_PROGRESS":
        return "In Progress";
      case "DELIVERED":
        return "Delivered";
      case "COMPLETED":
        return "Completed";
      case "CANCELLED":
        return "Cancelled";
      case "REJECTED":
        return "Rejected";
      default:
        return status;
    }
  };

  const renderOrderCard = (order: CombinedOrder) => (
    <View key={order.id} style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderIdRow}>
          <ThemedText style={styles.orderId}>#{order.id}</ThemedText>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor:
                  order.type === "ride" ? primary + "20" : "#8B5CF6" + "20",
              },
            ]}
          >
            <ThemedText
              style={[
                styles.typeBadgeText,
                { color: order.type === "ride" ? primary : "#8B5CF6" },
              ]}
            >
              {order.type === "ride" ? "Ride" : "Delivery"}
            </ThemedText>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(order.status) + "20" },
          ]}
        >
          <ThemedText
            style={[styles.statusText, { color: getStatusColor(order.status) }]}
          >
            {getStatusLabel(order.status)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.locationContainer}>
        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: primary }]} />
          <ThemedText style={styles.locationText}>
            {order.pickupLocation || "Pickup Location"}
          </ThemedText>
        </View>
        <View style={styles.dashedLine} />
        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: danger }]} />
          <ThemedText style={styles.locationText}>
            {order.dropoffLocation || "Dropoff Location"}
          </ThemedText>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <ThemedText style={styles.dateText}>
          {new Date(order.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </ThemedText>
        <ThemedText style={styles.earningsText}>
          ₦{order.totalAmount?.toLocaleString() || "0"}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <ThemedText type="title" style={styles.pageTitle}>
        Orders
      </ThemedText>

      {/* Custom Order Tabs */}
      <OrderTabs active={activeTab} onChange={setActiveTab} />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {loading ? (
          <View style={styles.cardsList}>
            {Array.from({ length: 3 }).map((_, index) => (
              <OrderCardSkeleton key={index} />
            ))}
          </View>
        ) : orders.length === 0 ? (
          <EmptyState message="No orders in this section" />
        ) : (
          <View style={styles.cardsList}>{orders.map(renderOrderCard)}</View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

/* ---------------------------------- */
/* OrderTabs Component (Exactly as provided) */
/* ---------------------------------- */

// import { OrderTab } from "@/types/order"; // Assuming you have this type

interface OrderTabsProps {
  active: OrderTab;
  onChange: (tab: OrderTab) => void;
}

export const OrderTabs: React.FC<OrderTabsProps> = ({ active, onChange }) => {
  const primary = useThemeColor({}, "brandPrimary");
  const inactive = useThemeColor({}, "textSecondary");

  const tabs: { key: OrderTab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "active", label: "Active" },
    { key: "completed", label: "History" },
  ];

  return (
    <View style={tabStyles.container}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => onChange(tab.key)}
          style={[
            tabStyles.tab,
            active === tab.key && { borderBottomColor: primary },
          ]}
        >
          <ThemedText
            type={active === tab.key ? "defaultSemiBold" : "default"}
            style={{ color: active === tab.key ? primary : inactive }}
          >
            {tab.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
};

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
});

/* ---------------------------------- */
/* Empty State */
/* ---------------------------------- */

function EmptyState({ message }: { message: string }) {
  const muted = useThemeColor({}, "textMuted");
  return (
    <View style={styles.emptyState}>
      <ThemedText style={{ color: muted, textAlign: "center", fontSize: 16 }}>
        {message}
      </ThemedText>
    </View>
  );
}

/* ---------------------------------- */
/* Styles */
/* ---------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  pageTitle: {
    fontSize: 28,
    marginBottom: 16,
  },
  cardsList: {
    gap: 16,
  },
  orderCard: {
    borderRadius: 16,
    padding: 16,
    gap: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    gap: 12,
  },
  orderIdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontSize: 16,
    fontWeight: "700",
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  locationContainer: {
    gap: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  locationText: {
    fontSize: 14,
    flex: 1,
    color: "#333",
  },
  dashedLine: {
    height: 20,
    width: 2,
    borderLeftWidth: 2,
    borderLeftColor: "#ddd",
    borderStyle: "dashed",
    marginLeft: 4,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  dateText: {
    fontSize: 13,
    color: "#888",
  },
  earningsText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10B981",
  },
  emptyState: {
    padding: 60,
    alignItems: "center",
  },
});
