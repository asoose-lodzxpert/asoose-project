import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRide } from "@/context/RideContext";

import { RideLocationCard } from "@/components/ride/RideLocationCard";
import { VehicleTypeSelector } from "@/components/ride/VehicleTypeSelector";
import { FareEstimateCard } from "@/components/ride/FareEstimateCard";
import Toast from "react-native-toast-message";

export default function RideBookingScreen() {
  const router = useRouter();
  const {
    currentRide,
    pageView,
    pickupLocation,
    dropoffLocation,
    fareEstimate,
    loading,
    error,
    estimateFare,
    createRide,
    createScheduledRide,
    scheduledAt,
    setScheduledAt,
    resetBooking,
  } = useRide();

  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const danger = useThemeColor({}, "statusError");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
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
      // If ride is cancelled by user or driver (or legacy CANCELLED), reset so user can book again
      const cancelledStatuses = [
        "CANCELLED",
        "CANCELLED_BY_USER",
        "CANCELLED_BY_DRIVER",
      ];
      if (cancelledStatuses.includes(currentRide.status)) {
        Toast.show({
          type: "error",
          text1: "Ride cancelled",
          text2: currentRide.cancellationReason || "No driver available",
        });
        if (__DEV__) {
          console.log("Resetting ride state due to cancellation");
        }
        resetBooking();
        return;
      }

      // All active ride states (FINDING_DRIVER, AWAITING_PAYMENT, DRIVER_ASSIGNED, IN_PROGRESS)
      // are handled within the tracking screen.
      router.replace("/ride/tracking");
    }
  }, [currentRide, pageView, router, resetBooking]);

  // Build a stable key from the selected coordinates; changes whenever either
  // location is updated so we can detect and re-estimate.
  const locKey = useMemo(() => {
    if (!pickupLocation || !dropoffLocation) return null;
    return [
      pickupLocation.latitude.toFixed(6),
      pickupLocation.longitude.toFixed(6),
      dropoffLocation.latitude.toFixed(6),
      dropoffLocation.longitude.toFixed(6),
    ].join("|");
  }, [pickupLocation, dropoffLocation]);

  // Keep a ref so the effect only fires when the key actually changes, not on
  // every render. This prevents double-estimating on the initial load.
  const prevLocKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!locKey || locKey === prevLocKeyRef.current) return;
    prevLocKeyRef.current = locKey;
    handleEstimate();
  }, [locKey, handleEstimate]);

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

    if (scheduledAt) {
        const success = await createScheduledRide();
        if (success) {
            router.replace("/(tabs)/home");
        }
        return;
    }

    const rideId = await createRide();

    if (rideId) {
      router.push("/ride/payment");
    }
  };

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"date" | "time">("date");

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }

    const currentDate = selectedDate || scheduledAt || new Date(Date.now() + 60 * 60 * 1000);
    
    if (datePickerMode === "date") {
      setDatePickerMode("time");
      setScheduledAt(currentDate);
    } else {
      setShowDatePicker(false);
      setScheduledAt(currentDate);
      setDatePickerMode("date");
    }
  };

  const handleOpenPicker = () => {
    setDatePickerMode("date");
    setShowDatePicker(true);
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

        {/* Ride Info */}
        <VehicleTypeSelector
          fare={fareEstimate?.fareBreakdown.totalFare}
          isFareLoading={estimating}
          distanceKm={fareEstimate?.distanceKm}
          durationMin={fareEstimate?.durationMin}
        />

        {/* Selected Schedule Time */}
        {scheduledAt && (
          <View style={[styles.scheduledCard, { backgroundColor: `${primary}10`, borderColor: primary }]}>
            <View style={styles.scheduledInfo}>
              <IconSymbol name="clock" size={20} color={primary} />
              <View>
                <ThemedText style={styles.scheduledLabel}>Scheduled for</ThemedText>
                <ThemedText style={styles.scheduledTime}>
                  {scheduledAt.toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </ThemedText>
              </View>
            </View>
            <Pressable onPress={() => setScheduledAt(null)} style={styles.clearScheduled}>
                <IconSymbol name="x" size={16} color={primary} />
            </Pressable>
          </View>
        )}

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
        <View style={styles.footerRow}>
          <Pressable
            onPress={handleOpenPicker}
            disabled={!pickupLocation || !dropoffLocation}
            style={[
              styles.scheduleButton,
              {
                backgroundColor: card,
                borderColor: border,
              },
            ]}
          >
             <IconSymbol name="clock" size={24} color={scheduledAt ? primary : textSecondary} />
          </Pressable>

          <Pressable
            onPress={handleBookRide}
            disabled={!canBook}
            style={[
              styles.bookButton,
              {
                backgroundColor: canBook ? primary : textSecondary,
                flex: 1,
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
                  {scheduledAt ? "Schedule Ride" : "Book Ride"}
                </ThemedText>
                <IconSymbol name="arrow.right" size={20} color={textOnPrimary} />
              </>
            )}
          </Pressable>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={scheduledAt || new Date(Date.now() + 60 * 60 * 1000)}
            mode={datePickerMode}
            is24Hour={false}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDateChange}
            minimumDate={new Date(Date.now() + 30 * 60 * 1000)} // At least 30 mins in future
          />
        )}
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
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scheduleButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
  scheduledCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
  },
  scheduledInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  scheduledLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "800",
    opacity: 0.6,
  },
  scheduledTime: {
    fontSize: 14,
    fontWeight: "700",
  },
  clearScheduled: {
    padding: 4,
  },
});
