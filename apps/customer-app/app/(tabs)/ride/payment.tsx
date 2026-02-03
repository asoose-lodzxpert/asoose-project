import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRide } from "@/context/RideContext";
import { RideService } from "@/services/ride.service";

type PaymentMethod = "CASH" | "CARD";

export default function RidePaymentScreen() {
  const router = useRouter();
  const {
    currentRide,
    loading,
    confirmPayment,
  } = useRide();

  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CASH");
  const [processing, setProcessing] = useState(false);

  if (!currentRide) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: surface }]}>
        <View style={styles.emptyState}>
          <ThemedText>No ride found</ThemedText>
          <Pressable onPress={() => router.replace("/ride")} style={styles.backLink}>
            <ThemedText type="link">Go back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const handleConfirmPayment = async () => {
    Alert.alert(
      "Confirm Payment",
      `Proceed with ${selectedMethod === "CASH" ? "Cash" : "Card"} payment?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setProcessing(true);
            try {
              await confirmPayment(currentRide.id, selectedMethod);
              router.replace("/ride/tracking");
            } catch (err) {
              console.error("Payment confirmation error:", err);
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={primary} />
        </Pressable>
        <ThemedText type="subtitle">Confirm Payment</ThemedText>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Trip Summary */}
        <View style={[styles.summaryCard, { backgroundColor: card, borderColor: border }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Trip Summary
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
              Duration
            </ThemedText>
            <ThemedText type="default">
              {RideService.formatDuration(currentRide.durationMin || 0)}
            </ThemedText>
          </View>
        </View>

        {/* Fare Breakdown */}
        <View style={[styles.fareCard, { backgroundColor: card, borderColor: border }]}>
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
            <ThemedText type="defaultSemiBold">Total</ThemedText>
            <ThemedText
              type="title"
              style={[styles.totalAmount, { color: primary }]}
            >
              {RideService.formatCurrency(currentRide.totalFare || 0)}
            </ThemedText>
          </View>
        </View>

        {/* Payment Method */}
        <View style={[styles.paymentCard, { backgroundColor: card, borderColor: border }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Payment Method
          </ThemedText>

          <Pressable
            onPress={() => setSelectedMethod("CASH")}
            style={[
              styles.methodOption,
              {
                borderColor: selectedMethod === "CASH" ? primary : border,
                backgroundColor: selectedMethod === "CASH" ? `${primary}10` : card,
              },
            ]}
          >
            <View style={styles.methodLeft}>
              <IconSymbol name="banknote" size={24} color={primary} />
              <View>
                <ThemedText type="defaultSemiBold">Cash</ThemedText>
                <ThemedText type="caption" style={{ color: textSecondary }}>
                  Pay with cash
                </ThemedText>
              </View>
            </View>
            {selectedMethod === "CASH" && (
              <IconSymbol name="checkmark.circle.fill" size={24} color={primary} />
            )}
          </Pressable>

          <Pressable
            onPress={() => setSelectedMethod("CARD")}
            style={[
              styles.methodOption,
              {
                borderColor: selectedMethod === "CARD" ? primary : border,
                backgroundColor: selectedMethod === "CARD" ? `${primary}10` : card,
              },
            ]}
          >
            <View style={styles.methodLeft}>
              <IconSymbol name="creditcard" size={24} color={primary} />
              <View>
                <ThemedText type="defaultSemiBold">Card</ThemedText>
                <ThemedText type="caption" style={{ color: textSecondary }}>
                  Pay with card
                </ThemedText>
              </View>
            </View>
            {selectedMethod === "CARD" && (
              <IconSymbol name="checkmark.circle.fill" size={24} color={primary} />
            )}
          </Pressable>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { backgroundColor: surface }]}>
        <Pressable
          onPress={handleConfirmPayment}
          disabled={loading || processing}
          style={[
            styles.confirmButton,
            {
              backgroundColor: primary,
              opacity: loading || processing ? 0.6 : 1,
            },
          ]}
        >
          {loading || processing ? (
            <ActivityIndicator size="small" color={textOnPrimary} />
          ) : (
            <>
              <ThemedText
                type="defaultSemiBold"
                style={[styles.confirmButtonText, { color: textOnPrimary }]}
              >
                Confirm & Find Driver
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
  paymentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
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
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  totalAmount: {
    fontSize: 24,
  },
  methodOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  methodLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmButtonText: {
    fontSize: 16,
  },
});
