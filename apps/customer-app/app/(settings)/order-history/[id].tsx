import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  RefreshControl,
  DimensionValue,
  Share,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { fetchOrderById } from "@/services/order-history.service";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

  const hasShare = order?.status === "delivered";

  /* -------- Data Loader -------- */

  const loadOrder = useCallback(async () => {
    if (!id || typeof id !== "string") {
      setOrder(null);
      setError("Order not found");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchOrderById(id);
      setOrder(data);
    } catch (e) {
      setOrder(null);
      setError((e as Error)?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrder();
    setRefreshing(false);
  }, [loadOrder]);

  const handleShare = useCallback(async () => {
    if (!order) return;

    const message = `Order ${order.id} has been delivered! Total: ₦${formatCurrency(
      order.total,
    )}`;

    try {
      await Share.share({ message });
    } catch (error: any) {
      Alert.alert("Share failed", error.message);
    }
  }, [order]);

  /* ---------------- Skeleton Components ---------------- */

  const SkeletonLine = ({
    width = "100%",
    height = 14,
    radius = 8,
  }: {
    width?: DimensionValue;
    height?: number;
    radius?: number;
  }) => {
    const progress = useSharedValue(-SCREEN_WIDTH);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: progress.value }],
    }));

    useEffect(() => {
      progress.value = withRepeat(
        withTiming(SCREEN_WIDTH, { duration: 1400, easing: Easing.linear }),
        -1,
        false,
      );
    }, []);

    return (
      <View
        style={{
          width,
          height,
          borderRadius: radius,
          backgroundColor: surfaceSubtle,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={[
            {
              width: "40%",
              height: "100%",
              backgroundColor: borderSubtle,
              opacity: 0.4,
            },
            animatedStyle,
          ]}
        />
      </View>
    );
  };

  const SkeletonInfo = () => (
    <View style={styles.skeletonSection}>
      <View style={{ alignItems: "center", gap: 6 }}>
        <SkeletonLine width={160} height={18} />
        <SkeletonLine width={100} height={12} />
        <SkeletonLine width={80} height={12} radius={6} />
      </View>

      <View style={[styles.infoDivider, { backgroundColor: surfaceSubtle }]} />

      <View style={{ gap: 10 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.infoRow}>
            <SkeletonLine width={80} height={12} />
            <SkeletonLine width={140} height={12} />
          </View>
        ))}
      </View>
    </View>
  );

  const SkeletonTimeline = () => (
    <View style={styles.skeletonSection}>
      <SkeletonLine width={140} height={14} />

      <View style={{ marginTop: 12, gap: 14 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.timelineItem}>
            <SkeletonLine width={32} height={32} radius={16} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonLine width="60%" height={14} />
              <SkeletonLine width="90%" height={12} />
              <SkeletonLine width="40%" height={10} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const SkeletonItems = () => (
    <View style={styles.skeletonSection}>
      <SkeletonLine width={100} height={14} />

      <View style={{ marginTop: 12, gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.itemRow}>
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonLine width="70%" height={14} />
              <SkeletonLine width="30%" height={12} />
            </View>
            <SkeletonLine width={60} height={14} />
          </View>
        ))}

        <View style={styles.totalRow}>
          <SkeletonLine width={80} height={14} />
          <SkeletonLine width={90} height={18} />
        </View>
      </View>
    </View>
  );

  /* ---------------- Sections ---------------- */

  const renderTimeline = () => {
    if (!order?.timeline?.length) return null;

    return (
      <View style={styles.timelineSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Order Timeline
        </ThemedText>
        <View style={[styles.timelineDivider, { backgroundColor: border }]} />

        <View style={styles.timelineContainer}>
          {order.timeline.map((step: any, idx: number) => (
            <View key={idx} style={styles.timelineItem}>
              <View
                style={[styles.timelineDot, { backgroundColor: brandPrimary }]}
              >
                <IconSymbol
                  name={step.icon || "clock"}
                  size={14}
                  color="#FFF"
                />
              </View>
              <View style={styles.timelineContent}>
                <ThemedText
                  style={[styles.timelineLabel, { color: textColor }]}
                >
                  {step.label}
                </ThemedText>
                <ThemedText
                  style={[styles.timelineDesc, { color: textSecondary }]}
                >
                  {step.description}
                </ThemedText>
                {step.time && (
                  <ThemedText
                    style={[styles.timelineTime, { color: textSecondary }]}
                  >
                    {new Date(step.time).toLocaleString()}
                  </ThemedText>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderItems = () => {
    if (!order?.items?.length) return null;

    return (
      <View style={styles.itemsSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Items
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
                  x{item.quantity}
                </ThemedText>
              </View>
              <ThemedText style={[styles.itemPrice, { color: textColor }]}>
                ₦{formatCurrency(item.price)}
              </ThemedText>
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: border }]}>
            <ThemedText style={[styles.totalLabel, { color: textColor }]}>
              Total
            </ThemedText>
            <ThemedText style={[styles.totalPrice, { color: brandPrimary }]}>
              ₦{formatCurrency(order.total)}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  const renderInfo = () =>
    order && (
      <View style={styles.infoSection}>
        <View style={styles.receiptSubHeader}>
          <ThemedText style={[styles.receiptTitle, { color: textColor }]}>
            Order:{" "}
            <ThemedText style={{ fontSize: 11, color: textSecondary }}>
              #{order.id}
            </ThemedText>
          </ThemedText>
          <ThemedText style={[styles.receiptDate, { color: textSecondary }]}>
            {new Date(order.createdAt).toLocaleDateString()}
          </ThemedText>
          <ThemedText style={[styles.receiptStatus, { color: brandPrimary }]}>
            {order.status.toUpperCase()}
          </ThemedText>
        </View>

        {order.deliveredAt && (
          <ThemedText
            style={[styles.receiptDelivered, { color: textSecondary }]}
          >
            Delivered: {new Date(order.deliveredAt).toLocaleDateString()}
          </ThemedText>
        )}

        <View style={[styles.infoDivider, { backgroundColor: borderSubtle }]} />

        <View style={styles.infoGrid}>
          <InfoRow label="Order ID" value={order.id} />
          <InfoRow label="Status" value={order.status} />
          <InfoRow
            label="Created"
            value={new Date(order.createdAt).toLocaleString()}
          />
          {order.deliveredAt && (
            <InfoRow
              label="Delivered"
              value={new Date(order.deliveredAt).toLocaleString()}
            />
          )}
        </View>
      </View>
    );

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
        {renderInfo()}
        {renderTimeline()}
        {renderItems()}
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
            <SkeletonInfo />
            <SkeletonTimeline />
            <SkeletonItems />
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

  receiptSubHeader: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 2,
  },

  receiptTitle: { fontSize: 18, fontWeight: "700" },
  receiptDate: { fontSize: 14 },
  receiptStatus: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 4,
  },
  receiptDelivered: {
    textAlign: "center",
    paddingHorizontal: 24,
    paddingVertical: 4,
    fontSize: 12,
    fontStyle: "italic",
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

  infoSection: {},
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  infoGrid: { paddingHorizontal: 24, gap: 8 },
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

  timelineSection: {},
  timelineDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 24,
    marginBottom: 12,
  },
  timelineContainer: { paddingHorizontal: 24, gap: 12 },
  timelineItem: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  timelineContent: { flex: 1, gap: 2 },
  timelineLabel: { fontSize: 15, fontWeight: "600" },
  timelineDesc: { fontSize: 13 },
  timelineTime: { fontSize: 11 },

  itemsSection: {},
  itemsDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  itemsList: { paddingHorizontal: 24, gap: 8 },
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
    paddingTop: 8,
    borderTopWidth: 1,
    paddingBottom: 20,
  },
  totalLabel: { fontSize: 16, fontWeight: "700" },
  totalPrice: { fontSize: 18, fontWeight: "800" },

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
