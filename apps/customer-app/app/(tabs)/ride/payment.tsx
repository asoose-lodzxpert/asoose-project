import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRide } from "@/context/RideContext";
import { RideService } from "@/services/ride.service";
import { initiatePayment } from "@/services/payment.service";
import { PaymentWebView } from "@/components/checkout/PaymentWebView";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { InAppTx } from "@/types/payment";

export default function RidePaymentScreen() {
  const router = useRouter();
  const { currentRide, confirmPayment } = useRide();
  const { user } = useUserProfile();

  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");

  const [processing, setProcessing] = useState(false);
  const [checkoutTx, setCheckoutTx] = useState<InAppTx | null>(null);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);

  if (!currentRide) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: surface }]}>
        <View style={styles.emptyState}>
          <ThemedText>No active ride found</ThemedText>
          <Pressable onPress={() => router.replace("/ride")}>
            <ThemedText type="link">Go back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const handleConfirmPayment = async () => {
    if (!user) {
      Toast.show({ type: "error", text1: "Profile not loaded" });
      return;
    }

    setProcessing(true);
    try {
      const callbackUrl = "asoose-app://payment-callback";
      const paymentPayload = {
        amount: Number(currentRide.totalFare) * 100, // Paystack expects Kobo
        type: "RIDE",
        rideId: currentRide.id,
        callbackUrl,
      };

      const response = await initiatePayment("paystack", paymentPayload, user);

      const checkoutUrl = response.authorizationUrl || response.checkoutUrl;
      const transactionId = response.reference || response.transactionId;

      if (checkoutUrl) {
        setCheckoutTx({
          transactionId,
          checkoutUrl,
          amount: Number(currentRide.totalFare),
          method: "paystack",
          status: "pending",
        });
        setShowPaymentWebView(true);
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

  const handlePaymentSuccess = () => {
    setShowPaymentWebView(false);
    Toast.show({ type: "success", text1: "Payment successful!" });
    confirmPayment(currentRide.id, "CARD");
    router.replace("/ride/tracking");
  };

  const handlePaymentCancel = () => {
    setShowPaymentWebView(false);
    Toast.show({ type: "info", text1: "Payment cancelled" });
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={primary} />
        </Pressable>
        <ThemedText type="subtitle">Final Confirmation</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.mainCard,
            { backgroundColor: card, borderColor: border },
          ]}
        >
          <ThemedText type="caption" style={styles.label}>
            TOTAL FARE
          </ThemedText>
          <ThemedText type="title" style={[styles.price, { color: primary }]}>
            {RideService.formatCurrency(currentRide.totalFare || 0)}
          </ThemedText>

          <View style={styles.divider} />

          <View style={styles.routeBox}>
            <View style={styles.routeItem}>
              <View style={[styles.dot, { backgroundColor: success }]} />
              <ThemedText numberOfLines={1} style={styles.address}>
                {currentRide.pickupAddress?.street || "Pickup"}
              </ThemedText>
            </View>
            <View style={[styles.line, { backgroundColor: border }]} />
            <View style={styles.routeItem}>
              <View style={[styles.dot, { backgroundColor: danger }]} />
              <ThemedText numberOfLines={1} style={styles.address}>
                {currentRide.dropoffAddress?.street || "Dropoff"}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.paymentInfo}>
          <IconSymbol name="lock.fill" size={14} color={success} />
          <ThemedText type="caption">Secure payment via Paystack</ThemedText>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: surface }]}>
        <Pressable
          onPress={handleConfirmPayment}
          disabled={processing}
          style={[
            styles.payButton,
            { backgroundColor: primary, opacity: processing ? 0.7 : 1 },
          ]}
        >
          {processing ? (
            <ActivityIndicator color={textOnPrimary} />
          ) : (
            <ThemedText type="defaultSemiBold" style={{ color: textOnPrimary }}>
              Pay {RideService.formatCurrency(currentRide.totalFare || 0)}
            </ThemedText>
          )}
        </Pressable>
      </View>

      {checkoutTx && (
        <PaymentWebView
          visible={showPaymentWebView}
          url={checkoutTx.checkoutUrl}
          reference={checkoutTx.transactionId}
          paymentMethod="paystack"
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
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
    padding: 16,
    paddingTop: 20,
    gap: 12,
  },
  backButton: { padding: 4 },
  content: { padding: 20 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  mainCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  label: { letterSpacing: 1, opacity: 0.6 },
  price: { fontSize: 36, fontWeight: "800", marginVertical: 8 },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.05)",
    marginVertical: 20,
  },
  routeBox: { width: "100%", gap: 4 },
  routeItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 1, height: 20, marginLeft: 3.5 },
  address: { flex: 1, fontSize: 14 },
  paymentInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  payButton: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
