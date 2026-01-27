import React, { useState, useCallback } from "react";
import { Modal, View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

type IconName = React.ComponentProps<typeof IconSymbol>["name"];

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  icon?: IconName;
}

interface ConfirmState extends ConfirmOptions {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    visible: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    type: "info",
    onConfirm: () => {},
    onCancel: () => {},
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        ...options,
        visible: true,
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        type: options.type || "info",
        onConfirm: () => {
          setConfirmState((prev) => ({ ...prev, visible: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState((prev) => ({ ...prev, visible: false }));
          resolve(false);
        },
      });
    });
  }, []);

  const ConfirmModal = useCallback(() => {
    const surfaceCard = useThemeColor({}, "surfaceCard");
    const borderColor = useThemeColor({}, "borderDefault");
    const textPrimary = useThemeColor({}, "textPrimary");
    const mutedText = useThemeColor({}, "textDisabled");
    const primary = useThemeColor({}, "brandPrimary");
    const errorColor = useThemeColor({}, "statusError");
    const warningColor = useThemeColor({}, "statusNeutral");

    const getIconColor = () => {
      switch (confirmState.type) {
        case "danger":
          return errorColor;
        case "warning":
          return warningColor;
        default:
          return primary;
      }
    };

    const getConfirmButtonColor = () => {
      switch (confirmState.type) {
        case "danger":
          return errorColor;
        case "warning":
          return warningColor;
        default:
          return primary;
      }
    };

    const getDefaultIcon = (): IconName => {
      switch (confirmState.type) {
        case "danger":
          return "trash";
        case "warning":
          return "exclamationmark.triangle";
        default:
          return "info.circle";
      }
    };

    return (
      <Modal
        visible={confirmState.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={confirmState.onCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceCard }]}>
            <View style={styles.modalHeader}>
              <IconSymbol
                name={confirmState.icon || getDefaultIcon()}
                size={48}
                color={getIconColor()}
              />
            </View>

            <ThemedText
              type="subtitle"
              style={{ textAlign: "center", marginBottom: 8 }}
            >
              {confirmState.title}
            </ThemedText>

            <ThemedText
              style={{
                textAlign: "center",
                color: mutedText,
                marginBottom: 24,
              }}
            >
              {confirmState.message}
            </ThemedText>

            <View style={styles.modalActions}>
              <Pressable
                onPress={confirmState.onCancel}
                style={[
                  styles.modalButton,
                  { borderColor: borderColor, borderWidth: 1 },
                ]}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: textPrimary }}
                >
                  {confirmState.cancelText}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={confirmState.onConfirm}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: getConfirmButtonColor(),
                  },
                ]}
              >
                <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
                  {confirmState.confirmText}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }, [confirmState]);

  return { confirm, ConfirmModal };
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
