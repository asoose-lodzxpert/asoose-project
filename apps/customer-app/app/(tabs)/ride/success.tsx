import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRide } from "@/context/RideContext";
import { RideService } from "@/services/ride.service";
import { useToast } from "@/components/ui/ThemedToast";

export default function RideSuccessScreen() {
  const router = useRouter();
  const showToast = useToast();
  const { currentRide, resetBooking } = useRide();

  const primary = useThemeColor({}, "brandPrimary");
  const success = useThemeColor({}, "statusSuccess");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");

  const [rating, setRating] = useState(0);

  const handleGoHome = () => {
    resetBooking();
    router.replace("/ride");
  };

  const handleViewHistory = () => {
    router.push("/ride-history" as any);
  };

  const handleSubmitRating = () => {
    if (rating === 0) {
      showToast({
        message: "Please select a rating before submitting",
        variant: "error",
      });
      return;
    }

    // TODO: Submit rating to backend
    showToast({
      message: "Your rating has been submitted. Thank you!",
      variant: "success",
    });
    setTimeout(handleGoHome, 1500);
  };

  if (!currentRide) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: surface }]}>
        <View style={styles.emptyState}>
          <ThemedText>No ride data found</ThemedText>
          <Pressable onPress={handleGoHome} style={styles.backLink}>
            <ThemedText type="link">Go Home</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Success Icon */}
        <View style={styles.successIconContainer}>
          <View
            style={[styles.successIcon, { backgroundColor: `${success}20` }]}
          >
            <IconSymbol
              name="checkmark.circle.fill"
              size={64}
              color={success}
            />
          </View>
          <ThemedText type="title" style={styles.successTitle}>
            Trip Completed!
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.successSubtitle, { color: textSecondary }]}
          >
            We hope you enjoyed your ride
          </ThemedText>
        </View>

        {/* Trip Summary */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: card, borderColor: border },
          ]}
        >
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Trip Summary
          </ThemedText>

          <View style={styles.infoRow}>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Ride ID
            </ThemedText>
            <ThemedText type="caption" style={{ fontFamily: "monospace" }}>
              #{currentRide.id.slice(-8).toUpperCase()}
            </ThemedText>
          </View>

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
              Duration
            </ThemedText>
            <ThemedText type="default">
              {RideService.formatDuration(currentRide.durationMin || 0)}
            </ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Date
            </ThemedText>
            <ThemedText type="default">
              {new Date(
                currentRide.completedAt || currentRide.createdAt,
              ).toLocaleString()}
            </ThemedText>
          </View>
        </View>

        {/* Fare Breakdown */}
        <View
          style={[
            styles.fareCard,
            { backgroundColor: card, borderColor: border },
          ]}
        >
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Fare Breakdown
          </ThemedText>

          <View style={styles.fareRow}>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Base Fare
            </ThemedText>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              {RideService.formatCurrency(currentRide.baseFare || 0)}
            </ThemedText>
          </View>

          <View style={styles.fareRow}>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Distance Fare
            </ThemedText>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              {RideService.formatCurrency(currentRide.distanceFare || 0)}
            </ThemedText>
          </View>

          <View style={styles.fareRow}>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Time Fare
            </ThemedText>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              {RideService.formatCurrency(currentRide.timeFare || 0)}
            </ThemedText>
          </View>

          {(currentRide.platformFee || 0) > 0 && (
            <View style={styles.fareRow}>
              <ThemedText type="caption" style={{ color: textSecondary }}>
                Platform Fee
              </ThemedText>
              <ThemedText type="caption" style={{ color: textSecondary }}>
                {RideService.formatCurrency(currentRide.platformFee || 0)}
              </ThemedText>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: border }]} />

          <View style={styles.totalRow}>
            <ThemedText type="defaultSemiBold">Total Paid</ThemedText>
            <ThemedText
              type="title"
              style={[styles.totalAmount, { color: success }]}
            >
              {RideService.formatCurrency(currentRide.totalFare || 0)}
            </ThemedText>
          </View>

          <View style={styles.paymentMethod}>
            <IconSymbol
              name={
                currentRide.payment?.method === "CASH"
                  ? "banknote"
                  : "creditcard"
              }
              size={16}
              color={textSecondary}
            />
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Paid with {currentRide.payment?.method || "Cash"}
            </ThemedText>
          </View>
        </View>

        {/* Driver Rating */}
        {currentRide.rider && (
          <View
            style={[
              styles.ratingCard,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Rate Your Driver
            </ThemedText>

            <View style={styles.driverInfo}>
              <View style={[styles.driverAvatar, { backgroundColor: primary }]}>
                <ThemedText style={styles.driverInitial}>
                  {currentRide.rider.name.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <ThemedText type="default">{currentRide.rider.name}</ThemedText>
            </View>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <IconSymbol
                    name={star <= rating ? "star.fill" : "star"}
                    size={40}
                    color={star <= rating ? "#FFA000" : textSecondary}
                  />
                </Pressable>
              ))}
            </View>

            {rating > 0 && (
              <Pressable
                onPress={handleSubmitRating}
                style={[styles.ratingButton, { backgroundColor: primary }]}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.ratingButtonText}
                >
                  Submit Rating
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.footer, { backgroundColor: surface }]}>
        <Pressable
          onPress={handleViewHistory}
          style={[styles.outlineButton, { borderColor: border }]}
        >
          <IconSymbol name="clock" size={20} color={primary} />
          <ThemedText type="defaultSemiBold" style={{ color: primary }}>
            View History
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handleGoHome}
          style={[styles.primaryButton, { backgroundColor: primary }]}
        >
          <IconSymbol name="plus" size={20} color="white" />
          <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
            Book Another Ride
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 60,
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
  successIconContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  fareCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  ratingCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 24,
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  driverInfo: {
    alignItems: "center",
    marginBottom: 24,
  },
  driverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  driverInitial: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  ratingButtonText: {
    color: "white",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  outlineButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
  },
});
