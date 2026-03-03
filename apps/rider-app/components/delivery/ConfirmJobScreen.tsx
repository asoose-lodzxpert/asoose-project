import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { resolveAddress } from "@/utils/address";
import CancelJobModal from "@/components/delivery/CancelJobModal";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { jobsService } from "@/services/jobs.service";

// In development builds, skip photo requirement so the flow can be tested end-to-end
const DEV_BYPASS = __DEV__;

export default function ConfirmJobScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const { activeJob, completeJob, cancelJob } = useJobs();

  const primary = useThemeColor({}, "brandPrimary");
  const background = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textMuted = useThemeColor({}, "textMuted");
  const danger = useThemeColor({}, "statusError");
  const success = useThemeColor({}, "statusSuccess");

  const { bottom } = useSafeAreaInsets();

  if (!activeJob) return null;
  const isRide = activeJob.jobType === "ride";
  const needsOtp = !isRide && !!activeJob.requiresOtp;
  const dropoff = resolveAddress(activeJob.dropoffAddress);

  const handleVerifyOtp = async () => {
    if (!otpValue.trim()) {
      setOtpError("Please enter the OTP from the recipient.");
      return;
    }
    try {
      setOtpLoading(true);
      setOtpError(null);
      await jobsService.verifyDeliveryOtp(activeJob.id, otpValue.trim());
      setOtpVerified(true);
    } catch (e: any) {
      setOtpError(
        e?.message || "Incorrect OTP. Ask the recipient to check theirs.",
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!isRide && !photoUri && !DEV_BYPASS) return;
    if (needsOtp && !otpVerified && !DEV_BYPASS) return;
    await completeJob(!isRide ? { photoUri, otp: otpValue.trim() } : undefined);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]?.uri)
      setPhotoUri(result.assets[0].uri);
  };

  const pillLabel = isRide ? "Complete Ride" : "Confirm Delivery";
  const canComplete =
    (isRide || !!photoUri || DEV_BYPASS) &&
    (!needsOtp || otpVerified || DEV_BYPASS);

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.wrapper, { backgroundColor: background }]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingBottom: bottom + 20 },
          ]}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.pill,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <View style={[styles.pillDot, { backgroundColor: success }]} />
              <ThemedText style={[styles.pillText, { color: textPrimary }]}>
                {pillLabel.toUpperCase()}
              </ThemedText>
            </View>
          </View>

          {/* Content */}
          <View style={styles.centerContent}>
            {/* Customer card */}
            <View
              style={[
                styles.card,
                { backgroundColor: card, borderColor: border },
              ]}
            >
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
                    {isRide ? "PASSENGER" : "RECIPIENT"}
                  </ThemedText>
                  <ThemedText
                    style={[styles.customerName, { color: textPrimary }]}
                  >
                    {!isRide && activeJob.recipientName
                      ? activeJob.recipientName
                      : activeJob.customerName}
                  </ThemedText>
                  {dropoff ? (
                    <ThemedText
                      style={[styles.dropoffText, { color: textSecondary }]}
                      numberOfLines={1}
                    >
                      {dropoff}
                    </ThemedText>
                  ) : null}
                  {activeJob.dropoffContactPhone ? (
                    <Pressable
                      style={styles.phoneRow}
                      onPress={() =>
                        Linking.openURL(`tel:${activeJob.dropoffContactPhone}`)
                      }
                    >
                      <IconSymbol name="phone" size={13} color={danger} />
                      <ThemedText style={[styles.phoneText, { color: danger }]}>
                        {activeJob.dropoffContactPhone}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Photo card (delivery only) */}
            {!isRide && (
              <Pressable
                style={[
                  styles.photoCard,
                  { backgroundColor: card, borderColor: primary + "60" },
                ]}
                onPress={takePhoto}
              >
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.photoPreview}
                  />
                ) : (
                  <>
                    <View
                      style={[
                        styles.cameraIconWrap,
                        { backgroundColor: primary + "18" },
                      ]}
                    >
                      <IconSymbol
                        name="camera.fill"
                        size={24}
                        color={primary}
                      />
                    </View>
                    <ThemedText style={[styles.photoHint, { color: primary }]}>
                      {DEV_BYPASS
                        ? "[DEV] Photo optional"
                        : "Take delivery photo"}
                    </ThemedText>
                  </>
                )}
              </Pressable>
            )}

            {/* OTP card (delivery only) */}
            {needsOtp && (
              <View
                style={[
                  styles.otpCard,
                  {
                    backgroundColor: card,
                    borderColor: otpVerified
                      ? "#10B981"
                      : otpError
                        ? "#EF4444"
                        : primary + "60",
                  },
                ]}
              >
                <View style={styles.otpHeader}>
                  <IconSymbol
                    name={otpVerified ? "checkmark.seal.fill" : "lock.fill"}
                    size={16}
                    color={otpVerified ? "#10B981" : primary}
                  />
                  <ThemedText
                    style={[
                      styles.otpLabel,
                      { color: otpVerified ? "#10B981" : textMuted },
                    ]}
                  >
                    {otpVerified ? "OTP VERIFIED" : "RECIPIENT OTP"}
                  </ThemedText>
                </View>

                {!otpVerified && (
                  <>
                    <View style={[styles.otpInputRow, { borderColor: border }]}>
                      <TextInput
                        style={[styles.otpInput, { color: textPrimary }]}
                        placeholder="Ask recipient for code"
                        placeholderTextColor={textMuted}
                        value={otpValue}
                        onChangeText={(v) => {
                          setOtpValue(v);
                          setOtpError(null);
                        }}
                        keyboardType="number-pad"
                        maxLength={10}
                        autoCapitalize="none"
                      />
                      <Pressable
                        style={[styles.verifyBtn, { backgroundColor: primary }]}
                        onPress={handleVerifyOtp}
                        disabled={otpLoading}
                      >
                        {otpLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <ThemedText style={styles.verifyBtnText}>
                            Verify
                          </ThemedText>
                        )}
                      </Pressable>
                    </View>
                    {otpError ? (
                      <ThemedText style={styles.otpError}>
                        {otpError}
                      </ThemedText>
                    ) : (
                      <ThemedText
                        style={[styles.otpHint, { color: textMuted }]}
                      >
                        Enter the code the recipient shows you.
                      </ThemedText>
                    )}
                  </>
                )}
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.mainBtn,
                {
                  backgroundColor: "#10B981",
                  opacity: !canComplete ? 0.4 : pressed ? 0.9 : 1,
                },
              ]}
              disabled={!canComplete}
              onPress={handleComplete}
            >
              <ThemedText style={[styles.mainBtnText, { color: "#fff" }]}>
                {isRide ? "COMPLETE RIDE" : "COMPLETE DELIVERY"}
              </ThemedText>
              <View style={[styles.btnCircle, { backgroundColor: "#fff" }]}>
                <IconSymbol name="checkmark" size={16} color="#10B981" />
              </View>
            </Pressable>

            <Pressable
              style={styles.cancelLink}
              onPress={() => setCancelVisible(true)}
            >
              <ThemedText style={[styles.cancelText, { color: textMuted }]}>
                Cancel job
              </ThemedText>
            </Pressable>

            {!isRide && !photoUri && (
              <ThemedText
                style={[
                  styles.hint,
                  { color: DEV_BYPASS ? "#F59E0B" : textMuted },
                ]}
              >
                {DEV_BYPASS
                  ? "⚡ DEV MODE — photo bypassed"
                  : "Photo required to complete delivery"}
              </ThemedText>
            )}
            {needsOtp && !otpVerified && !DEV_BYPASS && (
              <ThemedText style={[styles.hint, { color: textMuted }]}>
                Verify the recipient’s OTP to unlock completion.
              </ThemedText>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
  wrapper: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
    flex: 1, // Added flex: 1 to allow KeyboardAvoidingView to expand
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 10 : 20,
    gap: 20,
  },
  header: { flexDirection: "row", alignItems: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  pillDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  centerContent: { gap: 14 },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
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
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  customerName: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  dropoffText: { fontSize: 13, fontWeight: "500" },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingVertical: 4,
  },
  phoneText: { fontSize: 14, fontWeight: "700" },
  photoCard: {
    height: 130,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  cameraIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPreview: { width: "100%", height: "100%", borderRadius: 22 },
  photoHint: { fontSize: 13, fontWeight: "600" },
  footer: { gap: 10 },
  mainBtn: {
    height: 72,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 6,
  },
  mainBtnText: { fontSize: 16, fontWeight: "900", letterSpacing: 1.5 },
  btnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelLink: { alignItems: "center", paddingVertical: 8 },
  cancelText: { fontSize: 13, fontWeight: "600" },
  hint: { fontSize: 12, textAlign: "center", fontWeight: "600" },
  otpCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  otpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  otpLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  otpInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  otpInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 3,
  },
  verifyBtn: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 76,
  },
  verifyBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  otpError: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  otpHint: {
    fontSize: 12,
    fontWeight: "500",
  },
});
