import React from "react";
import { View, StyleSheet, Modal, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

interface PaymentSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string | null;
  amount: number;
  currency: string;
}

export function PaymentSuccessModal({
  visible,
  onClose,
  orderId,
  amount,
  currency,
}: PaymentSuccessModalProps) {
  const accent = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const statusSuccess = useThemeColor({}, "statusSuccess");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: surface }]}>
          {/* Success Icon */}
          <View
            style={[styles.iconContainer, { backgroundColor: statusSuccess }]}
          >
            <IconSymbol name="checkmark" size={64} color="#fff" />
          </View>

          {/* Success Message */}
          <ThemedText style={styles.title}>Payment Successful!</ThemedText>

          <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
            Your order has been placed successfully
          </ThemedText>

          {/* Order Details */}
          <View style={styles.detailsContainer}>
            {orderId && (
              <View style={styles.detailRow}>
                <ThemedText
                  style={[styles.detailLabel, { color: textSecondary }]}
                >
                  Order ID
                </ThemedText>
                <ThemedText style={styles.detailValue}>
                  #{orderId.slice(-8).toUpperCase()}
                </ThemedText>
              </View>
            )}

            <View style={styles.detailRow}>
              <ThemedText
                style={[styles.detailLabel, { color: textSecondary }]}
              >
                Amount Paid
              </ThemedText>
              <ThemedText
                style={[styles.detailValue, { color: statusSuccess }]}
              >
                {currency}
                {amount.toLocaleString()}
              </ThemedText>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: accent }]}
              onPress={onClose}
            >
              <ThemedText style={styles.primaryButtonText}>Done</ThemedText>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                onClose();
                // Navigate to orders screen
              }}
            >
              <ThemedText
                style={[styles.secondaryButtonText, { color: accent }]}
              >
                View Order
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },

  detailsContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 32,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  detailLabel: {
    fontSize: 14,
  },

  detailValue: {
    fontSize: 16,
    fontWeight: "700",
  },

  buttonContainer: {
    width: "100%",
    gap: 12,
  },

  primaryButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },

  secondaryButton: {
    paddingVertical: 14,
    alignItems: "center",
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
