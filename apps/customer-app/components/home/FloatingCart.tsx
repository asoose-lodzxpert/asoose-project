import { Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useCart } from "@/context/CartContext";
import { useThemeColor } from "@/hooks/use-theme-color";

export function FloatingCart() {
  const { items, total } = useCart();
  const primary = useThemeColor({}, "brandPrimary");

  if (!items.length) return null;

  return (
    <Pressable style={[styles.bar, { backgroundColor: primary }]}>
      <ThemedText style={styles.text}>
        View Cart ({items.length} items) • ${total.toFixed(2)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  text: { fontWeight: "700" },
});
