import React, { useState, useCallback } from "react";
import { Modal, View, StyleSheet, Pressable, Dimensions } from "react-native";
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
    const textSecondary = useThemeColor({}, "textSecondary");
    const primary = useThemeColor({}, "brandPrimary");
    const errorColor = useThemeColor({}, "statusError");
    const warningColor = useThemeColor({}, "statusPending"); // Mapping warning to Pending (Amber)
    const textOnPrimary = useThemeColor({}, "textOnPrimary");

    const getColors = () => {
      switch (confirmState.type) {
        case "danger":
          return { main: errorColor, bg: errorColor + "15" };
        case "warning":
          return { main: warningColor, bg: warningColor + "15" };
        default:
          return { main: primary, bg: primary + "15" };
      }
    };

    const getDefaultIcon = (): IconName => {
      switch (confirmState.type) {
        case "danger":
          return "trash.fill";
        case "warning":
          return "exclamationmark.triangle.fill";
        default:
          return "info.circle.fill";
      }
    };

    const colors = getColors();

    return (
      <Modal
        visible={confirmState.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={confirmState.onCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceCard }]}>
            {/* Redesigned Icon Header */}
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: colors.bg }]}>
                <IconSymbol
                  name={confirmState.icon || getDefaultIcon()}
                  size={32}
                  color={colors.main}
                />
              </View>
            </View>

            <View style={styles.textContainer}>
              <ThemedText type="subtitle" style={styles.titleText}>
                {confirmState.title}
              </ThemedText>

              <ThemedText
                style={[styles.messageText, { color: textSecondary }]}
              >
                {confirmState.message}
              </ThemedText>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={confirmState.onCancel}
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { borderColor },
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
                style={[styles.modalButton, { backgroundColor: colors.main }]}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: textOnPrimary }}
                >
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
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 28,
  },
  titleText: {
    textAlign: "center",
    fontSize: 20,
    marginBottom: 10,
  },
  messageText: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1.5,
  },
});
