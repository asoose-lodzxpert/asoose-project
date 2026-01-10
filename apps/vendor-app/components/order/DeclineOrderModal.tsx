import React, { useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function DeclineOrderModal({
  visible,
  onClose,
  onConfirm,
  loading = false,
}: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const borderColor = useThemeColor({}, "borderDefault");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const mutedText = useThemeColor({}, "textDisabled");
  const errorColor = useThemeColor({}, "statusError");

  const [reason, setReason] = useState("");

  const predefinedReasons = [
    "Out of stock",
    "Too busy right now",
    "Ingredients unavailable",
    "Closing soon",
    "Unable to prepare",
  ];

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason("");
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={[styles.modal, { backgroundColor: surfaceCard }]}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="subtitle">Decline Order</ThemedText>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={mutedText} />
            </Pressable>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <ThemedText style={{ marginBottom: 16, color: mutedText }}>
              Please select or provide a reason for declining this order:
            </ThemedText>

            {/* Predefined reasons */}
            <View style={styles.reasonsContainer}>
              {predefinedReasons.map((preReason) => (
                <Pressable
                  key={preReason}
                  onPress={() => setReason(preReason)}
                  style={[
                    styles.reasonChip,
                    {
                      borderColor: reason === preReason ? primary : borderColor,
                      backgroundColor:
                        reason === preReason ? primary + "20" : "transparent",
                    },
                  ]}
                >
                  <ThemedText
                    style={{
                      color: reason === preReason ? primary : mutedText,
                      fontSize: 14,
                    }}
                  >
                    {preReason}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {/* Custom reason */}
            <ThemedText
              style={{ marginTop: 16, marginBottom: 8, fontSize: 14 }}
            >
              Or write a custom reason:
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor,
                  color: useThemeColor({}, "textPrimary"),
                },
              ]}
              placeholder="Enter reason..."
              placeholderTextColor={mutedText}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              style={[styles.button, { borderColor, borderWidth: 1 }]}
            >
              <ThemedText>Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={!reason.trim() || loading}
              style={[
                styles.button,
                {
                  backgroundColor:
                    !reason.trim() || loading ? mutedText : errorColor,
                },
              ]}
            >
              <ThemedText style={{ color: "#fff" }}>
                {loading ? "Declining..." : "Decline Order"}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modal: {
    width: "90%",
    maxWidth: 500,
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  reasonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
