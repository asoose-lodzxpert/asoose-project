import React, { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { resolveAddress } from "@/utils/address";
import { getDirections, getDistanceMeters } from "@/services/maps";
import CancelJobModal from "@/components/delivery/CancelJobModal";

export default function EnRouteToPickup({
  onAnimateToPickup,
}: {
  onAnimateToPickup?: () => void;
}) {
  const { activeJob, arriveAtPickup, cancelJob } = useJobs();
  const { bottom } = useSafeAreaInsets();

  const colors = {
    bg: useThemeColor({}, "surfaceBackground"),
    card: useThemeColor({}, "surfaceCard"),
    border: useThemeColor({}, "borderDefault"),
    primary: useThemeColor({}, "brandPrimary"),
    text: useThemeColor({}, "textPrimary"),
    muted: useThemeColor({}, "textMuted"),
    danger: useThemeColor({}, "statusError"),
    onPrimary: useThemeColor({}, "textOnPrimary"),
  };

  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState("");
  const [cancelVisible, setCancelVisible] = useState(false);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    if (!activeJob) return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        async (loc) => {
          const lat =
            activeJob.pickupAddress?.latitude ?? activeJob.pickupAddress?.lat;
          const lng =
            activeJob.pickupAddress?.longitude ?? activeJob.pickupAddress?.lng;
          if (typeof lat !== "number") return;

          const [dRes, dirRes] = await Promise.allSettled([
            getDistanceMeters({
              originLat: loc.coords.latitude,
              originLng: loc.coords.longitude,
              destLat: lat,
              destLng: lng,
            }),
            getDirections({
              originLat: loc.coords.latitude,
              originLng: loc.coords.longitude,
              destLat: lat,
              destLng: lng,
            }),
          ]);

          if (dRes.status === "fulfilled") setDistance(dRes.value.distance);
          if (dirRes.status === "fulfilled" && !dirRes.value.error)
            setEta(dirRes.value.duration.text);
        },
      );
    })();
    return () => sub?.remove();
  }, [activeJob]);

  if (!activeJob) return null;

  const isRide = activeJob.jobType === "ride";
  const isMultiStop =
    activeJob.jobType === "delivery" && (activeJob.stops?.length ?? 0) > 1;
  // const canArrive = __DEV__ || (distance !== null && distance <= 50);
  const canArrive = true;
  const pickup = resolveAddress(activeJob.pickupAddress);

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: colors.bg, paddingBottom: bottom + 16 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.statusGroup}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <ThemedText style={styles.statusText}>
            {isMultiStop
              ? `Stop ${(activeJob?.currentStopIndex ?? 0) + 1}/${activeJob?.stops?.length}`
              : "Picking Up"}
          </ThemedText>
        </View>
        <ThemedText style={[styles.etaText, { color: colors.muted }]}>
          {distance ? `${(distance / 1000).toFixed(1)}km` : ""}{" "}
          {eta && `• ${eta}`}
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
            {isRide ? "PASSENGER" : isMultiStop ? "STORE" : "SENDER"}
          </ThemedText>
          <ThemedText style={styles.name}>
            {(isMultiStop && activeJob.stops?.[0]?.storeName) ||
              activeJob.customerName}
          </ThemedText>
          <ThemedText
            numberOfLines={1}
            style={[styles.address, { color: colors.muted }]}
          >
            {pickup}
          </ThemedText>
        </View>

        {(activeJob.customerPhone ||
          activeJob.pickupAddress?.phone ||
          activeJob.pickupContactPhone) && (
          <Pressable
            onPress={() =>
              Linking.openURL(
                `tel:${activeJob.customerPhone || activeJob.pickupAddress?.phone || activeJob.pickupContactPhone}`,
              )
            }
            style={styles.callBtn}
          >
            <IconSymbol name="phone" size={18} color={colors.primary} />
          </Pressable>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          disabled={!canArrive}
          onPress={async () => {
            await arriveAtPickup();
            onAnimateToPickup?.();
          }}
          style={({ pressed }) => [
            styles.mainBtn,
            {
              backgroundColor: colors.primary,
              opacity: !canArrive ? 0.4 : pressed ? 0.9 : 1,
            },
          ]}
        >
          <ThemedText style={[styles.btnText, { color: colors.onPrimary }]}>
            ARRIVE AT PICKUP
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
    paddingTop: 12,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  etaText: { fontSize: 12, fontWeight: "600" },
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
