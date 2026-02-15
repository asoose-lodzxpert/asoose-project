import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedInput } from "@/components/ThemedInput";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (categoryName: string) => void;
  categoryToEdit?: string;
}

export const AddCategoryModal: React.FC<Props> = ({
  visible,
  onClose,
  onSave,
  categoryToEdit,
}) => {
  const [name, setName] = useState("");

  const primary = useThemeColor({}, "brandPrimary");
  const background = useThemeColor({}, "surfaceBackground");

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit);
    } else {
      setName("");
    }
  }, [categoryToEdit, visible]);

  const handleSave = () => {
    if (!name.trim()) return Toast.show({ text1: "Category name is required" });
    onSave(name.trim());
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <ThemedView style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <ThemedView style={[styles.modal, { backgroundColor: background }]}>
            <ScrollView
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <ThemedText type="title" style={{ marginBottom: 16 }}>
                {categoryToEdit ? "Edit Category" : "Add Category"}
              </ThemedText>

              <ThemedText style={styles.label}>Category Name</ThemedText>
              <ThemedInput
                placeholder="Enter category name"
                value={name}
                onChangeText={setName}
              />
            </ScrollView>

            <View style={styles.actions}>
              <Pressable
                style={[
                  styles.button,
                  {
                    backgroundColor: "transparent",
                    borderWidth: 1,
                    borderColor: primary,
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
                <ThemedText style={{ color: "#fff" }}>Save</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </KeyboardAvoidingView>
        <Toast />
      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "90%",
    borderRadius: 16,
    padding: 20,
  },
  label: {
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
});
