import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { resolveAddress } from "@/utils/address";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

const AUTO_DECLINE_TIMEOUT = 90;
const EXTENSION_TIME = 15;

export default function IncomingJobSheet() {
  const { incomingJob, acceptJob, declineJob } = useJobs();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const subtle = useThemeColor({}, "surfaceSubtle");
  const danger = useThemeColor({}, "statusError");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textMuted = useThemeColor({}, "textMuted");

  const [timer, setTimer] = useState(AUTO_DECLINE_TIMEOUT);
  const [canExtend, setCanExtend] = useState(true);
  const [loadingAccept, setLoadingAccept] = useState(false);

  useEffect(() => {
    if (!incomingJob) return;
    setTimer(AUTO_DECLINE_TIMEOUT);
    setCanExtend(true);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          declineJob(incomingJob.id, incomingJob.jobType);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [incomingJob?.id, declineJob]);

  if (!incomingJob) return null;

  const isRide = incomingJob.jobType === "ride";
  const pickup = resolveAddress(incomingJob.pickupAddress);
  const dropoff = resolveAddress(incomingJob.dropoffAddress);
  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  const handleAccept = async () => {
    setLoadingAccept(true);
    try {
      await acceptJob(incomingJob.id, incomingJob.jobType);
    } catch {
      setLoadingAccept(false);
    }
  };

  return (
    <View style={[styles.sheet, { backgroundColor: surface }]}>
      {/* Header: badge + timer */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: primary + "18" }]}>
          <ThemedText style={[styles.badgeText, { color: primary }]}>
            {isRide ? "NEW RIDE" : "NEW DELIVERY"}
          </ThemedText>
        </View>
        <View style={styles.timerRow}>
          {canExtend && timer <= 30 && (
            <Pressable
              style={[styles.extendBtn, { borderColor: primary }]}
              onPress={() => {
                setTimer((p) => p + EXTENSION_TIME);
                setCanExtend(false);
              }}
            >
              <ThemedText style={[styles.extendText, { color: primary }]}>
                +15s
              </ThemedText>
            </Pressable>
          )}
          <ThemedText
            style={[
              styles.timer,
              { color: timer <= 15 ? danger : textPrimary },
            ]}
          >
            {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </ThemedText>
        </View>
      </View>

      {/* Route */}
      <View style={[styles.route, { backgroundColor: subtle }]}>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: primary }]} />
          <ThemedText
            style={[styles.routeText, { color: textPrimary }]}
            numberOfLines={1}
          >
            {pickup || "Pickup location"}
          </ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: "#ddd" }]} />
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: danger }]} />
          <ThemedText
            style={[styles.routeText, { color: textPrimary }]}
            numberOfLines={1}
          >
            {dropoff || "Drop-off location"}
          </ThemedText>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.stats}>
        {incomingJob.distanceKm != null && (
          <View style={styles.statItem}>
            <IconSymbol name="arrow.right.circle" size={13} color={textMuted} />
            <ThemedText style={[styles.statText, { color: textMuted }]}>
              {incomingJob.distanceKm} km
            </ThemedText>
          </View>
        )}
        {incomingJob.durationMin != null && (
          <View style={styles.statItem}>
            <IconSymbol name="clock" size={13} color={textMuted} />
            <ThemedText style={[styles.statText, { color: textMuted }]}>
              ~{incomingJob.durationMin} min
            </ThemedText>
          </View>
        )}
        {incomingJob.packageDetails && (
          <View style={styles.statItem}>
            <IconSymbol name="shippingbox" size={13} color={textMuted} />
            <ThemedText
              style={[styles.statText, { color: textMuted }]}
              numberOfLines={1}
            >
              {incomingJob.packageDetails}
            </ThemedText>
          </View>
        )}
        <ThemedText style={[styles.earnings, { color: primary }]}>
          ₦{incomingJob.earnings?.toFixed(0)}
        </ThemedText>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, styles.btnGhost, { borderColor: "#ddd" }]}
          onPress={() => declineJob(incomingJob.id, incomingJob.jobType)}
          disabled={loadingAccept}
        >
          <ThemedText style={[styles.btnLabel, { color: danger }]}>
            Decline
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.btn, { backgroundColor: primary }]}
          onPress={handleAccept}
          disabled={loadingAccept}
        >
          {loadingAccept ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ThemedText style={[styles.btnLabel, { color: "#fff" }]}>
              Accept
            </ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 36,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timer: { fontSize: 16, fontWeight: "700" },
  extendBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  extendText: { fontSize: 12, fontWeight: "600" },
  route: { borderRadius: 14, padding: 14, gap: 10 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  divider: { height: 1, marginLeft: 4 },
  routeText: { fontSize: 14, flex: 1 },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 13 },
  earnings: { fontSize: 18, fontWeight: "700", marginLeft: "auto" },
  actions: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: { borderWidth: 1 },
  btnLabel: { fontSize: 14, fontWeight: "600" },
});
