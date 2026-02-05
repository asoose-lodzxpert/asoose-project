import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const AUTO_DECLINE_TIMEOUT = 90;
const EXTENSION_TIME = 15;

export default function IncomingJobSheet() {
  const { incomingJob, acceptJob, declineJob } = useJobs();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const danger = useThemeColor({}, "statusError");
  const warning = useThemeColor({}, "statusPending");

  const [timer, setTimer] = useState(AUTO_DECLINE_TIMEOUT);
  const [isPaused, setIsPaused] = useState(false);
  const [canExtend, setCanExtend] = useState(true);
  const [loadingAccept, setLoadingAccept] = useState(false);

  const isRide = incomingJob && incomingJob.jobType === "ride";
  const isDelivery = incomingJob && incomingJob.jobType === "delivery";

  useEffect(() => {
    if (!incomingJob) return;

    setTimer(AUTO_DECLINE_TIMEOUT);
    setIsPaused(false);
    setCanExtend(true);

    const interval = setInterval(() => {
      if (!isPaused) {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            if (incomingJob) {
              declineJob(incomingJob.id, incomingJob.jobType);
            }
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [incomingJob, declineJob, isPaused]);

  if (!incomingJob) return null;

  const handleAccept = async () => {
    setLoadingAccept(true);
    try {
      await acceptJob(incomingJob.id, incomingJob.jobType);
    } catch {
      setLoadingAccept(false);
    }
  };

  const handleDecline = async () => {
    await declineJob(incomingJob.id, incomingJob.jobType);
  };

  const handleExtend = () => {
    if (canExtend) {
      setTimer((prev) => prev + EXTENSION_TIME);
      setCanExtend(false);
    }
  };

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder} />

      <View style={[styles.sheet, { backgroundColor: surface }]}>
        ...
        <View style={styles.newDeliveryBadge}>
          <ThemedText style={{ color: primary, fontWeight: "600" }}>
            {isRide ? "NEW RIDE" : "NEW DELIVERY"}
          </ThemedText>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {canExtend && timer <= 30 && (
              <TouchableOpacity
                onPress={handleExtend}
                style={[styles.extendButton, { backgroundColor: warning }]}
              >
                <ThemedText
                  style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}
                >
                  +15s
                </ThemedText>
              </TouchableOpacity>
            )}
            <View style={styles.timerBadge}>
              <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
              </ThemedText>
            </View>
          </View>
        </View>
        <View style={styles.vendorRow}>
          <IconSymbol
            name={isRide ? "car" : "storefront"}
            size={32}
            color={primary}
          />
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold">
              {isRide
                ? incomingJob.customerName
                : incomingJob.pickupAddress?.name || "Pickup"}
            </ThemedText>
            <ThemedText style={{ color: "#666" }}>
              {isRide
                ? `Pickup • ${incomingJob.pickupAddress?.address || incomingJob.pickupAddress}`
                : `Pickup • ${incomingJob.pickupAddress?.address || incomingJob.pickupAddress}`}
            </ThemedText>
          </View>
        </View>
        <View style={styles.addressRow}>
          <View style={styles.iconCircle}>
            <IconSymbol name="p.square" size={18} color="#fff" />
          </View>
          <ThemedText>
            {`Pickup: ${incomingJob.pickupAddress?.address || incomingJob.pickupAddress}`}
          </ThemedText>
        </View>
        <View style={styles.addressRow}>
          <View style={[styles.iconCircle, { backgroundColor: "#EF4444" }]}>
            <IconSymbol name="d.square" size={18} color="#fff" />
          </View>
          <ThemedText>
            {`Drop-off: ${incomingJob.dropoffAddress?.address || incomingJob.dropoffAddress}`}
          </ThemedText>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <IconSymbol name="clock" size={18} color="#666" />
            <ThemedText>
              {isRide && incomingJob.durationMin !== undefined
                ? `~${incomingJob.durationMin} min`
                : isDelivery && incomingJob.packageDetails
                  ? incomingJob.packageDetails
                  : ""}
            </ThemedText>
          </View>
          <View style={styles.infoItem}>
            <IconSymbol name="arrow.right.circle" size={18} color="#666" />
            <ThemedText>
              {isRide && incomingJob.distanceKm !== undefined
                ? `${incomingJob.distanceKm} km`
                : ""}
            </ThemedText>
          </View>
          <ThemedText type="title" style={{ color: primary }}>
            ₦{incomingJob.earnings?.toFixed(2)}
          </ThemedText>
        </View>
        {/* No note or items on IncomingJobOffer. If needed, add custom UI here. */}
        <View style={styles.actionButtons}>
          <Pressable style={styles.declineBtn} onPress={handleDecline}>
            <ThemedText style={{ color: danger, fontWeight: "600" }}>
              DECLINE
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.acceptBtn, { backgroundColor: primary }]}
            onPress={handleAccept}
          >
            {loadingAccept ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={{ color: "#fff", fontWeight: "700" }}>
                ACCEPT
              </ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapPlaceholder: { flex: 1, backgroundColor: "#E5E7EB" },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    gap: 16,
  },
  newDeliveryBadge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timerBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
  },
  extendButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  vendorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  noteBanner: {
    flexDirection: "row",
    backgroundColor: "#FFF7ED",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtons: { flexDirection: "row", gap: 12 },
  declineBtn: {
    flex: 1,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 12,
    alignItems: "center",
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
});
