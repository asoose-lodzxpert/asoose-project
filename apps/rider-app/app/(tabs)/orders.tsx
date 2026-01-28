import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { EmptyState } from "@/components/orders/EmptyState";
import { OrderCard } from "@/components/orders/OrderCard";
import { OrderCardSkeleton } from "@/components/orders/OrderCardSkeleton";
import { OrderTabs } from "@/components/orders/OrderTabs";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getAllJobs } from "@/services/orders.service";
import type { CurrentJob } from "@/types/job";
import Toast from "react-native-toast-message";

/* ---------------------------------- */
/* Types */
/* ---------------------------------- */

type OrderTab = "active" | "completed";

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
  const [orders, setOrders] = useState<CurrentJob[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);

  // Fetch orders from backend
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      // Determine status filter based on tab
      let statusFilter: string | undefined;
      if (activeTab === "active") {
        statusFilter = "ACCEPTED,PICKED_UP,IN_PROGRESS";
      } else if (activeTab === "completed") {
        statusFilter = "DELIVERED,COMPLETED,CANCELLED,REJECTED";
      }
      const response = await getAllJobs(statusFilter);
      setOrders(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      Toast.show({
        type: "error",
        text1: "Failed to fetch jobs",
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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "REQUESTED":
      case "ASSIGNED":
        return "#F59E0B";
      case "ACCEPTED":
      case "PICKED_UP":
        return "#3B82F6";
      case "IN_PROGRESS":
        return "#8B5CF6";
      case "DELIVERED":
      case "COMPLETED":
        return success || "#10B981";
      case "CANCELLED":
      case "REJECTED":
        return danger;
      default:
        return muted;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
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

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <ThemedText type="title" style={styles.pageTitle}>
        Orders
      </ThemedText>

      {/* Custom Order Tabs (no pending tab) */}
      <OrderTabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={["active", "completed"]}
      />

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
          <View style={styles.cardsList}>
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

/* ---------------------------------- */

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
