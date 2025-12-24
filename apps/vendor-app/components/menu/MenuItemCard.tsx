import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  Switch,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { MenuItem } from "@/types/menu";

interface Props {
  item: MenuItem;
  onToggleStock: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const MenuItemCard: React.FC<Props> = ({
  item,
  onToggleStock,
  onEdit,
  onDelete,
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const border = useThemeColor({}, "borderDefault");
  const error = useThemeColor({}, "statusError");
  const primary = useThemeColor({}, "brandPrimary");
  const background = useThemeColor({}, "surfaceBackground");

  return (
    <View style={[styles.card, { backgroundColor: background }]}>
      <View style={styles.top}>
        <View style={styles.imageWrapper}>
          {imageLoading && (
            <ActivityIndicator
              size="small"
              color={primary}
              style={styles.loader}
            />
          )}
          <Image
            source={{
              uri: imageError
                ? require("@/assets/images/image-placeholder.png")
                : item.images[0],
            }}
            style={styles.image}
            resizeMode="cover"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
        </View>

        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">{item.name}</ThemedText>

          {!item.inStock && (
            <View style={styles.outOfStock}>
              <ThemedText style={styles.outText}>Out of stock</ThemedText>
            </View>
          )}

          <ThemedText style={styles.price}>
            ₦{item.price.toLocaleString()}
          </ThemedText>
        </View>

        <Switch
          value={item.inStock}
          onValueChange={onToggleStock}
          trackColor={{
            false: "#E5E7EB",
            true: primary,
          }}
          thumbColor={item.inStock ? primary : "#F3F4F6"}
          ios_backgroundColor="#E5E7EB"
        />
      </View>

      <View style={[styles.divider, { borderColor: border }]} />

      <View style={styles.actions}>
        <Pressable
          onPress={onEdit}
          style={[styles.button, { backgroundColor: primary }]}
        >
          <IconSymbol name="pencil" size={16} color="#fff" />
          <ThemedText style={styles.buttonText}>Edit</ThemedText>
        </Pressable>

        <Pressable
          onPress={onDelete}
          style={[styles.button, { backgroundColor: error }]}
        >
          <IconSymbol name="trash" size={16} color="#fff" />
          <ThemedText style={styles.buttonText}>Delete</ThemedText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  top: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  imageWrapper: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  loader: {
    position: "absolute",
    zIndex: 1,
  },

  outOfStock: {
    alignSelf: "flex-start",
    marginTop: 4,
    marginBottom: 4,
    minWidth: 90,
    paddingHorizontal: 6,
    paddingVertical: 4,
    // borderRadius: 999,
    backgroundColor: "#FEE2E2",
  },

  outText: {
    fontSize: 12,
    color: "#B91C1C",
    textAlign: "center",
  },

  price: {
    marginTop: 2,
    fontSize: 14,
    opacity: 0.8,
  },

  divider: {
    marginVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },

  buttonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
