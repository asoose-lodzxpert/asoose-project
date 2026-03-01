import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SkeletonRideCard } from "@/components/ui/Skeleton";
import { useThemeColor } from "@/hooks/use-theme-color";
import { RideService } from "@/services/ride.service";
import { Ride } from "@/types/ride";
import { RelativePathString, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { PaymentWebView } from "@/components/checkout/PaymentWebView";
import { initiatePayment } from "@/services/payment.service";
import { useUserProfile } from "@/hooks/useUserProfile";
import Toast from "react-native-toast-message";
import type { InAppTx } from "@/types/payment";

const PAGE_SIZE = 10;

export default function RidesHistoryScreen() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textColor = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const cardBg = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const accentGreen = useThemeColor({}, "statusSuccess");
  const accentYellow = "#F59E0B"; // Warning color
  const accentRed = useThemeColor({}, "statusError");
  const router = useRouter();
  const { user } = useUserProfile();

  // Payment state
  const [payingRideId, setPayingRideId] = useState<string | null>(null);
  const [checkoutTx, setCheckoutTx] = useState<InAppTx | null>(null);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);

  const handlePayNow = async (ride: Ride) => {
    if (!user) {
      Toast.show({ type: "error", text1: "Profile not loaded" });
      return;
    }
    setPayingRideId(ride.id);
    try {
      const response = await initiatePayment(
        "paystack",
        {
          amount: Number(ride.totalFare ?? 0) * 100,
          type: "RIDE",
          rideId: ride.id,
          callbackUrl: "asoose-app://payment-callback",
        },
        {
          email: user.email,
          name: user.name || user.email,
          phone: user.phone ?? undefined,
        },
      );
      const checkoutUrl = response.authorizationUrl || response.checkoutUrl;
      const transactionId = response.reference || response.transactionId;
      if (checkoutUrl) {
        setCheckoutTx({
          transactionId,
          checkoutUrl,
          amount: Number(ride.totalFare ?? 0),
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
      setPayingRideId(null);
    }
  };

  const loadRides = useCallback(
    async (refresh = false, attempt = 0) => {
      if (loading && attempt === 0) return;
      if (!hasMore && !refresh) return;

      setLoading(true);
      try {
        const currentPage = refresh ? 1 : page;
        const data = await RideService.getUserRides({
          page: currentPage,
          limit: PAGE_SIZE,
        });

        // Backend returns array directly

        if (refresh) {
          setRides(data);
          setPage(1);
        } else {
          setRides((prev) => [...prev, ...data]);
        }

        setHasMore(data.length === PAGE_SIZE);
        setRetryCount(0);
        setLoading(false);
        setRefreshing(false);
      } catch (error) {
        const shouldRetry = refresh || page === 1; // Only retry on initial load or refresh
        const errorMessage = (error as Error)?.message || "Failed to load";
        const isNetworkError =
          errorMessage.toLowerCase().includes("network") ||
          errorMessage.toLowerCase().includes("fetch") ||
          errorMessage.toLowerCase().includes("connection");

        const maxRetries = isNetworkError && shouldRetry ? 3 : 0;

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          setRetryCount(attempt + 1);

          retryTimeoutRef.current = setTimeout(() => {
            loadRides(refresh, attempt + 1);
          }, delay);
        } else {
          console.error("Failed to load rides:", error);
          setLoading(false);
          setRefreshing(false);
          setRetryCount(0);
        }
      }
    },
    [page, hasMore, loading],
  );

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadRides(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadRides(true);
  }, [loadRides]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((p) => p + 1);
      loadRides(false);
    }
  }, [loading, hasMore, loadRides]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return accentGreen;
      case "CANCELLED":
        return accentRed;
      case "REQUESTED":
      case "ACCEPTED":
      case "ARRIVED":
      case "IN_PROGRESS":
        return accentYellow;
      default:
        return textSecondary;
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderRideCard = ({ item: ride }: { item: Ride }) => {
    const statusColor = getStatusColor(ride.status);
    const isPaid =
      ride.payment?.status === "PAID" ||
      ride.payment?.status === "COMPLETED" ||
      ride.payment?.status === "SUCCESS";
    const isCancelled = (ride.status as string).includes("CANCELLED");
    const isCompleted = ride.status === "COMPLETED";
    const showPayBtn = !isPaid && !isCancelled && isCompleted;
    const isPayingThis = payingRideId === ride.id;

    return (
      <Pressable
        style={[
          styles.rideCard,
          { backgroundColor: cardBg, borderColor: border },
        ]}
        onPress={() => {
          router.push(
            `/(settings)/ride-history/${ride.id}` as RelativePathString,
          );
        }}
      >
        <View style={styles.rideHeader}>
          <View style={styles.rideIdContainer}>
            <IconSymbol name="car.fill" size={18} color={brandPrimary} />
            <ThemedText style={[styles.rideId, { color: textColor }]}>
              Ride #{ride.id.slice(-6).toUpperCase()}
            </ThemedText>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "22" },
            ]}
          >
            <ThemedText
              type="caption"
              style={[styles.statusText, { color: statusColor }]}
            >
              {formatStatus(ride.status)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.locationRow}>
            <IconSymbol name="location.fill" size={16} color={accentGreen} />
            <ThemedText
              numberOfLines={1}
              style={[styles.locationText, { color: textColor }]}
            >
              {ride.pickupAddress?.street || "Pickup location"}
            </ThemedText>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.locationRow}>
            <IconSymbol name="mappin" size={16} color={accentRed} />
            <ThemedText
              numberOfLines={1}
              style={[styles.locationText, { color: textColor }]}
            >
              {ride.dropoffAddress?.street || "Dropoff location"}
            </ThemedText>
          </View>
        </View>

        {ride.rider && (
          <View style={styles.driverInfo}>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Driver: {ride.rider.name}
            </ThemedText>
            {ride.rider.vehicle && (
              <ThemedText type="caption" style={{ color: textSecondary }}>
                {ride.rider.vehicle.make} {ride.rider.vehicle.model} •{" "}
                {ride.rider.vehicle.plateNumber}
              </ThemedText>
            )}
          </View>
        )}

        {/* Payment badge */}
        <View style={styles.paymentRow}>
          <View
            style={[
              styles.paymentBadge,
              {
                backgroundColor: isPaid ? accentGreen + "22" : accentRed + "22",
              },
            ]}
          >
            <IconSymbol
              name={
                isPaid ? "checkmark.circle.fill" : "exclamationmark.circle.fill"
              }
              size={12}
              color={isPaid ? accentGreen : accentRed}
            />
            <ThemedText
              style={[
                styles.paymentBadgeText,
                { color: isPaid ? accentGreen : accentRed },
              ]}
            >
              {isPaid
                ? `Paid${ride.payment?.method ? ` · ${ride.payment.method.replace("_", " ")}` : ""}`
                : "Unpaid"}
            </ThemedText>
          </View>
        </View>

        <View style={styles.rideFooter}>
          <View style={styles.dateContainer}>
            <IconSymbol name="clock" size={14} color={textSecondary} />
            <ThemedText type="caption" style={{ color: textSecondary }}>
              {formatDate(ride.createdAt)} • {formatTime(ride.createdAt)}
            </ThemedText>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ThemedText style={[styles.fareText, { color: brandPrimary }]}>
              ₦{ride.totalFare?.toLocaleString() || "0"}
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
                  handlePayNow(ride);
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

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="car" size={64} color={textSecondary} />
      <ThemedText
        type="subtitle"
        style={[styles.emptyTitle, { color: textColor }]}
      >
        No rides yet
      </ThemedText>
      <ThemedText type="caption" style={{ color: textSecondary }}>
        Your ride history will appear here
      </ThemedText>
    </View>
  );

  const renderFooter = () => {
    if (!loading || refreshing) return null;
    return (
      <View style={styles.footerLoader}>
        <SkeletonRideCard />
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={22} color={brandPrimary} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>
          Ride History
        </ThemedText>
      </View>

      <FlatList
        data={rides}
        renderItem={renderRideCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={brandPrimary}
            colors={[brandPrimary]}
          />
        }
      />

      {loading && rides.length === 0 && !refreshing && (
        <View style={styles.listContent}>
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonRideCard key={index} />
          ))}
        </View>
      )}

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
            loadRides(true);
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
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700" },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  rideCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
  },
  rideHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  rideIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rideId: {
    fontSize: 16,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  routeContainer: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    flex: 1,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: "#E5E7EB",
    marginLeft: 7,
    marginVertical: 2,
  },

  driverInfo: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
    marginBottom: 12,
    gap: 4,
  },

  rideFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fareText: {
    fontSize: 18,
    fontWeight: "700",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },

  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },

  initialLoader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
  },
  paymentRow: {
    marginTop: 8,
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
