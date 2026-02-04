import React, { useState } from "react";
import { ProductModal } from "./ProductModal";
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Product } from "@/types/store-types";
import { useThemeColor } from "@/hooks/use-theme-color";

export function ProductList({
  products,
  isRestaurant,
  onAddToCart,
  loading = false,
  vendorId,
}: {
  products: Product[];
  isRestaurant: boolean;
  onAddToCart?: (productId: string) => void;
  loading?: boolean;
  vendorId: string;
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const primary = useThemeColor({}, "brandPrimary");
  const cardBg = useThemeColor({}, "surfaceCard");
  const text = useThemeColor({}, "textPrimary");
  const muted = useThemeColor({}, "textMuted");
  const price = useThemeColor({}, "textSecondary");
  const skeletonColor = useThemeColor({}, "surfaceSubtle");

  const sectionTitle = isRestaurant ? "Popular Items" : "Featured Products";

  const handleOpenModal = (item: Product) => {
    setSelectedProduct(item);
    setQty(1);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedProduct(null);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    // Safely get the first image or use a placeholder
    const imageUri =
      item.images && item.images.length > 0
        ? item.images[0]
        : "https://via.placeholder.com/150";

    // Safely get category name
    const categoryName = item.category?.name || "Uncategorized";

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handleOpenModal(item)}
        style={[styles.menuCard, { backgroundColor: cardBg }]}
      >
        <Image source={{ uri: imageUri }} style={styles.menuImage} />
        <ThemedText style={[styles.menuTitle, { color: text }]}>
          {item.name}
        </ThemedText>
        <ThemedText style={[styles.menuDescription, { color: muted }]}>
          {item.description} • {categoryName}
        </ThemedText>
        <View style={styles.menuFooter}>
          <ThemedText style={[styles.menuPrice, { color: price }]}>
            ₦{item.price?.toFixed(2) || "0.00"}
          </ThemedText>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: primary }]}
            onPress={(e) => {
              e.stopPropagation();
              onAddToCart?.(item.id);
            }}
          >
            <ThemedText style={[styles.addButtonText, { color: text }]}>
              +
            </ThemedText>
          </TouchableOpacity>
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
      <View
        style={{
          width: "60%",
          height: 18,
          backgroundColor: skeletonColor,
          borderRadius: 4,
          marginBottom: 4,
          marginTop: 8,
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
        <View style={[styles.addButton, { backgroundColor: skeletonColor }]} />
      </View>
    </View>
  );

  return (
    <View style={styles.menuSection}>
      <ThemedText style={[styles.sectionTitle, { color: text }]}>
        {sectionTitle}
      </ThemedText>
      {loading ? (
        Array.from({ length: 3 }).map(renderSkeleton)
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.menuList}
        />
      )}
      <ProductModal
        visible={modalVisible}
        onClose={handleCloseModal}
        product={selectedProduct}
        qty={qty}
        onChangeQty={setQty}
        vendorId={vendorId}
      />
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
  menuCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  menuImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  menuFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuPrice: {
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
});
