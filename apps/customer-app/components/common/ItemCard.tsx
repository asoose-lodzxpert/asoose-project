import { View, StyleSheet, Image, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { Item } from "@/types/item";

const ITEM_PLACEHOLDER = require("@/assets/placeholders/item.jpg");

type Props = {
  item: Item;
  onPress?: () => void;
};

export function ItemCard({ item, onPress }: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const card = useThemeColor({}, "surfaceCard");

  return (
    <Pressable
      style={[styles.card, { backgroundColor: card }]}
      onPress={onPress}
    >
      {/* ---------------- Image ---------------- */}
      <View style={styles.imageWrap}>
        <Image
          source={item.image ? { uri: item.image } : ITEM_PLACEHOLDER}
          style={styles.image}
          resizeMode="cover"
        />

        {typeof item.discount === "number" && item.discount > 0 && (
          <View style={[styles.discount, { backgroundColor: primary }]}>
            <ThemedText style={styles.discountText}>
              -{item.discount}%
            </ThemedText>
          </View>
        )}
      </View>

      {/* ---------------- Info ---------------- */}
      <View style={styles.info}>
        <ThemedText numberOfLines={2} style={styles.name}>
          {item.name}
        </ThemedText>

        <ThemedText style={styles.price}>
          ₦{item.price.toLocaleString("en-NG")}
        </ThemedText>
      </View>
    </Pressable>
  );
}

/* ---------------------------------- */
/* Styles */
/* ---------------------------------- */
const IMAGE_HEIGHT = 120;

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    overflow: "hidden",
    flex: 1,
  },

  imageWrap: {
    height: IMAGE_HEIGHT,
    width: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
  },

  discount: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000",
  },

  info: {
    padding: 8,
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
  },
});
