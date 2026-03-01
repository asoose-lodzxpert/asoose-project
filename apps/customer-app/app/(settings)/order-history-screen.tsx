import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  View,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { RelativePathString, useRouter } from "expo-router";
import { fetchOrderHistory } from "@/services/order-history.service";
import { OrderStatus, Order } from "@/types/order-types";
import { PaymentWebView } from "@/components/checkout/PaymentWebView";
import { initiatePayment } from "@/services/payment.service";
import { useUserProfile } from "@/hooks/useUserProfile";
import Toast from "react-native-toast-message";
import type { InAppTx } from "@/types/payment";

const ORDER_STATUS_OPTIONS = Object.values(OrderStatus).map((status) => ({
  label: status.charAt(0) + status.slice(1).toLowerCase(),
  value: status,
}));

function getStatusColor(
  status: OrderStatus,
  colors: {
    success: string;
    error: string;
    pending: string;
    primary: string;
  },
): string {
  switch (status) {
    case OrderStatus.DELIVERED:
      return colors.success;
    case OrderStatus.CANCELLED:
    case OrderStatus.REJECTED:
      return colors.error;
    case OrderStatus.PENDING:
      return colors.pending;
    default:
      return colors.primary;
  }
}

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
  const statusSuccess = useThemeColor({}, "statusSuccess");
  const statusError = useThemeColor({}, "statusError");
  const statusPending = useThemeColor({}, "statusPending");
  const router = useRouter();
  const { user } = useUserProfile();

  // Payment state
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [checkoutTx, setCheckoutTx] = useState<InAppTx | null>(null);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);

  const statusColors = {
    success: statusSuccess,
    error: statusError,
    pending: statusPending,
    primary: brandPrimary,
  };

  const handlePayNow = async (order: Order) => {
    if (!user) {
      Toast.show({ type: "error", text1: "Profile not loaded" });
      return;
    }
    setPayingOrderId(order.id);
    try {
      const amount = order.total * 100; // kobo
      const payload: any = {
        amount,
        type: "ORDER",
        callbackUrl: "asoose-app://payment-callback",
      };
      if (order.type === "GROUP") {
        payload.orderGroupId = order.id;
      } else {
        payload.orderId = order.id;
      }
      const response = await initiatePayment("paystack", payload, {
        email: user.email,
        name: user.name || user.email,
        phone: user.phone ?? undefined,
      });
      const checkoutUrl = response.authorizationUrl || response.checkoutUrl;
      const transactionId = response.reference || response.transactionId;
      if (checkoutUrl) {
        setCheckoutTx({
          transactionId,
          checkoutUrl,
          amount: order.total,
          method: "paystack",
          status: "pending",
        });
        setShowPaymentWebView(true);
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Payment failed",
        text2: err.message || "Could not initiate payment",
      });
    } finally {
      setPayingOrderId(null);
    }
  };

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
          if (__DEV__)
            console.log("Fetched orders:", JSON.stringify(res.data, null, 2));
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

  const renderItem = ({ item: order }: { item: Order }) => {
    const statusColor = getStatusColor(order.status, statusColors);
    const isGroup = order.type === "GROUP";
    const isPaid =
      order.paymentStatus === "PAID" ||
      order.paymentStatus === "COMPLETED" ||
      order.paymentStatus === "SUCCESS";
    const isCancelled =
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REJECTED;
    const showPayBtn = !isPaid && !isCancelled;
    const isPayingThis = payingOrderId === order.id;

    return (
      <Pressable
        style={[
          styles.orderCard,
          { backgroundColor: cardBg, borderColor: border },
        ]}
        onPress={() =>
          router.push(("/order-history/" + order.id) as RelativePathString)
        }
      >
        <View style={styles.cardHeader}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ThemedText
              style={[styles.orderId, { color: textColor }]}
              numberOfLines={1}
            >
              {isGroup ? "Multi-Store Order" : `Order #${order.id.slice(-6)}`}
            </ThemedText>
            {isGroup && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: brandPrimary + "22" },
                ]}
              >
                <ThemedText
                  style={[styles.statusText, { color: brandPrimary }]}
                >
                  {order.orderCount} stores
                </ThemedText>
              </View>
            )}
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "22" },
            ]}
          >
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {order.status}
            </ThemedText>
          </View>
        </View>

        <ThemedText
          style={[styles.storeText, { color: textSecondary }]}
          numberOfLines={1}
        >
          {isGroup ? order.stores?.join(" · ") : order.storeName}
        </ThemedText>

        {/* Payment status row */}
        <View style={styles.paymentRow}>
          <View
            style={[
              styles.paymentBadge,
              {
                backgroundColor: isPaid
                  ? statusSuccess + "22"
                  : statusError + "22",
              },
            ]}
          >
            <IconSymbol
              name={
                isPaid ? "checkmark.circle.fill" : "exclamationmark.circle.fill"
              }
              size={12}
              color={isPaid ? statusSuccess : statusError}
            />
            <ThemedText
              style={[
                styles.paymentBadgeText,
                { color: isPaid ? statusSuccess : statusError },
              ]}
            >
              {isPaid
                ? `Paid${order.paymentMethod ? ` · ${order.paymentMethod.replace("_", " ")}` : ""}`
                : "Unpaid"}
            </ThemedText>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <ThemedText style={[styles.totalText, { color: textColor }]}>
            ₦{order.total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ThemedText style={[styles.dateText, { color: textSecondary }]}>
              {new Date(order.createdAt).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </ThemedText>
            {showPayBtn && (
              <Pressable
                style={[
                  styles.payNowBtn,
                  {
                    backgroundColor: brandPrimary,
                    opacity: isPayingThis ? 0.7 : 1,
                  },
                ]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  handlePayNow(order);
                }}
                disabled={isPayingThis}
              >
                {isPayingThis ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <ThemedText style={styles.payNowText}>Pay Now</ThemedText>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

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

      {/* Retrigger payment WebView */}
      {checkoutTx && (
        <PaymentWebView
          visible={showPaymentWebView}
          url={checkoutTx.checkoutUrl}
          reference={checkoutTx.transactionId}
          paymentMethod="paystack"
          onSuccess={() => {
            setShowPaymentWebView(false);
            setCheckoutTx(null);
            Toast.show({ type: "success", text1: "Payment successful!" });
            // Refresh list
            setPage(1);
            setHasMore(true);
            loadOrders(true);
          }}
          onCancel={() => {
            setShowPaymentWebView(false);
            Toast.show({ type: "info", text1: "Payment cancelled" });
          }}
          onFailure={(msg) => {
            setShowPaymentWebView(false);
            Toast.show({
              type: "error",
              text1: "Payment failed",
              text2: msg,
            });
          }}
        />
      )}
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
  orderId: {
    fontWeight: "bold",
    fontSize: 15,
    flexShrink: 1,
  },
  storeText: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  totalText: {
    fontSize: 15,
    fontWeight: "700",
  },
  dateText: {
    fontSize: 12,
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
  paymentRow: {
    marginTop: 6,
    marginBottom: 4,
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  payNowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  payNowText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
});
