import React, { useMemo, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Animated,
  StyleProp,
  ViewStyle,
} from "react-native";
import { RelativePathString, useRouter } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useCart } from "@/context/CartContext";
import { CartItem, Restaurant } from "@/types/cart";

/* -------------------------------------------------------------------------- */
/* TYPES */
/* -------------------------------------------------------------------------- */

type CartGroup = {
  id: string;
  restaurant?: Restaurant;
  items: CartItem[];
};

/* -------------------------------------------------------------------------- */
/* SCREEN */
/* -------------------------------------------------------------------------- */

export default function CartScreen() {
  const {
    items,
    restaurants,
    subtotal,
    deliveryFee,
    total,
    removeItem,
    increaseQty,
    decreaseQty,
    loading,
    canCheckout,
  } = useCart();

  const router = useRouter();

  const accent = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "borderDefault");
  const statusError = useThemeColor({}, "statusError");

  const currencySymbol = restaurants[0]?.currency ?? "₦";

  /* ------------------------------------------------------------------------ */
  /* GROUP ITEMS BY RESTAURANT */
  /* ------------------------------------------------------------------------ */

  const groupedByRestaurant = useMemo<CartGroup[]>(() => {
    if (!items.length) return [];

    const map = new Map<string, CartGroup>();

    items.forEach((item) => {
      const restaurant = restaurants.find((r) => r.id === item.vendorId);
      const key = restaurant?.id ?? item.vendorId;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          restaurant,
          items: [],
        });
      }

      map.get(key)!.items.push(item);
    });

    return Array.from(map.values());
  }, [items, restaurants]);

  /* ------------------------------------------------------------------------ */
  /* LOADING */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return <CartSkeleton onBack={() => router.back()} color={accent} />;
  }

  /* ------------------------------------------------------------------------ */
  /* EMPTY CART */
  /* ------------------------------------------------------------------------ */

  if (!items.length) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { backgroundColor: surface }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={accent} />
          </Pressable>
          <ThemedText type="title">Cart</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIconContainer,
              { backgroundColor: surfaceSubtle },
            ]}
          >
            <IconSymbol name="cart" size={64} color={borderColor} />
          </View>

          <ThemedText type="subtitle" style={styles.emptyTitle}>
            Your cart is empty
          </ThemedText>
          <ThemedText style={[styles.emptySubTitle, { color: textSecondary }]}>
            Add items from stores to get started
          </ThemedText>

          <Pressable
            style={[styles.browseBtn, { backgroundColor: accent }]}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.browseBtnText}>Browse Stores</ThemedText>
            <IconSymbol name="chevron.right" size={18} color="#fff" />
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* CART CONTENT */
  /* ------------------------------------------------------------------------ */

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surface }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={accent} />
        </Pressable>

        <View style={styles.headerCenter}>
          <ThemedText type="title" style={styles.headerTitle}>
            Cart
          </ThemedText>
          <View style={[styles.itemCountBadge, { backgroundColor: accent }]}>
            <ThemedText style={styles.itemCountText}>
              {items.reduce((s, i) => s + i.qty, 0)}
            </ThemedText>
          </View>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {groupedByRestaurant.map((group) => (
          <View key={group.id} style={styles.restaurantBlock}>
            {/* Restaurant header */}
            <View
              style={[
                styles.restaurantHeader,
                { backgroundColor: surfaceCard },
              ]}
            >
              {group.restaurant?.image ? (
                <Image
                  source={{ uri: group.restaurant.image }}
                  style={styles.restaurantLogo}
                />
              ) : (
                <View
                  style={[
                    styles.restaurantLogoPlaceholder,
                    { backgroundColor: surfaceSubtle },
                  ]}
                >
                  <IconSymbol name="house.fill" size={20} color={borderColor} />
                </View>
              )}

              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontWeight: "700" }}>
                  {group.restaurant?.name ?? "Store"}
                </ThemedText>
                {group.restaurant?.deliveryTime && (
                  <ThemedText style={{ color: textSecondary, fontSize: 12 }}>
                    {group.restaurant.deliveryTime}
                  </ThemedText>
                )}
              </View>

              <Pressable
                onPress={() =>
                  router.push(
                    `/(store)/store-screen/${group.restaurant?.id}` as RelativePathString,
                  )
                }
              >
                <IconSymbol
                  name="chevron.right"
                  size={18}
                  color={borderColor}
                />
              </Pressable>
            </View>

            {/* Items */}
            <View
              style={[styles.itemsWrapper, { backgroundColor: surfaceCard }]}
            >
              {group.items.map((item, index) => (
                <View key={item.id}>
                  <View style={styles.itemRow}>
                    <Image
                      source={
                        item.image
                          ? { uri: item.image }
                          : require("@/assets/images/placeholder.png")
                      }
                      style={styles.itemImage}
                    />

                    <View style={styles.itemInfo}>
                      <ThemedText
                        style={[styles.itemName, { color: textPrimary }]}
                        numberOfLines={2}
                      >
                        {item.name}
                      </ThemedText>

                      {item.description ? (
                        <ThemedText
                          style={[
                            styles.itemDescription,
                            { color: textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.description}
                        </ThemedText>
                      ) : null}

                      <View style={styles.itemFooter}>
                        <ThemedText style={[styles.price, { color: accent }]}>
                          {formatCurrency(
                            item.price * item.qty,
                            currencySymbol,
                          )}
                        </ThemedText>

                        <View style={styles.qtyRow}>
                          <Pressable
                            onPress={() => decreaseQty(item.id)}
                            style={[
                              styles.qtyBtn,
                              { backgroundColor: surfaceSubtle },
                            ]}
                          >
                            <IconSymbol
                              name="minus"
                              size={16}
                              color={textPrimary}
                            />
                          </Pressable>

                          <ThemedText
                            style={[styles.qtyText, { color: textPrimary }]}
                          >
                            {item.qty}
                          </ThemedText>

                          <Pressable
                            onPress={() => increaseQty(item.id)}
                            style={[
                              styles.qtyBtn,
                              { backgroundColor: surfaceSubtle },
                            ]}
                          >
                            <IconSymbol
                              name="plus"
                              size={16}
                              color={textPrimary}
                            />
                          </Pressable>
                        </View>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => removeItem(item.id)}
                      style={[
                        styles.removeBtn,
                        { backgroundColor: surfaceSubtle },
                      ]}
                    >
                      <IconSymbol name="trash" size={18} color={statusError} />
                    </Pressable>
                  </View>

                  {index < group.items.length - 1 && (
                    <View
                      style={[styles.divider, { backgroundColor: borderColor }]}
                    />
                  )}
                </View>
              ))}
            </View>

            <Pressable
              style={[styles.addMoreBtn, { borderColor: borderColor }]}
              onPress={() => router.back()}
            >
              <IconSymbol name="plus.circle.fill" size={20} color={accent} />
              <ThemedText style={[styles.addMoreText, { color: accent }]}>
                Add more items
              </ThemedText>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {/* Summary */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: surfaceCard, borderTopColor: borderColor },
        ]}
      >
        <View style={styles.summaryContent}>
          <View style={styles.summaryRow}>
            <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>
              Subtotal
            </ThemedText>
            <ThemedText style={[styles.summaryValue, { color: textPrimary }]}>
              {formatCurrency(subtotal, currencySymbol)}
            </ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelWithIcon}>
              <IconSymbol name="car.fill" size={16} color={textSecondary} />
              <ThemedText
                style={[styles.summaryLabel, { color: textSecondary }]}
              >
                Delivery Fee
              </ThemedText>
            </View>
            <ThemedText style={[styles.summaryValue, { color: textPrimary }]}>
              {formatCurrency(deliveryFee, currencySymbol)}
            </ThemedText>
          </View>

          <View
            style={[styles.summaryDivider, { backgroundColor: borderColor }]}
          />

          <View style={styles.summaryRow}>
            <ThemedText style={[styles.summaryTotal, { color: textPrimary }]}>
              Total
            </ThemedText>
            <ThemedText style={[styles.summaryTotal, { color: accent }]}>
              {formatCurrency(total, currencySymbol)}
            </ThemedText>
          </View>
        </View>

        {!canCheckout ? (
          <View
            style={[
              styles.warningBanner,
              { backgroundColor: surfaceSubtle, borderColor: statusError },
            ]}
          >
            <IconSymbol name="alert-circle" size={18} color={statusError} />
            <ThemedText style={[styles.warningText, { color: statusError }]}>
              Keep only one store in cart
            </ThemedText>
          </View>
        ) : null}

        <Pressable
          disabled={!canCheckout}
          onPress={() => router.push("/checkout")}
          style={[
            styles.placeOrderBtn,
            { backgroundColor: accent },
            !canCheckout && styles.placeOrderBtnDisabled,
          ]}
        >
          <ThemedText style={styles.placeOrderText}>
            Proceed to Checkout
          </ThemedText>
          <IconSymbol name="arrow.right" size={20} color="#fff" />
        </Pressable>
      </View>
    </ThemedView>
  );
}

/* -------------------------------------------------------------------------- */
/* HELPERS */
/* -------------------------------------------------------------------------- */

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString()}`;
}

/* -------------------------------------------------------------------------- */
/* SKELETON */
/* -------------------------------------------------------------------------- */

function SkeletonBlock({
  height,
  width,
  style,
}: {
  height: number;
  width?: number | string;
  style?: StyleProp<ViewStyle>;
}) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  const animatedStyle = {
    height,
    ...(typeof width === "number" && { width }),
    borderRadius: 16,
    backgroundColor: "#e0e0e0",
    opacity: pulse,
  };

  return (
    <Animated.View
      style={[
        animatedStyle,
        typeof width === "string" && { width: width as any },
        style,
      ]}
    />
  );
}

function CartSkeleton({
  onBack,
  color,
}: {
  onBack: () => void;
  color: string;
}) {
  return (
    <ThemedView style={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <IconSymbol name="arrow-left" size={20} color={color} />
      </Pressable>

      <SkeletonBlock height={180} />
      <SkeletonBlock height={100} style={{ marginTop: 16 }} />
    </ThemedView>
  );
}

/* -------------------------------------------------------------------------- */
/* STYLES */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },

  itemCountBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  itemCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 200,
    paddingTop: 8,
  },

  restaurantBlock: {
    marginBottom: 20,
  },

  restaurantHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  restaurantLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },

  restaurantLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  itemsWrapper: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  itemRow: {
    flexDirection: "row",
    paddingVertical: 12,
    gap: 12,
  },

  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },

  itemInfo: {
    flex: 1,
    justifyContent: "space-between",
  },

  itemName: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 4,
  },

  itemDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },

  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  price: {
    fontSize: 18,
    fontWeight: "800",
  },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  qtyText: {
    minWidth: 28,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },

  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  divider: {
    height: 1,
    opacity: 0.5,
  },

  addMoreBtn: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },

  addMoreText: {
    fontWeight: "700",
    fontSize: 15,
  },

  summaryCard: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },

  summaryContent: {
    marginBottom: 16,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  summaryLabelWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  summaryLabel: {
    fontSize: 15,
  },

  summaryValue: {
    fontWeight: "600",
    fontSize: 15,
  },

  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },

  summaryTotal: {
    fontSize: 20,
    fontWeight: "800",
  },

  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },

  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },

  placeOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },

  placeOrderBtnDisabled: {
    opacity: 0.4,
  },

  placeOrderText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },

  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
  },

  emptySubTitle: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },

  browseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 16,
  },

  browseBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
