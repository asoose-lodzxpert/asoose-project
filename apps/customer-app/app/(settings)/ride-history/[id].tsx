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
import { checkDispute, Dispute } from "@/services/dispute.service";
import {
  DisputeSheet,
  ExistingDisputeCard,
} from "@/components/dispute/DisputeSheet";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatCurrency(value: string | number | undefined | null) {
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-NG", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function RideDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textColor = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");
  const surface = useThemeColor({}, "surfaceBackground");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const card = useThemeColor({}, "surfaceCard");
  const accentGreen = useThemeColor({}, "statusSuccess");
  const accentRed = useThemeColor({}, "statusError");

  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisputeSheet, setShowDisputeSheet] = useState(false);
  const [existingDispute, setExistingDispute] = useState<Dispute | null>(null);

  const loadRide = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [data, disputeRes] = await Promise.all([
        RideService.getRideById(id),
        checkDispute({ rideId: id }).catch(() => ({ dispute: null })),
      ]);
      setRide(data);
      setExistingDispute(disputeRes.dispute);
    } catch (e) {
      setError("Failed to load ride details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadRide();
  }, [loadRide]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRide();
  };

  const renderTimeline = () => {
    if (!ride) return null;

    const isCancelled = [
      "CANCELLED",
      "CANCELLED_BY_USER",
      "CANCELLED_BY_DRIVER",
    ].includes(ride.status);

    const steps: { label: string; icon: IconSymbolName; status: string[] }[] = [
      {
        label: "Requested",
        icon: "checkmark.circle",
        status: ["REQUESTED", "SEARCHING_DRIVER"],
      },
      {
        label: "Driver Found",
        icon: "person.badge.plus",
        status: ["DRIVER_ACCEPTED", "PAID", "ACCEPTED"],
      },
      { label: "On Trip", icon: "car.fill", status: ["IN_PROGRESS"] },
      {
        label: isCancelled ? "Cancelled" : "Completed",
        icon: isCancelled ? "xmark.circle.fill" : "checkmark.seal.fill",
        status: isCancelled
          ? ["CANCELLED", "CANCELLED_BY_USER", "CANCELLED_BY_DRIVER"]
          : ["COMPLETED"],
      },
    ];

    const activeIndex = isCancelled
      ? 3
      : steps.findIndex((s) => s.status.includes(ride.status));

    return (
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: card, borderColor: border },
        ]}
      >
        <ThemedText style={[styles.sectionHeader, { color: textSecondary }]}>
          RIDE TIMELINE
        </ThemedText>
        <View style={styles.timelineRow}>
          {steps.map((step, idx) => {
            const isCompleted =
              idx < activeIndex || (idx === activeIndex && !isCancelled);
            const isCurrent = idx === activeIndex;
            const tint =
              isCancelled && isCurrent
                ? accentRed
                : isCompleted || isCurrent
                  ? brandPrimary
                  : border;

            return (
              <React.Fragment key={idx}>
                <View style={styles.stepContainer}>
                  <View style={[styles.stepIcon, { backgroundColor: tint }]}>
                    <IconSymbol name={step.icon} size={14} color="#FFF" />
                  </View>
                  <ThemedText
                    style={[
                      styles.stepLabel,
                      { color: isCurrent ? textColor : textSecondary },
                    ]}
                  >
                    {step.label}
                  </ThemedText>
                </View>
                {idx < steps.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      {
                        backgroundColor:
                          idx < activeIndex ? brandPrimary : border,
                      },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {isCancelled && (
          <View
            style={[styles.cancelBanner, { backgroundColor: accentRed + "10" }]}
          >
            <IconSymbol
              name="exclamationmark.triangle.fill"
              size={16}
              color={accentRed}
            />
            <ThemedText
              style={{
                color: accentRed,
                fontSize: 13,
                fontWeight: "600",
                marginLeft: 8,
              }}
            >
              {ride.cancellationReason || "Ride was cancelled"}
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  const renderRoute = () => {
    if (!ride) return null;
    return (
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: card, borderColor: border },
        ]}
      >
        <View style={styles.routeRow}>
          <View style={styles.routeIcons}>
            <View style={[styles.dot, { backgroundColor: accentGreen }]} />
            <View style={[styles.line, { backgroundColor: border }]} />
            <IconSymbol name="mappin.and.ellipse" size={18} color={accentRed} />
          </View>
          <View style={styles.routeInfo}>
            <View style={styles.addressBox}>
              <ThemedText type="caption" style={{ color: textSecondary }}>
                PICKUP
              </ThemedText>
              <ThemedText numberOfLines={1} style={styles.addressText}>
                {ride.pickupAddress?.street}
              </ThemedText>
            </View>
            <View style={[styles.addressBox, { marginTop: 20 }]}>
              <ThemedText type="caption" style={{ color: textSecondary }}>
                DROPOFF
              </ThemedText>
              <ThemedText numberOfLines={1} style={styles.addressText}>
                {ride.dropoffAddress?.street}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFare = () => {
    if (!ride) return null;
    return (
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: card, borderColor: border },
        ]}
      >
        <ThemedText style={[styles.sectionHeader, { color: textSecondary }]}>
          PAYMENT SUMMARY
        </ThemedText>
        <View style={styles.fareItem}>
          <ThemedText style={{ color: textSecondary }}>Total Fare</ThemedText>
          <ThemedText style={styles.fareValue}>
            ₦{formatCurrency(ride.totalFare)}
          </ThemedText>
        </View>
        <View style={styles.fareItem}>
          <ThemedText style={{ color: textSecondary }}>Distance</ThemedText>
          <ThemedText style={styles.fareValue}>{ride.distanceKm} km</ThemedText>
        </View>
        <View style={styles.fareItem}>
          <ThemedText style={{ color: textSecondary }}>Status</ThemedText>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  ride.payment?.status === "COMPLETED"
                    ? accentGreen + "20"
                    : border,
              },
            ]}
          >
            <ThemedText
              style={{
                color:
                  ride.payment?.status === "COMPLETED"
                    ? accentGreen
                    : textColor,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              {ride.payment?.status || "UNPAID"}
            </ThemedText>
          </View>
        </View>
        <View
          style={[
            styles.divider,
            { backgroundColor: border, marginVertical: 12 },
          ]}
        />
        <View style={styles.fareItem}>
          <ThemedText style={{ fontWeight: "700" }}>Amount Paid</ThemedText>
          <ThemedText style={[styles.totalPrice, { color: brandPrimary }]}>
            ₦{formatCurrency(ride.payment?.amount || 0)}
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color={brandPrimary} />
        </Pressable>
        <ThemedText type="subtitle">
          Ride #ID...{ride?.id.slice(-5).toUpperCase()}
        </ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brandPrimary}
          />
        }
      >
        {renderTimeline()}
        {renderRoute()}
        {renderFare()}

        {/* Dispute section */}
        {existingDispute ? (
          <ExistingDisputeCard
            dispute={existingDispute}
            onPress={() =>
              router.push(`/(settings)/dispute/${existingDispute.id}` as any)
            }
          />
        ) : (
          <Pressable
            style={[styles.supportBtn, { borderColor: border }]}
            onPress={() => setShowDisputeSheet(true)}
          >
            <ThemedText style={{ color: brandPrimary, fontWeight: "700" }}>
              Need help with this ride?
            </ThemedText>
          </Pressable>
        )}

        <View style={styles.infoBox}>
          <IconSymbol name="info.circle" size={16} color={textSecondary} />
          <ThemedText
            style={{ color: textSecondary, fontSize: 12, marginLeft: 8 }}
          >
            Request created at{" "}
            {new Date(ride?.createdAt || "").toLocaleString()}
          </ThemedText>
        </View>
      </ScrollView>

      <DisputeSheet
        visible={showDisputeSheet}
        onClose={() => setShowDisputeSheet(false)}
        entityLabel={`Ride #${(ride?.id ?? "").slice(-6).toUpperCase()}`}
        rideId={id}
        onDisputeFiled={(d) => setExistingDispute(d)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 20,
    gap: 12,
  },
  backBtn: { padding: 4 },
  scrollContent: { padding: 16, gap: 16 },
  sectionCard: { padding: 20, borderRadius: 20, borderWidth: 1 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 20,
  },

  // Timeline
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepContainer: { alignItems: "center", gap: 8, zIndex: 2 },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { fontSize: 10, fontWeight: "600" },
  stepLine: {
    flex: 1,
    height: 2,
    marginTop: -18,
    marginHorizontal: -10,
    zIndex: 1,
  },
  cancelBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
  },

  // Route
  routeRow: { flexDirection: "row", gap: 16 },
  routeIcons: { alignItems: "center", width: 20 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 2, flex: 1, marginVertical: 4 },
  routeInfo: { flex: 1 },
  addressBox: { gap: 4 },
  addressText: { fontSize: 14, fontWeight: "600" },

  // Fare
  fareItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
  },
  fareValue: { fontWeight: "600", fontSize: 14 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  totalPrice: { fontSize: 20, fontWeight: "800" },
  divider: { height: 1, width: "100%" },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  supportBtn: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
});
