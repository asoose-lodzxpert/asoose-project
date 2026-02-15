import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
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

export default function RideBookingScreen() {
  const router = useRouter();
  const Toast = require('react-native-toast-message');
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
  } = useRide();

  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const danger = useThemeColor({}, "statusError");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const textSecondary = useThemeColor({}, "textSecondary");

  const [estimating, setEstimating] = useState(false);

  // Check for active ride and redirect
  useEffect(() => {
    if (currentRide && pageView !== "IDLE") {
      // User has an active ride, redirect to appropriate screen
      if (pageView === "PAYMENT") {
        router.replace("/ride/payment");
      } else {
        router.replace("/ride/tracking");
      }
    }
  }, [currentRide, pageView, router]);

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
  }, [pickupLocation, dropoffLocation, selectedVehicleType]);

  const handleEstimate = async () => {
    setEstimating(true);
    await estimateFare();
    setEstimating(false);
  };

  const handleBookRide = async () => {
    if (!pickupLocation || !dropoffLocation) {
      showToast({
          Toast.show({
        message: "Please select both pickup and dropoff locations",
        variant: "error",
      });
      return;
    }

    if (!fareEstimate) {
      showToast({ message: "Please wait for fare estimate", variant: "error" });
        Toast.show({ type: 'error', text1: "Please wait for fare estimate" });
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
        <ThemedText type="title">Book a Ride</ThemedText>
        <ThemedText type="caption" style={{ color: textSecondary }}>
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
