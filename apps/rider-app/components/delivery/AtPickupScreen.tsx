import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { resolveAddress } from "@/utils/address";
import CancelJobModal from "@/components/delivery/CancelJobModal";

const RIDE_OTP_LENGTH = 6;

export default function AtPickupScreen() {
  const { activeJob, confirmPickup, cancelJob } = useJobs();
  const { bottom } = useSafeAreaInsets();
  const [cancelVisible, setCancelVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    ? "Start Ride"
    : isMultiStop && currentStopIndex < (activeJob.stops?.length ?? 1) - 1
      ? "Collected — Next Stop"
      : "Confirm Pickup";

  const canConfirm = isRide ? otp.trim().length === RIDE_OTP_LENGTH : true;

  const handleConfirm = async () => {
    if (isRide && otp.trim().length !== RIDE_OTP_LENGTH) {
      setOtpError(`Enter the ${RIDE_OTP_LENGTH}-digit code from the passenger`);
      return;
    }
    setLoading(true);
    setOtpError(null);
    try {
      await confirmPickup(isRide ? otp.trim() : undefined);
    } catch (err: any) {
      if (isRide) {
        setOtpError(
          err?.message ||
            "Invalid code. Ask the passenger to check their screen.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

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

      {/* OTP entry — rides only */}
      {isRide && (
        <View
          style={[
            styles.otpCard,
            {
              backgroundColor: colors.card,
              borderColor: otpError ? colors.danger : colors.primary + "60",
            },
          ]}
        >
          <View style={styles.otpHeader}>
            <IconSymbol name="lock.fill" size={14} color={colors.primary} />
            <ThemedText style={[styles.otpLabel, { color: colors.muted }]}>
              PASSENGER TRIP CODE
            </ThemedText>
          </View>
          <TextInput
            style={[
              styles.otpInput,
              {
                color: colors.text,
                borderColor: otpError ? colors.danger : colors.border,
              },
            ]}
            placeholder="Ask passenger for their code"
            placeholderTextColor={colors.muted}
            value={otp}
            onChangeText={(v) => {
              setOtp(v.replace(/[^0-9]/g, ""));
              if (otpError) setOtpError(null);
            }}
            keyboardType="number-pad"
            maxLength={RIDE_OTP_LENGTH}
            autoCapitalize="none"
          />
          {otpError ? (
            <ThemedText style={[styles.otpError, { color: colors.danger }]}>
              {otpError}
            </ThemedText>
          ) : (
            <ThemedText style={[styles.otpHint, { color: colors.muted }]}>
              The passenger sees this code on their screen.
            </ThemedText>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Pressable
          onPress={handleConfirm}
          disabled={!canConfirm || loading}
          style={({ pressed }) => [
            styles.mainBtn,
            {
              backgroundColor: colors.primary,
              opacity: !canConfirm || loading ? 0.5 : pressed ? 0.9 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <ThemedText style={[styles.btnText, { color: colors.onPrimary }]}>
              {btnLabel.toUpperCase()}
            </ThemedText>
          )}
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
  otpCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  otpHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  otpLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  otpInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 8,
    textAlign: "center",
  },
  otpHint: { fontSize: 12 },
  otpError: { fontSize: 12, fontWeight: "600" },
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
