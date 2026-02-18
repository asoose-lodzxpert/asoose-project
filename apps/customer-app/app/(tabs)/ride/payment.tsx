import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message"; // Correct Import

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRide } from "@/context/RideContext";
import { RideService } from "@/services/ride.service";
import {
  initiatePayment,
  checkBankTransferStatus,
} from "@/services/payment.service";
import { PaymentWebView } from "@/components/checkout/PaymentWebView";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { PaymentMethod, BankAccount, InAppTx } from "@/types/payment";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";

export default function RidePaymentScreen() {
  const router = useRouter();
  const { currentRide, loading, confirmPayment } = useRide();
  const { user } = useUserProfile();
  const showConfirm = useConfirm();

  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");
  const muted = useThemeColor({}, "textMuted");

  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethod>("paystack");
  const [processing, setProcessing] = useState(false);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [checkoutTx, setCheckoutTx] = useState<InAppTx | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<string>("");
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);

  if (!currentRide) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: surface }]}>
        <View style={styles.emptyState}>
          <ThemedText>No ride found</ThemedText>
          <Pressable
            onPress={() => router.replace("/ride")}
            style={styles.backLink}
          >
            <ThemedText type="link">Go back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const handleConfirmPayment = async () => {
    if (!user || !currentRide) {
      Toast.show({
        type: "error",
        text1: "Payment Error",
        text2: "User or ride information missing",
      });
      return;
    }

    setProcessing(true);
    try {
      if (selectedMethod === "transfer" || selectedMethod === "monnify") {
        const paymentPayload = {
          amount: currentRide.totalFare,
          type: "RIDE",
          rideId: currentRide.id,
        };

        const response = await initiatePayment(
          selectedMethod,
          paymentPayload,
          user,
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
      } else if (
        selectedMethod === "paystack" ||
        selectedMethod === "flutterwave"
      ) {
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
          user,
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
          setShowPaymentWebView(true);
        }
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Payment failed",
        text2: err.message || "Failed to initiate payment",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentWebView(false);
    Toast.show({ type: "success", text1: "Payment confirmed!" });
    confirmPayment(currentRide.id, "CARD");
    router.replace("/ride/tracking");
  };

  const handlePaymentCancel = () => {
    setShowPaymentWebView(false);
    Toast.show({ type: "info", text1: "Payment cancelled" });
  };

  const checkBankNow = async () => {
    if (!bankAccount) return;
    setProcessing(true);
    setPollingStatus("Verifying payment...");

    try {
      const status = await checkBankTransferStatus(
        bankAccount.reference,
        selectedMethod,
      );
      if (status.paid) {
        Toast.show({ type: "success", text1: "Payment confirmed!" });
        setShowBankModal(false);
        router.replace("/ride/tracking");
      } else {
        Toast.show({
          type: "info",
          text1: "Pending",
          text2:
            "We haven't received your payment yet. Please transfer and try again.",
        });
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.message || "Failed to check payment status",
      });
    } finally {
      setProcessing(false);
      setPollingStatus("");
    }
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setStringAsync(text);
    Toast.show({ type: "success", text1: "Account number copied" });
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={primary} />
        </Pressable>
        <ThemedText type="subtitle">Confirm Payment</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Trip Summary Card */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: card, borderColor: border },
          ]}
        >
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
        </View>

        {/* Fare Breakdown Card */}
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

        {/* Payment Methods */}
        <View
          style={[
            styles.paymentCard,
            { backgroundColor: card, borderColor: border },
          ]}
        >
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Payment Method
          </ThemedText>
          {["paystack", "flutterwave", "transfer"].map((method) => (
            <Pressable
              key={method}
              onPress={() => setSelectedMethod(method as PaymentMethod)}
              style={[
                styles.methodOption,
                {
                  borderColor: selectedMethod === method ? primary : border,
                  backgroundColor:
                    selectedMethod === method ? `${primary}10` : card,
                },
              ]}
            >
              <View style={styles.methodLeft}>
                <IconSymbol name="creditcard" size={24} color={primary} />
                <ThemedText
                  type="defaultSemiBold"
                  style={{ textTransform: "capitalize" }}
                >
                  {method}
                </ThemedText>
              </View>
              {selectedMethod === method && (
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={24}
                  color={primary}
                />
              )}
            </Pressable>
          ))}
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: surface }]}>
        {pollingStatus ? (
          <View style={styles.pollingContainer}>
            <ActivityIndicator size="small" color={primary} />
            <ThemedText
              type="caption"
              style={{ color: textSecondary, marginTop: 8 }}
            >
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
                  {selectedMethod === "transfer"
                    ? "Generate Account"
                    : "Proceed to Payment"}
                </ThemedText>
                <IconSymbol
                  name="arrow.right"
                  size={20}
                  color={textOnPrimary}
                />
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* Modals */}
      {checkoutTx && showPaymentWebView && (
        <PaymentWebView
          visible={showPaymentWebView}
          url={checkoutTx.checkoutUrl}
          reference={checkoutTx.transactionId}
          paymentMethod={selectedMethod}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}

      <Modal
        visible={showBankModal}
        animationType="slide"
        onRequestClose={() => setShowBankModal(false)}
      >
        <ThemedView
          style={[styles.modalContainer, { backgroundColor: surface }]}
        >
          <View style={styles.modalHeader}>
            <ThemedText type="title">Bank Transfer</ThemedText>
            <Pressable onPress={() => setShowBankModal(false)}>
              <IconSymbol name="xmark" size={24} color={muted} />
            </Pressable>
          </View>
          {bankAccount && (
            <ScrollView style={styles.modalContent}>
              <View
                style={[
                  styles.bankCard,
                  { backgroundColor: card, borderColor: border },
                ]}
              >
                <ThemedText type="subtitle">Transfer to:</ThemedText>
                <View style={styles.bankInfoRow}>
                  <ThemedText type="caption">
                    Bank: {bankAccount.bankName}
                  </ThemedText>
                  <View style={styles.copyRow}>
                    <ThemedText type="defaultSemiBold">
                      {bankAccount.accountNumber}
                    </ThemedText>
                    <Pressable
                      onPress={() => copyToClipboard(bankAccount.accountNumber)}
                    >
                      <IconSymbol name="doc.on.doc" size={18} color={primary} />
                    </Pressable>
                  </View>
                  <ThemedText type="caption">
                    Name: {bankAccount.accountName}
                  </ThemedText>
                </View>
                <View style={[styles.divider, { backgroundColor: border }]} />
                <ThemedText type="title" style={{ color: primary }}>
                  {RideService.formatCurrency(bankAccount.amount)}
                </ThemedText>
                <Pressable
                  onPress={checkBankNow}
                  style={[styles.checkButton, { backgroundColor: primary }]}
                >
                  <ThemedText style={{ color: textOnPrimary }}>
                    Check Status
                  </ThemedText>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </ThemedView>
      </Modal>
      <Toast />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },
  backButton: { padding: 4 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  backLink: { padding: 8 },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  fareCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  paymentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: { marginBottom: 16 },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 4,
  },
  locationDot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  locationLine: { width: 2, height: 20, marginLeft: 5, marginVertical: 4 },
  locationText: { flex: 1 },
  divider: { height: 1, marginVertical: 12 },
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
  totalAmount: { fontSize: 24 },
  methodOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  methodLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
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
  confirmButtonText: { fontSize: 16 },
  pollingContainer: { alignItems: "center", padding: 16 },
  modalContainer: { flex: 1, paddingTop: 60 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalContent: { flex: 1, padding: 16 },
  bankCard: { padding: 20, borderRadius: 16, borderWidth: 1 },
  bankInfoRow: { marginBottom: 16 },
  copyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  checkButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
});
