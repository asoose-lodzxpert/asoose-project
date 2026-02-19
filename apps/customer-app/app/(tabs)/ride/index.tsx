import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRide } from "@/context/RideContext";

import { RideLocationCard } from "@/components/ride/RideLocationCard";
import { VehicleTypeSelector } from "@/components/ride/VehicleTypeSelector";
import { FareEstimateCard } from "@/components/ride/FareEstimateCard";
import { VehicleType } from "@/types/ride";
import Toast from "react-native-toast-message";

export default function RideBookingScreen() {
  const router = useRouter();
  const {
    currentRide,
    pageView,
    pickupLocation,
    dropoffLocation,
    selectedVehicleType,
    fareEstimate,
    loading,
    error,
    setSelectedVehicleType,
    estimateFare,
    createRide,
    resetBooking,
  } = useRide();

  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const danger = useThemeColor({}, "statusError");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const textSecondary = useThemeColor({}, "textSecondary");

  const [estimating, setEstimating] = useState(false);

  const handleEstimate = useCallback(async () => {
    setEstimating(true);
    await estimateFare();
    setEstimating(false);
  }, [estimateFare]);

  // Check for active ride and redirect
  useEffect(() => {
    if (__DEV__)
      console.log("Current Ride:", JSON.stringify(currentRide, null, 2));

    if (__DEV__) console.log("Page View:", pageView);

    if (currentRide && pageView !== "IDLE") {
      // If ride is cancelled, do not redirect to payment/tracking
      if (currentRide.status === "CANCELLED") {
        Toast.show({
          type: "error",
          text1: "Ride cancelled",
          text2: currentRide.cancellationReason || "No driver available",
        });
        // Reset ride state so user can book again
        if (__DEV__) {
          console.log("Resetting ride state due to cancellation");
        }
        resetBooking();
        return;
      }

      // If payment is already completed but we're still on the PAYMENT pageView
      // (e.g. app was killed right after payment before ride confirmation came
      // back), skip payment and go straight to tracking.
      const ridePayment = Array.isArray(currentRide.payment)
        ? currentRide.payment[0]
        : currentRide.payment;
      const paymentCompleted = ridePayment?.status === "COMPLETED";
      if (paymentCompleted && pageView === "PAYMENT") {
        router.replace("/ride/tracking");
        return;
      }

      // Only auto-redirect for non-PAYMENT states (tracking resume on app open).
      // PAYMENT navigation is owned by handleBookRide to avoid double-navigation.
      if (pageView !== "PAYMENT") {
        router.replace("/ride/tracking");
      }
    }
  }, [currentRide, pageView, router, resetBooking]);

  // Auto-estimate when locations and vehicle are selected
  useEffect(() => {
    if (
      pickupLocation &&
      dropoffLocation &&
      selectedVehicleType &&
      !fareEstimate
    ) {
      handleEstimate();
    }
  }, [
    pickupLocation,
    dropoffLocation,
    selectedVehicleType,
    handleEstimate,
    fareEstimate,
  ]);

  const handleBookRide = async () => {
    if (!pickupLocation || !dropoffLocation) {
      Toast.show({
        text1: "Please select both pickup and dropoff locations",
        type: "error",
      });
      return;
    }

    if (!fareEstimate) {
      Toast.show({ type: "error", text1: "Please wait for fare estimate" });
      return;
    }

    const rideId = await createRide();

    if (rideId) {
      router.push("/ride/payment");
    }
  };

  const canBook =
    pickupLocation &&
    dropoffLocation &&
    fareEstimate &&
    !loading &&
    !estimating;

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <ThemedText type="title">Book a Ride</ThemedText>
          <Pressable
            onPress={resetBooking}
            style={styles.resetBtn}
            accessibilityLabel="Reset booking"
          >
            <IconSymbol
              name="arrow.counterclockwise"
              size={20}
              color={primary}
            />
          </Pressable>
        </View>
        <ThemedText
          type="caption"
          style={[styles.headerCaption, { color: textSecondary }]}
        >
          Enter your journey details
        </ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Message */}
        {error && (
          <View style={[styles.errorCard, { backgroundColor: `${danger}15` }]}>
            <IconSymbol
              name="exclamationmark.triangle"
              size={20}
              color={danger}
            />
            <ThemedText
              type="caption"
              style={[styles.errorText, { color: danger }]}
            >
              {error}
            </ThemedText>
          </View>
        )}

        {/* Location Selection */}
        <RideLocationCard
          type="pickup"
          title="Pickup Location"
          location={pickupLocation}
          onPress={() =>
            router.push("/ride/location-picker?type=pickup" as any)
          }
        />

        <RideLocationCard
          type="dropoff"
          title="Dropoff Location"
          location={dropoffLocation}
          onPress={() =>
            router.push("/ride/location-picker?type=dropoff" as any)
          }
        />

        {/* Vehicle Type Selection */}
        <VehicleTypeSelector
          selected={selectedVehicleType}
          onSelect={(type: VehicleType) => setSelectedVehicleType(type)}
        />

        {/* Fare Estimate */}
        {estimating && (
          <View style={[styles.estimatingCard, { backgroundColor: card }]}>
            <ActivityIndicator size="small" color={primary} />
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Calculating fare...
            </ThemedText>
          </View>
        )}

        {fareEstimate && !estimating && (
          <FareEstimateCard
            fareBreakdown={fareEstimate.fareBreakdown}
            distanceKm={fareEstimate.distanceKm}
            durationMin={fareEstimate.durationMin}
          />
        )}

        {/* Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Book Button */}
      <View style={[styles.footer, { backgroundColor: surface }]}>
        <Pressable
          onPress={handleBookRide}
          disabled={!canBook}
          style={[
            styles.bookButton,
            {
              backgroundColor: canBook ? primary : textSecondary,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={textOnPrimary} />
          ) : (
            <>
              <ThemedText
                type="defaultSemiBold"
                style={[styles.bookButtonText, { color: textOnPrimary }]}
              >
                Book Ride
              </ThemedText>
              <IconSymbol name="arrow.right" size={20} color={textOnPrimary} />
            </>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  headerCaption: {
    marginTop: 2,
  },
  resetBtn: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
  },
  estimatingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
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
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  bookButtonText: {
    fontSize: 16,
  },
});
