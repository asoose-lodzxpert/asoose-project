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
  markAsReady,
  Order,
} from "@/services/orders.service";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useOrderStream, OrderStreamEvent } from "@/hooks/use-order-stream";

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
  const [markingReadyId, setMarkingReadyId] = useState<string | null>(null);

  // Decline modal
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = React.useRef(true);

  // SSE event handlers
  const handleNewOrder = useCallback(
    (orderData: OrderStreamEvent) => {
      // Only add to pending tab
      if (tab === "pending" && isMountedRef.current) {
        Toast.show({
          type: "success",
          text1: "🎉 New Order!",
          text2: `Order from ${orderData.customerName}`,
          visibilityTime: 4000,
        });

        // Refresh the list to include the new order
        loadOrders(1, true);
      }
    },
    [tab],
  );

  const handleOrderUpdate = useCallback(
    (orderData: OrderStreamEvent) => {
      // Refresh current tab
      if (isMountedRef.current) {
        loadOrders(1, true);
      }
    },
    [tab],
  );

  // SSE Connection (disabled for history tab)
  const { isConnected, error: sseError } = useOrderStream({
    onNewOrder: handleNewOrder,
    onOrderUpdate: handleOrderUpdate,
    enabled: tab !== "history", // Disable SSE for history tab
  });

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadOrders = async (pageNum: number, isRefresh = false) => {
    if (!user?.storeId) {
      if (isMountedRef.current) {
        setLoading(false);
        Toast.show({
          type: "error",
          text1: "No store found",
          text2: "Please complete your store setup",
        });
      }
      return;
    }

    try {
      if (pageNum === 1 && !isRefresh) {
        if (isMountedRef.current) setLoading(true);
      } else if (pageNum > 1) {
        if (isMountedRef.current) setLoadingMore(true);
      }

      const response = await fetchOrders(tab, pageNum);

      if (!isMountedRef.current) return;

      if (isRefresh || pageNum === 1) {
        setOrders(response.data);
      } else {
        setOrders((prev) => [...prev, ...response.data]);
      }

      setHasMore(pageNum < response.meta.pages);
      setPage(pageNum);
    } catch (error: any) {
      if (isMountedRef.current) {
        Toast.show({
          type: "error",
          text1: error.message || "Failed to load orders",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  };

  // Load orders when tab changes or screen focuses
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const load = async () => {
        if (mounted) {
          setPage(1);
          setHasMore(true);
          await loadOrders(1);
        }
      };

      load();

      // Cleanup function to prevent state updates after unmount
      return () => {
        mounted = false;
      };
    }, [tab, user?.storeId]),
  );

  // Auto-refresh every 30 seconds for pending and active tabs (FALLBACK when SSE fails)
  useEffect(() => {
    if (tab === "history") return;

    // Only use polling if SSE is not connected
    if (isConnected) {
      return;
    }

    let mounted = true;

    const interval = setInterval(() => {
      if (mounted) {
        loadOrders(1, true);
      }
    }, 30000); // 30 seconds

    // Cleanup: clear interval when component unmounts or tab changes
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [tab, isConnected, user?.storeId]);

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
    if (isMountedRef.current) setAcceptingId(orderId);
    try {
      await acceptOrder(orderId);

      if (!isMountedRef.current) return;

      Toast.show({
        type: "success",
        text1: "Order accepted",
        text2: "Order moved to active",
      });

      // Remove from pending list or refresh
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (error: any) {
      if (isMountedRef.current) {
        Toast.show({
          type: "error",
          text1: error.message || "Failed to accept order",
        });
      }
    } finally {
      if (isMountedRef.current) setAcceptingId(null);
    }
  };

  const handleDeclineClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowDeclineModal(true);
  };

  const handleDeclineConfirm = async (reason: string) => {
    if (!selectedOrderId) return;

    if (isMountedRef.current) setDecliningId(selectedOrderId);
    try {
      await declineOrder(selectedOrderId, reason);

      if (!isMountedRef.current) return;

      Toast.show({
        type: "success",
        text1: "Order declined",
        text2: reason,
      });

      setShowDeclineModal(false);
      setOrders((prev) => prev.filter((o) => o.id !== selectedOrderId));
    } catch (error: any) {
      if (isMountedRef.current) {
        Toast.show({
          type: "error",
          text1: error.message || "Failed to decline order",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setDecliningId(null);
        setSelectedOrderId(null);
      }
    }
  };

  const handlePrepare = async (orderId: string) => {
    if (isMountedRef.current) setPreparingId(orderId);
    try {
      await markAsPreparing(orderId);

      if (!isMountedRef.current) return;

      Toast.show({
        type: "success",
        text1: "Order preparing",
        text2: "Status updated",
      });

      // Update order status in list
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "PREPARING" as const } : o,
        ),
      );
    } catch (error: any) {
      if (isMountedRef.current) {
        Toast.show({
          type: "error",
          text1: error.message || "Failed to update order",
        });
      }
    } finally {
      if (isMountedRef.current) setPreparingId(null);
    }
  };

  const handleMarkReady = async (orderId: string) => {
    if (isMountedRef.current) setMarkingReadyId(orderId);
    try {
      await markAsReady(orderId);

      if (!isMountedRef.current) return;

      Toast.show({
        type: "success",
        text1: "Order ready",
        text2: "Order status updated to READY",
      });

      // Update order status in list
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "READY" as const } : o,
        ),
      );
    } catch (error: any) {
      if (isMountedRef.current) {
        Toast.show({
          type: "error",
          text1: error.message || "Failed to mark order ready",
        });
      }
    } finally {
      if (isMountedRef.current) setMarkingReadyId(null);
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

  const borderColor = useThemeColor({}, "borderDefault");
  const background = useThemeColor({}, "surfaceCard");

  return (
    <ThemedView style={{ flex: 1 }}>
      <OrderTabs active={tab} onChange={setTab} />

      <View style={[styles.pullTextContainer, { backgroundColor: muted }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* SSE Connection Status */}
          {tab !== "history" && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isConnected ? "#22c55e" : "#f59e0b",
                }}
              />
              <ThemedText type="caption" style={{ fontSize: 11 }}>
                {isConnected ? "Live" : sseError ? "Polling" : "Connecting..."}
              </ThemedText>
              <ThemedText type="caption" style={{ marginLeft: 4 }}>
                •
              </ThemedText>
            </View>
          )}
          <ThemedText type="caption">Pull down to refresh</ThemedText>
        </View>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 16 }}>
          {[...Array(4)].map((_, i) => (
            <View
              key={i}
              style={{
                backgroundColor: background,
                borderRadius: 10,
                marginBottom: 12,
                padding: 12,
              }}
            >
              {/* Profile row skeleton */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: borderColor,
                    opacity: 0.3,
                  }}
                />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <View
                    style={{
                      width: "40%",
                      height: 16,
                      backgroundColor: borderColor,
                      borderRadius: 4,
                      opacity: 0.3,
                      marginBottom: 4,
                    }}
                  />
                  <View
                    style={{
                      width: "30%",
                      height: 12,
                      backgroundColor: borderColor,
                      borderRadius: 4,
                      opacity: 0.3,
                    }}
                  />
                </View>
                <View
                  style={{
                    width: 70,
                    height: 24,
                    backgroundColor: borderColor,
                    borderRadius: 12,
                    opacity: 0.3,
                  }}
                />
              </View>

              {/* Items skeleton */}
              <View style={{ marginBottom: 12 }}>
                {[0, 1].map((idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <View
                      style={{
                        width: "50%",
                        height: 14,
                        backgroundColor: borderColor,
                        borderRadius: 4,
                        opacity: 0.3,
                      }}
                    />
                    <View
                      style={{
                        width: "20%",
                        height: 14,
                        backgroundColor: borderColor,
                        borderRadius: 4,
                        opacity: 0.3,
                      }}
                    />
                  </View>
                ))}
              </View>

              {/* Total skeleton */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    width: "20%",
                    height: 18,
                    backgroundColor: borderColor,
                    borderRadius: 4,
                    opacity: 0.3,
                  }}
                />
                <View
                  style={{
                    width: "30%",
                    height: 18,
                    backgroundColor: borderColor,
                    borderRadius: 4,
                    opacity: 0.3,
                  }}
                />
              </View>

              {/* Action buttons skeleton (for pending tab) */}
              {tab === "pending" && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View
                    style={{
                      flex: 1,
                      height: 40,
                      backgroundColor: borderColor,
                      borderRadius: 8,
                      opacity: 0.3,
                    }}
                  />
                  <View
                    style={{
                      flex: 1,
                      height: 40,
                      backgroundColor: borderColor,
                      borderRadius: 8,
                      opacity: 0.3,
                    }}
                  />
                </View>
              )}
            </View>
          ))}
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
              onMarkReady={() => handleMarkReady(item.id)}
              accepting={acceptingId === item.id}
              declining={decliningId === item.id}
              preparing={preparingId === item.id}
              markingReady={markingReadyId === item.id}
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
