import { PaymentWebView } from "@/components/checkout/PaymentWebView";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";

import { useSendPackage } from "@/context/SendPackageContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useUserProfile } from "@/hooks/useUserProfile";
import { initiatePayment } from "@/services/payment.service";
import { createDelivery, formatCurrency } from "@/services/sendPackage.api";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function PaymentScreen() {
  const { returnData, resetDelivery } = useSendPackage();
  const router = useRouter();
  const { user, loading: userLoading } = useUserProfile();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const muted = useThemeColor({}, "textMuted");
  const surfaceCard = useThemeColor({}, "surfaceCard");

  const data = returnData();

  const [processing, setProcessing] = useState(false);
  const [checkoutTx, setCheckoutTx] = useState<{
    checkoutUrl: string;
    transactionId: string;
  } | null>(null);
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);

  const price = useMemo(() => data.quote?.price ?? 0, [data]);

  async function confirmPayment() {
    if (!user) {
      Toast.show({ type: "error", text1: "User profile not loaded yet" });
      return;
    }

    // Validation
    if (!data.deliveryDetails?.name || !data.deliveryDetails?.phone) {
      Toast.show({ text1: "Recipient details are required", type: "error" });
      return;
    }

    if (!data.pickup?.address?.coords || !data.dropoff?.address?.coords) {
      Toast.show({ text1: "Valid locations are required", type: "error" });
      return;
    }

    if (price <= 0) {
      Toast.show({ text1: "Invalid delivery price", type: "error" });
      return;
    }

    setProcessing(true);

    try {
      // Normalize package options for RequestDeliveryDto compliance
      const normalizedData = {
        ...data,
        packageOptions: {
          ...data.packageOptions,
          declaredValue: Number(data.packageOptions?.declaredValue || 0),
          weightKg: Number(data.packageOptions?.weightKg || 0),
          fragile: data.packageOptions?.fragile,
          perishable: data.packageOptions?.perishable,
          containsLiquid: data.packageOptions?.containsLiquid,
        },
      };

      // 1. Create the delivery record in the backend
      const deliveryResponse = await createDelivery(normalizedData);

      // Extract ID from common response patterns
      const createdId =
        deliveryResponse?.id ||
        deliveryResponse?.deliveryId ||
        deliveryResponse?.delivery?.id;

      if (!createdId) {
        throw new Error("Could not verify delivery creation");
      }

      setDeliveryId(createdId);

      // 2. Prepare payment payload
      const paymentPayload = {
        amount: price,
        type: "DELIVERY",
        deliveryId: createdId,

        email: user.email,
        metadata: {
          recipientName: data.deliveryDetails.name,
          packageSize: data.packageSize,
        },
      };

      // 3. Initiate Paystack Transaction
      const paymentInit = await initiatePayment(
        "paystack",
        paymentPayload,
        user,
      );

      if (!paymentInit?.authorizationUrl) {
        throw new Error("Payment provider failed to generate a URL");
      }

      setCheckoutTx({
        checkoutUrl: paymentInit.authorizationUrl,
        transactionId: paymentInit.reference,
      });
      setShowPaymentWebView(true);
    } catch (err: any) {
      const msg = err?.message || "Payment initialization failed";
      Toast.show({ type: "error", text1: msg });
      if (__DEV__) console.error("Payment flow error:", err);
    } finally {
      setProcessing(false);
    }
  }

  const handlePaymentSuccess = () => {
    setShowPaymentWebView(false);
    router.replace({
      pathname: "/delivery/success",
      params: {
        price,
        distanceKm: data.quote?.distanceKm ?? 0,
        etaMinutes: data.quote?.etaMinutes ?? 0,
        deliveryId: deliveryId || "",
      },
    });
  };

  const handlePaymentCancel = () => {
    setShowPaymentWebView(false);
    Toast.show({
      type: "info",
      text1: "Payment Cancelled",
      text2: "You can try again when you are ready",
    });
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <View style={styles.header}>
        <Pressable onPress={router.back} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={22} color={primary} />
        </Pressable>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Confirm & Pay
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!user && !userLoading && (
          <View
            style={[
              styles.errorCard,
              { backgroundColor: surfaceCard, borderColor: danger },
            ]}
          >
            <IconSymbol
              name="exclamationmark.triangle.fill"
              size={20}
              color={danger}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <ThemedText type="defaultSemiBold" style={{ color: danger }}>
                Session Error
              </ThemedText>
              <ThemedText type="caption" style={{ color: danger }}>
                Please log in again to continue
              </ThemedText>
            </View>
          </View>
        )}

        {/* Route Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: surfaceCard, borderColor: border },
          ]}
        >
          <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
            Route Summary
          </ThemedText>
          <View style={styles.routeRow}>
            <View style={styles.routeIconColumn}>
              <View style={[styles.routeDot, { backgroundColor: success }]} />
              <View style={[styles.routeLine, { backgroundColor: border }]} />
              <View style={[styles.routeDot, { backgroundColor: primary }]} />
            </View>
            <View style={styles.routeContent}>
              <View style={styles.routeStop}>
                <ThemedText type="caption" style={{ color: muted }}>
                  PICKUP
                </ThemedText>
                <ThemedText type="default" numberOfLines={1}>
                  {data.pickup?.address?.fullAddress ?? "—"}
                </ThemedText>
              </View>
              <View style={styles.routeStop}>
                <ThemedText type="caption" style={{ color: muted }}>
                  DROP-OFF
                </ThemedText>
                <ThemedText type="default" numberOfLines={1}>
                  {data.dropoff?.address?.fullAddress ?? "—"}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Recipient Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: surfaceCard, borderColor: border },
          ]}
        >
          <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
            Recipient
          </ThemedText>
          <View style={styles.contactSection}>
            <View
              style={[styles.contactIconWrap, { backgroundColor: surface }]}
            >
              <IconSymbol name="person.fill" size={20} color={primary} />
            </View>
            <View style={styles.contactInfo}>
              <ThemedText type="default">
                {data.deliveryDetails?.name || "—"}
              </ThemedText>
              <ThemedText type="caption" style={{ color: muted }}>
                {data.deliveryDetails?.phone || "—"}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Price Summary */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: surface, borderColor: primary },
          ]}
        >
          <View style={styles.summaryRow}>
            <View>
              <ThemedText type="caption" style={{ color: muted }}>
                Total Fare
              </ThemedText>
              <ThemedText type="title" style={styles.priceText}>
                {formatCurrency(price)}
              </ThemedText>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <ThemedText type="caption" style={{ color: muted }}>
                Distance
              </ThemedText>
              <ThemedText type="defaultSemiBold">
                {data.quote?.distanceKm ?? 0} km
              </ThemedText>
              <ThemedText type="caption" style={{ color: muted }}>
                ~{data.quote?.etaMinutes ?? 0} mins
              </ThemedText>
            </View>
          </View>
        </View>

        <Pressable
          onPress={confirmPayment}
          style={({ pressed }) => [
            styles.payButton,
            {
              backgroundColor: primary,
              opacity: pressed || processing ? 0.7 : 1,
            },
          ]}
          disabled={processing || userLoading || !user}
        >
          {processing ? (
            <ActivityIndicator color={textOnPrimary} />
          ) : (
            <ThemedText type="defaultSemiBold" style={{ color: textOnPrimary }}>
              Pay {formatCurrency(price)}
            </ThemedText>
          )}
        </Pressable>
      </ScrollView>

      {checkoutTx && (
        <PaymentWebView
          visible={showPaymentWebView}
          url={checkoutTx.checkoutUrl}
          reference={checkoutTx.transactionId}
          paymentMethod="paystack"
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          onPaymentComplete={resetDelivery}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", padding: 16 },
  backButton: { padding: 8, borderRadius: 8 },
  headerTitle: { marginLeft: 8, fontSize: 18 },
  content: { padding: 16, gap: 16 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
  cardTitle: { marginBottom: 12, fontSize: 16 },
  routeRow: { flexDirection: "row" },
  routeIconColumn: { width: 24, alignItems: "center", marginRight: 12 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 2, flex: 1, marginVertical: 4 },
  routeContent: { flex: 1, gap: 12 },
  routeStop: { gap: 2 },
  contactSection: { flexDirection: "row", alignItems: "center" },
  contactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contactInfo: { flex: 1 },
  summaryCard: { padding: 20, borderRadius: 16, borderWidth: 2 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceText: { fontSize: 28, fontWeight: "bold" },
  payButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});
