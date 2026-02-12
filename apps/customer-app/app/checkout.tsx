import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { AddressSelectionModal } from "@/components/checkout/AddressSelectionModal";
import { PaymentMethodModal } from "@/components/checkout/PaymentMethodModal";
import { PaymentWebView } from "@/components/checkout/PaymentWebView";
import { PaymentSuccessModal } from "@/components/checkout/PaymentSuccessModal";
import { Address } from "@/types/address";
import { request } from "@/lib/authFetch";
import { initiatePayment } from "@/services/payment.service";
import { createOrder } from "@/services/order.service";
import { useToast } from "@/components/ui/ThemedToast";

type PaymentMethod = "paystack" | "flutterwave" | "monnify" | "transfer";

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, groups, subtotal, deliveryFee, total, clearCart } = useCart();
  const showToast = useToast();

  // Theme Colors
  const primary = useThemeColor({}, "brandPrimary");
  const background = useThemeColor({}, "surfaceBackground");
  const surface = useThemeColor({}, "surfaceBackground");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const border = useThemeColor({}, "borderDefault");
  const error = useThemeColor({}, "statusError");

  // State
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>("paystack");

  // Modals
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Payment Data
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const currencySymbol = groups[0]?.restaurant.currency ?? "₦";

  // ---------------- Effects ----------------

  useEffect(() => {
    if (!items.length) {
      router.replace("/cart");
    }
  }, [items]);

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const response = await request("users/addresses", { method: "GET" });
        setAddresses(response || []);
        if (!selectedAddress && response && Array.isArray(response)) {
          const homeAddr = response.find(
            (a: Address) => a.label?.toLowerCase() === "home",
          );
          if (homeAddr) setSelectedAddress(homeAddr);
          else if (response.length > 0) setSelectedAddress(response[0]);
        }
      } catch (error) {
        console.error("Failed to load addresses:", error);
      }
    };
    loadAddresses();
  }, [user]);

  // ---------------- Handlers ----------------

  const handlePlaceOrder = async () => {
    if (!selectedAddress || !selectedPaymentMethod || !user) return;
    setIsProcessing(true);

    try {
      // 1. Create Multi-Order (backend handles grouping by store)
      const orderPayload = {
        addressId: selectedAddress.id,
        items: items.map((item) => ({ id: item.id, quantity: item.qty })),
      };

      const orderResponse = await createOrder(orderPayload);
      // Multi-order returns { orderGroupId, orders[], grandTotal }
      const createdOrderGroupId =
        orderResponse.orderGroupId || orderResponse.id;
      setOrderId(createdOrderGroupId);

      // 2. Initiate Payment for entire order group
      const paymentPayload = {
        amount: total,
        orderGroupId: createdOrderGroupId,
        type: "ORDER",
        callbackUrl: `https://asoose.com/payment/callback/paystack`,
      };

      const userIdentity = {
        email: user.email,
        name: user.name || user.email,
        phone: user.phone ?? undefined,
      };

      const paymentResponse = await initiatePayment(
        selectedPaymentMethod,
        paymentPayload,
        userIdentity,
      );

      if (
        selectedPaymentMethod === "transfer" ||
        selectedPaymentMethod === "monnify"
      ) {
        setPaymentReference(paymentResponse.reference);
        setShowSuccessModal(true);
      } else if (selectedPaymentMethod === "paystack") {
        setPaymentUrl(paymentResponse.authorizationUrl);
        setPaymentReference(paymentResponse.reference);
        setShowPaymentWebView(true);
      }
    } catch (error) {
      console.error("Order/Payment failed:", error);
      showToast({
        message: "Failed to process order. Please try again.",
        variant: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const canProceed = selectedAddress && selectedPaymentMethod && !isProcessing;

  // ---------------- Render Helpers ----------------

  const renderPaymentIcon = (method: PaymentMethod) => {
    const iconName =
      method === "transfer" || method === "monnify"
        ? "building.columns.fill"
        : "creditcard.fill";
    return <IconSymbol name={iconName} size={22} color={primary} />;
  };

  return (
    <ThemedView style={styles.container}>
      {/* 1. Navbar */}
      <View
        style={[
          styles.header,
          { backgroundColor: surface, borderBottomColor: border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="arrow.left" size={24} color={textPrimary} />
        </Pressable>
        <ThemedText
          type="subtitle"
          style={{ flex: 1, textAlign: "center", paddingRight: 40 }}
        >
          Checkout
        </ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Delivery Section (Hero) */}
        <View style={styles.sectionContainer}>
          <ThemedText style={[styles.sectionLabel, { color: textSecondary }]}>
            DELIVERY LOCATION
          </ThemedText>
          <Pressable
            style={[
              styles.addressCard,
              { backgroundColor: surface, borderColor: border },
            ]}
            onPress={() => setShowAddressModal(true)}
          >
            <View
              style={[styles.iconCircle, { backgroundColor: primary + "20" }]}
            >
              <IconSymbol name="mappin.and.ellipse" size={22} color={primary} />
            </View>

            <View style={{ flex: 1 }}>
              {selectedAddress ? (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <ThemedText style={styles.addressTitle}>
                      {selectedAddress.label}
                    </ThemedText>
                    {selectedAddress.isDefault && (
                      <View
                        style={[
                          styles.defaultBadge,
                          { backgroundColor: border },
                        ]}
                      >
                        <ThemedText style={{ fontSize: 10, fontWeight: "600" }}>
                          DEFAULT
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText
                    numberOfLines={1}
                    style={[styles.addressSub, { color: textSecondary }]}
                  >
                    {selectedAddress.address}
                  </ThemedText>
                </>
              ) : (
                <ThemedText style={{ color: error, fontWeight: "600" }}>
                  Add a delivery address
                </ThemedText>
              )}
            </View>

            <View style={styles.editButton}>
              <ThemedText
                style={{ color: primary, fontWeight: "600", fontSize: 13 }}
              >
                CHANGE
              </ThemedText>
            </View>
          </Pressable>
        </View>

        {/* 3. Order Details (Receipt Style) - Multi-Cart */}
        <View style={styles.sectionContainer}>
          <ThemedText style={[styles.sectionLabel, { color: textSecondary }]}>
            ORDER SUMMARY
          </ThemedText>

          {groups.map((group, groupIndex) => (
            <View
              key={group.restaurant.id}
              style={[
                styles.receiptCard,
                { backgroundColor: surface, borderColor: border },
                groupIndex > 0 && { marginTop: 12 },
              ]}
            >
              {/* Store Header */}
              <View style={[styles.storeHeader, { borderBottomColor: border }]}>
                {group.restaurant?.image && (
                  <Image
                    source={{ uri: group.restaurant.image }}
                    style={styles.miniStoreLogo}
                  />
                )}
                <ThemedText style={styles.storeName}>
                  {group.restaurant?.name || "Store"}
                </ThemedText>
                <ThemedText style={{ color: textSecondary, fontSize: 13 }}>
                  {" "}
                  • {group.items.length} items
                </ThemedText>
              </View>

              {/* Items List */}
              <View style={styles.itemsList}>
                {group.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.qtyBadge}>
                      <ThemedText style={{ fontSize: 12, fontWeight: "700" }}>
                        {item.qty}x
                      </ThemedText>
                    </View>
                    <ThemedText
                      style={[styles.itemName, { flex: 1 }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </ThemedText>
                    <ThemedText style={styles.itemPrice}>
                      {formatCurrency(item.price * item.qty, currencySymbol)}
                    </ThemedText>
                  </View>
                ))}
              </View>

              {/* Group Subtotal */}
              <View
                style={[
                  styles.financials,
                  { backgroundColor: background, borderTopColor: border },
                ]}
              >
                <View style={styles.row}>
                  <ThemedText style={{ color: textSecondary }}>
                    Subtotal
                  </ThemedText>
                  <ThemedText style={{ fontWeight: "600" }}>
                    {formatCurrency(group.subtotal, currencySymbol)}
                  </ThemedText>
                </View>
                <View style={styles.row}>
                  <ThemedText style={{ color: textSecondary }}>
                    Delivery Fee
                  </ThemedText>
                  <ThemedText style={{ fontWeight: "600" }}>
                    {formatCurrency(group.deliveryFee, currencySymbol)}
                  </ThemedText>
                </View>
                <View style={[styles.divider, { backgroundColor: border }]} />
                <View style={styles.row}>
                  <ThemedText style={{ fontSize: 14, fontWeight: "700" }}>
                    Store Total
                  </ThemedText>
                  <ThemedText style={{ fontSize: 15, fontWeight: "700" }}>
                    {formatCurrency(group.total, currencySymbol)}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}

          {/* Grand Total Card - Only show if multiple groups */}
          {groups.length > 1 && (
            <View
              style={[
                styles.receiptCard,
                {
                  backgroundColor: primary + "10",
                  borderColor: primary,
                  marginTop: 12,
                },
              ]}
            >
              <View style={{ padding: 16 }}>
                <View style={styles.row}>
                  <ThemedText style={{ fontSize: 16, fontWeight: "700" }}>
                    Grand Total
                  </ThemedText>
                  <ThemedText
                    style={{ fontSize: 18, fontWeight: "800", color: primary }}
                  >
                    {formatCurrency(total, currencySymbol)}
                  </ThemedText>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* 4. Payment Method */}
        <View style={styles.sectionContainer}>
          <ThemedText style={[styles.sectionLabel, { color: textSecondary }]}>
            PAYMENT METHOD
          </ThemedText>
          <Pressable
            style={[
              styles.paymentCard,
              { backgroundColor: surface, borderColor: border },
            ]}
            onPress={() => setShowPaymentModal(true)}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              {renderPaymentIcon(selectedPaymentMethod || "paystack")}
              <ThemedText style={{ fontWeight: "600", fontSize: 15 }}>
                {getPaymentMethodLabel(selectedPaymentMethod || "paystack")}
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color={textSecondary} />
          </Pressable>
        </View>

        {/* Spacer for Floating Footer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 5. Sticky Footer */}
      <View
        style={[
          styles.footer,
          { backgroundColor: surface, borderTopColor: border },
        ]}
      >
        <Pressable
          disabled={!canProceed}
          onPress={handlePlaceOrder}
          style={[
            styles.placeOrderBtn,
            { backgroundColor: primary },
            !canProceed && styles.disabledBtn,
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <ThemedText style={styles.btnText}>Place Order</ThemedText>
              <View style={styles.btnPricePill}>
                <ThemedText
                  style={{ color: primary, fontWeight: "700", fontSize: 13 }}
                >
                  {formatCurrency(total, currencySymbol)}
                </ThemedText>
              </View>
            </>
          )}
        </Pressable>
      </View>

      {/* --- Modals (Logic unchanged) --- */}
      <AddressSelectionModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSelect={(addr) => {
          setSelectedAddress(addr);
          setShowAddressModal(false);
        }}
        selectedAddressId={selectedAddress?.id}
      />
      <PaymentMethodModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSelect={(method) => {
          setSelectedPaymentMethod(method);
          setShowPaymentModal(false);
        }}
        selectedMethod={selectedPaymentMethod}
      />
      {paymentUrl && paymentReference && (
        <PaymentWebView
          visible={showPaymentWebView}
          url={paymentUrl}
          reference={paymentReference}
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

// Helpers
function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString()}`;
}

function getPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    paystack: "Paystack",
    flutterwave: "Flutterwave",
    monnify: "Bank Transfer (Monnify)",
    transfer: "Direct Bank Transfer",
  };
  return labels[method] || method;
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8, marginLeft: -8 },
  scrollContent: { padding: 16 },

  // Section Headers
  sectionContainer: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Address Card
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addressTitle: { fontWeight: "700", fontSize: 15 },
  addressSub: { fontSize: 13, marginTop: 2 },
  defaultBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  editButton: { padding: 4 },

  // Receipt Card
  receiptCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  miniStoreLogo: { width: 24, height: 24, borderRadius: 6 },
  storeName: { fontWeight: "700", fontSize: 14 },

  itemsList: { padding: 16, paddingBottom: 8 },
  itemRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  qtyBadge: {
    backgroundColor: "#eee",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  itemName: { fontSize: 14 },
  itemPrice: { fontWeight: "600", fontSize: 14 },

  // Financials
  financials: { padding: 16, borderTopWidth: 1 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  divider: { height: 1, marginVertical: 8 },

  // Payment Card
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  placeOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  disabledBtn: { opacity: 0.5 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnPricePill: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
});
