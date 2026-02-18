import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { AddressSelectionModal } from "@/components/checkout/AddressSelectionModal";
import { PaymentWebView } from "@/components/checkout/PaymentWebView";
import { PaymentSuccessModal } from "@/components/checkout/PaymentSuccessModal";
import { Address } from "@/types/address";
import { request } from "@/lib/authFetch";
import { initiatePayment } from "@/services/payment.service";
import { createOrder } from "@/services/order.service";
import Toast from "react-native-toast-message";

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, groups, total, clearCart } = useCart();

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Payment State
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const currencySymbol = groups[0]?.restaurant.currency ?? "₦";

  useEffect(() => {
    if (!items.length && !showSuccessModal) {
      router.replace("/cart");
    }
  }, [items]);

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const response = await request("users/addresses", { method: "GET" });
        if (response && Array.isArray(response) && response.length > 0) {
          const homeAddr = response.find(
            (a: Address) => a.label?.toLowerCase() === "home",
          );
          setSelectedAddress(homeAddr || response[0]);
        }
      } catch (error) {
        console.error("Failed to load addresses:", error);
      }
    };
    loadAddresses();
  }, [user]);

  const handlePlaceOrder = async () => {
    if (!selectedAddress || !user) {
      Toast.show({ type: "info", text1: "Please select an address" });
      return;
    }
    setIsProcessing(true);

    try {
      const orderPayload = {
        addressId: selectedAddress.id,
        items: items.map((item) => ({ id: item.id, quantity: item.qty })),
      };

      const orderResponse = await createOrder(orderPayload);
      const createdOrderId =
        (orderResponse as any).orderGroupId || orderResponse.id;
      setOrderId(createdOrderId);

      const paymentPayload = {
        amount: total,
        orderGroupId: createdOrderId,
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
    } catch (error) {
      Toast.show({ type: "error", text1: "Payment initialization failed" });
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
                { backgroundColor: card, borderColor: border },
              ]}
              onPress={() => setShowAddressModal(true)}
            >
              <View
                style={[styles.iconBox, { backgroundColor: primary + "15" }]}
              >
                <IconSymbol
                  name="mappin.and.ellipse"
                  size={20}
                  color={primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.addressLabel}>
                  {selectedAddress?.label || "Select Address"}
                </ThemedText>
                <ThemedText
                  style={[styles.addressText, { color: textSecondary }]}
                  numberOfLines={1}
                >
                  {selectedAddress?.address || "Tap to add a delivery location"}
                </ThemedText>
              </View>
              <IconSymbol
                name="chevron.right"
                size={16}
                color={textSecondary}
              />
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
                <IconSymbol name="creditcard.fill" size={20} color="#011b33" />
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

                  {/* Specific Delivery Fee for this Restaurant */}
                  <View style={styles.feeRow}>
                    <ThemedText
                      style={[styles.feeLabel, { color: textSecondary }]}
                    >
                      Delivery Fee
                    </ThemedText>
                    <ThemedText style={styles.feeAmount}>
                      {group.deliveryFee > 0
                        ? formatCurrency(group.deliveryFee, currencySymbol)
                        : "FREE"}
                    </ThemedText>
                  </View>
                </View>
              ))}

              {/* Final Calculations */}
              <View style={[styles.totalContainer, { borderTopColor: border }]}>
                <View style={styles.summaryRow}>
                  <ThemedText style={{ color: textSecondary, fontSize: 15 }}>
                    Total to pay
                  </ThemedText>
                  <ThemedText style={styles.grandTotal}>
                    {formatCurrency(total, currencySymbol)}
                  </ThemedText>
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
            disabled={isProcessing || !selectedAddress}
            onPress={handlePlaceOrder}
            style={[
              styles.payButton,
              { backgroundColor: primary },
              (!selectedAddress || isProcessing) && styles.disabled,
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.payButtonContent}>
                <ThemedText style={styles.payText}>
                  Pay {formatCurrency(total, currencySymbol)}
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
      />

      {paymentUrl && paymentReference && (
        <PaymentWebView
          visible={showPaymentWebView}
          url={paymentUrl}
          reference={paymentReference}
          paymentMethod="paystack"
          onSuccess={() => {
            setShowPaymentWebView(false);
            setShowSuccessModal(true);
          }}
          onCancel={() => setShowPaymentWebView(false)}
          onPaymentComplete={clearCart}
        />
      )}

      <PaymentSuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.replace("/(tabs)/home");
        }}
        orderId={orderId}
        amount={total}
        currency={currencySymbol}
      />
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
