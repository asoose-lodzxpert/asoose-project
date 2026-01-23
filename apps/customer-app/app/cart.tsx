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
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useCart } from "@/context/CartContext";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { CartItem, Restaurant } from "@/types/cart";

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
    error,
    canCheckout,
  } = useCart();

  const router = useRouter();
  const accent = useThemeColor({}, "brandPrimary");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const textSecondary = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "borderDefault");
  const statusError = useThemeColor({}, "statusError");
  const currencySymbol = restaurants[0]?.currency ?? "₦";

  const groupedByRestaurant = useMemo(() => {
    if (!items.length) return [] as CartGroup[];
    const buckets = new Map<string, CartGroup>();
    items.forEach((item) => {
      const restaurant = restaurants.find((r) => r.id === item.restaurantId);
      const key = restaurant?.id || item.restaurantId || `unknown-${item.id}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          id: key,
          restaurant,
          items: [],
        });
      }
      buckets.get(key)!.items.push(item);
    });
    return Array.from(buckets.values());
  }, [items, restaurants]);

  if (loading) {
    return <CartSkeleton onBack={() => router.back()} />;
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Your Cart
        </ThemedText>
        <Pressable
          style={[styles.backButton, { backgroundColor: accent }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <IconSymbol name="arrow.left" size={20} color="#fff" />
        </Pressable>
      </View>

      {error ? (
        <View style={[styles.banner, { borderColor: statusError }]}>
          <IconSymbol name="alert-circle" size={18} color={statusError} />
          <ThemedText style={[styles.bannerText, { color: statusError }]}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Image
            source={require("@/assets/images/placeholder.png")}
            style={styles.emptyImage}
          />
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            Cart is empty
          </ThemedText>
          <ThemedText style={[styles.emptySubTitle, { color: textSecondary }]}>
            Browse stores and add meals to see them here.
          </ThemedText>
          <Pressable
            style={[styles.browseBtn, { backgroundColor: accent }]}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={16} color="#fff" />
            <ThemedText style={styles.browseBtnText}>Explore stores</ThemedText>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {groupedByRestaurant.map((group) => (
              <View key={group.id} style={styles.restaurantBlock}>
                <View style={styles.restaurantHeader}>
                  <View style={styles.restaurantMeta}>
                    <ThemedText style={styles.restaurantName}>
                      {group.restaurant?.name || "Store"}
                    </ThemedText>
                    {group.restaurant?.deliveryTime ? (
                      <ThemedText
                        style={[styles.deliveryTime, { color: textSecondary }]}
                      >
                        {group.restaurant.deliveryTime}
                      </ThemedText>
                    ) : null}
                  </View>
                  {group.restaurant?.image ? (
                    <Image
                      source={{ uri: group.restaurant.image }}
                      style={styles.restaurantLogo}
                    />
                  ) : null}
                </View>

                <View
                  style={[
                    styles.itemsWrapper,
                    { backgroundColor: surfaceCard },
                  ]}
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
                          defaultSource={require("@/assets/images/placeholder.png")}
                        />

                        <View style={styles.itemInfo}>
                          <View style={styles.itemTitleRow}>
                            <ThemedText style={styles.itemName}>
                              {item.name}
                            </ThemedText>
                            {item.available === false && (
                              <ThemedText
                                style={[
                                  styles.unavailableTag,
                                  {
                                    color: statusError,
                                    borderColor: statusError,
                                  },
                                ]}
                              >
                                unavailable
                              </ThemedText>
                            )}
                          </View>

                          {item.options ? (
                            <ThemedText
                              style={[
                                styles.itemOptions,
                                { color: textSecondary },
                              ]}
                            >
                              {item.options}
                            </ThemedText>
                          ) : null}

                          {item.description ? (
                            <ThemedText
                              style={[
                                styles.itemDescription,
                                { color: textSecondary },
                              ]}
                            >
                              {item.description}
                            </ThemedText>
                          ) : null}

                          <View style={styles.qtyRow}>
                            <Pressable
                              onPress={() => decreaseQty(item.id)}
                              style={[styles.qtyBtn, { borderColor }]}
                              accessibilityLabel={`Decrease quantity for ${item.name}`}
                            >
                              <ThemedText>-</ThemedText>
                            </Pressable>
                            <ThemedText style={styles.qtyText}>
                              {item.qty}
                            </ThemedText>
                            <Pressable
                              onPress={() => increaseQty(item.id)}
                              style={[styles.qtyBtn, { borderColor }]}
                              accessibilityLabel={`Increase quantity for ${item.name}`}
                            >
                              <ThemedText>+</ThemedText>
                            </Pressable>
                          </View>
                        </View>

                        <View style={styles.rightCol}>
                          <ThemedText style={styles.price}>
                            {formatCurrency(
                              item.price * item.qty,
                              currencySymbol,
                            )}
                          </ThemedText>
                          <Pressable
                            onPress={() => removeItem(item.id)}
                            style={styles.removeBtn}
                            accessibilityLabel={`Remove ${item.name}`}
                          >
                            <IconSymbol
                              name="trash"
                              size={16}
                              color={statusError}
                            />
                          </Pressable>
                        </View>
                      </View>

                      {index < group.items.length - 1 && (
                        <View
                          style={[
                            styles.divider,
                            { backgroundColor: borderColor },
                          ]}
                        />
                      )}
                    </View>
                  ))}
                </View>

                <Pressable
                  style={styles.addMoreBtn}
                  onPress={() => router.back()}
                >
                  <ThemedText style={[styles.addMoreText, { color: accent }]}>
                    Add more from {group.restaurant?.name || "this store"}
                  </ThemedText>
                  <IconSymbol name="chevron.right" size={16} color={accent} />
                </Pressable>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.summaryCard, { backgroundColor: surfaceCard }]}>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {formatCurrency(subtotal, currencySymbol)}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Delivery</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {formatCurrency(deliveryFee, currencySymbol)}
              </ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryTotal}>Total</ThemedText>
              <ThemedText style={styles.summaryTotal}>
                {formatCurrency(total, currencySymbol)}
              </ThemedText>
            </View>
            {!canCheckout ? (
              <ThemedText
                style={[styles.checkoutNotice, { color: statusError }]}
              >
                Please keep only one store in your cart to checkout.
              </ThemedText>
            ) : null}
            <Pressable
              style={[
                styles.placeOrderBtn,
                !canCheckout && styles.placeOrderBtnDisabled,
                { backgroundColor: accent },
              ]}
              disabled={!canCheckout}
            >
              <ThemedText style={styles.placeOrderText}>
                Proceed to checkout
              </ThemedText>
            </Pressable>
          </View>
        </>
      )}
    </ThemedView>
  );
}

type CartGroup = {
  id: string;
  restaurant?: Restaurant;
  items: CartItem[];
};

function formatCurrency(value: number, currency: string) {
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${currency}${formatted}`;
}

type SkeletonBlockProps = {
  height: number;
  width?: number | string;
  style?: StyleProp<ViewStyle>;
};

function SkeletonBlock({ height, width = "100%", style }: SkeletonBlockProps) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  const skeletonBase = useThemeColor({}, "surfaceCard");

  useEffect(() => {
    const animation = Animated.loop(
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
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          height,
          width: width as number | `${number}%`,
          borderRadius: 16,
          backgroundColor: skeletonBase,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

function CartSkeleton({ onBack }: { onBack: () => void }) {
  const accent = useThemeColor({}, "brandPrimary");
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Your Cart
        </ThemedText>
        <Pressable
          style={[styles.backButton, { backgroundColor: accent }]}
          onPress={onBack}
        >
          <IconSymbol name="arrow.left" size={20} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.skeletonWrapper}>
        <SkeletonBlock height={180} />
        <SkeletonBlock height={100} style={{ marginTop: 16 }} />
      </View>
      <View style={styles.skeletonSummary}>
        <SkeletonBlock height={60} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  bannerText: {
    fontWeight: "600",
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyImage: {
    width: 120,
    height: 120,
    opacity: 0.4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptySubTitle: {
    textAlign: "center",
  },
  browseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    marginTop: 8,
  },
  browseBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  scrollContent: {
    paddingBottom: 160,
  },
  restaurantBlock: {
    marginBottom: 24,
  },
  restaurantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  restaurantMeta: {
    flex: 1,
    paddingRight: 12,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: "700",
  },
  deliveryTime: {
    marginTop: 4,
  },
  restaurantLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  itemsWrapper: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemRow: {
    flexDirection: "row",
    paddingVertical: 14,
    gap: 12,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
  },
  itemOptions: {
    fontSize: 12,
    marginTop: 4,
  },
  itemDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  unavailableTag: {
    fontSize: 10,
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    minWidth: 24,
    textAlign: "center",
    fontWeight: "600",
  },
  rightCol: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
  },
  removeBtn: {
    paddingVertical: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 4,
  },
  addMoreBtn: {
    marginTop: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addMoreText: {
    fontWeight: "600",
  },
  summaryCard: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    color: "#7a7a7a",
  },
  summaryValue: {
    fontWeight: "600",
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e0e0e0",
    marginVertical: 8,
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: "700",
  },
  checkoutNotice: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  placeOrderBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  placeOrderBtnDisabled: {
    opacity: 0.5,
  },
  placeOrderText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  skeletonWrapper: {
    gap: 16,
  },
  skeletonSummary: {
    marginTop: "auto",
  },
});
