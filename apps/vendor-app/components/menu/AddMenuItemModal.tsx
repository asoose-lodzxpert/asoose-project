import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { MenuItem } from "@/types/menu";
import { uploadFile } from "@/services/storage.service";
import { fetchCategories, Category } from "@/services/products.service";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (item: {
    name: string;
    price: number;
    categoryId: string;
    stock?: number;
    image?: string;
    images?: string[];
  }) => void;
  itemToEdit?: MenuItem;
}

export const AddMenuItemModal: React.FC<Props> = ({
  visible,
  onClose,
  onSave,
  itemToEdit,
}) => {
  const background = useThemeColor({}, "surfaceBackground");
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Load categories when modal opens
  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to load categories",
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name || "");
      setPrice(itemToEdit.price?.toString() || "");
      setStock(itemToEdit.stock?.toString() || "0");

      // Load images array
      setImages(itemToEdit.images || []);

      setSelectedCategory(itemToEdit.categoryId || null);
    } else {
      setName("");
      setPrice("");
      setStock("0");
      setImages([]);
      setSelectedCategory(null);
    }
  }, [itemToEdit, visible]);

  const pickImage = async () => {
    try {
      // Check if we already have 5 images (max limit)
      if (images.length >= 5) {
        Toast.show({
          type: "error",
          text1: "Maximum 5 images allowed",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];

        setUploading(true);
        setUploadProgress(0);

        try {
          // Upload to backend storage
          const fileUri = asset.uri;
          const fileName =
            fileUri.split("/").pop() || `product-${Date.now()}.jpg`;
          const fileType = asset.type === "image" ? "image/jpeg" : "image/png";

          const uploadedUrl = await uploadFile(
            {
              uri: fileUri,
              name: fileName,
              type: fileType,
            },
            (progress) => {
              setUploadProgress(progress.percentage);
            },
          );

          // Add uploaded URL to images array
          setImages((prev) => [...prev, uploadedUrl]);
        } catch (error) {
          Toast.show({
            type: "error",
            text1: "Failed to upload image",
          });
        } finally {
          setUploading(false);
          setUploadProgress(0);
        }
      }
    } catch (error) {
      // Silent error handling
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim())
      return Toast.show({ text1: "Product name is required", type: "error" });
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0)
      return Toast.show({ text1: "Valid price is required", type: "error" });
    if (!selectedCategory)
      return Toast.show({ text1: "Select a category", type: "error" });
    if (images.length === 0)
      return Toast.show({
        text1: "At least one image is required",
        type: "error",
      });

    onSave({
      name: name.trim(),
      price: Number(price),
      categoryId: selectedCategory,
      stock: stock ? Number(stock) : 0,
      image: images[0],
      images: images,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <Pressable
            style={[styles.modal, { backgroundColor: background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 100 }}
            >
              <ThemedText type="title" style={styles.title}>
                {itemToEdit ? "Edit Product" : "Add Product"}
              </ThemedText>

              {/* Image Upload Section */}
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  Product Images * (Max 5)
                </ThemedText>

                {/* Uploaded Images Grid */}
                {images.length > 0 && (
                  <View style={styles.imagesGrid}>
                    {images.map((uri, index) => (
                      <View key={index} style={styles.imageContainer}>
                        <Image source={{ uri }} style={styles.uploadedImage} />
                        <Pressable
                          style={styles.removeButton}
                          onPress={() => removeImage(index)}
                        >
                          <IconSymbol name="xmark" size={20} color="#EF4444" />
                        </Pressable>
                        {index === 0 && (
                          <View style={styles.primaryBadge}>
                            <ThemedText style={styles.primaryText}>
                              Primary
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Add Image Button */}
                {images.length < 5 && (
                  <Pressable
                    onPress={pickImage}
                    disabled={uploading}
                    style={[
                      styles.imagePicker,
                      { borderColor: border },
                      uploading && styles.imagePickerDisabled,
                    ]}
                  >
                    {uploading ? (
                      <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="large" color={primary} />
                        <ThemedText style={{ color: primary, marginTop: 8 }}>
                          Uploading... {uploadProgress}%
                        </ThemedText>
                      </View>
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <IconSymbol
                          name="camera.fill"
                          size={32}
                          color={muted}
                        />
                        <ThemedText style={{ color: muted, marginTop: 8 }}>
                          Tap to upload
                        </ThemedText>
                        <ThemedText style={{ color: muted, fontSize: 12 }}>
                          {images.length}/5 images
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
                )}
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
                {loadingCategories ? (
                  <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="small" color={primary} />
                    <ThemedText style={{ marginLeft: 8, color: muted }}>
                      Loading categories...
                    </ThemedText>
                  </View>
                ) : (
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
                )}
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
        </KeyboardAvoidingView>
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
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
  },
  primaryBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "#10B981",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryText: {
    color: "#fff",
    fontSize: 10,
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
  },
  imagePickerDisabled: {
    opacity: 0.5,
  },
  uploadingContainer: {
    alignItems: "center",
    gap: 8,
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
