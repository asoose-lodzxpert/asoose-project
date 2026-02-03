import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRide } from "@/context/RideContext";
import { RideStatus } from "@/types/ride";
import { FindingDriverView } from "@/components/ride/FindingDriverView";
import { DriverInfoCard } from "@/components/ride/DriverInfoCard";
import { TripProgressTracker } from "@/components/ride/TripProgressTracker";
import { OTPDisplay } from "@/components/ride/OTPDisplay";
import { RideService } from "@/services/ride.service";

export default function RideTrackingScreen() {
  const router = useRouter();
  const {
    currentRide,
    pageView,
    loading,
    driverLocation,
    cancelRide,
    refreshCurrentRide,
    socketConnected,
  } = useRide();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");

  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (!currentRide) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: surface }]}>
        <View style={styles.emptyState}>
          <ThemedText>No active ride</ThemedText>
          <Pressable onPress={() => router.replace("/ride")} style={styles.backLink}>
            <ThemedText type="link">Book a Ride</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshCurrentRide();
    setRefreshing(false);
  };

  const handleCancelRide = () => {
    Alert.alert(
      "Cancel Ride",
      "Are you sure you want to cancel this ride?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelRide("Cancelled by user");
              router.replace("/ride");
            } catch (err) {
              console.error("Cancel error:", err);
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const canCancel =
    currentRide.status === RideStatus.PENDING ||
    currentRide.status === RideStatus.REQUESTED ||
    currentRide.status === RideStatus.ACCEPTED;

  const showDriverInfo =
    currentRide.rider &&
    (currentRide.status === RideStatus.ACCEPTED ||
      currentRide.status === RideStatus.ARRIVED ||
      currentRide.status === RideStatus.IN_PROGRESS);

  const showOTP =
    currentRide.status === RideStatus.ARRIVED && currentRide.startOtp;

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={primary} />
        </Pressable>
        <View style={styles.headerContent}>
          <ThemedText type="subtitle">Your Ride</ThemedText>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: socketConnected ? success : danger,
                },
              ]}
            />
            <ThemedText type="caption" style={{ color: textSecondary }}>
              {socketConnected ? "Live" : "Offline"}
            </ThemedText>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Progress Tracker */}
        {currentRide.status !== RideStatus.PENDING &&
          currentRide.status !== RideStatus.CANCELLED && (
            <View style={[styles.progressCard, { backgroundColor: card }]}>
              <TripProgressTracker currentStatus={currentRide.status as RideStatus} />
            </View>
          )}

        {/* Finding Driver State */}
        {currentRide.status === RideStatus.REQUESTED && <FindingDriverView />}

        {/* Driver Info */}
        {showDriverInfo && <DriverInfoCard driver={currentRide.rider!} />}

        {/* OTP Display */}
        {showOTP && <OTPDisplay otp={currentRide.startOtp!} />}

        {/* Trip Details */}
        <View style={[styles.detailsCard, { backgroundColor: card, borderColor: border }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Trip Details
          </ThemedText>

          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: success }]} />
            <View style={styles.locationText}>
              <ThemedText type="caption" style={{ color: textSecondary }}>
                Pickup
              </ThemedText>
              <ThemedText type="default">
                {currentRide.pickupAddress?.street || "Pickup location"}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.locationLine, { backgroundColor: border }]} />

          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: danger }]} />
            <View style={styles.locationText}>
              <ThemedText type="caption" style={{ color: textSecondary }}>
                Dropoff
              </ThemedText>
              <ThemedText type="default">
                {currentRide.dropoffAddress?.street || "Dropoff location"}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: border }]} />

          <View style={styles.infoRow}>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Distance
            </ThemedText>
            <ThemedText type="default">
              {RideService.formatDistance(currentRide.distanceKm || 0)}
            </ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Estimated Fare
            </ThemedText>
            <ThemedText type="defaultSemiBold" style={{ color: primary }}>
              {RideService.formatCurrency(currentRide.totalFare || 0)}
            </ThemedText>
          </View>
        </View>

        {/* Driver Location Info */}
        {driverLocation && (
          <View style={[styles.locationCard, { backgroundColor: card, borderColor: border }]}>
            <View style={styles.locationHeader}>
              <IconSymbol name="location.fill" size={20} color={primary} />
              <ThemedText type="defaultSemiBold">Driver Location</ThemedText>
            </View>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Lat: {driverLocation.latitude.toFixed(6)}
            </ThemedText>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Lng: {driverLocation.longitude.toFixed(6)}
            </ThemedText>
          </View>
        )}

        {/* Status Messages */}
        {currentRide.status === RideStatus.ACCEPTED && (
          <View style={[styles.messageCard, { backgroundColor: `${primary}15` }]}>
            <IconSymbol name="car.fill" size={20} color={primary} />
            <ThemedText type="caption" style={{ color: primary }}>
              Your driver is on the way to pick you up
            </ThemedText>
          </View>
        )}

        {currentRide.status === RideStatus.ARRIVED && (
          <View style={[styles.messageCard, { backgroundColor: `${success}15` }]}>
            <IconSymbol name="checkmark.circle" size={20} color={success} />
            <ThemedText type="caption" style={{ color: success }}>
              Your driver has arrived at the pickup location
            </ThemedText>
          </View>
        )}

        {currentRide.status === RideStatus.IN_PROGRESS && (
          <View style={[styles.messageCard, { backgroundColor: `${primary}15` }]}>
            <IconSymbol name="arrow.right.circle" size={20} color={primary} />
            <ThemedText type="caption" style={{ color: primary }}>
              Trip in progress. Enjoy your ride!
            </ThemedText>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Cancel Button */}
      {canCancel && (
        <View style={[styles.footer, { backgroundColor: surface }]}>
          <Pressable
            onPress={handleCancelRide}
            disabled={cancelling}
            style={[
              styles.cancelButton,
              {
                backgroundColor: danger,
                opacity: cancelling ? 0.6 : 1,
              },
            ]}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <IconSymbol name="xmark.circle" size={20} color="white" />
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.cancelButtonText}
                >
                  Cancel Ride
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  backLink: {
    padding: 8,
  },
  progressCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  detailsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  locationCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  messageCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 4,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  locationLine: {
    width: 2,
    height: 20,
    marginLeft: 5,
    marginVertical: 4,
  },
  locationText: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "white",
  },
});
