import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

const REASONS = [
  "Customer no-show",
  "Long wait time",
  "Safety concern",
  "Vehicle breakdown",
  "Wrong order / wrong location",
  "Other",
];

interface Props {
  visible: boolean;
  onClose(): void;
  onConfirm(reason: string): Promise<void>;
}

export default function CancelJobModal({ visible, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const subtle = useThemeColor({}, "surfaceSubtle");
  const danger = useThemeColor({}, "statusError");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textMuted = useThemeColor({}, "textMuted");

  const handleConfirm = async () => {
    if (!selected || loading) return;
    setLoading(true);
    try {
      await onConfirm(selected);
    } finally {
      setLoading(false);
      setSelected(null);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setSelected(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={[styles.sheet, { backgroundColor: surface }]}>
          <View style={styles.handle} />

          <ThemedText style={[styles.title, { color: textPrimary }]}>
            Cancel job
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: textMuted }]}>
            Select a reason
          </ThemedText>

          <View style={styles.reasons}>
            {REASONS.map((r) => {
              const active = selected === r;
              return (
                <Pressable
                  key={r}
                  style={[
                    styles.reason,
                    { backgroundColor: subtle },
                    active && {
                      backgroundColor: primary + "18",
                      borderColor: primary,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => setSelected(r)}
                >
                  <View
                    style={[
                      styles.radio,
                      { borderColor: active ? primary : "#ccc" },
                    ]}
                  >
                    {active && (
                      <View
                        style={[styles.radioDot, { backgroundColor: primary }]}
                      />
                    )}
                  </View>
                  <ThemedText
                    style={[styles.reasonText, { color: textPrimary }]}
                  >
                    {r}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnGhost, { borderColor: "#ddd" }]}
              onPress={handleClose}
              disabled={loading}
            >
              <ThemedText style={[styles.btnText, { color: textMuted }]}>
                Keep job
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.btn,
                { backgroundColor: selected ? danger : "#ccc" },
              ]}
              onPress={handleConfirm}
              disabled={!selected || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={[styles.btnText, { color: "#fff" }]}>
                  Cancel job
                </ThemedText>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 4,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  subtitle: { fontSize: 13, marginBottom: 12 },
  reasons: { gap: 8, marginBottom: 20 },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  reasonText: { fontSize: 14 },
  actions: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: { borderWidth: 1 },
  btnText: { fontSize: 14, fontWeight: "600" },
});
