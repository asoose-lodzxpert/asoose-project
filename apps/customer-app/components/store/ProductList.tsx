import React from "react";
import { View, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { Image } from "expo-image";
import { ThemedText } from "@/components/themed-text";
import { Product } from "@/types/store-types";
import { useThemeColor } from "@/hooks/use-theme-color";
import { RelativePathString, useRouter } from "expo-router";

export function ProductList({
  products,
  isRestaurant,
  onAddToCart,
  loading = false,
  disabled = false,
}: {
  products: Product[];
  isRestaurant: boolean;
  onAddToCart?: (productId: string) => void;
  loading?: boolean;
  vendorId: string;
  /** When true the add-to-cart button is visually muted and non-functional */
  disabled?: boolean;
}) {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const cardBg = useThemeColor({}, "surfaceCard");
  const text = useThemeColor({}, "textPrimary");
  const muted = useThemeColor({}, "textMuted");
  const price = useThemeColor({}, "textSecondary");
  const skeletonColor = useThemeColor({}, "surfaceSubtle");

  const sectionTitle = "Featured Products";

  const handleProductPress = (item: Product) => {
    router.push(`/product/${item.id}` as RelativePathString);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    // Safely get the first image or use a placeholder
    const imageUri =
      item.images && item.images.length > 0
        ? item.images[0]
        : "https://via.placeholder.com/150";

    // Safely get category name
    const categoryName = item.category?.name || "Uncategorized";

    const isSoldOut = item.manageStock && (item.stock <= 0 || item.status === 'OUT_OF_STOCK');
    const isEffectivelyDisabled = disabled || isSoldOut;

    return (
      <TouchableOpacity
        activeOpacity={isEffectivelyDisabled ? 1 : 0.85}
        onPress={() => !isEffectivelyDisabled && handleProductPress(item)}
        style={[styles.menuCard, { backgroundColor: cardBg }, isSoldOut && { opacity: 0.6 }]}
        disabled={isEffectivelyDisabled}
      >
        <Image
          source={{ uri: imageUri }}
          style={styles.menuImage}
          contentFit="cover"
          transition={200}
        />
        {isSoldOut && (
          <View style={styles.soldOutBadge}>
            <ThemedText style={styles.soldOutText}>Sold Out</ThemedText>
          </View>
        )}
        <View style={styles.cardContent}>
          <ThemedText
            style={[styles.menuTitle, { color: text }]}
            numberOfLines={2}
          >
            {item.name}
          </ThemedText>
          <ThemedText
            style={[styles.menuDescription, { color: muted }]}
            numberOfLines={1}
          >
            {categoryName}
          </ThemedText>
          <View style={styles.menuFooter}>
            <ThemedText style={[styles.menuPrice, { color: price }]}>
              ₦{item.price?.toFixed(2) || "0.00"}
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.addButton,
                { backgroundColor: isEffectivelyDisabled ? "#9ca3af" : primary },
              ]}
              onPress={(e) => {
                e.stopPropagation();
                if (!isEffectivelyDisabled) onAddToCart?.(item.id);
              }}
              disabled={isEffectivelyDisabled}
              activeOpacity={isEffectivelyDisabled ? 1 : 0.7}
            >
              <ThemedText style={[styles.addButtonText, { color: "#FFF" }]}>
                +
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSkeleton = (_: any, idx: number) => (
    <View
      key={idx}
      style={[styles.menuCard, { backgroundColor: cardBg, opacity: 0.5 }]}
    >
      <View style={[styles.menuImage, { backgroundColor: skeletonColor }]} />
      <View style={styles.cardContent}>
        <View
          style={{
            width: "60%",
            height: 18,
            backgroundColor: skeletonColor,
            borderRadius: 4,
            marginBottom: 4,
          }}
        />
        <View
          style={{
            width: "80%",
            height: 14,
            backgroundColor: skeletonColor,
            borderRadius: 4,
            marginBottom: 8,
          }}
        />
        <View style={styles.menuFooter}>
          <View
            style={{
              width: 60,
              height: 16,
              backgroundColor: skeletonColor,
              borderRadius: 4,
            }}
          />
          <View
            style={[styles.addButton, { backgroundColor: skeletonColor }]}
          />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.menuSection}>
      <ThemedText style={[styles.sectionTitle, { color: text }]}>
        {sectionTitle}
      </ThemedText>
      {loading ? (
        <View style={styles.gridContainer}>
          {Array.from({ length: 4 }).map((_, idx) => renderSkeleton(_, idx))}
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.menuList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  menuSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 16,
  },
  menuList: {
    paddingBottom: 100,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  menuCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    overflow: "hidden",
    flex: 1,
    maxWidth: "48%",
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  menuImage: {
    width: "100%",
    height: 120,
  },
  cardContent: {
    padding: 10,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 18,
  },
  menuDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  menuFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  soldOutBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120, // matches menuImage height
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  soldOutText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
    textTransform: "uppercase",
  },
});
