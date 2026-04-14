import React from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

type Variant = "default" | "warning" | "danger";

type ConfirmDialogProps = {
  visible: boolean;
  title?: string;
  message?: string;
  icon?: string;
  variant?: Variant;
  confirmLabel?: string;
  cancelLabel?: string;
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title = "Are you sure?",
  message,
  icon = "alert-circle",
  variant = "warning",
  confirmLabel = "Yes",
  cancelLabel = "Cancel",
  hideCancel = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const primary = useThemeColor({}, "brandPrimary");
  const danger = useThemeColor({}, "statusError");
  const surface = useThemeColor({}, "surfaceCard");
  const text = useThemeColor({}, "textPrimary");

  const iconColor = variant === "danger" ? danger : primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === "ios" ? "slide" : "fade"}
      onRequestClose={onCancel}
    >
      <View style={styles.wrapper}>
        <Pressable style={styles.backdrop} onPress={onCancel} />

        <View style={[styles.card, { backgroundColor: surface }]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, { borderColor: iconColor }]}>
              <IconSymbol name={icon as any} size={28} color={iconColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <ThemedText type="defaultSemiBold" style={{ color: text }}>
                {title}
              </ThemedText>
              {message ? (
                <ThemedText
                  type="caption"
                  style={{ marginTop: 6, color: text }}
                >
                  {message}
                </ThemedText>
              ) : null}
            </View>
          </View>

          <View style={styles.actionsRow}>
            {!hideCancel && (
              <Pressable style={styles.cancelBtn} onPress={onCancel}>
                <ThemedText type="defaultSemiBold">{cancelLabel}</ThemedText>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.confirmBtn,
                { backgroundColor: iconColor, width: hideCancel ? "100%" : undefined, alignItems: "center" },
              ]}
              onPress={onConfirm}
            >
              <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
                {confirmLabel}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  // backdrop covers the whole wrapper
  card: {
    width: "100%",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
});

export default ConfirmDialog;
