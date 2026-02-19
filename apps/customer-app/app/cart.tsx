import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
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
  const bg = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const subtle = useThemeColor({}, "surfaceSubtle");
  const border = useThemeColor({}, "borderDefault");
  const textMain = useThemeColor({}, "textPrimary");
  const textSub = useThemeColor({}, "textSecondary");
  const textMuted = useThemeColor({}, "textMuted");
  const onPrimary = useThemeColor({}, "textOnPrimary");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");

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

  if (!items.length) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: bg }]}>
        <View style={[styles.emptyIconWrap, { backgroundColor: subtle }]}>
          <IconSymbol name="cart" size={48} color={textMuted} />
        </View>
        <ThemedText style={[styles.emptyTitle, { color: textMain }]}>
          Your cart is empty
        </ThemedText>
        <ThemedText style={[styles.emptySubtitle, { color: textSub }]}>
          Add items from a restaurant to get started
        </ThemedText>
        <Pressable
          onPress={() => router.back()}
          style={[styles.shopBtn, { backgroundColor: primary }]}
        >
          <ThemedText style={[styles.shopBtnText, { color: onPrimary }]}>
            Browse Restaurants
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: card, borderBottomColor: border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="arrow.left" size={20} color={textMain} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: textMain }]}>
          Cart
        </ThemedText>
        <View style={[styles.badge, { backgroundColor: `${primary}20` }]}>
          <ThemedText style={[styles.badgeText, { color: primary }]}>
            {items.length}
          </ThemedText>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Grouped item sections */}
        {grouped.map((group, idx) => (
          <View key={idx} style={[styles.section, { backgroundColor: card }]}>
            {/* Vendor row */}
            <View style={[styles.vendorRow, { borderBottomColor: border }]}>
              <IconSymbol name="storefront" size={14} color={textMuted} />
              <ThemedText style={[styles.vendorName, { color: textMuted }]}>
                {group.restaurant?.name ?? "Seller"}
              </ThemedText>
            </View>

            {group.items.map((item: any, itemIdx: number) => (
              <View
                key={item.id}
                style={[
                  styles.itemRow,
                  itemIdx < group.items.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: border,
                  },
                ]}
              >
                <Image
                  source={{ uri: item.image }}
                  style={[styles.itemImg, { backgroundColor: subtle }]}
                />

                <View style={styles.itemInfo}>
                  <ThemedText
                    style={[styles.itemName, { color: textMain }]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </ThemedText>
                  <ThemedText style={[styles.itemPrice, { color: primary }]}>
                    {currency}
                    {item.price.toLocaleString()}
                  </ThemedText>

                  <View style={styles.itemFooter}>
                    {/* Remove */}
                    <Pressable
                      onPress={() => removeItem(item.id)}
                      style={styles.removeBtn}
                      hitSlop={6}
                    >
                      <IconSymbol name="trash" size={14} color={danger} />
                      <ThemedText
                        style={[styles.removeText, { color: danger }]}
                      >
                        Remove
                      </ThemedText>
                    </Pressable>

                    {/* Stepper */}
                    <View
                      style={[
                        styles.stepper,
                        { borderColor: border, backgroundColor: subtle },
                      ]}
                    >
                      <Pressable
                        onPress={() =>
                          item.qty > 1
                            ? decreaseQty(item.id)
                            : removeItem(item.id)
                        }
                        style={styles.stepBtn}
                        hitSlop={6}
                      >
                        <ThemedText
                          style={[styles.stepGlyph, { color: textMain }]}
                        >
                          −
                        </ThemedText>
                      </Pressable>
                      <ThemedText style={[styles.qtyText, { color: textMain }]}>
                        {item.qty}
                      </ThemedText>
                      <Pressable
                        onPress={() => increaseQty(item.id)}
                        style={styles.stepBtn}
                        hitSlop={6}
                      >
                        <ThemedText
                          style={[styles.stepGlyph, { color: primary }]}
                        >
                          +
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Order summary */}
        <View style={[styles.summary, { backgroundColor: card }]}>
          <ThemedText style={[styles.summaryHeading, { color: textMuted }]}>
            Order Summary
          </ThemedText>

          <View style={styles.summaryRow}>
            <ThemedText style={[styles.summaryLabel, { color: textSub }]}>
              Subtotal
            </ThemedText>
            <ThemedText style={[styles.summaryValue, { color: textMain }]}>
              {currency}
              {subtotal.toLocaleString()}
            </ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText style={[styles.summaryLabel, { color: textSub }]}>
              Delivery fee
            </ThemedText>
            <ThemedText style={[styles.summaryValue, { color: textMain }]}>
              {currency}
              {deliveryFee.toLocaleString()}
            </ThemedText>
          </View>

          <View style={[styles.divider, { backgroundColor: border }]} />

          <View style={styles.summaryRow}>
            <ThemedText style={[styles.totalLabel, { color: textMain }]}>
              Total
            </ThemedText>
            <ThemedText style={[styles.totalValue, { color: primary }]}>
              {currency}
              {total.toLocaleString()}
            </ThemedText>
          </View>
        </View>

        {/* Trust badge */}
        <View style={styles.trust}>
          <IconSymbol name="checkmark.shield.fill" size={13} color={success} />
          <ThemedText style={[styles.trustText, { color: success }]}>
            Secure checkout guaranteed
          </ThemedText>
        </View>
      </ScrollView>

      {/* Sticky checkout footer */}
      <View
        style={[
          styles.footer,
          { backgroundColor: card, borderTopColor: border },
        ]}
      >
        <Pressable
          onPress={() => router.push("/checkout")}
          disabled={!canCheckout}
          style={[
            styles.checkoutBtn,
            { backgroundColor: primary },
            !canCheckout && { opacity: 0.45 },
          ]}
        >
          <ThemedText style={[styles.checkoutText, { color: onPrimary }]}>
            Checkout · {currency}
            {total.toLocaleString()}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
  },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 13, fontWeight: "700" },

  scroll: { paddingBottom: 40 },

  // Item sections
  section: {
    marginTop: 10,
    borderRadius: 2,
    overflow: "hidden",
  },
  vendorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 6,
  },
  vendorName: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  itemImg: {
    width: 80,
    height: 80,
    borderRadius: 10,
    flexShrink: 0,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  itemPrice: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  removeText: { fontSize: 12, fontWeight: "600" },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  stepBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stepGlyph: { fontSize: 18, fontWeight: "500", lineHeight: 20 },
  qtyText: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
  },

  // Summary
  summary: {
    marginTop: 10,
    padding: 20,
  },
  summaryHeading: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  divider: { height: 1, marginVertical: 12 },
  totalLabel: { fontSize: 15, fontWeight: "700" },
  totalValue: { fontSize: 17, fontWeight: "800" },

  // Trust
  trust: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 6,
  },
  trustText: { fontSize: 12, fontWeight: "600" },

  // Footer
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 16,
    borderTopWidth: 1,
  },
  checkoutBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutText: { fontSize: 15, fontWeight: "700" },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  shopBtn: {
    paddingHorizontal: 32,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  shopBtnText: { fontSize: 14, fontWeight: "700" },
});
