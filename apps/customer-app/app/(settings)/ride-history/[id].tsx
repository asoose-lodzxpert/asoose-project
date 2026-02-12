import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  DimensionValue,
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

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { RideService } from "@/services/ride.service";
import { Ride } from "@/types/ride";

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

export default function RideDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  /* -------- Theme Colors -------- */
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textColor = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const border = useThemeColor({}, "borderDefault");
  const surface = useThemeColor({}, "surfaceBackground");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const accentGreen = useThemeColor({}, "statusSuccess");
  const accentRed = useThemeColor({}, "statusError");

  /* -------- State -------- */
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  /* -------- Data Loader with Auto-Retry -------- */
  const loadRide = useCallback(
    async (attempt = 0) => {
      if (!id || typeof id !== "string") {
        setRide(null);
        setError("Ride not found");
        setLoading(false);
        return;
      }

      if (attempt === 0) {
        setLoading(true);
        setError(null);
        setRetryCount(0);
      }

      try {
        const data = await RideService.getRideById(id);
        setRide(data);
        setError(null);
        setRetryCount(0);
        setLoading(false);
        setRefreshing(false);
      } catch (e) {
        const errorMessage = (e as Error)?.message || "Failed to load ride";
        const isNetworkError =
          errorMessage.toLowerCase().includes("network") ||
          errorMessage.toLowerCase().includes("fetch") ||
          errorMessage.toLowerCase().includes("connection");

        const maxRetries = isNetworkError ? 3 : 1;

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          setRetryCount(attempt + 1);

          retryTimeoutRef.current = setTimeout(() => {
            loadRide(attempt + 1);
          }, delay);
        } else {
          setRide(null);
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
    loadRide();
  }, [loadRide]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRide(0);
  }, [loadRide]);

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
      <ThemedText style={[styles.errorTitle, { color: textColor }]}>
        Oops!
      </ThemedText>
      <ThemedText style={[styles.errorText, { color: textSecondary }]}>
        {error || "Ride not available"}
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

  const SkeletonInfo = () => (
    <View style={styles.skeletonSection}>
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

      <View
        style={{
          marginTop: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <React.Fragment key={i}>
            <SkeletonLine width={36} height={36} radius={18} />
            {i < 4 && <SkeletonLine width={40} height={2} />}
          </React.Fragment>
        ))}
      </View>

      <View style={{ marginTop: 16, alignItems: "center", gap: 4 }}>
        <SkeletonLine width="50%" height={14} />
        <SkeletonLine width="40%" height={10} />
      </View>
    </View>
  );

  const SkeletonRoute = () => (
    <View style={styles.skeletonSection}>
      <SkeletonLine width={100} height={14} />

      <View style={{ marginTop: 12, gap: 16 }}>
        {[1, 2].map((i) => (
          <View key={i} style={{ flexDirection: "row", gap: 12 }}>
            <SkeletonLine width={20} height={20} radius={10} />
            <View style={{ flex: 1, gap: 4 }}>
              <SkeletonLine width="40%" height={12} />
              <SkeletonLine width="80%" height={14} />
              <SkeletonLine width="60%" height={12} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const SkeletonFare = () => (
    <View style={styles.skeletonSection}>
      <SkeletonLine width={100} height={14} />

      <View style={{ marginTop: 12, gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.infoRow}>
            <SkeletonLine width={100} height={12} />
            <SkeletonLine width={80} height={12} />
          </View>
        ))}

        <View style={[styles.totalRow, { borderTopColor: border }]}>
          <SkeletonLine width={80} height={14} />
          <SkeletonLine width={90} height={18} />
        </View>
      </View>
    </View>
  );

  /* ---------------- Sections ---------------- */
  const renderTimeline = () => {
    if (!ride) return null;

    const statusTimeline: {
      status: string;
      label: string;
      icon: IconSymbolName;
    }[] = [
      { status: "REQUESTED", label: "Requested", icon: "checkmark.circle" },
      { status: "ACCEPTED", label: "Accepted", icon: "checkmark.circle.fill" },
      { status: "IN_PROGRESS", label: "In Progress", icon: "car.fill" },
      { status: "COMPLETED", label: "Completed", icon: "checkmark.seal" },
    ];

    const currentIndex = statusTimeline.findIndex(
      (s) => s.status === ride.status,
    );
    const activeIndex = currentIndex >= 0 ? currentIndex : 0;
    const currentStep = statusTimeline[activeIndex];

    return (
      <View style={styles.timelineSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Ride Status
        </ThemedText>
        <View style={[styles.divider, { backgroundColor: border }]} />

        <View style={styles.horizontalTimeline}>
          {statusTimeline.map((step, idx) => {
            const isPassed = idx <= activeIndex;
            const iconColor = isPassed ? brandPrimary : "#D1D5DB";
            const lineColor = isPassed ? brandPrimary : "#E5E7EB";

            return (
              <React.Fragment key={idx}>
                <View style={styles.timelineIconWrapper}>
                  <View
                    style={[
                      styles.timelineIconCircle,
                      { backgroundColor: iconColor },
                    ]}
                  >
                    <IconSymbol name={step.icon} size={16} color="#FFF" />
                  </View>
                </View>
                {idx < statusTimeline.length - 1 && (
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

        <View style={styles.currentStatusContainer}>
          <ThemedText style={[styles.currentStatusLabel, { color: textColor }]}>
            {currentStep.label}
          </ThemedText>
          {ride.completedAt && (
            <ThemedText
              style={[styles.currentStatusTime, { color: textSecondary }]}
            >
              {new Date(ride.completedAt).toLocaleString()}
            </ThemedText>
          )}
        </View>
      </View>
    );
  };

  const renderRideInfo = () => {
    if (!ride) return null;

    return (
      <View style={styles.infoSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Ride Information
        </ThemedText>
        <View style={[styles.divider, { backgroundColor: border }]} />
        <View style={styles.infoGrid}>
          <InfoRow
            label="Ride ID"
            value={`#${ride.id.slice(-8).toUpperCase()}`}
          />
          <InfoRow
            label="Requested On"
            value={new Date(ride.createdAt).toLocaleDateString()}
          />
          <InfoRow
            label="Time"
            value={new Date(ride.createdAt).toLocaleTimeString()}
          />
          {ride.distanceKm && (
            <InfoRow label="Distance" value={`${ride.distanceKm} km`} />
          )}
          {ride.durationMin && (
            <InfoRow label="Duration" value={`${ride.durationMin} mins`} />
          )}
        </View>
      </View>
    );
  };

  const renderRoute = () => {
    if (!ride?.pickupAddress && !ride?.dropoffAddress) return null;

    return (
      <View style={styles.routeSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Route
        </ThemedText>
        <View style={[styles.divider, { backgroundColor: border }]} />
        <View style={styles.routeContainer}>
          {ride.pickupAddress && (
            <View style={styles.locationRow}>
              <IconSymbol name="location.fill" size={20} color={accentGreen} />
              <View style={styles.locationInfo}>
                <ThemedText
                  style={[styles.locationLabel, { color: textSecondary }]}
                >
                  Pickup
                </ThemedText>
                <ThemedText style={[styles.locationText, { color: textColor }]}>
                  {ride.pickupAddress.street}
                </ThemedText>
                <ThemedText
                  style={[styles.locationSubtext, { color: textSecondary }]}
                >
                  {ride.pickupAddress.city}, {ride.pickupAddress.state}
                </ThemedText>
              </View>
            </View>
          )}

          <View style={styles.routeLine} />

          {ride.dropoffAddress && (
            <View style={styles.locationRow}>
              <IconSymbol name="mappin" size={20} color={accentRed} />
              <View style={styles.locationInfo}>
                <ThemedText
                  style={[styles.locationLabel, { color: textSecondary }]}
                >
                  Dropoff
                </ThemedText>
                <ThemedText style={[styles.locationText, { color: textColor }]}>
                  {ride.dropoffAddress.street}
                </ThemedText>
                <ThemedText
                  style={[styles.locationSubtext, { color: textSecondary }]}
                >
                  {ride.dropoffAddress.city}, {ride.dropoffAddress.state}
                </ThemedText>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderDriver = () => {
    if (!ride?.rider) return null;

    return (
      <View style={styles.driverSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Driver
        </ThemedText>
        <View style={[styles.divider, { backgroundColor: border }]} />
        <View style={styles.driverContainer}>
          <View style={styles.driverRow}>
            <View style={styles.driverIconWrapper}>
              <IconSymbol name="person.fill" size={24} color={brandPrimary} />
            </View>
            <View style={styles.driverInfo}>
              <ThemedText style={[styles.driverName, { color: textColor }]}>
                {ride.rider.name}
              </ThemedText>
              <ThemedText
                style={[styles.driverPhone, { color: textSecondary }]}
              >
                {ride.rider.phone}
              </ThemedText>
              {ride.rider.rating && (
                <View style={styles.ratingContainer}>
                  <IconSymbol name="star.fill" size={14} color="#F59E0B" />
                  <ThemedText
                    style={[styles.ratingText, { color: textSecondary }]}
                  >
                    {ride.rider.rating} ({ride.rider.totalRides} rides)
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFare = () => {
    if (!ride) return null;

    return (
      <View style={styles.fareSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Fare Details
        </ThemedText>
        <View style={[styles.divider, { backgroundColor: border }]} />
        <View style={styles.fareContainer}>
          {ride.baseFare && (
            <View style={styles.fareRow}>
              <ThemedText style={[styles.fareLabel, { color: textSecondary }]}>
                Base Fare
              </ThemedText>
              <ThemedText style={[styles.fareValue, { color: textColor }]}>
                ₦{formatCurrency(ride.baseFare)}
              </ThemedText>
            </View>
          )}
          {ride.distanceFare && (
            <View style={styles.fareRow}>
              <ThemedText style={[styles.fareLabel, { color: textSecondary }]}>
                Distance Fare
              </ThemedText>
              <ThemedText style={[styles.fareValue, { color: textColor }]}>
                ₦{formatCurrency(ride.distanceFare)}
              </ThemedText>
            </View>
          )}
          {ride.timeFare && (
            <View style={styles.fareRow}>
              <ThemedText style={[styles.fareLabel, { color: textSecondary }]}>
                Time Fare
              </ThemedText>
              <ThemedText style={[styles.fareValue, { color: textColor }]}>
                ₦{formatCurrency(ride.timeFare)}
              </ThemedText>
            </View>
          )}
          {ride.surgeMultiplier && ride.surgeMultiplier > 1 && (
            <View style={styles.fareRow}>
              <ThemedText style={[styles.fareLabel, { color: textSecondary }]}>
                Surge ({ride.surgeMultiplier}x)
              </ThemedText>
              <ThemedText style={[styles.fareValue, { color: accentRed }]}>
                +₦
                {formatCurrency(
                  (ride.totalFare || 0) * (ride.surgeMultiplier - 1),
                )}
              </ThemedText>
            </View>
          )}
          {ride.platformFee && (
            <View style={styles.fareRow}>
              <ThemedText style={[styles.fareLabel, { color: textSecondary }]}>
                Platform Fee
              </ThemedText>
              <ThemedText style={[styles.fareValue, { color: textColor }]}>
                ₦{formatCurrency(ride.platformFee)}
              </ThemedText>
            </View>
          )}

          <View style={[styles.totalRow, { borderTopColor: border }]}>
            <ThemedText style={[styles.totalLabel, { color: textColor }]}>
              Total Fare
            </ThemedText>
            <ThemedText style={[styles.totalPrice, { color: brandPrimary }]}>
              ₦{formatCurrency(ride.totalFare)}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

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
      <View style={styles.contentContainer}>
        {renderTimeline()}
        {renderRideInfo()}
        {renderRoute()}
        {renderDriver()}
        {renderFare()}
      </View>
      <View style={styles.footerSpacer} />
    </ScrollView>
  );

  return (
    <ThemedView style={[styles.mainContainer, { backgroundColor: surface }]}>
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
            Ride Details
          </ThemedText>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {/* Body */}
      {loading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.contentContainer}>
            <SkeletonTimeline />
            <SkeletonInfo />
            <SkeletonRoute />
            <SkeletonInfo />
            <SkeletonFare />
          </View>
          <View style={styles.footerSpacer} />
        </ScrollView>
      ) : error || !ride ? (
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
  mainContainer: { flex: 1 },

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

  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 24,
    marginBottom: 16,
  },

  // Timeline Section
  timelineSection: {
    paddingBottom: 12,
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
  currentStatusTime: {
    fontSize: 12,
    marginTop: 2,
  },

  // Info Section
  infoSection: {
    paddingBottom: 8,
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

  // Route Section
  routeSection: {
    paddingBottom: 8,
  },
  routeContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  locationInfo: {
    flex: 1,
    gap: 2,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 15,
    fontWeight: "600",
  },
  locationSubtext: {
    fontSize: 13,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: "#E5E7EB",
    marginLeft: 9,
    marginVertical: 4,
  },

  // Driver Section
  driverSection: {
    paddingBottom: 8,
  },
  driverContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  driverRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  driverIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  driverInfo: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "700",
  },
  driverPhone: {
    fontSize: 14,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
  },

  // Fare Section
  fareSection: {
    paddingBottom: 8,
  },
  fareContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  fareLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  fareValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    paddingBottom: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "800",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  errorContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  errorTitle: { fontSize: 24, fontWeight: "700", marginTop: 8 },

  /* Skeleton */
  skeletonSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 8,
    backgroundColor: "transparent",
  },
  errorText: { fontSize: 16, textAlign: "center", marginBottom: 24 },

  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  retryButtonText: { fontSize: 16, fontWeight: "600" },

  footerSpacer: { height: 80 },
});
