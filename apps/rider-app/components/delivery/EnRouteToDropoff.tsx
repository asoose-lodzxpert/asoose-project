import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { resolveAddress } from "@/utils/address";
import CancelJobModal from "@/components/delivery/CancelJobModal";
import { getDirections, getDistanceMeters } from "@/services/maps";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

export default function EnRouteToDropoff({
  onAnimateToDropoff,
}: {
  onAnimateToDropoff?: () => void;
}) {
  const { activeJob, arriveAtDropoff, cancelJob } = useJobs();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const subtle = useThemeColor({}, "surfaceSubtle");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  const danger = useThemeColor({}, "statusError");

  const [distanceToCustomer, setDistanceToCustomer] = useState<number | null>(
    null,
  );
  const [eta, setEta] = useState("");
  const [cancelVisible, setCancelVisible] = useState(false);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        if (!isMounted) return;

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10,
            timeInterval: 3000,
          },
          async (loc) => {
            if (!isMounted || !activeJob) return;
            const dropoffLat =
              activeJob.dropoffAddress?.latitude ??
              activeJob.dropoffAddress?.lat;
            const dropoffLng =
              activeJob.dropoffAddress?.longitude ??
              activeJob.dropoffAddress?.lng;
            if (
              typeof dropoffLat !== "number" ||
              typeof dropoffLng !== "number"
            )
              return;

            try {
              const d = await getDistanceMeters({
                originLat: loc.coords.latitude,
                originLng: loc.coords.longitude,
                destLat: dropoffLat,
                destLng: dropoffLng,
              });
              if (typeof d.distance === "number" && isMounted)
                setDistanceToCustomer(d.distance);
            } catch {}

            try {
              const data = await getDirections({
                originLat: loc.coords.latitude,
                originLng: loc.coords.longitude,
                destLat: dropoffLat,
                destLng: dropoffLng,
              });
              if (!data.error && data.duration && isMounted)
                setEta(data.duration.text);
            } catch {}
          },
        );
      } catch {}
    };

    startTracking();
    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, [activeJob]);

  if (!activeJob) return null;

  const dropoff = resolveAddress(activeJob.dropoffAddress);
  const canArrive = true;
  // const canArrive = distanceToCustomer !== null && distanceToCustomer <= 50;

  return (
    <>
      <View style={[styles.sheet, { backgroundColor: surface }]}>
        {/* Step label */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, { backgroundColor: danger }]} />
          <ThemedText style={[styles.stepLabel, { color: danger }]}>
            En route to drop-off
          </ThemedText>
        </View>

        {/* Address */}
        <View style={[styles.addressCard, { backgroundColor: subtle }]}>
          <IconSymbol name="location.fill" size={16} color={danger} />
          <ThemedText
            style={[styles.addressText, { color: textPrimary }]}
            numberOfLines={2}
          >
            {dropoff || "Drop-off location"}
          </ThemedText>
        </View>

        {/* ETA row */}
        {(distanceToCustomer !== null || eta) && (
          <View style={styles.etaRow}>
            {distanceToCustomer !== null && (
              <ThemedText style={[styles.etaText, { color: textMuted }]}>
                {(distanceToCustomer / 1000).toFixed(2)} km away
              </ThemedText>
            )}
            {eta && distanceToCustomer !== null && (
              <ThemedText
                style={[styles.etaSep, { color: textMuted }]}
              ></ThemedText>
            )}
            {eta && (
              <ThemedText style={[styles.etaText, { color: textMuted }]}>
                {eta}
              </ThemedText>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {canArrive ? (
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: danger }]}
              onPress={async () => {
                await arriveAtDropoff();
                onAnimateToDropoff?.();
              }}
            >
              <ThemedText style={styles.primaryBtnText}>
                Arrived at drop-off
              </ThemedText>
            </Pressable>
          ) : (
            <View
              style={[styles.primaryBtn, { backgroundColor: danger + "60" }]}
            >
              <ThemedText style={styles.primaryBtnText}>
                Arrived at drop-off
              </ThemedText>
            </View>
          )}
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
  stepRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  stepLabel: { fontSize: 13, fontWeight: "600", letterSpacing: 0.3 },
  addressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  addressText: { fontSize: 14, flex: 1 },
  etaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  etaText: { fontSize: 13 },
  etaSep: { fontSize: 13 },
  actions: { gap: 8 },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  cancelLink: { alignItems: "center", paddingVertical: 8 },
  cancelText: { fontSize: 13, fontWeight: "500" },
});
