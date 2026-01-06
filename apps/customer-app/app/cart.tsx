import React from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useCart } from "@/context/CartContext";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function CartScreen() {
  const { items, restaurants, total, removeItem, increaseQty, decreaseQty } =
    useCart();

  const groupedByRestaurant = items.reduce(
    (acc, item) => {
      if (!acc[item.restaurantId]) acc[item.restaurantId] = [];
      acc[item.restaurantId].push(item);
      return acc;
    },
    {} as Record<string, typeof items>
  );

  if (items.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.empty}>Your cart is empty.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Your Cart
      </ThemedText>

      {Object.entries(groupedByRestaurant).map(
        ([restaurantId, restaurantItems]) => {
          const restaurant = restaurants.find((r) => r.id === restaurantId);

          return (
            <View key={restaurantId} style={styles.restaurantBlock}>
              {/* ---------------- Restaurant Header ---------------- */}
              <View style={styles.restaurantHeader}>
                <View>
                  <ThemedText style={styles.restaurantName}>
                    {restaurant?.name}
                  </ThemedText>
                  <ThemedText style={styles.deliveryTime}>
                    {restaurant?.deliveryTime}
                  </ThemedText>
                </View>
              </View>

              {/* ---------------- Items ---------------- */}
              <View style={styles.itemsWrapper}>
                {restaurantItems.map((item, index) => (
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
                        <ThemedText style={styles.itemName}>
                          {item.name}
                        </ThemedText>

                        {item.options && (
                          <ThemedText style={styles.itemOptions}>
                            {item.options}
                          </ThemedText>
                        )}

                        <View style={styles.qtyRow}>
                          <Pressable
                            onPress={() => decreaseQty(item.id)}
                            style={styles.qtyBtn}
                          >
                            <ThemedText>-</ThemedText>
                          </Pressable>
                          <ThemedText style={styles.qtyText}>
                            {item.qty}
                          </ThemedText>
                          <Pressable
                            onPress={() => increaseQty(item.id)}
                            style={styles.qtyBtn}
                          >
                            <ThemedText>+</ThemedText>
                          </Pressable>
                        </View>
                      </View>

                      <View style={styles.rightCol}>
                        <ThemedText style={styles.price}>
                          ${(item.price * item.qty).toFixed(2)}
                        </ThemedText>
                        <Pressable onPress={() => removeItem(item.id)}>
                          <IconSymbol name="trash" size={18} color="#e53935" />
                        </Pressable>
                      </View>
                    </View>

                    {index < restaurantItems.length - 1 && (
                      <View style={styles.divider} />
                    )}
                  </View>
                ))}
              </View>

              {/* ---------------- Add More Items ---------------- */}
              <Pressable style={styles.addMoreBtn}>
                <ThemedText style={styles.addMoreText}>
                  Add more items from {restaurant?.name}
                </ThemedText>
              </Pressable>
            </View>
          );
        }
      )}

      {/* ---------------- Footer ---------------- */}
      <View style={styles.footer}>
        <ThemedText style={styles.total}>Total: ${total.toFixed(2)}</ThemedText>

        <Pressable style={styles.placeOrderBtn}>
          <ThemedText style={styles.placeOrderText}>Place Order</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  empty: { marginTop: 32, textAlign: "center", color: "#888" },

  /* Restaurant */
  restaurantBlock: {
    marginBottom: 24,
    borderRadius: 14,
    backgroundColor: "#f6f6f6",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  restaurantHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  restaurantName: { fontSize: 18, fontWeight: "700" },
  deliveryTime: { fontSize: 13, color: "#666", marginTop: 4 },

  /* Items */
  itemsWrapper: {
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
  },
  itemRow: {
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "flex-start",
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: { flex: 1 },
  itemName: { fontWeight: "600", marginBottom: 2 },
  itemOptions: { fontSize: 12, color: "#777" },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { marginHorizontal: 12 },

  rightCol: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 56,
  },
  price: { fontWeight: "600", marginBottom: 8 },

  divider: {
    height: 1,
    backgroundColor: "#eee",
  },

  /* Actions */
  addMoreBtn: {
    marginTop: 16,
    paddingVertical: 12,
  },
  addMoreText: {
    color: "#f4b400",
    fontWeight: "600",
  },

  footer: { marginTop: 24 },
  total: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  placeOrderBtn: {
    backgroundColor: "#f4b400",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  placeOrderText: {
    fontWeight: "700",
    fontSize: 16,
  },
});
