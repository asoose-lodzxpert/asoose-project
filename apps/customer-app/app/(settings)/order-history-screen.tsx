import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
 View, StyleSheet, Pressable, FlatList } from "react-native";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { RelativePathString, useRouter } from "expo-router";
import { fetchOrderHistory } from "@/services/order-history.service";
import { OrderStatus, Order } from "@/types/order-types";

const ORDER_STATUS_OPTIONS = Object.values(OrderStatus).map((status) => ({
  label: status.charAt(0) + status.slice(1).toLowerCase(),
  value: status,
}));

export default function OrderHistoryScreen() {
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [modalAnim] = useState(new Animated.Value(0));
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pageSize = 10;

  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textColor = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const surfaceBg = useThemeColor({}, "surfaceBackground");
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
        const res = await fetchOrderHistory({
          page: reset ? 1 : page,
          pageSize,
          status,
        });
        if (reset) {
          setOrders(res.data);
        } else {
          setOrders((prev) => [...prev, ...res.data]);
        }
        setHasMore(res.hasMore);
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
        style={[
          styles.orderCard,
          { backgroundColor: cardBg, borderColor: border },
        ]}
        onPress={() =>
          router.push(("/order-history/" + order.id) as RelativePathString)
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.orderIdContainer}>
            <IconSymbol name="shopping-bag" size={18} color={brandPrimary} />
            <ThemedText style={[styles.orderId, { color: textColor }]}>
              Order #{order.id.slice(-6)}
            </ThemedText>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: brandPrimary + "22" },
            ]}
          >
            <ThemedText style={[styles.statusText, { color: brandPrimary }]}>
              {order.status}
            </ThemedText>
          </View>
        </View>

        <View style={styles.cardDetailsRowSmall}>
          <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
            Total:
          </ThemedText>
          <ThemedText style={[styles.detailValue, { color: textColor }]}>
            ₦{order.total.toFixed(2)}
          </ThemedText>
        </View>

        <View style={styles.cardDetailsRowSmall}>
          <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
            Date:
          </ThemedText>
          <ThemedText style={[styles.detailValue, { color: textSecondary }]}>
            {new Date(order.createdAt).toLocaleString()}
          </ThemedText>
        </View>
      </Pressable>
      <View style={[styles.separator, { backgroundColor: border }]} />
    </>
  );

  const renderSkeleton = () => {
    const skeletons = Array.from({ length: 5 });
    return skeletons.map((_, i) => (
      <View
        key={i}
        style={[
          styles.orderCard,
          { backgroundColor: cardBg, opacity: 0.5, borderColor: border },
        ]}
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

  // Modal animation handlers
  const openModal = () => {
    setFilterModalVisible(true);
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };
  const closeModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => setFilterModalVisible(false));
  };

  const modalTranslateY = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={22} color={brandPrimary} />
        </Pressable>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Orders
        </ThemedText>
        <TouchableOpacity style={styles.filterBtn} onPress={openModal}>
          <IconSymbol name="list" size={20} color={brandPrimary} />
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType={Platform.OS === "ios" ? "slide" : "fade"}
        transparent
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={closeModal}
        />
        <Animated.View
          style={[
            styles.modalSheet,
            {
              transform: [{ translateY: modalTranslateY }],
              backgroundColor: surfaceBg,
              borderColor: border,
            },
          ]}
        >
          <View style={styles.modalHandle} />
          <ThemedText style={styles.modalTitle}>Filter Orders</ThemedText>
          <View style={styles.modalOptions}>
            <TouchableOpacity
              style={[
                styles.modalOption,
                status === undefined && styles.modalOptionActive,
              ]}
              onPress={() => {
                setStatus(undefined);
                closeModal();
              }}
            >
              <ThemedText style={styles.modalOptionText}>All</ThemedText>
            </TouchableOpacity>
            {ORDER_STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.modalOption,
                  { borderColor: status === opt.value ? brandPrimary : border },
                ]}
                onPress={() => {
                  setStatus(opt.value as OrderStatus);
                  closeModal();
                }}
              >
                <ThemedText style={styles.modalOptionText}>
                  {opt.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.modalCancelBtn} onPress={closeModal}>
            <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

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
                <SkeletonCard style={{ marginHorizontal: 16 }} />
              ) : null
            }
            contentContainerStyle={
              orders.length === 0 ? { flex: 1 } : undefined
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
    borderBottomWidth: 1,
    zIndex: 2,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  filterBtn: {
    marginLeft: "auto",
    padding: 8,
    borderRadius: 20,
  },
  // Modal styles
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  modalSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 24,
    paddingBottom: 32,
    zIndex: 2,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 18,
    textAlign: "center",
  },
  modalOptions: {
    marginBottom: 16,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  modalOptionActive: {},
  modalOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalCancelBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalCancelText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
  },
  list: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 8,
  },
  orderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
    marginHorizontal: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  status: {
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 2,
    marginTop: 2,
    letterSpacing: 0.2,
    textTransform: "capitalize",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardDetailsRowSmall: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  cardDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 13,
    marginRight: 4,
    fontWeight: "400",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  orderId: {
    fontWeight: "bold",
    fontSize: 15,
    marginBottom: 2,
  },
  separator: {
    height: 1,
    marginVertical: 10,
    marginHorizontal: 24,
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
