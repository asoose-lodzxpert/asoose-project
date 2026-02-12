import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useToast } from "@/components/ui/ThemedToast";
import { useThemeColor } from "@/hooks/use-theme-color";
import { fetchOrderById } from "@/services/order-history.service";

function formatCurrency(value: string | number | undefined | null) {
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-NG", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const showToast = useToast();

  /* -------- Theme Colors -------- */
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textColor = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const border = useThemeColor({}, "borderDefault");
  const surface = useThemeColor({}, "surfaceBackground");

  // Skeleton colors from theme
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const borderSubtle = useThemeColor({}, "borderDefault");

  /* -------- State -------- */
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = React.useRef<number | null>(null);

  const hasShare = order?.status === "delivered";

  /* -------- Data Loader with Auto-Retry -------- */

  const loadOrder = useCallback(
    async (attempt = 0) => {
      if (!id || typeof id !== "string") {
        setOrder(null);
        setError("Order not found");
        setLoading(false);
        return;
      }

      if (attempt === 0) {
        setLoading(true);
        setError(null);
        setRetryCount(0);
      }

      try {
        const data = await fetchOrderById(id);
        setOrder(data);
        setError(null);
        setRetryCount(0);
        setLoading(false);
        setRefreshing(false);
      } catch (e) {
        const errorMessage = (e as Error)?.message || "Failed to load order";
        const isNetworkError =
          errorMessage.toLowerCase().includes("network") ||
          errorMessage.toLowerCase().includes("fetch") ||
          errorMessage.toLowerCase().includes("connection");

        const maxRetries = isNetworkError ? 3 : 1;

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          setRetryCount(attempt + 1);

          retryTimeoutRef.current = setTimeout(() => {
            loadOrder(attempt + 1);
          }, delay);
        } else {
          setOrder(null);
          setError(errorMessage);
          setLoading(false);
          setRefreshing(false);
          setRetryCount(0);
        }
      }
    },
    [id],
  );

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrder(0);
  }, [loadOrder]);

  const handleShare = useCallback(async () => {
    if (!order) return;

    const message = `Order ${order.id} has been delivered! Total: ₦${formatCurrency(
      order.total,
    )}`;

    try {
      await Share.share({ message });
    } catch (error: any) {
      showToast({ message: error.message || "Share failed", variant: "error" });
    }
  }, [order, showToast]);

  /* ---------------- Skeleton Components ---------------- */

  const SkeletonBlock = ({
    height,
    width = "100%",
    style,
  }: {
    height: number;
    width?: number | string;
    style?: StyleProp<ViewStyle>;
  }) => {
    const pulse = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }, [pulse]);

    const animatedStyle = {
      height,
      borderRadius: 8,
      backgroundColor: surfaceSubtle,
      opacity: pulse,
      ...(typeof width === "number" && { width }),
    };

    return (
      <Animated.View
        style={[
          animatedStyle,
          typeof width === "string" && { width: width as any },
          style,
        ]}
      />
    );
  };

  const SkeletonInfo = () => (
    <View style={styles.skeletonSection}>
      <SkeletonBlock height={18} width={140} style={{ marginBottom: 16 }} />
      <View style={{ gap: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.infoRow}>
            <SkeletonBlock width={80} height={14} />
            <SkeletonBlock width={120} height={14} />
          </View>
        ))}
      </View>
    </View>
  );

  const SkeletonTimeline = () => (
    <View style={styles.skeletonSection}>
      <SkeletonBlock height={18} width={140} style={{ marginBottom: 16 }} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 20,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <React.Fragment key={i}>
            <SkeletonBlock
              width={36}
              height={36}
              style={{ borderRadius: 18 }}
            />
            {i < 4 && <SkeletonBlock width={40} height={3} />}
          </React.Fragment>
        ))}
      </View>

      <View style={{ alignItems: "center", gap: 8 }}>
        <SkeletonBlock width="60%" height={16} />
        <SkeletonBlock width="80%" height={14} />
        <SkeletonBlock width="50%" height={12} />
      </View>
    </View>
  );

  const SkeletonItems = () => (
    <View style={styles.skeletonSection}>
      <SkeletonBlock height={18} width={120} style={{ marginBottom: 16 }} />

      <View style={{ gap: 16 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.itemRow}>
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBlock width="70%" height={14} />
              <SkeletonBlock width="30%" height={12} />
            </View>
            <SkeletonBlock width={70} height={14} />
          </View>
        ))}

        <View
          style={[styles.totalRow, { borderTopColor: border, marginTop: 8 }]}
        >
          <SkeletonBlock width={100} height={16} />
          <SkeletonBlock width={80} height={18} />
        </View>
      </View>
    </View>
  );

  const SkeletonPayment = () => (
    <View style={styles.skeletonSection}>
      <SkeletonBlock height={18} width={140} style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <SkeletonBlock width={40} height={40} style={{ borderRadius: 20 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBlock width="50%" height={14} />
          <SkeletonBlock width="30%" height={12} />
        </View>
      </View>
    </View>
  );

  /* ---------------- Sections ---------------- */

  const renderTimeline = () => {
    if (!order?.timeline?.length) return null;

    // Find the current active step by matching order status
    const currentStepIndex = order.timeline.findIndex(
      (step: any) => step.status === order.status,
    );
    const activeIndex =
      currentStepIndex >= 0
        ? currentStepIndex
        : order.timeline.findIndex((step: any) => step.time);
    const currentStep = order.timeline[activeIndex >= 0 ? activeIndex : 0];

    // Map timeline icons to available IconSymbol names
    const iconMap: Record<string, any> = {
      default: "checkmark.circle",
      kitchen: "fork.knife",
      package: "shippingbox.fill",
      rider: "car.fill",
      delivered: "checkmark.circle.fill",
    };

    return (
      <View style={styles.timelineSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Order Status
        </ThemedText>
        <View style={[styles.timelineDivider, { backgroundColor: border }]} />

        {/* Horizontal Icon Timeline */}
        <View style={styles.horizontalTimeline}>
          {order.timeline.map((step: any, idx: number) => {
            const isPassed = idx <= activeIndex;
            const iconColor = isPassed ? brandPrimary : "#D1D5DB";
            const lineColor = isPassed ? brandPrimary : "#E5E7EB";
            const iconName = iconMap[step.icon] || step.icon || "clock";

            return (
              <React.Fragment key={idx}>
                <View style={styles.timelineIconWrapper}>
                  <View
                    style={[
                      styles.timelineIconCircle,
                      { backgroundColor: iconColor },
                    ]}
                  >
                    <IconSymbol name={iconName} size={16} color="#FFF" />
                  </View>
                </View>
                {idx < order.timeline.length - 1 && (
                  <View
                    style={[
                      styles.timelineConnector,
                      { backgroundColor: lineColor },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Current Status Description */}
        <View style={styles.currentStatusContainer}>
          <ThemedText style={[styles.currentStatusLabel, { color: textColor }]}>
            {currentStep.label}
          </ThemedText>
          <ThemedText
            style={[styles.currentStatusDesc, { color: textSecondary }]}
          >
            {currentStep.description}
          </ThemedText>
          {currentStep.time && (
            <ThemedText
              style={[styles.currentStatusTime, { color: textSecondary }]}
            >
              {new Date(currentStep.time).toLocaleString()}
            </ThemedText>
          )}
        </View>
      </View>
    );
  };

  const renderItems = () => {
    if (!order?.items?.length) return null;

    return (
      <View style={styles.itemsSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Order Items
        </ThemedText>
        <View style={[styles.itemsDivider, { backgroundColor: border }]} />
        <View style={styles.itemsList}>
          {order.items.map((item: any) => (
            <View
              key={item.id}
              style={[styles.itemRow, { borderBottomColor: border }]}
            >
              <View style={styles.itemInfo}>
                <ThemedText style={[styles.itemName, { color: textColor }]}>
                  {item.name}
                </ThemedText>
                <ThemedText style={[styles.itemQty, { color: textSecondary }]}>
                  Qty: {item.quantity}
                </ThemedText>
              </View>
              <ThemedText style={[styles.itemPrice, { color: textColor }]}>
                ₦{formatCurrency(item.price)}
              </ThemedText>
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: border }]}>
            <ThemedText style={[styles.totalLabel, { color: textColor }]}>
              Total Amount
            </ThemedText>
            <ThemedText style={[styles.totalPrice, { color: brandPrimary }]}>
              ₦{formatCurrency(order.total)}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  const renderPayment = () => {
    if (!order?.paymentMethod) return null;

    const paymentMethod = order.paymentMethod;
    const paymentIcon =
      paymentMethod === "Cash" ? "dollarsign.circle.fill" : "creditcard.fill";

    return (
      <View style={styles.paymentSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Payment Method
        </ThemedText>
        <View style={[styles.paymentDivider, { backgroundColor: border }]} />
        <View style={styles.paymentContent}>
          <View style={styles.paymentRow}>
            <View style={styles.paymentIconWrapper}>
              <IconSymbol name={paymentIcon} size={20} color={brandPrimary} />
            </View>
            <View style={styles.paymentInfo}>
              <ThemedText style={[styles.paymentMethod, { color: textColor }]}>
                {paymentMethod}
              </ThemedText>
              {order.paymentStatus && (
                <ThemedText
                  style={[styles.paymentStatus, { color: textSecondary }]}
                >
                  {order.paymentStatus}
                </ThemedText>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderInfo = () => {
    if (!order) return null;

    return (
      <View style={styles.infoSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Order Information
        </ThemedText>
        <View style={[styles.infoDivider, { backgroundColor: border }]} />
        <View style={styles.infoGrid}>
          <InfoRow
            label="Order ID"
            value={`#${order.id.slice(-8).toUpperCase()}`}
          />
          <InfoRow
            label="Placed On"
            value={new Date(order.createdAt).toLocaleDateString()}
          />
          <InfoRow
            label="Time"
            value={new Date(order.createdAt).toLocaleTimeString()}
          />
          {order.eta && <InfoRow label="ETA" value={order.eta} />}
          {order.store?.name && (
            <InfoRow label="Store" value={order.store.name} />
          )}
          {order.distance && (
            <InfoRow label="Distance" value={`${order.distance} km`} />
          )}
        </View>
      </View>
    );
  };

  /* ---------------- UI ---------------- */

  const renderEmptyState = () => (
    <ScrollView
      contentContainerStyle={styles.errorContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={brandPrimary}
        />
      }
    >
      <IconSymbol name="alert-circle" size={48} color={brandPrimary} />
      <ThemedText style={styles.errorTitle}>Oops!</ThemedText>
      <ThemedText style={styles.errorText}>
        {error || "Order not available"}
      </ThemedText>

      <Pressable
        style={[styles.retryButton, { borderColor: brandPrimary }]}
        onPress={() => router.back()}
      >
        <ThemedText style={[styles.retryButtonText, { color: brandPrimary }]}>
          Go Back
        </ThemedText>
      </Pressable>
    </ScrollView>
  );

  const renderContent = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={brandPrimary}
        />
      }
    >
      <View style={styles.receiptContainer}>
        {renderTimeline()}
        {renderInfo()}
        {renderItems()}
        {renderPayment()}
      </View>
      <View style={styles.footerSpacer} />
    </ScrollView>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: border, backgroundColor: surface },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={22} color={brandPrimary} />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Order Details
          </ThemedText>
        </View>

        {hasShare && (
          <Pressable style={styles.shareButton} onPress={handleShare}>
            <IconSymbol name="share" size={20} color={brandPrimary} />
          </Pressable>
        )}

        <View style={[styles.headerSpacer, { width: hasShare ? 0 : 32 }]} />
      </View>

      {/* Body */}
      {loading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.receiptContainer}>
            <SkeletonTimeline />
            <SkeletonInfo />
            <SkeletonItems />
            <SkeletonPayment />
          </View>
          <View style={styles.footerSpacer} />
        </ScrollView>
      ) : error || !order ? (
        renderEmptyState()
      ) : (
        renderContent()
      )}
    </ThemedView>
  );
}

/* ---------------- Small Components ---------------- */

function InfoRow({ label, value }: { label: string; value: string }) {
  const textColor = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={styles.infoRow}>
      <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.infoValue, { color: textColor }]}>
        {value}
      </ThemedText>
    </View>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8, borderRadius: 12, marginRight: 12 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "600" },
  shareButton: { padding: 8, borderRadius: 12, marginLeft: 12 },
  headerSpacer: { width: 32 },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 24, alignItems: "center" },

  receiptContainer: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 12,
    overflow: "hidden",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  infoSection: {
    paddingBottom: 8,
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  infoGrid: { paddingHorizontal: 24, gap: 10, paddingBottom: 8 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: { fontSize: 12, fontWeight: "500" },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
  },

  timelineSection: {
    paddingBottom: 12,
  },
  timelineDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  horizontalTimeline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  timelineIconWrapper: {
    alignItems: "center",
  },
  timelineIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineConnector: {
    flex: 1,
    height: 3,
    marginHorizontal: 4,
    borderRadius: 2,
  },
  currentStatusContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    alignItems: "center",
    gap: 4,
  },
  currentStatusLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  currentStatusDesc: {
    fontSize: 14,
    textAlign: "center",
  },
  currentStatusTime: {
    fontSize: 12,
    marginTop: 2,
  },

  itemsSection: {
    paddingBottom: 8,
  },
  itemsDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 24,
    marginBottom: 12,
  },
  itemsList: { paddingHorizontal: 24, gap: 0 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: 14, fontWeight: "600" },
  itemQty: { fontSize: 12 },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    minWidth: 60,
    textAlign: "right",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    paddingBottom: 8,
  },
  totalLabel: { fontSize: 16, fontWeight: "700" },
  totalPrice: { fontSize: 18, fontWeight: "800" },

  paymentSection: {
    paddingBottom: 12,
  },
  paymentDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 24,
    marginBottom: 12,
  },
  paymentContent: {
    paddingHorizontal: 24,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentInfo: {
    flex: 1,
    gap: 2,
  },
  paymentMethod: {
    fontSize: 15,
    fontWeight: "600",
  },
  paymentStatus: {
    fontSize: 13,
  },

  errorContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  errorTitle: { fontSize: 24, fontWeight: "700", marginTop: 8 },
  errorText: { fontSize: 16, textAlign: "center", marginBottom: 24 },

  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  retryButtonText: { fontSize: 16, fontWeight: "600" },

  footerSpacer: { height: 80 },

  /* Skeleton */
  skeletonSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 8,
    backgroundColor: "transparent",
  },
});
