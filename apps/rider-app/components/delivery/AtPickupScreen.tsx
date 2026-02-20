import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { resolveAddress } from "@/utils/address";
import CancelJobModal from "@/components/delivery/CancelJobModal";

export default function AtPickupScreen() {
  const { activeJob, confirmPickup, cancelJob } = useJobs();
  const { bottom } = useSafeAreaInsets();
  const [cancelVisible, setCancelVisible] = useState(false);

  const colors = {
    bg: useThemeColor({}, "surfaceBackground"),
    card: useThemeColor({}, "surfaceCard"),
    border: useThemeColor({}, "borderDefault"),
    primary: useThemeColor({}, "brandPrimary"),
    text: useThemeColor({}, "textPrimary"),
    muted: useThemeColor({}, "textMuted"),
    danger: useThemeColor({}, "statusError"),
    success: useThemeColor({}, "statusSuccess"),
    onPrimary: useThemeColor({}, "textOnPrimary"),
  };

  if (!activeJob) return null;

  const isRide = activeJob.jobType === "ride";
  const pickup = resolveAddress(activeJob.pickupAddress);
  const isMultiStop = !isRide && (activeJob.stops?.length ?? 0) > 1;
  const currentStopIndex = activeJob.currentStopIndex ?? 0;
  const storeName =
    activeJob.stops?.[currentStopIndex]?.storeName ?? activeJob.customerName;

  const btnLabel = isRide
    ? "Confirm Pickup"
    : isMultiStop && currentStopIndex < (activeJob.stops?.length ?? 1) - 1
      ? "Collected — Next Stop"
      : "Confirm Pickup";

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: colors.bg, paddingBottom: bottom + 16 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.statusGroup}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <ThemedText style={styles.statusText}>
            {isMultiStop
              ? `Stop ${currentStopIndex + 1}/${activeJob.stops?.length}`
              : "At Pickup"}
          </ThemedText>
        </View>
        <ThemedText style={[styles.instruction, { color: colors.muted }]}>
          {isRide ? "Ready for passenger" : "Collect order"}
        </ThemedText>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardContent}>
          <ThemedText style={[styles.label, { color: colors.muted }]}>
            {isRide ? "PICKUP LOCATION" : "VENDOR"}
          </ThemedText>
          <ThemedText style={styles.name}>{storeName}</ThemedText>
          <ThemedText
            numberOfLines={1}
            style={[styles.address, { color: colors.muted }]}
          >
            {pickup}
          </ThemedText>
        </View>

        {activeJob.pickupContactPhone && (
          <Pressable
            onPress={() =>
              Linking.openURL(`tel:${activeJob.pickupContactPhone}`)
            }
            style={styles.callBtn}
          >
            <IconSymbol name="phone" size={18} color={colors.primary} />
          </Pressable>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={confirmPickup}
          style={({ pressed }) => [
            styles.mainBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <ThemedText style={[styles.btnText, { color: colors.onPrimary }]}>
            {btnLabel.toUpperCase()}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => setCancelVisible(true)}
          style={styles.cancelBtn}
        >
          <ThemedText style={[styles.cancelText, { color: colors.danger }]}>
            Cancel Job
          </ThemedText>
        </Pressable>
      </View>

      <CancelJobModal
        visible={cancelVisible}
        onClose={() => setCancelVisible(false)}
        onConfirm={async (r) => {
          await cancelJob(activeJob.id, activeJob.jobType, r);
          setCancelVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  instruction: { fontSize: 12, fontWeight: "500" },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  cardContent: { flex: 1, gap: 2 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  name: { fontSize: 16, fontWeight: "700" },
  address: { fontSize: 13 },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8881",
  },
  footer: { gap: 12 },
  mainBtn: {
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  cancelBtn: { alignItems: "center" },
  cancelText: { fontSize: 13, fontWeight: "600" },
});
