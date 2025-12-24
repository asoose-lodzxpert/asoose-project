import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ScrollView,
  Switch,
  Text,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { MenuItem } from "@/types/menu";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (item: MenuItem) => void;
  categories: string[];
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

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [inStock, setInStock] = useState(true);

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name || "");
      setDescription(itemToEdit.description || "");
      setPrice(itemToEdit.price?.toString() || "");
      setImages(itemToEdit.images || []);
      setSelectedCategory(itemToEdit.category || null);
      setInStock(itemToEdit.inStock ?? true);
    } else {
      setName("");
      setDescription("");
      setPrice("");
      setImages([]);
      setSelectedCategory(null);
      setInStock(true);
    }
  }, [itemToEdit, visible]);

  const pickImage = async (): Promise<string | null> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: true,
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
    if (images.length >= 8) return;
    const uri = await pickImage();
    if (uri) setImages((prev) => [...prev, uri]);
  };

  const handleDeleteImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
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
    if (!name.trim()) return showToast("Item name is required");
    if (!price.trim() || isNaN(Number(price)))
      return showToast("Valid price is required");
    if (!selectedCategory) return showToast("Select a category");
    if (images.length === 0) return showToast("Add at least one image");

    const newItem: MenuItem = {
      id: itemToEdit?.id || `mock-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      price: Number(price),
      images: [images[0], ...images.slice(1).slice(0, 7)] as [string],
      category: selectedCategory,
      inStock,
    };

    onSave(newItem);
    onClose();
  };

  const renderImage = ({ item, drag, isActive }: RenderItemParams<string>) => {
    const idx = images.findIndex((i) => i === item);
    const isPlaceholder = item === "placeholder";

    if (isPlaceholder) {
      return (
        <Pressable
          style={[styles.image, styles.placeholder]}
          onPress={handleAddImage}
        >
          <IconSymbol name="plus" size={24} color={muted} />
        </Pressable>
      );
    }

    return (
      <View style={[styles.imageWrapper, isActive && { opacity: 0.8 }]}>
        {/* Image itself is the drag handle */}
        <Pressable
          onLongPress={drag}
          style={{
            width: 80,
            height: 80,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <Image
            source={{ uri: item }}
            style={styles.image}
            resizeMode="cover"
          />
        </Pressable>

        {/* Delete button overlay */}
        <Pressable
          style={styles.deleteIcon}
          onPress={() => handleDeleteImage(idx)}
          pointerEvents="box-none"
        >
          <IconSymbol name="trash" size={16} color="#fff" />
        </Pressable>
      </View>
    );
  };

  const imageData = [...images];
  if (images.length < 8) imageData.push("placeholder");

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <ThemedView style={styles.overlay}>
        <ThemedView style={[styles.modal, { backgroundColor: background }]}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText type="title" style={{ marginBottom: 16 }}>
              {itemToEdit ? "Edit Item" : "Add New Item"}
            </ThemedText>

            <View style={styles.section}>
              <ThemedText style={styles.label}>Item Name</ThemedText>
              <ThemedInput
                placeholder="Enter item name"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.label}>Description</ThemedText>
              <ThemedInput
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
                style={{ height: 80, textAlignVertical: "top" }}
                multiline
                maxLength={200}
              />
              <ThemedText type="caption" style={{ marginTop: 4 }}>
                {description.length}/200
              </ThemedText>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.label}>Price (₦)</ThemedText>
              <ThemedInput
                placeholder="Price"
                value={price}
                onChangeText={(t) => setPrice(t.replace(/[^0-9.]/g, ""))}
                keyboardType="numeric"
              />
            </View>

            <View
              style={[
                styles.section,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                },
              ]}
            >
              <ThemedText style={styles.label}>In Stock</ThemedText>
              <Switch
                value={inStock}
                onValueChange={setInStock}
                trackColor={{ false: "#E5E7EB", true: primary }}
                thumbColor={inStock ? primary : "#F3F4F6"}
                ios_backgroundColor="#E5E7EB"
                style={{ marginTop: 8, marginLeft: 12 }}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.label}>Visual Media</ThemedText>
              <ThemedText type="caption" style={{ marginBottom: 8 }}>
                Click to add images (max 8).
              </ThemedText>
              <DraggableFlatList
                horizontal
                data={imageData}
                keyExtractor={(_, i) => i.toString()}
                renderItem={renderImage}
                onDragEnd={({ data }) => {
                  const filtered = data.filter((i) => i !== "placeholder");
                  setImages(filtered);
                }}
                contentContainerStyle={{ gap: 12, paddingVertical: 8 }}
                showsHorizontalScrollIndicator={false}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.label}>Category</ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 8 }}
              >
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryButton,
                      selectedCategory === cat
                        ? { backgroundColor: primary, borderColor: primary }
                        : {
                            borderColor: primary,
                            borderWidth: 1,
                            backgroundColor: "transparent",
                          },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <ThemedText
                      type="default"
                      style={{
                        color: selectedCategory === cat ? "#fff" : primary,
                      }}
                    >
                      {cat}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[
                styles.button,
                {
                  borderColor: primary,
                  borderWidth: 1,
                  backgroundColor: "transparent",
                },
              ]}
              onPress={onClose}
            >
              <ThemedText style={{ color: primary }}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.button, { backgroundColor: primary }]}
              onPress={handleSave}
            >
              <ThemedText style={{ color: "#fff" }}>Save Item</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
        <Toast />
      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  modal: {
    flex: 1,
    width: "100%",
    padding: 20,
  },
  section: {
    marginVertical: 16,
  },
  label: {
    marginBottom: 8,
  },
  imageWrapper: { position: "relative" },
  image: { width: 80, height: 80, borderRadius: 10 },
  placeholder: {
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteIcon: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    padding: 2,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  button: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
});
