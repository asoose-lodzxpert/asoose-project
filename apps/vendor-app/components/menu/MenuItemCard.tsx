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
import { Product } from "@/services/products.service";

interface Props {
  item: Product;
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
  const muted = useThemeColor({}, "textDisabled");

  const isInStock = item.status === "ACTIVE";
  const isOutOfStock = item.status === "OUT_OF_STOCK";

  return (
    <View style={[styles.card, { backgroundColor: background }]}>
      {/* ---------- Top ---------- */}
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
            source={
              item.images?.length && !imageError
                ? { uri: item.images[0] }
                : require("@/assets/images/image-placeholder.png")
            }
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

          {item.category?.name && (
            <ThemedText style={styles.category}>
              {item.category.name}
            </ThemedText>
          )}

          {isOutOfStock && (
            <View style={styles.outOfStock}>
              <ThemedText style={styles.outText}>Out of stock</ThemedText>
            </View>
          )}

          <ThemedText style={styles.price}>
            ₦{item.price.toLocaleString()}
          </ThemedText>

          {item.stock !== undefined && (
            <ThemedText style={styles.stock}>Stock: {item.stock}</ThemedText>
          )}
        </View>

        <Switch
          value={isInStock}
          onValueChange={onToggleStock}
          trackColor={{ false: "#E5E7EB", true: primary }}
          thumbColor={isInStock ? primary : "#F3F4F6"}
          ios_backgroundColor="#E5E7EB"
        />
      </View>

      {/* ---------- Modifiers ---------- */}
      {item.modifierGroups?.length ? (
        <>
          <View style={[styles.divider, { borderColor: border }]} />

          <View style={styles.modifiers}>
            {item.modifierGroups.map((group) => (
              <View key={group.id} style={styles.modifierGroup}>
                <ThemedText style={styles.groupName}>
                  {group.name}
                  <ThemedText style={{ color: muted }}>
                    {" "}
                    ({group.minSelect}-{group.maxSelect})
                  </ThemedText>
                </ThemedText>

                <View style={styles.modifierList}>
                  {group.modifiers.map((mod) => (
                    <ThemedText key={mod.id} style={styles.modifierItem}>
                      • {mod.name}
                      {mod.price > 0 && (
                        <ThemedText style={{ color: muted }}>
                          {" "}
                          (+₦{mod.price.toLocaleString()})
                        </ThemedText>
                      )}
                    </ThemedText>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* ---------- Actions ---------- */}
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

/* ---------- Styles ---------- */

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

  category: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },

  outOfStock: {
    alignSelf: "flex-start",
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
  },

  outText: {
    fontSize: 12,
    color: "#B91C1C",
  },

  price: {
    marginTop: 2,
    fontSize: 14,
    opacity: 0.8,
  },

  stock: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },

  modifiers: {
    gap: 8,
  },

  modifierGroup: {
    gap: 4,
  },

  groupName: {
    fontSize: 13,
    fontWeight: "600",
  },

  modifierList: {
    paddingLeft: 6,
    gap: 2,
  },

  modifierItem: {
    fontSize: 12,
    opacity: 0.75,
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
