import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { MenuItem } from "@/types/menu";

interface CategoryOption {
  id: string;
  name: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (item: {
    name: string;
    price: number;
    categoryId: string;
    stock?: number;
    image?: string;
  }) => void;
  categories: CategoryOption[];
  itemToEdit?: MenuItem;
}

export const AddMenuItemModal: React.FC<Props> = ({
  visible,
  onClose,
  onSave,
  categories,
  itemToEdit,
}) => {
  const background = useThemeColor({}, "surfaceBackground");
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name || "");
      setPrice(itemToEdit.price?.toString() || "");
      setStock(itemToEdit.stock?.toString() || "0");
      setImage(itemToEdit.image || null);
      setSelectedCategory(itemToEdit.categoryId || null);
    } else {
      setName("");
      setPrice("");
      setStock("0");
      setImage(null);
      setSelectedCategory(null);
    }
  }, [itemToEdit, visible]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        // TODO: Upload to storage service
        // For now, using local URI
      }
    } catch (error) {
      console.log("Image pick error:", error);
      Toast.show({
        type: "error",
        text1: "Failed to pick image",
      });
    }
  };

  const showToast = (message: string) => {
    Toast.show({
      type: "error",
      text1: message,
      position: "top",
      visibilityTime: 2000,
    });
  };

  const handleSave = () => {
    if (!name.trim()) return showToast("Product name is required");
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0)
      return showToast("Valid price is required");
    if (!selectedCategory) return showToast("Select a category");

    onSave({
      name: name.trim(),
      price: Number(price),
      categoryId: selectedCategory,
      stock: stock ? Number(stock) : 0,
      image: image || undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.modal, { backgroundColor: background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText type="title" style={styles.title}>
              {itemToEdit ? "Edit Product" : "Add Product"}
            </ThemedText>

            {/* Image Upload */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Product Image
              </ThemedText>
              <Pressable
                onPress={pickImage}
                style={[
                  styles.imagePicker,
                  { borderColor: border },
                  image && styles.imagePickerWithImage,
                ]}
              >
                {image ? (
                  <Image source={{ uri: image }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <IconSymbol name="camera.fill" size={32} color={muted} />
                    <ThemedText style={{ color: muted, marginTop: 8 }}>
                      Tap to upload
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Product Name */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Product Name *
              </ThemedText>
              <ThemedInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., Jollof Rice"
              />
            </View>

            {/* Category */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Category *
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
              >
                {categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    style={[
                      styles.categoryChip,
                      { borderColor: border },
                      selectedCategory === cat.id && {
                        backgroundColor: primary,
                        borderColor: primary,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.categoryText,
                        selectedCategory === cat.id && { color: "#fff" },
                      ]}
                    >
                      {cat.name}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Price */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Price (₦) *
              </ThemedText>
              <ThemedInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>

            {/* Stock */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Stock Quantity
              </ThemedText>
              <ThemedInput
                value={stock}
                onChangeText={setStock}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                onPress={onClose}
                style={[styles.button, { backgroundColor: "#E5E7EB" }]}
              >
                <ThemedText style={{ color: "#374151" }}>Cancel</ThemedText>
              </Pressable>

              <Pressable
                onPress={handleSave}
                style={[styles.button, { backgroundColor: primary, flex: 1 }]}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={{ color: "#fff" }}>
                    {itemToEdit ? "Update" : "Add"} Product
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>

      <Toast />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    padding: 20,
  },
  title: {
    marginBottom: 20,
    fontWeight: "700",
  },
  section: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: "600",
  },
  imagePicker: {
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imagePickerWithImage: {
    borderStyle: "solid",
    borderColor: "#10B981",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    alignItems: "center",
    gap: 8,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
});
