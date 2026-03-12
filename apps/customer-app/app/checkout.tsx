import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
  BackHandler,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { AddressSelectionModal } from "@/components/checkout/AddressSelectionModal";
import { PaymentWebView } from "@/components/checkout/PaymentWebView";
import { Address } from "@/types/address";
import { request } from "@/lib/authFetch";
import { initiatePayment } from "@/services/payment.service";
import { createOrder } from "@/services/order.service";
import Toast from "react-native-toast-message";

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, groups, total, subtotal, deliveryFee, clearCart } = useCart();
  const { location: homeLocation } = useLocation();

  // Theme Colors
  const primary = useThemeColor({}, "brandPrimary");
  const background = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const textSecondary = useThemeColor({}, "textSecondary");
  const border = useThemeColor({}, "borderDefault");

  // State
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const orderCompleted = useRef(false); // guards against cart-empty redirect after payment

  // Intercept Android back when order is done — prevent going back to delivery/cart
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (orderCompleted.current) {
        router.dismissAll();
        router.replace("/(tabs)/home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  // Payment State
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const capturedAmount = useRef(0); // snapshot of total before cart is cleared

  // Live fee quote state
  type QuoteGroup = {
    storeId: string;
    deliveryFee: number;
    serviceFee: number;
    subtotal: number;
  };
  type QuoteResult = {
    groups: QuoteGroup[];
    totalDeliveryFee: number;
    totalServiceFee: number;
    totalVatAmount: number;
    grandTotal: number;
  };
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [isLoadingFee, setIsLoadingFee] = useState(false);
  const quoteAbortRef = useRef<number>(0);

  const currencySymbol = groups[0]?.restaurant.currency ?? "₦";

  useEffect(() => {
    if (!items.length && !orderCompleted.current) {
      router.replace("/cart");
    }
  }, [items]);

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const response = await request("users/addresses", { method: "GET" });
        if (response && Array.isArray(response) && response.length > 0) {
          // Prefer address closest to user's home-screen location
          if (homeLocation?.coords) {
            const { latitude, longitude } = homeLocation.coords;
            const sorted = [...response].sort((a: Address, b: Address) => {
              const da = Math.hypot(a.lat - latitude, a.lng - longitude);
              const db = Math.hypot(b.lat - latitude, b.lng - longitude);
              return da - db;
            });
            setSelectedAddress(sorted[0]);
          } else {
            // Fallback: prefer "home" label, then first
            const homeAddr = response.find(
              (a: Address) => a.label?.toLowerCase() === "home",
            );
            setSelectedAddress(homeAddr || response[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load addresses:", error);
      }
    };
    loadAddresses();
  }, [user, homeLocation?.coords?.latitude, homeLocation?.coords?.longitude]);

  // Fetch live quote from backend whenever address or cart changes
  const fetchQuote = useCallback(
    async (address: Address) => {
      const requestId = ++quoteAbortRef.current;
      setIsLoadingFee(true);
      try {
        const data = await request("users/cart/quote", {
          method: "POST",
          body: JSON.stringify({
            addressId: address.id,
            items: items.map((item) => ({
              id: item.id,
              quantity: item.qty,
              // Include selected modifier IDs so the backend computes the
              // correct subtotal (base price + modifier add-ons).
              modifierIds:
                item.modifierGroups?.flatMap((g) =>
                  g.selectedModifiers.map((m) => m.id),
                ) ?? [],
            })),
          }),
        });
        if (requestId !== quoteAbortRef.current) return;
        const totalServiceFee = (data.groups ?? []).reduce(
          (sum: number, g: any) => sum + (g.serviceFee ?? 0),
          0,
        );
        const totalVatAmount = (data.groups ?? []).reduce(
          (sum: number, g: any) => sum + (g.vatAmount ?? 0),
          0,
        );
        setQuoteResult({
          groups: (data.groups ?? []).map((g: any) => ({
            storeId: g.storeId ?? g.restaurantId ?? "",
            deliveryFee: g.deliveryFee ?? 0,
            serviceFee: g.serviceFee ?? 0,
            subtotal: g.subtotal ?? 0,
          })),
          totalDeliveryFee: data.totalDeliveryFee ?? 0,
          totalServiceFee,
          totalVatAmount,
          grandTotal: data.grandTotal ?? 0,
        });
      } catch (err: any) {
        if (requestId === quoteAbortRef.current) {
          console.error("Quote fetch failed:", err);
        }
      } finally {
        if (requestId === quoteAbortRef.current) {
          setIsLoadingFee(false);
        }
      }
    },
    [items],
  );

  useEffect(() => {
    if (selectedAddress) {
      fetchQuote(selectedAddress);
    } else {
      setQuoteResult(null);
    }
  }, [selectedAddress?.id, items.length]);

  // Resolve totals: prefer live quote, fall back to cart-computed values
  const resolvedDelivery = quoteResult?.totalDeliveryFee ?? deliveryFee;
  const resolvedService =
    quoteResult?.totalServiceFee ?? Math.round(subtotal * 0.05);
  const resolvedVat =
    quoteResult?.totalVatAmount ?? Math.round(subtotal * 0.07);
  // Use the backend-authoritative grand total from the quote when available.
  // This is the single source of truth and prevents discrepancies from
  // modifier prices or rounding that arise from recomputing client-side.
  const resolvedGrandTotal =
    quoteResult?.grandTotal ??
    subtotal + resolvedDelivery + resolvedService + resolvedVat;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Toast.show({ type: "info", text1: "Please select a delivery address" });
      return;
    }
    if (!user) {
      Toast.show({
        type: "error",
        text1: "Session expired. Please restart the app.",
      });
      return;
    }
    setIsProcessing(true);

    try {
      const orderPayload = {
        addressId: selectedAddress.id,
        items: items.map((item) => ({
          id: item.id,
          quantity: item.qty,
          // Flatten all selected modifier IDs — backend re-prices from DB
          modifierIds: item.modifierGroups?.flatMap((g) =>
            g.selectedModifiers.map((m) => m.id),
          ),
        })),
      };

      const orderResponse = await createOrder(orderPayload);

      // Multi-vendor response: { orderGroupId, orders, ... }
      // Single-vendor response: plain Order { id, storeId, ... }
      const multiVendorGroupId = (orderResponse as any).orderGroupId as
        | string
        | undefined;
      const singleOrderId = (orderResponse as any).id as string | undefined;
      const isMultiVendor = !!multiVendorGroupId;

      const trackingId = multiVendorGroupId ?? singleOrderId!;
      setOrderId(trackingId);

      const paymentPayload = {
        amount: resolvedGrandTotal,
        ...(isMultiVendor
          ? { orderGroupId: multiVendorGroupId }
          : { orderId: singleOrderId }),
        type: "ORDER",
        callbackUrl: `https://asoose.com/payment/callback/paystack`,
      };

      const userIdentity = {
        email: user.email,
        name: user.name || user.email,
        phone: user.phone ?? undefined,
      };

      // Force Paystack
      const paymentResponse = await initiatePayment(
        "paystack",
        paymentPayload,
        userIdentity,
      );

      setPaymentUrl(paymentResponse.authorizationUrl);
      setPaymentReference(paymentResponse.reference);
      setShowPaymentWebView(true);
    } catch (error: any) {
      // Surface backend messages (e.g. store closed / outside hours)
      const serverMessage =
        error?.response?.data?.message ||
        error?.data?.message ||
        error?.message ||
        "";

      const isAvailabilityError =
        serverMessage.toLowerCase().includes("closed") ||
        serverMessage.toLowerCase().includes("operating hours") ||
        serverMessage.toLowerCase().includes("temporarily");

      Toast.show({
        type: "error",
        text1: isAvailabilityError
          ? "Store Unavailable"
          : "Payment initialization failed",
        text2: serverMessage || undefined,
        visibilityTime: 5000,
      });

      if (__DEV__)
        console.error("Error during order/payment initialization:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <IconSymbol name="chevron.left" size={24} color={primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Review Order</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section: Delivery */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>
              DELIVERY ADDRESS
            </ThemedText>
            <Pressable
              style={[
                styles.glassCard,
                {
                  backgroundColor: selectedAddress ? card : primary + "10",
                  borderColor: selectedAddress ? border : primary,
                  borderWidth: selectedAddress ? 1 : 1.5,
                },
              ]}
              onPress={() => setShowAddressModal(true)}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: selectedAddress ? primary + "15" : primary,
                  },
                ]}
              >
                <IconSymbol
                  name="mappin.and.ellipse"
                  size={20}
                  color={selectedAddress ? primary : "#fff"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={[
                    styles.addressLabel,
                    !selectedAddress && { color: primary },
                  ]}
                >
                  {selectedAddress?.label || "Add Delivery Address"}
                </ThemedText>
                <ThemedText
                  style={[styles.addressText, { color: textSecondary }]}
                  numberOfLines={1}
                >
                  {selectedAddress?.street || "Tap to select where to deliver"}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.chevronBox,
                  {
                    backgroundColor: selectedAddress ? "transparent" : primary,
                  },
                ]}
              >
                <IconSymbol
                  name={selectedAddress ? "chevron.right" : "plus"}
                  size={14}
                  color={selectedAddress ? textSecondary : "#fff"}
                />
              </View>
            </Pressable>
          </View>

          {/* Section: Payment (Locked to Paystack) */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>PAYMENT METHOD</ThemedText>
            <View
              style={[
                styles.glassCard,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: "#011b3315" }]}>
                <IconSymbol name="creditcard.fill" size={20} color={primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.addressLabel}>Paystack</ThemedText>
                <ThemedText
                  style={[styles.addressText, { color: textSecondary }]}
                >
                  Cards, Bank, Transfer & USSD
                </ThemedText>
              </View>
              <IconSymbol name="lock.fill" size={14} color={textSecondary} />
            </View>
          </View>

          {/* Section: Summary */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>ORDER SUMMARY</ThemedText>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              {groups.map((group, idx) => (
                <View key={idx} style={idx > 0 && styles.groupDivider}>
                  {/* Restaurant Title */}
                  <View style={styles.storeRow}>
                    <ThemedText style={styles.storeName}>
                      {group.restaurant.name}
                    </ThemedText>
                  </View>

                  {/* Items */}
                  {group.items.map((item, i) => (
                    <View key={i} style={styles.itemRow}>
                      <ThemedText
                        style={[styles.itemQty, { color: textSecondary }]}
                      >
                        {item.quantity}x
                      </ThemedText>
                      <ThemedText style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </ThemedText>
                      <ThemedText style={styles.itemPrice}>
                        {formatCurrency(
                          item.price * item.quantity,
                          currencySymbol,
                        )}
                      </ThemedText>
                    </View>
                  ))}

                  {/* Per-store Delivery Fee */}
                  <View style={styles.feeRow}>
                    <ThemedText
                      style={[styles.feeLabel, { color: textSecondary }]}
                    >
                      Delivery Fee
                    </ThemedText>
                    {isLoadingFee ? (
                      <ThemedText
                        style={[styles.feeAmount, { color: textSecondary }]}
                      >
                        Calculating...
                      </ThemedText>
                    ) : (
                      (() => {
                        const qGroup = quoteResult?.groups.find(
                          (qg) => qg.storeId === group.restaurant.id,
                        );
                        const fee = qGroup?.deliveryFee ?? group.deliveryFee;
                        return (
                          <ThemedText style={styles.feeAmount}>
                            {fee > 0
                              ? formatCurrency(fee, currencySymbol)
                              : "FREE"}
                          </ThemedText>
                        );
                      })()
                    )}
                  </View>
                </View>
              ))}

              {/* Final Calculations */}
              <View style={[styles.totalContainer, { borderTopColor: border }]}>
                <View style={[styles.summaryRow, { marginBottom: 6 }]}>
                  <ThemedText style={{ color: textSecondary, fontSize: 13 }}>
                    Subtotal
                  </ThemedText>
                  <ThemedText style={{ fontSize: 13 }}>
                    {formatCurrency(subtotal, currencySymbol)}
                  </ThemedText>
                </View>
                <View style={[styles.summaryRow, { marginBottom: 6 }]}>
                  <ThemedText style={{ color: textSecondary, fontSize: 13 }}>
                    Delivery
                  </ThemedText>
                  {isLoadingFee ? (
                    <ThemedText style={{ fontSize: 13, color: textSecondary }}>
                      Calculating...
                    </ThemedText>
                  ) : (
                    <ThemedText style={{ fontSize: 13 }}>
                      {formatCurrency(resolvedDelivery, currencySymbol)}
                    </ThemedText>
                  )}
                </View>
                <View style={[styles.summaryRow, { marginBottom: 6 }]}>
                  <ThemedText style={{ color: textSecondary, fontSize: 13 }}>
                    Service Fee (5%)
                  </ThemedText>
                  {isLoadingFee ? (
                    <ThemedText style={{ fontSize: 13, color: textSecondary }}>
                      Calculating...
                    </ThemedText>
                  ) : (
                    <ThemedText style={{ fontSize: 13 }}>
                      {formatCurrency(resolvedService, currencySymbol)}
                    </ThemedText>
                  )}
                </View>
                <View style={[styles.summaryRow, { marginBottom: 12 }]}>
                  <ThemedText style={{ color: textSecondary, fontSize: 13 }}>
                    VAT (7%)
                  </ThemedText>
                  {isLoadingFee ? (
                    <ThemedText style={{ fontSize: 13, color: textSecondary }}>
                      Calculating...
                    </ThemedText>
                  ) : (
                    <ThemedText style={{ fontSize: 13 }}>
                      {formatCurrency(resolvedVat, currencySymbol)}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={{ color: textSecondary, fontSize: 15 }}>
                    Total to pay
                  </ThemedText>
                  {isLoadingFee ? (
                    <ThemedText
                      style={[styles.grandTotal, { color: textSecondary }]}
                    >
                      ...
                    </ThemedText>
                  ) : (
                    <ThemedText style={styles.grandTotal}>
                      {formatCurrency(resolvedGrandTotal, currencySymbol)}
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Action Bar */}
        <View
          style={[
            styles.actionBar,
            { backgroundColor: background, borderTopColor: border },
          ]}
        >
          <Pressable
            disabled={isProcessing || !selectedAddress || !user || isLoadingFee}
            onPress={handlePlaceOrder}
            style={[
              styles.payButton,
              { backgroundColor: primary },
              (!selectedAddress || !user || isProcessing || isLoadingFee) &&
                styles.disabled,
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : isLoadingFee ? (
              <View style={styles.payButtonContent}>
                <ActivityIndicator color="#fff" size="small" />
                <ThemedText style={styles.payText}>Calculating...</ThemedText>
              </View>
            ) : (
              <View style={styles.payButtonContent}>
                <ThemedText style={styles.payText}>
                  Pay {formatCurrency(resolvedGrandTotal, currencySymbol)}
                </ThemedText>
                <IconSymbol name="arrow.right" size={18} color="#fff" />
              </View>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      <AddressSelectionModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSelect={(addr) => {
          setSelectedAddress(addr);
          setShowAddressModal(false);
        }}
        selectedAddressId={selectedAddress?.id}
        currentLocation={
          homeLocation?.coords
            ? {
                coords: {
                  latitude: homeLocation.coords.latitude,
                  longitude: homeLocation.coords.longitude,
                },
                label: homeLocation.label,
                address: homeLocation.address,
              }
            : null
        }
      />

      {paymentUrl && paymentReference && (
        <PaymentWebView
          visible={showPaymentWebView}
          url={paymentUrl}
          reference={paymentReference}
          paymentMethod="paystack"
          onSuccess={() => {
            setShowPaymentWebView(false);
            router.replace({
              pathname: "/order-success" as any,
              params: {
                orderId: orderId ?? "",
                amount: String(capturedAmount.current),
                currency: currencySymbol,
              },
            });
          }}
          onCancel={() => setShowPaymentWebView(false)}
          onPaymentComplete={async () => {
            capturedAmount.current = resolvedGrandTotal; // capture before clearCart zeroes it
            orderCompleted.current = true;
            await clearCart();
          }}
        />
      )}
    </ThemedView>
  );
}

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString()}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  iconBtn: { padding: 8 },
  scrollContent: { padding: 20 },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
    opacity: 0.6,
  },
  glassCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  chevronBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addressLabel: { fontSize: 16, fontWeight: "700" },
  addressText: { fontSize: 13, marginTop: 2 },
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  storeRow: { marginBottom: 12 },
  storeName: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    opacity: 0.8,
  },
  itemRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  itemQty: { width: 30, fontSize: 13, fontWeight: "600" },
  itemName: { flex: 1, fontSize: 14 },
  itemPrice: { fontSize: 14, fontWeight: "700" },
  groupDivider: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    borderStyle: "dashed",
  },
  totalContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  grandTotal: { fontSize: 20, fontWeight: "900" },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    borderTopWidth: 1,
  },
  payButton: {
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  payText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
  },
  feeLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  feeAmount: {
    fontSize: 13,
    fontWeight: "600",
  },
});
