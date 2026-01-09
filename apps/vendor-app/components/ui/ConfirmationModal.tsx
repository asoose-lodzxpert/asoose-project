import React from "react";
import { Modal, View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Props {
  visible: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmationModal: React.FC<Props> = ({
  visible,
  message,
  onConfirm,
  onCancel,
  loading,
}) => {
  const background = useThemeColor({}, "surfaceBackground");
  const primary = useThemeColor({}, "brandPrimary");
  const red = useThemeColor({}, "statusError");

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: background }]}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 20 }}>
            {message}
          </ThemedText>

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, { backgroundColor: red }]}
              onPress={onCancel}
              disabled={loading}
            >
              <ThemedText style={{ color: "#fff" }}>Cancel</ThemedText>
            </Pressable>

            <Pressable
              style={[
                styles.button,
                { backgroundColor: primary, opacity: loading ? 0.7 : 1 },
              ]}
              onPress={onConfirm}
              disabled={loading}
            >
              <ThemedText style={{ color: "#fff" }}>
                {loading ? "Please wait..." : "Confirm"}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
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
    width: "80%",
    padding: 20,
    borderRadius: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});
