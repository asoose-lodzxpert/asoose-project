import { PaymentWebView } from "@/components/checkout/PaymentWebView";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useToast } from "@/components/ui/ThemedToast";
import { useSendPackage } from "@/context/SendPackageContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  checkBankTransferStatus,
  createBankTransfer,
  initiatePayment,
} from "@/services/payment.service";
import { createDelivery, formatCurrency } from "@/services/sendPackage.api";
import { PaymentMethod } from "@/types/payment";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

export default function PaymentScreen() {
  const { returnData, resetDelivery } = useSendPackage();
  const router = useRouter();
  const { user, loading: userLoading, error: userError } = useUserProfile();
  const showToast = useToast();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const muted = useThemeColor({}, "textMuted");
  const surfaceCard = useThemeColor({}, "surfaceCard");

  const data = returnData();

  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [processing, setProcessing] = useState(false);
  const [bankAccount, setBankAccount] = useState<any | null>(null);
  const [checkoutTx, setCheckoutTx] = useState<any | null>(null);
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const price = useMemo(() => {
    return data.quote?.price ?? 0;
  }, [data]);

  const [showPaymentWebView, setShowPaymentWebView] = useState(false);

  async function confirmPayment() {
    if (!user) {
      showToast({ message: "User not loaded. Please wait.", variant: "error" });
      return;
    }

    // Validate required fields
    if (!data.deliveryDetails?.name || !data.deliveryDetails?.phone) {
      showToast({
        message: "Please provide recipient name and phone number.",
        variant: "error",
      });
      return;
    }

    if (!data.pickup?.address || !data.dropoff?.address) {
      showToast({
        message: "Please select both pickup and delivery locations.",
        variant: "error",
      });
      return;
    }

    setProcessing(true);

    try {
      const deliveryResponse = await createDelivery(data);
      const createdDeliveryId =
        deliveryResponse.deliveryId || deliveryResponse.delivery?.id;

      if (!createdDeliveryId) {
        throw new Error("Failed to create delivery");
      }

      setDeliveryId(createdDeliveryId);

      const paymentPayload = {
        ...data,
        amount: price,
        type: "DELIVERY",
        deliveryId: createdDeliveryId,
      };

      if (method === "transfer") {
        const acct = await createBankTransfer(price, paymentPayload, user);
        setBankAccount(acct);
        startBankPolling(acct.reference, createdDeliveryId);
      } else {
        const callbackUrl = "asoose-app://payment-callback";
        const paymentInit = await initiatePayment(
          method,
          { ...paymentPayload, callbackUrl },
          user,
        );
        const checkoutUrl =
          paymentInit.authorizationUrl || paymentInit.checkoutUrl;
        const transactionId =
          paymentInit.reference || paymentInit.transactionId;
        setCheckoutTx({ transactionId, checkoutUrl });
        if (checkoutUrl) {
          setShowPaymentWebView(true);
        }
      }
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as any).message
          : String(err);
      showToast({ message: "Payment failed: " + msg, variant: "error" });
    } finally {
      setProcessing(false);
    }
  }

  async function checkBankNow() {
    if (!bankAccount) return;
    setProcessing(true);
    try {
      const res = await checkBankTransferStatus(bankAccount.reference, method);
      if (res.status === "paid") {
        clearPolling();
        router.push({
          pathname: "/delivery/success",
          params: {
            price: price,
            distanceKm: data.quote?.distanceKm ?? 0,
            etaMinutes: data.quote?.etaMinutes ?? 0,
            method: "transfer",
            deliveryId: deliveryId || "",
          },
        });
      }
    } finally {
      setProcessing(false);
    }
  }

  async function copyBankName() {
    if (!bankAccount) return;
    try {
      await Clipboard.setStringAsync(bankAccount.bankName);
    } catch (e) {
      console.warn("Clipboard unavailable", e);
    }
  }

  async function copyAccountNumber() {
    if (!bankAccount) return;
    try {
      await Clipboard.setStringAsync(bankAccount.accountNumber);
    } catch (e) {
      console.warn("Clipboard unavailable", e);
    }
  }

  function clearPolling() {
    try {
      if (pollRef.current) {
        clearInterval(pollRef.current as any);
        pollRef.current = null;
      }
    } catch (e) {
      /* ignore */
    }
  }

  function startBankPolling(reference: string, deliveryId: string) {
    clearPolling();
    pollRef.current = setInterval(async () => {
      const res = await checkBankTransferStatus(reference, method);
      if (res.status === "paid") {
        clearPolling();
        router.push({
          pathname: "/delivery/success",
          params: {
            price: price,
            distanceKm: data.quote?.distanceKm ?? 0,
            etaMinutes: data.quote?.etaMinutes ?? 0,
            method: "transfer",
            deliveryId: deliveryId,
          },
        });
      }
    }, 10000) as any;
  }

  // PaymentWebView handlers
  const handlePaymentSuccess = () => {
    setShowPaymentWebView(false);
    router.push({
      pathname: "/delivery/success",
      params: {
        price: price,
        distanceKm: data.quote?.distanceKm ?? 0,
        etaMinutes: data.quote?.etaMinutes ?? 0,
        method: method,
        deliveryId: deliveryId || "",
      },
    });
  };

  const handlePaymentCancel = () => {
    setShowPaymentWebView(false);
    // Optionally show alert
  };

  useEffect(() => {
    return () => clearPolling();
  }, []);

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
        {userError && (
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
                Failed to load user profile
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ marginTop: 2, color: danger }}
              >
                {String(userError)}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Delivery Route */}
        <View
          style={[
            styles.deliveryCard,
            { backgroundColor: surfaceCard, borderColor: border },
          ]}
        >
          <ThemedText
            type="defaultSemiBold"
            style={{ marginBottom: 16, fontSize: 16 }}
          >
            Delivery Route
          </ThemedText>

          <View style={styles.routeRow}>
            <View style={styles.routeIconColumn}>
              <View style={[styles.routeDot, { backgroundColor: success }]} />
              <View style={[styles.routeLine, { backgroundColor: border }]} />
              <View style={[styles.routeDot, { backgroundColor: primary }]} />
            </View>
            <View style={styles.routeContent}>
              <View style={styles.routeStop}>
                <ThemedText
                  type="caption"
                  style={{ color: muted, marginBottom: 4 }}
                >
                  PICKUP LOCATION
                </ThemedText>
                <ThemedText type="default" numberOfLines={2}>
                  {data.pickup?.address?.fullAddress ?? "-"}
                </ThemedText>
              </View>
              <View style={styles.routeStop}>
                <ThemedText
                  type="caption"
                  style={{ color: muted, marginBottom: 4 }}
                >
                  DELIVERY LOCATION
                </ThemedText>
                <ThemedText type="default" numberOfLines={2}>
                  {data.dropoff?.address?.fullAddress ?? "-"}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View
          style={[
            styles.contactsCard,
            { backgroundColor: surfaceCard, borderColor: border },
          ]}
        >
          <ThemedText
            type="defaultSemiBold"
            style={{ marginBottom: 16, fontSize: 16 }}
          >
            Contact Information
          </ThemedText>

          <View style={styles.contactSection}>
            <View
              style={[styles.contactIconWrap, { backgroundColor: surface }]}
            >
              <IconSymbol
                name="arrow.up.circle.fill"
                size={20}
                color={success}
              />
            </View>
            <View style={styles.contactInfo}>
              <ThemedText type="default" style={{ fontSize: 15 }}>
                {data.deliveryDetails?.name || "-"}
              </ThemedText>
              <ThemedText type="caption" style={{ color: muted, marginTop: 2 }}>
                {data.deliveryDetails?.phone || "-"}
              </ThemedText>
              {data.deliveryDetails?.instructions ? (
                <ThemedText
                  type="caption"
                  style={{ color: muted, marginTop: 2 }}
                >
                  {data.deliveryDetails.instructions}
                </ThemedText>
              ) : null}
            </View>
          </View>
        </View>

        {/* Package Details */}
        <View
          style={[
            styles.packageCard,
            { backgroundColor: surfaceCard, borderColor: border },
          ]}
        >
          <View style={styles.packageHeader}>
            <View
              style={[styles.packageIconWrap, { backgroundColor: surface }]}
            >
              <IconSymbol name="shippingbox.fill" size={22} color={primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
                Package Details
              </ThemedText>
              <ThemedText type="caption" style={{ marginTop: 2, color: muted }}>
                {data.packageSize?.replace("_", " ").toUpperCase()}
              </ThemedText>
            </View>
          </View>

          <View style={styles.packageDetails}>
            <View style={styles.detailItem}>
              <IconSymbol name="scalemass.fill" size={16} color={muted} />
              <ThemedText type="caption" style={{ marginLeft: 8 }}>
                Weight: {data.packageOptions?.weightKg ?? 0} kg
              </ThemedText>
            </View>
            {data.packageOptions?.declaredValue && (
              <View style={styles.detailItem}>
                <IconSymbol name="banknote.fill" size={16} color={muted} />
                <ThemedText type="caption" style={{ marginLeft: 8 }}>
                  Value: {data.packageOptions.declaredValue}
                </ThemedText>
              </View>
            )}
            {(data.packageOptions?.fragile ||
              data.packageOptions?.perishable ||
              data.packageOptions?.containsLiquid) && (
              <View style={styles.specialHandling}>
                <ThemedText
                  type="caption"
                  style={{ color: muted, marginBottom: 6 }}
                >
                  Special Handling:
                </ThemedText>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                >
                  {data.packageOptions?.fragile && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: surface, borderColor: danger },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: danger, fontSize: 11 }}
                      >
                        Fragile
                      </ThemedText>
                    </View>
                  )}
                  {data.packageOptions?.perishable && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: surface, borderColor: primary },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: primary, fontSize: 11 }}
                      >
                        Perishable
                      </ThemedText>
                    </View>
                  )}
                  {data.packageOptions?.containsLiquid && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: surface, borderColor: primary },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: primary, fontSize: 11 }}
                      >
                        Liquid
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            )}
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
                Total Amount
              </ThemedText>
              <ThemedText type="title" style={{ fontSize: 28, marginTop: 4 }}>
                {formatCurrency(price)}
              </ThemedText>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <ThemedText type="caption" style={{ color: muted }}>
                Distance
              </ThemedText>
              <ThemedText type="defaultSemiBold" style={{ marginTop: 4 }}>
                {data.quote?.distanceKm ?? 0} km
              </ThemedText>
              <ThemedText type="caption" style={{ color: muted, marginTop: 2 }}>
                ~{data.quote?.etaMinutes ?? 0} mins
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Bank account / checkout info (appear after package/estimate) */}
        {bankAccount && (
          <View
            style={[
              styles.cardFull,
              {
                backgroundColor: surfaceCard,
                borderColor: border,
                marginTop: 12,
              },
            ]}
          >
            <View style={styles.bankTopRow}>
              <ThemedText type="defaultSemiBold">Bank transfer</ThemedText>
              <ThemedText type="caption" style={styles.referenceText}>
                Ref: {bankAccount.reference}
              </ThemedText>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLabelWrap}>
                <ThemedText type="caption" style={{ color: muted }}>
                  Bank
                </ThemedText>
                <ThemedText type="default" style={styles.detailValue}>
                  {bankAccount.bankName}
                </ThemedText>
              </View>
              <Pressable onPress={copyBankName} style={styles.copyButton}>
                <ThemedText type="caption">Copy</ThemedText>
              </Pressable>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLabelWrap}>
                <ThemedText type="caption" style={{ color: muted }}>
                  Account
                </ThemedText>
                <ThemedText type="default" style={styles.detailValue}>
                  {bankAccount.accountNumber}
                </ThemedText>
              </View>
              <Pressable onPress={copyAccountNumber} style={styles.copyButton}>
                <ThemedText type="caption">Copy</ThemedText>
              </Pressable>
            </View>

            <View style={styles.detailRowSmall}>
              <View>
                <ThemedText type="caption" style={{ color: muted }}>
                  Name
                </ThemedText>
                <ThemedText type="default" style={styles.detailValue}>
                  {bankAccount.accountName}
                </ThemedText>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <ThemedText type="caption" style={{ color: muted }}>
                  Amount
                </ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.detailValue}>
                  {formatCurrency(bankAccount.amount)}
                </ThemedText>
              </View>
            </View>

            <Pressable
              onPress={checkBankNow}
              style={[
                styles.checkButton,
                { marginTop: 12, backgroundColor: primary },
              ]}
            >
              {processing ? (
                <ActivityIndicator color={textOnPrimary} />
              ) : (
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: textOnPrimary }}
                >
                  Check payment status
                </ThemedText>
              )}
            </Pressable>
          </View>
        )}

        {checkoutTx && showPaymentWebView && (
          <PaymentWebView
            visible={showPaymentWebView}
            url={checkoutTx.checkoutUrl}
            reference={checkoutTx.transactionId}
            paymentMethod={method}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
            onPaymentComplete={resetDelivery}
          />
        )}

        {!bankAccount && (
          <>
            <ThemedText type="caption" style={styles.sectionLabel}>
              Payment method
            </ThemedText>

            <View style={styles.methodsGrid}>
              {(
                [
                  {
                    key: "transfer",
                    label: "Bank transfer",
                    icon: "credit-card",
                  },
                  { key: "paystack", label: "Paystack", icon: "creditcard" },
                  { key: "monnify", label: "Monnify", icon: "wallet-giftcard" },
                  {
                    key: "flutterwave",
                    label: "Flutterwave",
                    icon: "dollar-sign",
                  },
                ] as { key: PaymentMethod; label: string; icon: string }[]
              ).map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => setMethod(m.key)}
                  style={[
                    styles.methodCard,
                    { borderColor: border },
                    method === m.key && {
                      borderColor: primary,
                      borderWidth: 2,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.methodIconWrap,
                      { backgroundColor: surfaceCard },
                    ]}
                  >
                    <IconSymbol
                      name={m.icon as any}
                      size={20}
                      color={method === m.key ? primary : muted}
                    />
                  </View>
                  <ThemedText
                    type={method === m.key ? "defaultSemiBold" : undefined}
                    style={styles.methodLabel}
                  >
                    {m.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={{ height: 24 }} />

            <Pressable
              onPress={confirmPayment}
              style={({ pressed }) => [
                styles.payButton,
                {
                  backgroundColor: primary,
                  opacity: pressed || processing || userLoading ? 0.7 : 1,
                },
              ]}
              disabled={processing || userLoading}
            >
              {processing || userLoading ? (
                <ActivityIndicator color={textOnPrimary} />
              ) : (
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: textOnPrimary }}
                >
                  Pay {formatCurrency(price)}
                </ThemedText>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", padding: 16 },
  iconContainer: { marginTop: 4 },
  backButton: { padding: 8, marginRight: 8, borderRadius: 8 },
  headerTitle: { marginLeft: 4, fontSize: 18 },
  content: { padding: 16, paddingBottom: 40 },

  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },

  deliveryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: "row",
  },
  routeIconColumn: {
    width: 32,
    alignItems: "center",
    marginRight: 16,
  },
  routeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  routeLine: {
    width: 2,
    flex: 1,
    marginVertical: 8,
  },
  routeContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  routeStop: {
    paddingVertical: 4,
  },

  contactsCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  contactSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  contactIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },

  packageCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  packageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  packageIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  packageDetails: {
    gap: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  specialHandling: {
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },

  summaryCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionLabel: {
    fontSize: 13,
    marginBottom: 4,
  },

  cardFull: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    width: "100%",
  },
  methodsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  methodCard: {
    width: "48%",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  methodIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  locationIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  locationContent: { flex: 1 },
  methodLabel: { fontSize: 14 },
  payButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  bankTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  referenceText: { fontSize: 12 },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  detailRowSmall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  detailLabelWrap: { flex: 1 },

  detailValue: { marginTop: 4, fontSize: 15 },
  copyButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  checkButton: { padding: 12, borderRadius: 10, alignItems: "center" },
});
