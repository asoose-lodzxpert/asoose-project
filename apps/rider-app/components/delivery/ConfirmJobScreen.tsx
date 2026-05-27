import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { resolveAddress } from "@/utils/address";
import CancelJobModal from "@/components/delivery/CancelJobModal";
import React, { useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedInput } from "@/components/ThemedInput";
import { RelativePathString } from "expo-router";

export default function ConfirmJobScreen() {
  const [cancelVisible, setCancelVisible] = useState(false);
  const { activeJob, completeJob, cancelJob } = useJobs();
  const router = useRouter();

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
  const dropoff = resolveAddress(activeJob.dropoffAddress);

  const [otp, setOtp] = useState("");

  const handleComplete = async () => {
    await completeJob({ otp });
  };

  const pillLabel = isRide ? "Complete Ride" : "Confirm Delivery";
  const canComplete = !activeJob.requiresOtp || otp.length >= 4;

  return (
    <>
      <View style={[styles.wrapper, { backgroundColor: background }]}>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Pressable
                        style={styles.phoneRow}
                        onPress={() =>
                          router.push({
                            pathname: "/chat/[id]" as RelativePathString,
                            params: { 
                              id: activeJob.customerId || activeJob.senderId,
                              name: activeJob.recipientName || activeJob.customerName,
                              orderId: activeJob.jobType === 'delivery' ? activeJob.id : undefined,
                              rideId: activeJob.jobType === 'ride' ? activeJob.id : undefined
                            }
                          })
                        }
                      >
                        <IconSymbol name="chat" size={13} color={danger} />
                        <ThemedText style={[styles.phoneText, { color: danger }]}>
                          Chat
                        </ThemedText>
                      </Pressable>
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
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {/* OTP Input for Deliveries */}
            {!isRide && activeJob.requiresOtp && (
              <View style={[styles.card, { backgroundColor: card, borderColor: border, gap: 12 }]}>
                <ThemedText style={[styles.cardLabel, { color: textMuted }]}>
                  DELIVERY VERIFICATION CODE
                </ThemedText>
                <ThemedText style={{ fontSize: 13, color: textSecondary }}>
                  Ask the recipient for the 4-digit code provided in their app.
                </ThemedText>
                <ThemedInput
                  placeholder="0000"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={{ fontSize: 24, fontWeight: "800", textAlign: "center", letterSpacing: 8 }}
                />
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
          </View>
        </ScrollView>
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
});
