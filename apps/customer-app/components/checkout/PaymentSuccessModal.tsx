import React from "react";
import { View, StyleSheet, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

interface PaymentSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  onViewOrder?: () => void;
  orderId: string | null;
  amount: number;
  currency: string;
}

export function PaymentSuccessModal({
  visible,
  onClose,
  onViewOrder,
  orderId,
  amount,
  currency,
}: PaymentSuccessModalProps) {
  const accent = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const statusSuccess = useThemeColor({}, "statusSuccess");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: surface }]}>
        {/* Top glow accent strip */}
        <View style={[styles.accentStrip, { backgroundColor: accent }]} />

        <View style={styles.content}>
          {/* Animated check circle */}
          <View
            style={[
              styles.iconOuter,
              { backgroundColor: statusSuccess + "20" },
            ]}
          >
            <View
              style={[styles.iconInner, { backgroundColor: statusSuccess }]}
            >
              <IconSymbol name="checkmark" size={52} color={textOnPrimary} />
            </View>
          </View>

          {/* Title */}
          <ThemedText style={styles.title}>Payment Successful!</ThemedText>
          <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
            Your order has been placed and{"\n"}is being prepared
          </ThemedText>

          {/* Details card */}
          <View
            style={[
              styles.detailsCard,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            {orderId && (
              <View style={[styles.detailRow, { borderBottomColor: border }]}>
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

            <View style={styles.detailRowLast}>
              <ThemedText
                style={[styles.detailLabel, { color: textSecondary }]}
              >
                Amount Paid
              </ThemedText>
              <ThemedText
                style={[styles.detailValueLarge, { color: statusSuccess }]}
              >
                {currency}
                {amount.toLocaleString()}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Action Buttons pinned to bottom */}
        <View style={styles.buttonContainer}>
          {onViewOrder && (
            <Pressable
              style={[styles.primaryButton, { backgroundColor: accent }]}
              onPress={onViewOrder}
            >
              <ThemedText
                style={[styles.primaryButtonText, { color: textOnPrimary }]}
              >
                View Order
              </ThemedText>
            </Pressable>
          )}

          <Pressable
            style={[
              styles.secondaryButton,
              { borderColor: accent + "50", backgroundColor: card },
            ]}
            onPress={onClose}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: accent }]}>
              Back to Home
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  accentStrip: {
    height: 4,
    width: "100%",
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  iconOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },

  iconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },

  detailsCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },

  detailRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  detailLabel: {
    fontSize: 14,
  },

  detailValue: {
    fontSize: 15,
    fontWeight: "700",
  },

  detailValueLarge: {
    fontSize: 22,
    fontWeight: "800",
  },

  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },

  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  primaryButtonText: {
    fontSize: 17,
    fontWeight: "700",
  },

  secondaryButton: {
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
