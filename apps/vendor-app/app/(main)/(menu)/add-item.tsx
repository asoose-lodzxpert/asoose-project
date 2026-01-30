import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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

/* ---------- Types ---------- */

interface ImageItem {
  uri: string;
  isNew: boolean;
  isEdited?: boolean;
  originalUri?: string;
}

interface Modifier {
  name: string;
  price: string;
}

interface ModifierGroup {
  name: string;
  minSelect: string;
  maxSelect: string;
  modifiers: Modifier[];
}

/* ---------- Screen ---------- */

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
  const [categoryId, setCategoryId] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);

  useEffect(() => {
    loadCategories();
    if (isEdit) loadItem();
  }, [itemId]);

  const loadCategories = async () => {
    try {
      setCategories(await fetchCategories());
    } catch {
      Toast.show({ type: "error", text1: "Failed to load categories" });
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

      if (item.images?.length) {
        setImages(item.images.map((uri: string) => ({ uri, isNew: false })));
      }

      if (item.modifierGroups?.length) {
        setModifierGroups(
          item.modifierGroups.map((g: any) => ({
            name: g.name,
            minSelect: g.minSelect.toString(),
            maxSelect: g.maxSelect.toString(),
            modifiers: g.modifiers.map((m: any) => ({
              name: m.name,
              price: m.price.toString(),
            })),
          })),
        );
      }
    } catch {
      Toast.show({ type: "error", text1: "Failed to load item" });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Images ---------- */

  const pickImage = async (): Promise<string | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    return !result.canceled ? result.assets[0].uri : null;
  };

  const handleAddImage = async () => {
    if (images.length >= 8) {
      Toast.show({ type: "info", text1: "Maximum 8 images allowed" });
      return;
    }
    const uri = await pickImage();
    if (uri) setImages((p) => [...p, { uri, isNew: true }]);
  };

  const handleReplaceImage = async (index: number) => {
    const uri = await pickImage();
    if (!uri) return;
    setImages((prev) => {
      const copy = [...prev];
      copy[index] = {
        uri,
        isNew: true,
        isEdited: true,
        originalUri: copy[index].uri,
      };
      return copy;
    });
  };

  const handleDeleteImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadImages = async (): Promise<string[]> => {
    const existing = images.filter((i) => !i.isNew && !i.isEdited);
    const toUpload = images.filter((i) => i.isNew || i.isEdited);

    if (!toUpload.length) return existing.map((i) => i.uri);

    setUploadingImages(true);
    try {
      const uploaded = await uploadBulk(
        toUpload.map((img, i) => ({
          uri: img.uri,
          name: `product-${Date.now()}-${i}.jpg`,
          type: "image/jpeg",
        })),
        (_: UploadProgress) => {},
      );

      let idx = 0;
      return images.map((img) =>
        img.isNew || img.isEdited ? uploaded[idx++] : img.uri,
      );
    } finally {
      setUploadingImages(false);
    }
  };

  /* ---------- Save ---------- */

  const handleSave = async () => {
    if (!name.trim() || !price || !categoryId || !images.length) {
      Toast.show({ type: "error", text1: "Complete all required fields" });
      return;
    }

    if (!user?.storeId) {
      Toast.show({ type: "error", text1: "Store not found" });
      return;
    }

    if (isEdit) {
      const ok = await confirm({
        title: "Update Product",
        message: "Are you sure?",
        confirmText: "Update",
        type: "warning",
      });
      if (!ok) return;
    }

    setSaving(true);
    try {
      const imageUrls = await uploadImages();

      const payload = {
        name,
        description: description || undefined,
        price: Number(price),
        categoryId,
        stock: Number(stock) || 0,
        images: imageUrls,
        modifierGroups: modifierGroups.map((g) => ({
          name: g.name,
          minSelect: Number(g.minSelect) || 0,
          maxSelect: Number(g.maxSelect) || 1,
          modifiers: g.modifiers.map((m) => ({
            name: m.name,
            price: Number(m.price) || 0,
          })),
        })),
      };

      if (isEdit && itemId) {
        await updateProduct(itemId, payload);
      } else {
        await createProduct({ storeId: user.storeId, ...payload });
      }

      Toast.show({
        type: "success",
        text1: isEdit ? "Product updated" : "Product created",
      });
      router.back();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Render ---------- */

  const renderImage = ({ item, drag }: RenderItemParams<ImageItem>) => {
    const idx = images.findIndex((i) => i.uri === item.uri);

    return (
      <View style={styles.imageWrapper}>
        <Pressable onLongPress={drag} onPress={() => handleReplaceImage(idx)}>
          <Image source={{ uri: item.uri }} style={styles.image} />
        </Pressable>
        <Pressable
          style={styles.deleteIcon}
          onPress={() => handleDeleteImage(idx)}
        >
          <IconSymbol name="trash" size={14} color="#fff" />
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <ThemedText type="title">
            {isEdit ? "Edit Product" : "Add Product"}
          </ThemedText>

          {/* Basic Fields */}
          <ThemedInput
            placeholder="Product name *"
            value={name}
            onChangeText={setName}
          />
          <ThemedInput
            placeholder="Description"
            value={description}
            onChangeText={setDescription}
          />
          <ThemedInput
            placeholder="Price *"
            value={price}
            keyboardType="numeric"
            onChangeText={setPrice}
          />
          <ThemedInput
            placeholder="Stock"
            value={stock}
            keyboardType="numeric"
            onChangeText={setStock}
          />

          <CustomDropdown
            label="Category *"
            data={categories.map((c) => ({ label: c.name, value: c.id }))}
            value={categoryId}
            onChange={(v) => setCategoryId(v as string)}
          />

          {/* Modifier Groups */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Modifier Groups</ThemedText>

            {modifierGroups.map((g, gi) => (
              <View key={gi} style={styles.modGroup}>
                <ThemedInput
                  placeholder="Group name"
                  value={g.name}
                  onChangeText={(t) => {
                    const c = [...modifierGroups];
                    c[gi].name = t;
                    setModifierGroups(c);
                  }}
                />

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <ThemedInput
                    placeholder="Min"
                    keyboardType="numeric"
                    value={g.minSelect}
                    onChangeText={(t) => {
                      const c = [...modifierGroups];
                      c[gi].minSelect = t;
                      setModifierGroups(c);
                    }}
                  />
                  <ThemedInput
                    placeholder="Max"
                    keyboardType="numeric"
                    value={g.maxSelect}
                    onChangeText={(t) => {
                      const c = [...modifierGroups];
                      c[gi].maxSelect = t;
                      setModifierGroups(c);
                    }}
                  />
                </View>

                {g.modifiers.map((m, mi) => (
                  <View key={mi} style={{ flexDirection: "row", gap: 8 }}>
                    <ThemedInput
                      placeholder="Modifier name"
                      value={m.name}
                      onChangeText={(t) => {
                        const c = [...modifierGroups];
                        c[gi].modifiers[mi].name = t;
                        setModifierGroups(c);
                      }}
                    />
                    <ThemedInput
                      placeholder="Price"
                      keyboardType="numeric"
                      value={m.price}
                      onChangeText={(t) => {
                        const c = [...modifierGroups];
                        c[gi].modifiers[mi].price = t;
                        setModifierGroups(c);
                      }}
                    />
                  </View>
                ))}

                <Pressable
                  onPress={() => {
                    const c = [...modifierGroups];
                    c[gi].modifiers.push({ name: "", price: "0" });
                    setModifierGroups(c);
                  }}
                >
                  <ThemedText type="caption" style={{ color: primary }}>
                    + Add Modifier
                  </ThemedText>
                </Pressable>
              </View>
            ))}

            <Pressable
              onPress={() =>
                setModifierGroups((p) => [
                  ...p,
                  { name: "", minSelect: "0", maxSelect: "1", modifiers: [] },
                ])
              }
            >
              <ThemedText style={{ color: primary }}>+ Add Group</ThemedText>
            </Pressable>
          </View>

          {/* Images */}
          <DraggableFlatList
            horizontal
            data={images}
            keyExtractor={(i, idx) => `${i.uri}-${idx}`}
            renderItem={renderImage}
            onDragEnd={({ data }) => setImages(data)}
          />
          <Pressable onPress={handleAddImage}>
            <ThemedText style={{ color: primary }}>+ Add Image</ThemedText>
          </Pressable>

          {/* Save */}
          <Pressable
            style={[styles.saveButton, { backgroundColor: primary }]}
            onPress={handleSave}
            disabled={saving || uploadingImages}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={{ color: "#fff" }}>
                {isEdit ? "Update" : "Create"}
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal />
      <Toast />
    </ThemedView>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  section: {
    marginTop: 16,
  },
  modGroup: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  imageWrapper: {
    width: 90,
    height: 90,
    marginRight: 12,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  deleteIcon: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    padding: 4,
  },
  saveButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
});
