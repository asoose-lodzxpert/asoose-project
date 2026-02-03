import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useState, useMemo, useEffect, useRef } from "react";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useSendPackage } from "@/context/SendPackageContext";
import { calculatePrice, formatCurrency } from "@/services/sendPackage.api";
import {
  initiatePayment,
  createBankTransfer,
  checkBankTransferStatus,
  openInAppCheckout,
  checkInAppPaymentStatus,
} from "@/services/payment.service";
import { useUserProfile } from "@/hooks/useUserProfile";
import * as WebBrowser from "expo-web-browser";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { PaymentMethod } from "@/types/payment";

export default function PaymentScreen() {
  const { returnData } = useSendPackage();
  const router = useRouter();
  const { user, loading: userLoading, error: userError } = useUserProfile();

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
  const pollRef = useRef<number | null>(null);

  const price = useMemo(() => {
    const packageSize = data.packageSize ?? ("small" as any);
    return calculatePrice(packageSize);
  }, [data]);

  async function confirmPayment() {
    if (!user) {
      alert("User not loaded. Please wait.");
      return;
    }
    setProcessing(true);
    try {
      if (method === "transfer") {
        const acct = await createBankTransfer(price, data, user);
        setBankAccount(acct);
        startBankPolling(acct.reference);
      } else {
        // Compose callback URL to return to the app (deep link or expo scheme)
        // Use your app's actual scheme (e.g., asoose-app://payment-callback)

        const callbackUrl = "asoose-app://payment-callback";
        const paymentInit = await initiatePayment(
          method,
          { ...data, callbackUrl, amount: price },
          user,
        );
        const checkoutUrl =
          paymentInit.authorizationUrl || paymentInit.checkoutUrl;
        const transactionId =
          paymentInit.reference || paymentInit.transactionId;
        setCheckoutTx({ transactionId, checkoutUrl });
        if (checkoutUrl) {
          WebBrowser.openBrowserAsync(checkoutUrl);
        }
        startInAppPolling(transactionId);
      }
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as any).message
          : String(err);
      alert("Payment failed: " + msg);
      console.error("payment confirm error", err);
    } finally {
      setProcessing(false);
    }
  }

  async function checkBankNow() {
    if (!bankAccount) return;
    setProcessing(true);
    try {
      const res = await checkBankTransferStatus(bankAccount.reference);
      if (res.status === "paid") {
        clearPolling();
        router.push({
          pathname: "/delivery/success",
          params: {
            price: price,
            distanceKm: data.quote?.distanceKm ?? 0,
            etaMinutes: data.quote?.etaMinutes ?? 0,
            method: "transfer",
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

  function startBankPolling(reference: string) {
    clearPolling();
    pollRef.current = setInterval(async () => {
      const res = await checkBankTransferStatus(reference);
      if (res.status === "paid") {
        clearPolling();
        router.push({
          pathname: "/delivery/success",
          params: {
            price: price,
            distanceKm: data.quote?.distanceKm ?? 0,
            etaMinutes: data.quote?.etaMinutes ?? 0,
            method: "transfer",
          },
        });
      }
    }, 10000) as any;
  }

  function startInAppPolling(transactionId: string) {
    clearPolling();
    pollRef.current = setInterval(async () => {
      const res = await checkInAppPaymentStatus(transactionId);
      if (res.status === "paid") {
        clearPolling();
        // close browser and navigate
        try {
          WebBrowser.dismissBrowser();
        } catch (e) {
          /* ignore */
        }
        router.push({
          pathname: "/delivery/success",
          params: {
            price: price,
            distanceKm: data.quote?.distanceKm ?? 0,
            etaMinutes: data.quote?.etaMinutes ?? 0,
            method: method,
          },
        });
      }
    }, 2000) as any;
  }
  useEffect(() => {
    return () => clearPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <View
          style={[
            styles.locationCard,
            { borderColor: border, backgroundColor: surfaceCard },
          ]}
        >
          <View style={styles.locationIconsColumn}>
            <View style={[styles.smallDot, { backgroundColor: success }]} />
            <View style={[styles.verticalLine, { backgroundColor: muted }]} />
            <View style={[styles.smallDot, { backgroundColor: danger }]} />
          </View>

          <View style={styles.locationContentColumn}>
            <View>
              <ThemedText type="defaultSemiBold">From</ThemedText>
              <ThemedText type="caption" style={styles.sectionText}>
                {data.pickup?.address?.fullAddress ?? "-"}
              </ThemedText>
            </View>

            <View style={{ height: 8 }} />

            <View>
              <ThemedText type="defaultSemiBold">To</ThemedText>
              <ThemedText type="caption" style={styles.sectionText}>
                {data.dropoff?.address?.fullAddress ?? "-"}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.sectionColumn}>
          <View
            style={[
              styles.cardFull,
              { backgroundColor: surfaceCard, borderColor: border },
            ]}
          >
            <ThemedText type="caption" style={styles.sectionLabel}>
              Package
            </ThemedText>
            <ThemedText type="default" style={styles.sectionText}>
              Size: {data.packageSize}
            </ThemedText>
            <ThemedText type="default" style={styles.sectionText}>
              Weight: {data.packageOptions?.weightKg ?? 0} kg
            </ThemedText>
            <ThemedText type="default" style={styles.sectionText}>
              Declared: {data.packageOptions?.declaredValue ?? ""}
            </ThemedText>
          </View>

          <View
            style={[
              styles.cardFull,
              styles.summaryCardFull,
              { backgroundColor: surfaceCard, borderColor: border },
            ]}
          >
            <ThemedText type="caption" style={styles.sectionLabel}>
              Estimated
            </ThemedText>
            <ThemedText type="value" style={styles.priceText}>
              {formatCurrency(price)}
            </ThemedText>
            <ThemedText type="caption" style={styles.mutedText}>
              {data.quote?.distanceKm ?? 0} km
            </ThemedText>
          </View>
        </View>

        <View style={{ height: 12 }} />

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

        {checkoutTx && (
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
            <ThemedText type="defaultSemiBold">Complete payment</ThemedText>
            <ThemedText type="caption" style={{ marginTop: 8 }}>
              {checkoutTx.checkoutUrl}
            </ThemedText>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <Pressable
                onPress={() =>
                  WebBrowser.openBrowserAsync(checkoutTx.checkoutUrl)
                }
                style={[
                  styles.methodCard,
                  {
                    width: "48%",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                ]}
              >
                <ThemedText type="defaultSemiBold">Open checkout</ThemedText>
              </Pressable>
            </View>
          </View>
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
                  opacity: pressed || processing ? 0.7 : 1,
                },
              ]}
              disabled={processing}
            >
              {processing ? (
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
  backButton: { padding: 8, marginRight: 8, borderRadius: 8 },
  headerTitle: { marginLeft: 4, fontSize: 18 },
  content: { padding: 16, paddingBottom: 40 },
  locationIconsColumn: { width: 36, alignItems: "center", marginRight: 12 },
  smallDot: { width: 10, height: 10, borderRadius: 5 },
  verticalLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  locationContentColumn: { flex: 1 },
  section: { marginBottom: 12 },
  sectionColumn: { flexDirection: "column", rowGap: 12 },
  sectionLabel: { fontSize: 13 },
  sectionText: { marginTop: 4, fontSize: 15 },
  sectionRow: { flexDirection: "row", gap: 12 },
  card: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  flex: { flex: 1 },
  summaryCard: { width: 120, alignItems: "center", justifyContent: "center" },
  priceText: { marginTop: 6, fontSize: 18 },
  cardFull: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    width: "100%",
  },
  summaryCardFull: { alignItems: "flex-start", marginTop: 8 },
  mutedText: { marginTop: 4 },
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
