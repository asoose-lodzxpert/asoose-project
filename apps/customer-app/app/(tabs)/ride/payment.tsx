import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Clipboard from "expo-clipboard";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRide } from "@/context/RideContext";
import { RideService } from "@/services/ride.service";
import { initiatePayment, checkBankTransferStatus, checkInAppPaymentStatus } from "@/services/payment.service";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { PaymentMethod, BankAccount, InAppTx } from "@/types/payment";

export default function RidePaymentScreen() {
  const router = useRouter();
  const {
    currentRide,
    loading,
    confirmPayment,
  } = useRide();
  const { user } = useUserProfile();

  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");
  const muted = useThemeColor({}, "textMuted");

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("paystack");
  const [processing, setProcessing] = useState(false);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [checkoutTx, setCheckoutTx] = useState<InAppTx | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<string>("");

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
    if (!user || !currentRide) {
      Alert.alert("Error", "User or ride information missing");
      return;
    }

    setProcessing(true);

    try {
      // For bank transfer (Monnify)
      if (selectedMethod === "transfer" || selectedMethod === "monnify") {
        const paymentPayload = {
          amount: currentRide.totalFare,
          type: "RIDE",
          rideId: currentRide.id,
        };

        const response = await initiatePayment(
          selectedMethod,
          paymentPayload,
          user
        );

        if (response.accountNumber) {
          setBankAccount({
            accountNumber: response.accountNumber,
            bankName: response.bankName || "Monnify",
            accountName: response.accountName || user.name,
            reference: response.reference || response.transactionReference,
            amount: currentRide.totalFare || 0,
            expiresAt: response.expiresAt || Date.now() + 30 * 60 * 1000,
            status: "pending",
          });
          setShowBankModal(true);
        }
      }
      // For card payments (Paystack/Flutterwave)
      else if (selectedMethod === "paystack" || selectedMethod === "flutterwave") {
        const callbackUrl = "asoose-app://payment-callback";
        const paymentPayload = {
          amount: currentRide.totalFare,
          type: "RIDE",
          rideId: currentRide.id,
          callbackUrl,
        };

        const response = await initiatePayment(
          selectedMethod,
          paymentPayload,
          user
        );

        const checkoutUrl = response.authorizationUrl || response.checkoutUrl;
        const transactionId = response.reference || response.transactionId;

        if (checkoutUrl) {
          setCheckoutTx({
            transactionId,
            checkoutUrl,
            amount: currentRide.totalFare || 0,
            method: selectedMethod,
            status: "pending",
          });

          // Open browser for payment
          await WebBrowser.openBrowserAsync(checkoutUrl);

          // Poll for payment status
          await pollInAppPaymentStatus(transactionId);
        }
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      Alert.alert("Payment Error", err.message || "Failed to initiate payment");
    } finally {
      setProcessing(false);
    }
  };

  const pollInAppPaymentStatus = async (transactionId: string) => {
    setPollingStatus("Checking payment status...");
    let attempts = 0;
    const maxAttempts = 20;

    const poll = setInterval(async () => {
      attempts++;
      try {
        const status = await checkInAppPaymentStatus(transactionId);
        if (status.paid) {
          clearInterval(poll);
          setPollingStatus("");
          Alert.alert("Success", "Payment confirmed!", [
            {
              text: "OK",
              onPress: () => router.replace("/ride/tracking"),
            },
          ]);
        } else if (attempts >= maxAttempts) {
          clearInterval(poll);
          setPollingStatus("");
          Alert.alert(
            "Payment Pending",
            "Payment verification is taking longer than expected. Please check your ride status."
          );
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          setPollingStatus("");
        }
      }
    }, 3000);
  };

  const checkBankNow = async () => {
    if (!bankAccount) return;

    setProcessing(true);
    setPollingStatus("Verifying payment...");

    try {
      const status = await checkBankTransferStatus(bankAccount.reference);
      if (status.paid) {
        Alert.alert("Success", "Payment confirmed!", [
          {
            text: "OK",
            onPress: () => {
              setShowBankModal(false);
              router.replace("/ride/tracking");
            },
          },
        ]);
      } else {
        Alert.alert(
          "Payment Pending",
          "We haven't received your payment yet. Please make the transfer and try again."
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to check payment status");
    } finally {
      setProcessing(false);
      setPollingStatus("");
    }
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Account number copied to clipboard");
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

          {/* Card - Unavailable */}
          <View
            style={[
              styles.methodOption,
              {
                borderColor: border,
                backgroundColor: card,
                opacity: 0.5,
              },
            ]}
          >
            <View style={styles.methodLeft}>
              <IconSymbol name="creditcard" size={24} color={muted} />
              <View>
                <ThemedText type="defaultSemiBold" style={{ color: muted }}>
                  Card
                </ThemedText>
                <ThemedText type="caption" style={{ color: muted }}>
                  Unavailable now
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Paystack */}
          <Pressable
            onPress={() => setSelectedMethod("paystack")}
            style={[
              styles.methodOption,
              {
                borderColor: selectedMethod === "paystack" ? primary : border,
                backgroundColor: selectedMethod === "paystack" ? `${primary}10` : card,
              },
            ]}
          >
            <View style={styles.methodLeft}>
              <IconSymbol name="creditcard" size={24} color={primary} />
              <View>
                <ThemedText type="defaultSemiBold">Paystack</ThemedText>
                <ThemedText type="caption" style={{ color: textSecondary }}>
                  Pay with card via Paystack
                </ThemedText>
              </View>
            </View>
            {selectedMethod === "paystack" && (
              <IconSymbol name="checkmark.circle.fill" size={24} color={primary} />
            )}
          </Pressable>

          {/* Flutterwave */}
          <Pressable
            onPress={() => setSelectedMethod("flutterwave")}
            style={[
              styles.methodOption,
              {
                borderColor: selectedMethod === "flutterwave" ? primary : border,
                backgroundColor: selectedMethod === "flutterwave" ? `${primary}10` : card,
              },
            ]}
          >
            <View style={styles.methodLeft}>
              <IconSymbol name="creditcard" size={24} color={primary} />
              <View>
                <ThemedText type="defaultSemiBold">Flutterwave</ThemedText>
                <ThemedText type="caption" style={{ color: textSecondary }}>
                  Pay with card via Flutterwave
                </ThemedText>
              </View>
            </View>
            {selectedMethod === "flutterwave" && (
              <IconSymbol name="checkmark.circle.fill" size={24} color={primary} />
            )}
          </Pressable>

          {/* Bank Transfer */}
          <Pressable
            onPress={() => setSelectedMethod("transfer")}
            style={[
              styles.methodOption,
              {
                borderColor: selectedMethod === "transfer" ? primary : border,
                backgroundColor: selectedMethod === "transfer" ? `${primary}10` : card,
              },
            ]}
          >
            <View style={styles.methodLeft}>
              <IconSymbol name="creditcard" size={24} color={primary} />
              <View>
                <ThemedText type="defaultSemiBold">Bank Transfer</ThemedText>
                <ThemedText type="caption" style={{ color: textSecondary }}>
                  Pay via bank transfer
                </ThemedText>
              </View>
            </View>
            {selectedMethod === "transfer" && (
              <IconSymbol name="checkmark.circle.fill" size={24} color={primary} />
            )}
          </Pressable>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { backgroundColor: surface }]}>
        {pollingStatus ? (
          <View style={styles.pollingContainer}>
            <ActivityIndicator size="small" color={primary} />
            <ThemedText type="caption" style={{ color: textSecondary, marginTop: 8 }}>
              {pollingStatus}
            </ThemedText>
          </View>
        ) : (
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
                  {selectedMethod === "transfer" || selectedMethod === "monnify"
                    ? "Generate Account Number"
                    : "Proceed to Payment"}
                </ThemedText>
                <IconSymbol name="arrow.right" size={20} color={textOnPrimary} />
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* Bank Transfer Modal */}
      <Modal
        visible={showBankModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowBankModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { backgroundColor: surface }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="title">Bank Transfer</ThemedText>
            <Pressable onPress={() => setShowBankModal(false)}>
              <IconSymbol name="xmark.circle" size={28} color={muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            {bankAccount && (
              <View style={[styles.bankCard, { backgroundColor: card, borderColor: border }]}>
                <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
                  Transfer to this account
                </ThemedText>

                <View style={styles.bankInfoRow}>
                  <ThemedText type="caption" style={{ color: textSecondary }}>
                    Bank Name
                  </ThemedText>
                  <ThemedText type="defaultSemiBold">{bankAccount.bankName}</ThemedText>
                </View>

                <View style={styles.bankInfoRow}>
                  <ThemedText type="caption" style={{ color: textSecondary }}>
                    Account Number
                  </ThemedText>
                  <View style={styles.copyRow}>
                    <ThemedText type="defaultSemiBold">
                      {bankAccount.accountNumber}
                    </ThemedText>
                    <Pressable onPress={() => copyToClipboard(bankAccount.accountNumber)}>
                      <IconSymbol name="doc.text" size={20} color={primary} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.bankInfoRow}>
                  <ThemedText type="caption" style={{ color: textSecondary }}>
                    Account Name
                  </ThemedText>
                  <ThemedText type="defaultSemiBold">{bankAccount.accountName}</ThemedText>
                </View>

                <View style={[styles.divider, { backgroundColor: border, marginVertical: 16 }]} />

                <View style={styles.bankInfoRow}>
                  <ThemedText type="caption" style={{ color: textSecondary }}>
                    Amount
                  </ThemedText>
                  <ThemedText type="title" style={{ color: primary }}>
                    {RideService.formatCurrency(bankAccount.amount)}
                  </ThemedText>
                </View>

                <View style={styles.instructionsBox}>
                  <IconSymbol name="info.circle" size={20} color={primary} />
                  <ThemedText type="caption" style={{ color: textSecondary, flex: 1 }}>
                    Transfer the exact amount to complete your payment. Click "Check Payment" after transfer.
                  </ThemedText>
                </View>

                <Pressable
                  onPress={checkBankNow}
                  disabled={processing}
                  style={[
                    styles.checkButton,
                    {
                      backgroundColor: primary,
                      opacity: processing ? 0.6 : 1,
                      marginTop: 16,
                    },
                  ]}
                >
                  {processing ? (
                    <ActivityIndicator color={textOnPrimary} />
                  ) : (
                    <ThemedText type="defaultSemiBold" style={{ color: textOnPrimary }}>
                      Check Payment Status
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            )}
          </ScrollView>
        </ThemedView>
      </Modal>
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
  pollingContainer: {
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  bankCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  bankInfoRow: {
    marginBottom: 16,
  },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  instructionsBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    backgroundColor: "rgba(0, 123, 255, 0.1)",
    borderRadius: 8,
    marginTop: 8,
  },
  checkButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
});
