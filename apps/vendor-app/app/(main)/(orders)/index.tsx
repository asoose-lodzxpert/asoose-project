import React, { useState, useCallback, useEffect } from "react";
import {
  FlatList,
  RefreshControl,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { OrderCard } from "@/components/order/OrderCard";
import { OrderTabs } from "@/components/order/OrderTabs";
import { ThemedText } from "@/components/themed-text";
import { DeclineOrderModal } from "@/components/order/DeclineOrderModal";
import {
  fetchOrders,
  acceptOrder,
  declineOrder,
  markAsPreparing,
  Order,
} from "@/services/orders.service";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";

type OrderTab = "pending" | "active" | "history";

export default function OrderScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "surfaceSubtle");
  const { user } = useAuth();

  const [tab, setTab] = useState<OrderTab>("pending");
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Action states
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [preparingId, setPreparingId] = useState<string | null>(null);

  // Decline modal
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const loadOrders = async (pageNum: number, isRefresh = false) => {
    if (!user?.storeId) {
      setLoading(false);
      Toast.show({
        type: "error",
        text1: "No store found",
        text2: "Please complete your store setup",
      });
      return;
    }

    try {
      if (pageNum === 1 && !isRefresh) {
        setLoading(true);
      } else if (pageNum > 1) {
        setLoadingMore(true);
      }

      const response = await fetchOrders(user.storeId, tab, pageNum);

      if (isRefresh || pageNum === 1) {
        setOrders(response.data);
      } else {
        setOrders((prev) => [...prev, ...response.data]);
      }

      setHasMore(pageNum < response.meta.pages);
      setPage(pageNum);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to load orders",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Load orders when tab changes or screen focuses
  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setHasMore(true);
      loadOrders(1);
    }, [tab])
  );

  // Auto-refresh every 30 seconds for pending and active tabs
  useEffect(() => {
    if (tab === "history") return;

    const interval = setInterval(() => {
      loadOrders(1, true);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [tab]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    loadOrders(1, true);
  }, [tab]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadOrders(page + 1);
    }
  };

  const handleAccept = async (orderId: string) => {
    setAcceptingId(orderId);
    try {
      await acceptOrder(orderId);

      Toast.show({
        type: "success",
        text1: "Order accepted",
        text2: "Order moved to active",
      });

      // Remove from pending list or refresh
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to accept order",
      });
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDeclineClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowDeclineModal(true);
  };

  const handleDeclineConfirm = async (reason: string) => {
    if (!selectedOrderId) return;

    setDecliningId(selectedOrderId);
    try {
      await declineOrder(selectedOrderId, reason);

      Toast.show({
        type: "success",
        text1: "Order declined",
        text2: reason,
      });

      setShowDeclineModal(false);
      setOrders((prev) => prev.filter((o) => o.id !== selectedOrderId));
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to decline order",
      });
    } finally {
      setDecliningId(null);
      setSelectedOrderId(null);
    }
  };

  const handlePrepare = async (orderId: string) => {
    setPreparingId(orderId);
    try {
      await markAsPreparing(orderId);

      Toast.show({
        type: "success",
        text1: "Order preparing",
        text2: "Status updated",
      });

      // Update order status in list
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "PREPARING" as const } : o
        )
      );
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to update order",
      });
    } finally {
      setPreparingId(null);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={primary} />
        <ThemedText style={{ marginLeft: 8, color: primary }}>
          Loading more...
        </ThemedText>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <ThemedText type="subtitle" style={{ opacity: 0.5 }}>
          No {tab} orders
        </ThemedText>
        <ThemedText style={{ marginTop: 8, opacity: 0.5 }}>
          Orders will appear here
        </ThemedText>
      </View>
    );
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <OrderTabs active={tab} onChange={setTab} />

      <View style={[styles.pullTextContainer, { backgroundColor: muted }]}>
        <ThemedText type="caption">Pull down to refresh</ThemedText>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primary} />
          <ThemedText style={{ marginTop: 16 }}>Loading orders...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              tab={tab}
              onAccept={() => handleAccept(item.id)}
              onDecline={() => handleDeclineClick(item.id)}
              onPrepare={() => handlePrepare(item.id)}
              accepting={acceptingId === item.id}
              declining={decliningId === item.id}
              preparing={preparingId === item.id}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      <DeclineOrderModal
        visible={showDeclineModal}
        onClose={() => {
          setShowDeclineModal(false);
          setSelectedOrderId(null);
        }}
        onConfirm={handleDeclineConfirm}
        loading={decliningId !== null}
      />

      <Toast />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  pullTextContainer: {
    paddingVertical: 8,
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
});
