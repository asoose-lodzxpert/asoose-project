import React from "react";
import { View, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

type PaymentMethod = "paystack" | "flutterwave" | "monnify" | "transfer";

interface PaymentMethodModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (method: PaymentMethod) => void;
  selectedMethod?: PaymentMethod | null;
}

const paymentMethods: {
  id: PaymentMethod;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    id: "paystack",
    label: "Paystack",
    icon: "creditcard.fill",
    description: "Pay with debit/credit card",
  },
  {
    id: "flutterwave",
    label: "Flutterwave",
    icon: "creditcard.fill",
    description: "Pay with debit/credit card",
  },
  {
    id: "monnify",
    label: "Monnify",
    icon: "building.columns.fill",
    description: "Bank transfer",
  },
  {
    id: "transfer",
    label: "Bank Transfer",
    icon: "building.columns.fill",
    description: "Direct bank transfer",
  },
];

export function PaymentMethodModal({
  visible,
  onClose,
  onSelect,
  selectedMethod,
}: PaymentMethodModalProps) {
  const accent = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "borderDefault");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.modalContent, { backgroundColor: surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="subtitle">Payment Method</ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={textPrimary} />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView style={styles.methodList}>
            {paymentMethods.map((method) => (
              <Pressable
                key={method.id}
                style={[
                  styles.methodItem,
                  { backgroundColor: surfaceCard, borderColor },
                  selectedMethod === method.id && {
                    borderColor: accent,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => onSelect(method.id)}
              >
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor:
                        selectedMethod === method.id ? accent : surfaceSubtle,
                    },
                  ]}
                >
                  <IconSymbol
                    name={method.icon as any}
                    size={24}
                    color={selectedMethod === method.id ? "#fff" : accent}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.methodLabel}>
                    {method.label}
                  </ThemedText>
                  <ThemedText
                    style={[styles.methodDescription, { color: textSecondary }]}
                  >
                    {method.description}
                  </ThemedText>
                </View>

                {selectedMethod === method.id && (
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={24}
                    color={accent}
                  />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },

  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingBottom: 24,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },

  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  methodList: {
    paddingHorizontal: 20,
  },

  methodItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  methodLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },

  methodDescription: {
    fontSize: 13,
  },
});
