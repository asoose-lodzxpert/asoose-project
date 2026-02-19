import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { resolveAddress } from "@/utils/address";
import CancelJobModal from "@/components/delivery/CancelJobModal";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

export default function AtPickupScreen() {
  const { activeJob, confirmPickup, cancelJob } = useJobs();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const subtle = useThemeColor({}, "surfaceSubtle");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  const danger = useThemeColor({}, "statusError");

  const [cancelVisible, setCancelVisible] = useState(false);

  if (!activeJob) return null;
  const isRide = activeJob.jobType === "ride";
  const pickup = resolveAddress(activeJob.pickupAddress);

  return (
    <>
      <View style={[styles.sheet, { backgroundColor: surface }]}>
        {/* Status */}
        <View style={styles.statusRow}>
          <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
          <ThemedText style={styles.statusText}>
            {isRide ? "Arrived at pickup" : "Arrived at pickup"}
          </ThemedText>
        </View>

        {/* Instruction */}
        <ThemedText style={[styles.instruction, { color: textMuted }]}>
          {isRide
            ? "Pick up your passenger"
            : "Collect the order from the vendor"}
        </ThemedText>

        {/* Address card */}
        <View style={[styles.addressCard, { backgroundColor: subtle }]}>
          <IconSymbol name="location.fill" size={15} color={primary} />
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.customerName, { color: textPrimary }]}>
              {activeJob.customerName}
            </ThemedText>
            {pickup ? (
              <ThemedText
                style={[styles.addressText, { color: textMuted }]}
                numberOfLines={2}
              >
                {pickup}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: primary }]}
            onPress={confirmPickup}
          >
            <IconSymbol name="checkmark" size={16} color="#fff" />
            <ThemedText style={styles.primaryBtnText}>
              {isRide ? "Confirm pickup" : "Confirm pickup"}
            </ThemedText>
          </Pressable>
          <Pressable
            style={styles.cancelLink}
            onPress={() => setCancelVisible(true)}
          >
            <ThemedText style={[styles.cancelText, { color: danger }]}>
              Cancel job
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <CancelJobModal
        visible={cancelVisible}
        onClose={() => setCancelVisible(false)}
        onConfirm={async (reason) => {
          await cancelJob(activeJob.id, activeJob.jobType, reason);
          setCancelVisible(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 36,
    gap: 12,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusText: { fontSize: 15, fontWeight: "700" },
  instruction: { fontSize: 13 },
  addressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  customerName: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  addressText: { fontSize: 13 },
  actions: { gap: 8 },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  cancelLink: { alignItems: "center", paddingVertical: 8 },
  cancelText: { fontSize: 13, fontWeight: "500" },
});
