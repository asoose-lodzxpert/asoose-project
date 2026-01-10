import React from "react";
import { View, StyleSheet, Modal, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Props {
  visible: boolean;
  label: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const DeleteConfirmModal: React.FC<Props> = ({
  visible,
  label,
  onCancel,
  onConfirm,
  loading,
}) => {
  const error = useThemeColor({}, "statusError");

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <ThemedText type="defaultSemiBold">Delete {label}?</ThemedText>

          <ThemedText style={{ marginTop: 8 }}>
            This action cannot be undone.
          </ThemedText>

          <View style={styles.actions}>
            <Pressable onPress={onCancel} disabled={loading}>
              <ThemedText style={{ opacity: loading ? 0.5 : 1 }}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable onPress={onConfirm} disabled={loading}>
              <ThemedText style={{ color: error, opacity: loading ? 0.5 : 1 }}>
                {loading ? "Deleting..." : "Delete"}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
  },
  actions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
  },
});
