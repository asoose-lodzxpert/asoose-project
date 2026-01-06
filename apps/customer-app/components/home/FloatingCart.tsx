import { Pressable, StyleSheet, View, Text } from "react-native";
import { useCart } from "@/context/CartContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";

export function FloatingCart() {
  const { items } = useCart();
  const primary = useThemeColor({}, "brandPrimary");
  const router = useRouter();
  const count = items.length;

  return (
    <Pressable
      style={[styles.fab, { backgroundColor: primary }]}
      onPress={() => router.push("/cart")}
      accessibilityRole="button"
      accessibilityLabel="View cart"
    >
      <IconSymbol name="cart" size={28} color="#fff" />
      <View style={styles.badgeContainer} pointerEvents="none">
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  badgeContainer: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#eee",
  },
  badgeText: {
    color: "#1a73e8",
    fontWeight: "bold",
    fontSize: 12,
  },
});
