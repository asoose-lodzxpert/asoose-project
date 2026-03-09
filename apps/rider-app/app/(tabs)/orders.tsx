import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

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
  const surface = useThemeColor({}, "surfaceBackground");
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
  }>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  // Used to ignore responses from stale/cancelled requests
  const fetchGenRef = useRef(0);

  // Fetch orders from backend
  const fetchOrders = useCallback(
    async (page = 1, append = false) => {
      // Bump generation; capture current gen so we can detect staleness
      const gen = ++fetchGenRef.current;

      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        let statusFilter: string | undefined;
        if (activeTab === "active") {
          statusFilter = "ACCEPTED,PICKED_UP,IN_PROGRESS";
        } else if (activeTab === "completed") {
          statusFilter = "DELIVERED,COMPLETED,CANCELLED,REJECTED";
        }
        const response = await getAllJobs(statusFilter, page, pagination.limit);

        if (__DEV__)
          console.log("Fetched orders:", JSON.stringify(response, null, 2));

        // Discard stale response (another fetch started after this one)
        if (gen !== fetchGenRef.current) return;

        if (append) {
          setOrders((prev) => [...prev, ...response.data]);
        } else {
          setOrders(response.data);
        }
        setPagination(response.pagination);
      } catch {
        if (gen !== fetchGenRef.current) return;
        Toast.show({
          type: "error",
          text1: "Failed to fetch jobs",
          text2: "Please try again",
        });
      } finally {
        // Only clear loading if this is still the current request
        if (gen === fetchGenRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [activeTab, pagination.limit],
  );

  // Fetch on mount and when tab changes
  useEffect(() => {
    setOrders([]);
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchOrders(1, false);
  }, [activeTab, fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders(1, false);
    setRefreshing(false);
  };

  // Infinite scroll handler
  const handleScroll = useCallback(
    async (event: {
      nativeEvent: {
        layoutMeasurement: { height: number };
        contentOffset: { y: number };
        contentSize: { height: number };
      };
    }) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
      if (
        isCloseToBottom &&
        !loadingMore &&
        !loading &&
        pagination.page < pagination.totalPages
      ) {
        await fetchOrders(pagination.page + 1, true);
        setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
      }
    },
    [loadingMore, loading, pagination, fetchOrders],
  );

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "REQUESTED":
      case "SEARCHING_DRIVER":
      case "ASSIGNED":
        return "#F59E0B";
      case "DRIVER_ACCEPTED":
      case "PAID":
      case "ACCEPTED":
      case "PICKED_UP":
        return "#3B82F6";
      case "IN_PROGRESS":
        return "#8B5CF6";
      case "DELIVERED":
      case "COMPLETED":
        return success || "#10B981";
      case "CANCELLED":
      case "CANCELLED_BY_USER":
      case "CANCELLED_BY_DRIVER":
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
      case "SEARCHING_DRIVER":
        return "Finding Driver";
      case "DRIVER_ACCEPTED":
        return "Driver Accepted";
      case "PAID":
        return "Paid";
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
      case "CANCELLED_BY_USER":
        return "Cancelled";
      case "CANCELLED_BY_DRIVER":
        return "Cancelled by Driver";
      case "REJECTED":
        return "Rejected";
      default:
        return status;
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <ThemedText type="subtitle" style={styles.pageTitle}>
        Orders
      </ThemedText>

      {/* Custom Order Tabs (no pending tab) */}
      <OrderTabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={["active", "completed"]}
      />

      <ScrollView
        ref={scrollViewRef}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
            {loadingMore && (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <ActivityIndicator size="small" color={primary} />
              </View>
            )}
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
    fontSize: 24,
    marginBottom: 16,
  },
  cardsList: {
    gap: 16,
  },
});
