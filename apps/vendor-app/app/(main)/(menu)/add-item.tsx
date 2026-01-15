import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CustomDropdown } from "@/components/CustomDropdown";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useConfirm } from "@/hooks/use-confirm";
import { useAuth } from "@/context/AuthContext";
import {
  fetchCategories,
  fetchProduct,
  createProduct,
  updateProduct,
} from "@/services/products.service";
import { uploadBulk, UploadProgress } from "@/services/storage.service";
import { Category } from "@/types/menu";

interface ImageItem {
  uri: string;
  isNew: boolean;
  isEdited?: boolean;
  originalUri?: string;
}

export default function AddEditItemScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { confirm, ConfirmModal } = useConfirm();
  const { user } = useAuth();

  const itemId = params.id as string | undefined;
  const isEdit = !!itemId;

  const primary = useThemeColor({}, "brandPrimary");
  const borderColor = useThemeColor({}, "borderDefault");
  const mutedText = useThemeColor({}, "textDisabled");

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    loadCategories();
    if (isEdit) {
      loadItem();
    }
  }, [itemId]);

  const loadCategories = async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load categories",
      });
    }
  };

  const loadItem = async () => {
    if (!itemId) return;

    try {
      setLoading(true);
      const item = await fetchProduct(itemId);

      setName(item.name);
      setDescription(item.description || "");
      setPrice(item.price.toString());
      setStock(item.stock?.toString() || "0");
      setCategoryId(item.categoryId);

      // Load existing images as not new
      if (item.image) {
        setImages([{ uri: item.image, isNew: false }]);
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load item",
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (): Promise<string | null> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
      });
      if (!result.canceled && result.assets.length > 0) {
        return result.assets[0].uri;
      }
    } catch (error) {
      console.log("Image pick error:", error);
    }
    return null;
  };

  const handleAddImage = async () => {
    if (images.length >= 8) {
      Toast.show({
        type: "info",
        text1: "Maximum 8 images allowed",
      });
      return;
    }

    const uri = await pickImage();
    if (uri) {
      setImages((prev) => [...prev, { uri, isNew: true }]);
    }
  };

  const handleReplaceImage = async (index: number) => {
    const uri = await pickImage();
    if (uri) {
      setImages((prev) => {
        const newImages = [...prev];
        newImages[index] = {
          uri,
          isNew: true,
          isEdited: true,
          originalUri: newImages[index].uri,
        };
        return newImages;
      });
    }
  };

  const handleDeleteImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadImages = async (): Promise<string | undefined> => {
    // Separate images into existing (unchanged) and new/edited
    const existingImages = images.filter((img) => !img.isNew && !img.isEdited);
    const imagesToUpload = images.filter((img) => img.isNew || img.isEdited);

    // If no new images to upload, return the first existing image
    if (imagesToUpload.length === 0) {
      return existingImages[0]?.uri;
    }

    setUploadingImages(true);
    try {
      // Prepare files for bulk upload
      const filesToUpload = imagesToUpload.map((img, index) => ({
        uri: img.uri,
        name: `product-${Date.now()}-${index}.jpg`,
        type: "image/jpeg",
      }));

      console.log("Uploading files:", filesToUpload.length);

      // Upload all new/edited images at once
      const uploadedUrls = await uploadBulk(
        filesToUpload,
        (progress: UploadProgress) => {
          console.log("Upload progress:", progress.percentage);
        }
      );

      console.log("Upload successful, URLs:", uploadedUrls);

      // Combine existing unchanged URLs with newly uploaded URLs
      // For edit mode: preserve position of existing images
      const finalUrls: string[] = [];
      let uploadedIndex = 0;

      images.forEach((img) => {
        if (img.isNew || img.isEdited) {
          // Use newly uploaded URL
          finalUrls.push(uploadedUrls[uploadedIndex]);
          uploadedIndex++;
        } else {
          // Keep existing URL
          finalUrls.push(img.uri);
        }
      });

      // Return the first URL (backend currently expects single image)
      // TODO: Update backend Product model to support multiple images
      return finalUrls[0];
    } catch (error: any) {
      console.error("Upload error:", error);
      const errorMessage = error?.message || "Failed to upload images";
      throw new Error(errorMessage);
    } finally {
      setUploadingImages(false);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Toast.show({ type: "error", text1: "Item name is required" });
      return false;
    }
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      Toast.show({ type: "error", text1: "Valid price is required" });
      return false;
    }
    if (!categoryId) {
      Toast.show({ type: "error", text1: "Select a category" });
      return false;
    }
    if (images.length === 0) {
      Toast.show({ type: "error", text1: "Add at least one image" });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!user?.storeId) {
      Toast.show({ type: "error", text1: "Store not found" });
      return;
    }

    // Show confirmation for updates
    if (isEdit) {
      const confirmed = await confirm({
        title: "Update Product",
        message: "Are you sure you want to update this product?",
        confirmText: "Update",
        type: "warning",
      });
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      // Upload images first
      const imageUrl = await uploadImages();

      if (isEdit && itemId) {
        // Update existing product
        await updateProduct(itemId, {
          name,
          description: description || undefined,
          price: Number(price),
          categoryId,
          stock: Number(stock) || 0,
          image: imageUrl,
        });

        Toast.show({
          type: "success",
          text1: "Product updated successfully",
        });
      } else {
        // Create new product
        await createProduct({
          storeId: user.storeId,
          name,
          description: description || undefined,
          price: Number(price),
          categoryId,
          stock: Number(stock) || 0,
          image: imageUrl,
        });

        Toast.show({
          type: "success",
          text1: "Product created successfully",
        });
      }

      router.back();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to save product",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: "Discard Changes",
      message: "Are you sure you want to discard your changes?",
      confirmText: "Discard",
      cancelText: "Keep Editing",
      type: "warning",
    });

    if (confirmed) {
      router.back();
    }
  };

  const renderImage = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<ImageItem>) => {
    const idx = images.findIndex((i) => i.uri === item.uri);

    return (
      <View style={[styles.imageWrapper, isActive && { opacity: 0.8 }]}>
        <Pressable
          onLongPress={drag}
          onPress={() => handleReplaceImage(idx)}
          style={styles.imageContainer}
        >
          <Image
            source={{ uri: item.uri }}
            style={styles.image}
            resizeMode="cover"
          />
          {item.isNew && (
            <View style={styles.newBadge}>
              <ThemedText style={{ fontSize: 8, color: "#fff" }}>
                NEW
              </ThemedText>
            </View>
          )}
        </Pressable>

        <Pressable
          style={styles.deleteIcon}
          onPress={() => handleDeleteImage(idx)}
        >
          <IconSymbol name="trash" size={16} color="#fff" />
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={{ flex: 1 }}>
        {/* Header Skeleton */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: borderColor,
                opacity: 0.3,
              }}
            />
            <View
              style={{
                width: 60,
                height: 20,
                borderRadius: 4,
                backgroundColor: borderColor,
                opacity: 0.3,
              }}
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          {/* Title Skeleton */}
          <View
            style={{
              width: 150,
              height: 28,
              borderRadius: 4,
              backgroundColor: borderColor,
              opacity: 0.3,
              marginBottom: 24,
            }}
          />

          {/* Form Fields Skeleton */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={styles.section}>
              <View
                style={{
                  width: 100,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: borderColor,
                  opacity: 0.3,
                  marginBottom: 8,
                }}
              />
              <View
                style={{
                  height: 50,
                  borderRadius: 12,
                  backgroundColor: borderColor,
                  opacity: 0.3,
                }}
              />
            </View>
          ))}
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleCancel}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <IconSymbol name="chevron.left" size={24} color={primary} />
          <ThemedText type="defaultSemiBold" style={{ color: primary }}>
            Cancel
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="title" style={{ marginBottom: 24 }}>
          {isEdit ? "Edit Product" : "Add New Product"}
        </ThemedText>

        {/* Item Name */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Product Name *
          </ThemedText>
          <ThemedInput
            placeholder="Enter product name"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Description
          </ThemedText>
          <ThemedInput
            placeholder="Product description (optional)"
            value={description}
            onChangeText={setDescription}
            style={{ height: 80, textAlignVertical: "top" }}
            multiline
            maxLength={200}
          />
          <ThemedText type="caption" style={{ marginTop: 4, color: mutedText }}>
            {description.length}/200
          </ThemedText>
        </View>

        {/* Price */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Price (₦) *
          </ThemedText>
          <ThemedInput
            placeholder="0.00"
            value={price}
            onChangeText={(t) => setPrice(t.replace(/[^0-9.]/g, ""))}
            keyboardType="numeric"
          />
        </View>

        {/* Stock */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Stock Quantity
          </ThemedText>
          <ThemedInput
            placeholder="0"
            value={stock}
            onChangeText={(t) => setStock(t.replace(/[^0-9]/g, ""))}
            keyboardType="numeric"
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <CustomDropdown
            label="Category *"
            placeholder="Select category"
            data={categories.map((cat) => ({
              label: cat.name,
              value: cat.id,
            }))}
            value={categoryId}
            onChange={(value) => setCategoryId(value as string)}
            modal={true}
          />
        </View>

        {/* Images */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Product Images * (Max 8)
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ marginBottom: 12, color: mutedText }}
          >
            Tap to replace image. Long press to reorder.
          </ThemedText>

          {images.length === 0 ? (
            // Show placeholder when no images
            <Pressable
              style={[styles.image, styles.placeholder, { borderColor }]}
              onPress={handleAddImage}
            >
              <IconSymbol name="plus" size={24} color={mutedText} />
              <ThemedText
                style={{ fontSize: 10, marginTop: 4, color: mutedText }}
              >
                Add Image
              </ThemedText>
            </Pressable>
          ) : (
            // Show images with add button on the side
            <View style={{ flexDirection: "row", gap: 12 }}>
              <DraggableFlatList
                horizontal
                data={images}
                keyExtractor={(item, i) => `${item.uri}-${i}`}
                renderItem={renderImage}
                onDragEnd={({ data }) => setImages(data)}
                contentContainerStyle={{ gap: 12 }}
                showsHorizontalScrollIndicator={false}
                style={{ flex: 1 }}
              />

              {images.length < 8 && (
                <Pressable
                  style={[styles.image, styles.placeholder, { borderColor }]}
                  onPress={handleAddImage}
                >
                  <IconSymbol name="plus" size={24} color={mutedText} />
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable
            style={[
              styles.button,
              styles.cancelButton,
              { borderColor: primary },
            ]}
            onPress={handleCancel}
            disabled={saving || uploadingImages}
          >
            <ThemedText type="defaultSemiBold" style={{ color: primary }}>
              Cancel
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.saveButton,
              {
                backgroundColor: primary,
                opacity: saving || uploadingImages ? 0.7 : 1,
              },
            ]}
            onPress={handleSave}
            disabled={saving || uploadingImages}
          >
            {saving || uploadingImages ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
                {isEdit ? "Update Product" : "Create Product"}
              </ThemedText>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmModal />
      <Toast />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
  },
  imageWrapper: {
    position: "relative",
    width: 100,
    height: 100,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  placeholder: {
    borderWidth: 2,
    borderStyle: "dashed",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteIcon: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    elevation: 5, // For Android
    shadowColor: "#000", // For iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  newBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "#10B981",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  saveButton: {},
});
