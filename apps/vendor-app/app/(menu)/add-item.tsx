import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import Toast from "react-native-toast-message";

import { CustomDropdown } from "@/components/CustomDropdown";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/hooks/use-confirm";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  createProduct,
  fetchCategories,
  fetchProduct,
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

export default function AddEditItemScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { confirm, ConfirmModal } = useConfirm();
  const { user } = useAuth();

  const itemId = params.id as string | undefined;
  const isEdit = !!itemId;

  // Theme Colors
  const primary = useThemeColor({}, "brandPrimary");
  const borderColor = useThemeColor({}, "borderDefault");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const textMuted = useThemeColor({}, "textMuted");
  const statusError = useThemeColor({}, "statusError");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");

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

  /* ---------- Handlers ---------- */

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

  const handleRemoveModifierGroup = (index: number) => {
    setModifierGroups((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveModifier = (groupIndex: number, modIndex: number) => {
    const updated = [...modifierGroups];
    updated[groupIndex].modifiers = updated[groupIndex].modifiers.filter(
      (_, i) => i !== modIndex,
    );
    setModifierGroups(updated);
  };

  const handleSave = async () => {
    if (!name.trim() || !price || !categoryId || !images.length) {
      Toast.show({ type: "error", text1: "Complete all required fields" });
      return;
    }
    if (!user?.storeId) return;

    setSaving(true);
    try {
      // Separate already-uploaded (HTTP) images from newly-picked (file://) ones
      const newImages = images.filter((i) => i.isNew);
      const existingImages = images.filter((i) => !i.isNew);

      // Upload new images to S3 first and obtain HTTPS URLs
      let uploadedUrls: string[] = [];
      if (newImages.length > 0) {
        setUploadingImages(true);
        uploadedUrls = await uploadBulk(
          newImages.map((img, index) => ({
            uri: img.uri,
            name:
              img.uri.split("/").pop() ||
              `product-${Date.now()}-${index}.jpg`,
            type: "image/jpeg",
          })),
        );
        setUploadingImages(false);
      }

      // Combine existing HTTPS URLs with newly-uploaded ones
      const finalImages = [
        ...existingImages.map((i) => i.uri),
        ...uploadedUrls,
      ];

      const payload = {
        name,
        description,
        price: Number(price),
        categoryId,
        stock: Number(stock) || 0,
        images: finalImages,
        modifierGroups: modifierGroups.map((g) => ({
          ...g,
          minSelect: Number(g.minSelect),
          maxSelect: Number(g.maxSelect),
          modifiers: g.modifiers.map((m) => ({
            ...m,
            price: Number(m.price) || 0,
          })),
        })),
      };

      if (isEdit) {
        await updateProduct(itemId!, payload);
      } else {
        await createProduct({ storeId: user.storeId, ...payload });
      }
      Toast.show({ type: "success", text1: isEdit ? "Updated" : "Created" });
      router.back();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.message });
    } finally {
      setSaving(false);
      setUploadingImages(false);
    }
  };

  /* ---------- Renders ---------- */

  const renderImage = ({ item, drag }: RenderItemParams<ImageItem>) => {
    const idx = images.findIndex((i) => i.uri === item.uri);
    return (
      <View style={styles.imageWrapper}>
        <Pressable onLongPress={drag} onPress={() => handleReplaceImage(idx)}>
          <Image source={{ uri: item.uri }} style={styles.image} />
        </Pressable>
        <Pressable
          style={[styles.deleteIcon, { backgroundColor: statusError }]}
          onPress={() => handleDeleteImage(idx)}
        >
          <IconSymbol name="xmark" size={12} color="#fff" />
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Top Row: Back Button + Title Centered */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          paddingTop: 16,
          marginBottom: 8,
        }}
      >
        {/* Back button, left-aligned but takes up space for centering */}
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={() => router.back()}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <IconSymbol name="chevron.left" size={22} color={primary} />
            <ThemedText
              style={{ color: primary, fontSize: 16, fontWeight: "600" }}
            >
              Back
            </ThemedText>
          </Pressable>
        </View>
        {/* Title, always centered */}
        <View
          style={{ flex: 2, alignItems: "center", justifyContent: "center" }}
        >
          <ThemedText
            type="subtitle"
            style={{ fontWeight: "700", textAlign: "center" }}
          >
            {isEdit ? "Edit Product" : "New Product"}
          </ThemedText>
        </View>
        {/* Right spacer for symmetry */}
        <View style={{ flex: 1 }} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Image Section */}
          <View style={styles.imageSection}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
              Product Photos ({images.length}/8)
            </ThemedText>
            <View style={{ flexDirection: "row" }}>
              <DraggableFlatList
                horizontal
                data={images}
                keyExtractor={(item, index) => `img-${index}`}
                renderItem={renderImage}
                onDragEnd={({ data }) => setImages(data)}
                showsHorizontalScrollIndicator={false}
              />
              {images.length < 8 && (
                <Pressable
                  style={[
                    styles.addImageBtn,
                    {
                      borderColor: borderColor,
                      backgroundColor: surfaceSubtle,
                    },
                  ]}
                  onPress={handleAddImage}
                >
                  <IconSymbol name="plus" size={24} color={primary} />
                  <ThemedText
                    style={{ color: primary, fontSize: 12, marginTop: 4 }}
                  >
                    Add Image
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formCard}>
            <ThemedInput
              label="Product Name *"
              placeholder="e.g. Cheese Burger"
              value={name}
              onChangeText={setName}
            />
            <ThemedInput
              label="Description"
              placeholder="Describe your product..."
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <View style={styles.row}>
              <ThemedInput
                label="Price *"
                placeholder="0.00"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                containerStyle={{ flex: 1 }}
              />
              <ThemedInput
                label="Stock"
                placeholder="0"
                value={stock}
                onChangeText={setStock}
                keyboardType="numeric"
                containerStyle={{ flex: 1 }}
              />
            </View>
            <CustomDropdown
              label="Category *"
              data={categories.map((c) => ({ label: c.name, value: c.id }))}
              value={categoryId}
              onChange={(v) => setCategoryId(v as string)}
            />
          </View>

          {/* Modifier Groups */}
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Modifier Groups</ThemedText>
            <Pressable
              onPress={() =>
                setModifierGroups([
                  ...modifierGroups,
                  { name: "", minSelect: "0", maxSelect: "1", modifiers: [] },
                ])
              }
            >
              <ThemedText style={{ color: primary, fontWeight: "600" }}>
                + Add Group
              </ThemedText>
            </Pressable>
          </View>

          {modifierGroups.map((group, gIdx) => (
            <View
              key={gIdx}
              style={[
                styles.modGroupCard,
                { borderColor: borderColor, backgroundColor: surfaceSubtle },
              ]}
            >
              <View style={styles.modGroupHeader}>
                <ThemedText type="defaultSemiBold">
                  Modifier Group {gIdx + 1}
                </ThemedText>
                <Pressable onPress={() => handleRemoveModifierGroup(gIdx)}>
                  <IconSymbol name="trash" size={20} color={statusError} />
                </Pressable>
              </View>

              <ThemedInput
                label="Group Name *"
                placeholder="e.g. Extra Toppings"
                value={group.name}
                onChangeText={(t) => {
                  const updated = [...modifierGroups];
                  updated[gIdx].name = t;
                  setModifierGroups(updated);
                }}
              />

              <View style={styles.row}>
                <ThemedInput
                  label="Min Select *"
                  placeholder="0"
                  value={group.minSelect}
                  keyboardType="numeric"
                  onChangeText={(t) => {
                    const updated = [...modifierGroups];
                    updated[gIdx].minSelect = t;
                    setModifierGroups(updated);
                  }}
                  containerStyle={{ flex: 1 }}
                />
                <ThemedInput
                  label="Max Select *"
                  placeholder="1"
                  value={group.maxSelect}
                  keyboardType="numeric"
                  onChangeText={(t) => {
                    const updated = [...modifierGroups];
                    updated[gIdx].maxSelect = t;
                    setModifierGroups(updated);
                  }}
                  containerStyle={{ flex: 1 }}
                />
              </View>

              <ThemedText
                type="defaultSemiBold"
                style={{ marginTop: 8, fontSize: 14 }}
              >
                Identifiers (Options)
              </ThemedText>
              {group.modifiers.map((mod, mIdx) => (
                <View key={mIdx} style={styles.modifierRow}>
                  <ThemedInput
                    label="Name *"
                    placeholder="e.g. Bacon"
                    value={mod.name}
                    onChangeText={(t) => {
                      const updated = [...modifierGroups];
                      updated[gIdx].modifiers[mIdx].name = t;
                      setModifierGroups(updated);
                    }}
                    containerStyle={{ flex: 2 }}
                  />
                  <ThemedInput
                    label="Price"
                    placeholder="0.00"
                    value={mod.price}
                    keyboardType="numeric"
                    onChangeText={(t) => {
                      const updated = [...modifierGroups];
                      updated[gIdx].modifiers[mIdx].price = t;
                      setModifierGroups(updated);
                    }}
                    containerStyle={{ flex: 1 }}
                  />
                  <Pressable
                    onPress={() => handleRemoveModifier(gIdx, mIdx)}
                    style={styles.modDeleteBtn}
                  >
                    <IconSymbol
                      name="minus.circle.fill"
                      size={22}
                      color={statusError}
                    />
                  </Pressable>
                </View>
              ))}

              <Pressable
                style={styles.addModBtn}
                onPress={() => {
                  const updated = [...modifierGroups];
                  // Initializing price as an empty string instead of "0"
                  updated[gIdx].modifiers.push({ name: "", price: "" });
                  setModifierGroups(updated);
                }}
              >
                <ThemedText
                  style={{ color: primary, fontSize: 14, fontWeight: "600" }}
                >
                  + Add Identifier
                </ThemedText>
              </Pressable>
            </View>
          ))}

          {/* Submit Button */}
          <Pressable
            style={[styles.saveButton, { backgroundColor: primary }]}
            onPress={handleSave}
            disabled={saving || uploadingImages}
          >
            {saving || uploadingImages ? (
              <ActivityIndicator color={textOnPrimary} />
            ) : (
              <ThemedText style={{ color: textOnPrimary, fontWeight: "700" }}>
                {isEdit ? "Update Product" : "Create Product"}
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

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: { flexDirection: "row", gap: 12 },
  imageSection: { marginBottom: 20 },
  imageWrapper: {
    width: 85,
    height: 85,
    marginRight: 12,
    position: "relative",
  },
  image: { width: 85, height: 85, borderRadius: 12 },
  deleteIcon: {
    position: "absolute",
    top: -4,
    right: -4,
    borderRadius: 10,
    padding: 4,
    zIndex: 10,
  },
  addImageBtn: {
    width: 85,
    height: 85,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  formCard: { gap: 12, marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modGroupCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  modGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modifierRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 4,
  },
  modDeleteBtn: { paddingBottom: 12 }, // Aligns trash icon with input center
  addModBtn: { marginTop: 8, padding: 8, alignSelf: "flex-start" },
  saveButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
});
