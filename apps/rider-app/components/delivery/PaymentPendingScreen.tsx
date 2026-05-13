import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PaymentPendingScreen() {
  const { activeJob } = useJobs();
  const primary = useThemeColor({}, "brandPrimary");
  const background = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textMuted = useThemeColor({}, "textMuted");
  const success = useThemeColor({}, "statusSuccess");

  const { bottom } = useSafeAreaInsets();

  if (!activeJob) return null;
  const isRide = activeJob.jobType === "ride";

  return (
    <View style={[styles.wrapper, { backgroundColor: background, paddingBottom: bottom + 20 }]}>
      <View style={styles.header}>
        <View style={[styles.pill, { backgroundColor: card, borderColor: border }]}>
          <ActivityIndicator size="small" color={success} style={{ marginRight: 8 }} />
          <ThemedText style={[styles.pillText, { color: textPrimary }]}>
            WAITING FOR PAYMENT
          </ThemedText>
        </View>
      </View>

      <View style={styles.centerContent}>
        <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.cardRow}>
            <View style={[styles.avatar, { backgroundColor: primary }]}>
              <ThemedText style={styles.avatarText}>
                {activeJob.customerName
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.cardLabel, { color: textMuted }]}>
                {isRide ? "PASSENGER" : "CUSTOMER"}
              </ThemedText>
              <ThemedText style={[styles.customerName, { color: textPrimary }]}>
                {activeJob.customerName}
              </ThemedText>
              <ThemedText style={[styles.amountText, { color: success }]}>
                Total Fare: ₦{activeJob.earnings?.toLocaleString()}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.instructionCard, { backgroundColor: card, borderColor: border }]}>
          <IconSymbol name="info.circle" size={20} color={textMuted} />
          <ThemedText style={[styles.instructionText, { color: textSecondary }]}>
            The trip is finished. Please wait for the customer to confirm payment on their app. You will be notified once the payment is successful.
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  header: { flexDirection: "row", alignItems: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  centerContent: { gap: 14 },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  cardLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  customerName: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  amountText: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  instructionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
