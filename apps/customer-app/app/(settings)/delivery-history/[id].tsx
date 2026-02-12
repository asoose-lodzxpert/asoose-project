import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { fetchDeliveryDetails } from "@/services/delivery-details.service";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  DimensionValue,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Delivery = any;

function formatCurrency(value: string | number | undefined | null) {
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-NG", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DeliveryDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const muted = useThemeColor({}, "textMuted");
  const textColor = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const success = useThemeColor({}, "statusSuccess");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(
    async (attempt = 0) => {
      if (attempt === 0) {
        setLoading(true);
        setError(null);
        setRetryCount(0);
      }

      try {
        const deliveryId = Array.isArray(id) ? id[0] : id;
        const data = await fetchDeliveryDetails(deliveryId as string);
        setDelivery(data);
        setError(null);
        setRetryCount(0);
        setLoading(false);
        setRefreshing(false);
      } catch (e) {
        const errorMessage = (e as Error)?.message || "Failed to load delivery";
        const isNetworkError =
          errorMessage.toLowerCase().includes("network") ||
          errorMessage.toLowerCase().includes("fetch") ||
          errorMessage.toLowerCase().includes("connection");

        const maxRetries = isNetworkError ? 3 : 1;

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          setRetryCount(attempt + 1);

          retryTimeoutRef.current = setTimeout(() => {
            fetchData(attempt + 1);
          }, delay);
        } else {
          setDelivery(null);
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
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(0);
    setRefreshing(false);
  }, [fetchData]);

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
              backgroundColor: border,
              opacity: 0.4,
            },
            animatedStyle,
          ]}
        />
      </View>
    );
  };

  const SkeletonStatus = () => (
    <View style={styles.skeletonSection}>
      <SkeletonLine width={140} height={14} />
      <View style={{ marginTop: 16, gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ gap: 6 }}>
            <SkeletonLine width="60%" height={12} />
            <SkeletonLine width="90%" height={10} />
          </View>
        ))}
      </View>
    </View>
  );

  const SkeletonRoute = () => (
    <View style={styles.skeletonSection}>
      <SkeletonLine width={120} height={14} />
      <View style={{ marginTop: 16, gap: 16 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <SkeletonLine width={14} height={14} radius={7} />
          <View style={{ flex: 1, gap: 4 }}>
            <SkeletonLine width="30%" height={10} />
            <SkeletonLine width="80%" height={12} />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <SkeletonLine width={14} height={14} radius={7} />
          <View style={{ flex: 1, gap: 4 }}>
            <SkeletonLine width="30%" height={10} />
            <SkeletonLine width="80%" height={12} />
          </View>
        </View>
      </View>
    </View>
  );

  const SkeletonInfo = () => (
    <View style={styles.skeletonSection}>
      <SkeletonLine width={100} height={14} />
      <View style={{ marginTop: 12, gap: 10 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.infoRow}>
            <SkeletonLine width={80} height={12} />
            <SkeletonLine width={120} height={12} />
          </View>
        ))}
      </View>
    </View>
  );

  /* ---------------- Render Sections ---------------- */

  const renderStatus = () => {
    if (!delivery) return null;

    const statusConfig: Record<
      string,
      { icon: any; color: string; label: string }
    > = {
      PENDING: { icon: "clock.fill", color: muted, label: "Pending" },
      REQUESTED: {
        icon: "arrow.clockwise",
        color: primary,
        label: "Finding Rider",
      },
      ASSIGNED: {
        icon: "person.fill",
        color: primary,
        label: "Rider Assigned",
      },
      PICKED_UP: {
        icon: "shippingbox.fill",
        color: primary,
        label: "Package Picked Up",
      },
      DELIVERED: {
        icon: "checkmark.circle.fill",
        color: success,
        label: "Delivered",
      },
      CANCELLED: {
        icon: "xmark.circle.fill",
        color: "#EF4444",
        label: "Cancelled",
      },
    };

    const config = statusConfig[delivery.status] || statusConfig.PENDING;

    return (
      <View style={styles.statusSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Delivery Status
        </ThemedText>
        <View style={[styles.divider, { backgroundColor: border }]} />
        <View style={styles.statusContent}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${config.color}15` },
            ]}
          >
            <IconSymbol name={config.icon} size={24} color={config.color} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.statusLabel, { color: config.color }]}>
              {config.label}
            </ThemedText>
            {delivery.deliveredAt && (
              <ThemedText style={[styles.statusTime, { color: textSecondary }]}>
                Delivered {new Date(delivery.deliveredAt).toLocaleString()}
              </ThemedText>
            )}
            {!delivery.deliveredAt && delivery.createdAt && (
              <ThemedText style={[styles.statusTime, { color: textSecondary }]}>
                Created {new Date(delivery.createdAt).toLocaleString()}
              </ThemedText>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderRoute = () => {
    if (!delivery) return null;

    return (
      <View style={styles.routeSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Delivery Route
        </ThemedText>
        <View style={[styles.divider, { backgroundColor: border }]} />

        <View style={styles.routeContainer}>
          <View style={styles.routeIconColumn}>
            <View style={[styles.routeDot, { backgroundColor: success }]} />
            <View style={[styles.routeLine, { backgroundColor: border }]} />
            <View style={[styles.routeDot, { backgroundColor: primary }]} />
          </View>
          <View style={styles.routeContent}>
            <View style={styles.routeStop}>
              <ThemedText style={[styles.routeLabel, { color: muted }]}>
                PICKUP LOCATION
              </ThemedText>
              <ThemedText style={[styles.routeAddress, { color: textColor }]}>
                {delivery.pickupAddress?.address || "Unknown Address"}
              </ThemedText>
            </View>
            <View style={styles.routeStop}>
              <ThemedText style={[styles.routeLabel, { color: muted }]}>
                DELIVERY LOCATION
              </ThemedText>
              <ThemedText style={[styles.routeAddress, { color: textColor }]}>
                {delivery.dropoffAddress?.address || "Unknown Address"}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderDeliveryInfo = () => {
    if (!delivery) return null;

    return (
      <View style={styles.infoSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Delivery Information
        </ThemedText>
        <View style={[styles.divider, { backgroundColor: border }]} />
        <View style={styles.infoGrid}>
          <InfoRow
            label="Delivery Fee"
            value={`₦${formatCurrency(delivery.deliveryFee)}`}
          />
          <InfoRow label="Distance" value={`${delivery.distanceKm || 0} km`} />
          <InfoRow label="Package" value={delivery.packageDetails || "-"} />
          {delivery.weightKg && (
            <InfoRow label="Weight" value={`${delivery.weightKg} kg`} />
          )}
        </View>
      </View>
    );
  };

  const renderContactInfo = () => {
    if (!delivery) return null;

    return (
      <View style={styles.contactSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Contact Information
        </ThemedText>
        <View style={[styles.divider, { backgroundColor: border }]} />

        <View style={styles.contactItem}>
          <View
            style={[styles.contactIcon, { backgroundColor: `${primary}15` }]}
          >
            <IconSymbol
              name="arrow.down.circle.fill"
              size={20}
              color={primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.contactLabel, { color: muted }]}>
              Recipient
            </ThemedText>
            <ThemedText style={[styles.contactName, { color: textColor }]}>
              {delivery.recipientName || "Not provided"}
            </ThemedText>
            {delivery.recipientPhone && (
              <ThemedText
                style={[styles.contactPhone, { color: textSecondary }]}
              >
                {delivery.recipientPhone}
              </ThemedText>
            )}
          </View>
        </View>

        {delivery.rider && (
          <>
            <View
              style={[styles.contactDivider, { backgroundColor: border }]}
            />
            <View style={styles.contactItem}>
              <View
                style={[
                  styles.contactIcon,
                  { backgroundColor: `${success}15` },
                ]}
              >
                <IconSymbol name="person.fill" size={20} color={success} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.contactLabel, { color: muted }]}>
                  Rider
                </ThemedText>
                <ThemedText style={[styles.contactName, { color: textColor }]}>
                  {delivery.rider.name}
                </ThemedText>
                {delivery.rider.phone && (
                  <ThemedText
                    style={[styles.contactPhone, { color: textSecondary }]}
                  >
                    {delivery.rider.phone}
                  </ThemedText>
                )}
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderOrderInfo = () => {
    if (!delivery) return null;

    return (
      <View style={styles.orderSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Order Details
        </ThemedText>
        <View style={[styles.divider, { backgroundColor: border }]} />
        <View style={styles.infoGrid}>
          <InfoRow
            label="Delivery ID"
            value={`#${delivery.id.slice(-8).toUpperCase()}`}
          />
          <InfoRow
            label="Created On"
            value={new Date(delivery.createdAt).toLocaleDateString()}
          />
          <InfoRow
            label="Time"
            value={new Date(delivery.createdAt).toLocaleTimeString()}
          />
          {delivery.assignedAt && (
            <InfoRow
              label="Assigned At"
              value={new Date(delivery.assignedAt).toLocaleString()}
            />
          )}
          {delivery.pickedUpAt && (
            <InfoRow
              label="Picked Up At"
              value={new Date(delivery.pickedUpAt).toLocaleString()}
            />
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
          tintColor={primary}
        />
      }
    >
      <IconSymbol name="alert-circle" size={48} color={primary} />
      <ThemedText style={[styles.errorTitle, { color: textColor }]}>
        Oops!
      </ThemedText>
      <ThemedText style={[styles.errorText, { color: textSecondary }]}>
        {error || "Delivery not found"}
      </ThemedText>
      <Pressable
        style={[styles.retryButton, { borderColor: primary }]}
        onPress={() => router.back()}
      >
        <ThemedText style={[styles.retryButtonText, { color: primary }]}>
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
          tintColor={primary}
        />
      }
    >
      <View style={styles.contentContainer}>
        {renderStatus()}
        {renderRoute()}
        {renderDeliveryInfo()}
        {renderContactInfo()}
        {renderOrderInfo()}
      </View>
      <View style={styles.footerSpacer} />
    </ScrollView>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <View
        style={[
          styles.header,
          { borderBottomColor: border, backgroundColor: surface },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={22} color={primary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Delivery Details
          </ThemedText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.contentContainer}>
            <SkeletonStatus />
            <SkeletonRoute />
            <SkeletonInfo />
            <SkeletonInfo />
            <SkeletonInfo />
          </View>
          <View style={styles.footerSpacer} />
        </ScrollView>
      ) : error || !delivery ? (
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
  headerSpacer: { width: 32 },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 24, alignItems: "center" },

  contentContainer: {
    width: "100%",
    maxWidth: 400,
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
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 24,
    marginBottom: 16,
  },

  statusSection: { paddingBottom: 12 },
  statusContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  statusBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusTime: {
    fontSize: 13,
    marginTop: 2,
  },

  routeSection: { paddingBottom: 12 },
  routeContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  routeIconColumn: {
    width: 32,
    alignItems: "center",
    marginRight: 16,
  },
  routeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  routeLine: {
    width: 2,
    flex: 1,
    marginVertical: 8,
  },
  routeContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  routeStop: {
    paddingVertical: 4,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  routeAddress: {
    fontSize: 15,
    lineHeight: 20,
  },

  infoSection: { paddingBottom: 12 },
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

  contactSection: { paddingBottom: 12 },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  contactName: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 13,
    marginTop: 1,
  },
  contactDivider: {
    height: 1,
    marginHorizontal: 24,
    marginBottom: 12,
  },

  orderSection: { paddingBottom: 12 },

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
