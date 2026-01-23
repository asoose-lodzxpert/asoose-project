import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { RelativePathString, useRouter } from "expo-router";
import { CustomDropdown } from "@/components/CustomDropdown";
import { fetchOrderHistory } from "@/services/order-history.service";
import { OrderStatus, Order } from "@/types/order-types";

const ORDER_STATUS_OPTIONS = Object.values(OrderStatus).map((status) => ({
  label: status.charAt(0) + status.slice(1).toLowerCase(),
  value: status,
}));

export default function OrderHistoryScreen() {
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pageSize = 10;
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textColor = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const cardBg = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const skeletonColor = useThemeColor({}, "surfaceSubtle");
  const router = useRouter();

  const loadOrders = useCallback(
    async (reset = false) => {
      if (loading) return;
      if (!hasMore && !reset) return;
      setLoading(true);
      try {
        const data = await fetchOrderHistory(status);
        // Simulate pagination (replace with backend pagination if available)
        const paginated = data.slice(0, (reset ? 1 : page) * pageSize);
        setOrders(paginated);
        setHasMore(paginated.length < data.length);
      } finally {
        setLoading(false);
      }
    },
    [status, page, hasMore, loading],
  );

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadOrders(true);
  }, [status]);

  useEffect(() => {
    if (page > 1) loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleLoadMore = () => {
    if (!loading && hasMore) setPage((p) => p + 1);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await loadOrders(true);
    setRefreshing(false);
  };

  const renderItem = ({ item: order }: { item: Order }) => (
    <>
      <Pressable
        key={order.id}
        style={[styles.orderCard, { backgroundColor: cardBg }]}
        onPress={() =>
          router.push(("/order-history/" + order.id) as RelativePathString)
        }
      >
        <ThemedText style={[styles.orderId, { color: textColor }]}>
          Order #{order.id.slice(-6)}
        </ThemedText>
        <ThemedText style={{ color: textSecondary }}>
          Status: {order.status}
        </ThemedText>
        <ThemedText style={{ color: textColor }}>
          Total: ₦{order.total.toFixed(2)}
        </ThemedText>
        <ThemedText style={{ color: textSecondary }}>
          Date: {new Date(order.createdAt).toLocaleString()}
        </ThemedText>
      </Pressable>
      <View style={[styles.separator, { backgroundColor: border }]} />
    </>
  );

  const renderSkeleton = () => {
    const skeletons = Array.from({ length: 5 });
    return skeletons.map((_, i) => (
      <View
        key={i}
        style={[styles.orderCard, { backgroundColor: cardBg, opacity: 0.5 }]}
      >
        <View
          style={[styles.skeletonLine, { backgroundColor: skeletonColor }]}
        />
        <View
          style={[styles.skeletonLine, { backgroundColor: skeletonColor }]}
        />
        <View
          style={[styles.skeletonLine, { backgroundColor: skeletonColor }]}
        />
        <View
          style={[styles.skeletonLine, { backgroundColor: skeletonColor }]}
        />
      </View>
    ));
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <IconSymbol
        name="box"
        size={48}
        color={brandPrimary}
        style={{ marginBottom: 12 }}
      />
      <ThemedText
        style={{
          fontSize: 18,
          fontWeight: "600",
          marginBottom: 6,
          color: textColor,
        }}
      >
        No orders yet
      </ThemedText>
      <ThemedText style={{ color: textSecondary, textAlign: "center" }}>
        You haven't placed any orders yet. When you do, they'll show up here!
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={22} color={brandPrimary} />
        </Pressable>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Orders
        </ThemedText>
      </View>
      <CustomDropdown
        data={[{ label: "All", value: "" }, ...ORDER_STATUS_OPTIONS]}
        value={status ?? ""}
        onChange={(v) => setStatus(v ? (v as OrderStatus) : undefined)}
        placeholder="Filter by status"
        containerStyle={{ margin: 16, marginBottom: 0 }}
      />
      <View style={styles.list}>
        {loading && orders.length === 0 ? (
          renderSkeleton()
        ) : (
          <FlatList
            data={orders}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={
              loading && orders.length > 0 ? (
                <ActivityIndicator style={{ marginVertical: 16 }} />
              ) : null
            }
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  list: {
    flex: 1,
    padding: 16,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 0,
    elevation: 1,
  },
  orderId: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  separator: {
    height: 1,
    marginVertical: 12,
    marginHorizontal: 4,
  },
  skeletonLine: {
    height: 16,
    borderRadius: 8,
    marginBottom: 10,
    width: "80%",
    alignSelf: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 48,
    paddingHorizontal: 24,
  },
});
