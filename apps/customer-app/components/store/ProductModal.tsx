import React, { useState } from "react";
import { useCart } from "@/context/CartContext";

import {
  Modal,
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Text,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Product } from "@/types/store-types";
import { useThemeColor } from "@/hooks/use-theme-color";

const { width } = Dimensions.get("window");

export function ProductModal({
  visible,
  onClose,
  product,
  vendorId,
  qty,
  onChangeQty,
}: {
  visible: boolean;
  onClose: () => void;
  product: Product | null;
  vendorId: string;
  qty: number;
  onChangeQty: (qty: number) => void;
}) {
  const { items, addItem, increaseQty, decreaseQty } = useCart();
  const Toast = require('react-native-toast-message');
  const [imgIdx, setImgIdx] = useState(0);
  const images = product?.images?.length ? product.images : [];
  const cardBg = useThemeColor({}, "surfaceCard");
  const text = useThemeColor({}, "textPrimary");
  const muted = useThemeColor({}, "textMuted");
  const primary = useThemeColor({}, "brandPrimary");

  if (!product) return null;
  const cartItem = items.find((i) => i.id === product.id);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: cardBg }]}>
          {/* Carousel */}
          <View style={styles.carouselContainer}>
            {images.length > 0 && (
              <Image
                source={{ uri: images[imgIdx] }}
                style={styles.carouselImage}
                resizeMode="cover"
              />
            )}
            {images.length > 1 && (
              <View style={styles.carouselNav}>
                <TouchableOpacity
                  onPress={() =>
                    setImgIdx((i) => (i === 0 ? images.length - 1 : i - 1))
                  }
                  style={styles.carouselBtn}
                >
                  <Text style={{ color: text, fontSize: 22 }}>{"<"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setImgIdx((i) => (i === images.length - 1 ? 0 : i + 1))
                  }
                  style={styles.carouselBtn}
                >
                  <Text style={{ color: text, fontSize: 22 }}>{">"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Details */}
          <ThemedText style={[styles.title, { color: text }]}>
            {product.name}
          </ThemedText>
          <ThemedText style={[styles.category, { color: muted }]}>
            {product.category.name}
          </ThemedText>
          <ThemedText style={[styles.price, { color: primary }]}>
            ₦{product.price.toFixed(2)}
          </ThemedText>
          <ThemedText style={[styles.desc, { color: text }]}>
            {product.description}
          </ThemedText>

          {/* Cart Controls */}
          {cartItem ? (
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={[styles.qtyBtn, { backgroundColor: primary }]}
                onPress={async () => {
                  try {
                    await decreaseQty(product.id);
                  } catch (e) {
                    showToast({
                                          Toast.show({
                                          Toast.show({
                      message: "Could not update cart",
                      variant: "error",
                    });
                  }
                }}
              >
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={[styles.qtyText, { color: text }]}>
                {cartItem.qty}
              </Text>
              <TouchableOpacity
                style={[styles.qtyBtn, { backgroundColor: primary }]}
                onPress={async () => {
                  try {
                    await increaseQty(product.id);
                  } catch (e) {
                    showToast({
                      message: "Could not update cart",
                      variant: "error",
                    });
                  }
                }}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.qtyBtn,
                {
                  backgroundColor: primary,
                  alignSelf: "center",
                  marginBottom: 16,
                },
              ]}
              onPress={async () => {
                try {
                  await addItem({
                    id: product.id,
                    name: product.name,
                    image: product.images[0],
                    price: product.price,
                    qty: qty,
                    vendorId: vendorId,
                    description: product.description,
                    available: true,
                  });
                  showToast({ message: "Added to cart!", variant: "success" });
                                  Toast.show({ type: 'success', text1: "Added to cart!" });
                                  Toast.show({
                } catch (e) {
                  showToast({
                    message: "Could not add to cart",
                    variant: "error",
                  });
                }
              }}
            >
              <Text style={styles.qtyBtnText}>Add to Cart</Text>
            </TouchableOpacity>
          )}

          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={{ color: primary, fontSize: 18 }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 480,
    maxHeight: "90%",
  },
  carouselContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  carouselImage: {
    width: width - 80,
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
  },
  carouselNav: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  carouselBtn: {
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  desc: {
    fontSize: 15,
    marginBottom: 16,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 16,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnText: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
  },
  qtyText: {
    fontSize: 18,
    fontWeight: "600",
    minWidth: 32,
    textAlign: "center",
  },
  closeBtn: {
    alignSelf: "center",
    marginTop: 8,
    padding: 8,
  },
});
