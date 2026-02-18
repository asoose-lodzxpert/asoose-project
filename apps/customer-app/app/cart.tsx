import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter, RelativePathString } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useCart } from "@/context/CartContext";

export default function CartScreen() {
  const {
    items,
    restaurants,
    total,
    subtotal,
    deliveryFee,
    removeItem,
    increaseQty,
    decreaseQty,
    canCheckout,
  } = useCart();
  const router = useRouter();

  const primary = useThemeColor({}, "brandPrimary");
  const bgGrey = useThemeColor({}, "surfaceBackground");
  const white = useThemeColor({}, "surfaceCard");
  const textMain = useThemeColor({}, "textPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  const borderLight = useThemeColor({}, "surfaceSubtle");

  const currency = restaurants[0]?.currency ?? "₦";

  const grouped = useMemo(() => {
    const map = new Map<string, any>();
    items.forEach((item) => {
      const restaurant = restaurants.find((r) => r.id === item.vendorId);
      if (!map.has(item.vendorId))
        map.set(item.vendorId, { restaurant, items: [] });
      map.get(item.vendorId).items.push(item);
    });
    return Array.from(map.values());
  }, [items, restaurants]);

  if (!items.length) return <EmptyCart primary={primary} router={router} />;

  return (
    <View style={[styles.container, { backgroundColor: bgGrey }]}>
      {/* 1. Header (Standard Pro Style) */}
      <View style={[styles.header, { backgroundColor: white }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="arrow.left" size={22} color={primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>
          Cart ({items.length})
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 2. Grouped Items */}
        {grouped.map((group, idx) => (
          <View key={idx} style={[styles.section, { backgroundColor: white }]}>
            <View style={styles.vendorHeader}>
              <IconSymbol name="storefront" size={16} color={textMuted} />
              <ThemedText style={styles.vendorName}>
                {group.restaurant?.name || "Seller"}
              </ThemedText>
            </View>

            {group.items.map((item: any) => (
              <View key={item.id} style={styles.itemRow}>
                <Image source={{ uri: item.image }} style={styles.itemImg} />

                <View style={styles.itemInfo}>
                  <ThemedText style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </ThemedText>
                  <ThemedText style={[styles.itemPrice, { color: primary }]}>
                    {currency}
                    {item.price.toLocaleString()}
                  </ThemedText>

                  <View style={styles.itemActions}>
                    <Pressable
                      onPress={() => removeItem(item.id)}
                      style={styles.removeBtn}
                    >
                      <IconSymbol name="trash" size={16} color={primary} />
                      <ThemedText
                        style={[styles.removeText, { color: primary }]}
                      >
                        REMOVE
                      </ThemedText>
                    </Pressable>

                    <View style={styles.stepper}>
                      <Pressable
                        onPress={() =>
                          item.qty > 1
                            ? decreaseQty(item.id)
                            : removeItem(item.id)
                        }
                        style={styles.stepAction}
                      >
                        <ThemedText style={styles.stepText}>-</ThemedText>
                      </Pressable>
                      <ThemedText style={styles.qtyValue}>
                        {item.qty}
                      </ThemedText>
                      <Pressable
                        onPress={() => increaseQty(item.id)}
                        style={styles.stepAction}
                      >
                        <ThemedText style={styles.stepText}>+</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* 3. Order Summary Section */}
        <View style={[styles.summarySection, { backgroundColor: white }]}>
          <ThemedText style={styles.summaryTitle}>ORDER SUMMARY</ThemedText>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
            <ThemedText style={styles.summaryPrice}>
              {currency}
              {subtotal.toLocaleString()}
            </ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Delivery Fee</ThemedText>
            <ThemedText style={styles.summaryPrice}>
              {currency}
              {deliveryFee.toLocaleString()}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: borderLight }]} />
          <View style={styles.summaryRow}>
            <ThemedText style={styles.totalLabel}>Total</ThemedText>
            <ThemedText style={[styles.totalPrice, { color: textMain }]}>
              {currency}
              {total.toLocaleString()}
            </ThemedText>
          </View>
        </View>

        <View style={styles.trustBadge}>
          <IconSymbol name="checkmark.shield.fill" size={14} color="#4CAF50" />
          <ThemedText style={styles.trustText}>
            Secure Checkout Guaranteed
          </ThemedText>
        </View>
      </ScrollView>

      {/* 4. Sticky Footer Button */}
      <View style={[styles.footer, { backgroundColor: white }]}>
        <Pressable
          onPress={() => router.push("/checkout")}
          disabled={!canCheckout}
          style={[
            styles.checkoutBtn,
            { backgroundColor: primary },
            !canCheckout && { opacity: 0.5 },
          ]}
        >
          <ThemedText style={styles.checkoutBtnText}>
            CHECKOUT ({currency}
            {total.toLocaleString()})
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyCart({ primary, router }: any) {
  return (
    <View style={styles.emptyContainer}>
      <IconSymbol name="cart" size={80} color="#ccc" />
      <ThemedText style={styles.emptyTitle}>Your cart is empty!</ThemedText>
      <Pressable
        onPress={() => router.back()}
        style={[styles.shopBtn, { backgroundColor: primary }]}
      >
        <ThemedText style={styles.shopBtnText}>START SHOPPING</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",

    paddingTop: Platform.OS === "ios" ? 50 : 30,
    height: Platform.OS === "ios" ? 100 : 100,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  backBtn: { width: 40 },
  section: { marginTop: 10, paddingVertical: 10 },
  vendorHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F2",
    gap: 8,
  },
  vendorName: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    color: "#75757A",
  },
  itemRow: {
    flexDirection: "row",
    padding: 15,
    borderBottomWidth: 8,
    borderBottomColor: "#F1F1F2",
  },
  itemImg: {
    width: 90,
    height: 90,
    borderRadius: 4,
    backgroundColor: "#F9F9F9",
  },
  itemInfo: { flex: 1, marginLeft: 15, justifyContent: "space-between" },
  itemName: { fontSize: 15, color: "#282828" },
  itemPrice: { fontSize: 17, fontWeight: "700", marginTop: 4 },
  itemActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  removeBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  removeText: { fontSize: 13, fontWeight: "600" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 4,
  },
  stepAction: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9F9F9",
  },
  stepText: { fontSize: 18, fontWeight: "600" },
  qtyValue: { paddingHorizontal: 15, fontSize: 15, fontWeight: "600" },
  summarySection: { marginTop: 10, padding: 15, paddingBottom: 30 },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 15,
    color: "#75757A",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 14, color: "#75757A" },
  summaryPrice: { fontSize: 14, fontWeight: "600" },
  divider: { height: 1, marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: "700" },
  totalPrice: { fontSize: 18, fontWeight: "800" },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 6,
  },
  trustText: { fontSize: 12, color: "#4CAF50", fontWeight: "600" },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingBottom: Platform.OS === "ios" ? 35 : 15,
  },
  checkoutBtn: {
    height: 50,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkoutBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 20,
  },
  shopBtn: {
    paddingHorizontal: 40,
    height: 48,
    borderRadius: 4,
    justifyContent: "center",
  },
  shopBtnText: { color: "#FFF", fontWeight: "700" },
});
