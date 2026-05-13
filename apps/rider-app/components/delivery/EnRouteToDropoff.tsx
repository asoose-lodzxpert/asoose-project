import React, { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { resolveAddress } from "@/utils/address";
import { getDirections, getDistanceMeters } from "@/services/maps";
import CancelJobModal from "@/components/delivery/CancelJobModal";
import JobItemDetailsModal from "./JobItemDetailsModal";

export default function EnRouteToDropoff({
  onAnimateToDropoff,
}: {
  onAnimateToDropoff?: () => void;
}) {
  const { activeJob, arriveAtDropoff, cancelJob } = useJobs();
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();

  const colors = {
    bg: useThemeColor({}, "surfaceBackground"),
    card: useThemeColor({}, "surfaceCard"),
    border: useThemeColor({}, "borderDefault"),
    text: useThemeColor({}, "textPrimary"),
    muted: useThemeColor({}, "textMuted"),
    danger: useThemeColor({}, "statusError"),
  };

  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState("");
  const [cancelVisible, setCancelVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

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
            activeJob.dropoffAddress?.latitude ?? activeJob.dropoffAddress?.lat;
          const lng =
            activeJob.dropoffAddress?.longitude ??
            activeJob.dropoffAddress?.lng;
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

  // const canArrive = __DEV__ || (distance !== null && distance <= 50);
  const canArrive = true;
  const dropoff = resolveAddress(activeJob.dropoffAddress);
  const deliveryId = activeJob.id.split("-")[0].toUpperCase();
  const isRide = activeJob.jobType === "ride";

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: colors.bg, paddingBottom: bottom + 16 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.statusGroup}>
          <View style={[styles.dot, { backgroundColor: colors.danger }]} />
          <ThemedText style={styles.statusText}>En Route • #{deliveryId}</ThemedText>
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
            {activeJob.jobType === "ride" ? "PASSENGER" : "RECIPIENT"}
          </ThemedText>
          <ThemedText style={styles.name}>
            {activeJob.recipientName || activeJob.customerName}
          </ThemedText>
          <ThemedText
            numberOfLines={1}
            style={[styles.address, { color: colors.muted }]}
          >
            {dropoff}
          </ThemedText>
        </View>

        {(activeJob.dropoffContactPhone ||
          activeJob.customerPhone ||
          activeJob.dropoffAddress?.phone) && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/chat/[id]",
                  params: { 
                    id: activeJob.customerId || activeJob.senderId,
                    name: activeJob.recipientName || activeJob.customerName,
                    orderId: activeJob.jobType === 'delivery' ? activeJob.id : undefined,
                    rideId: activeJob.jobType === 'ride' ? activeJob.id : undefined
                  }
                })
              }
              style={styles.callBtn}
            >
              <IconSymbol name="bubble.left" size={18} color={colors.danger} />
            </Pressable>
            <Pressable
              onPress={() =>
                Linking.openURL(
                  `tel:${activeJob.dropoffContactPhone || activeJob.customerPhone || activeJob.dropoffAddress?.phone}`,
                )
              }
              style={styles.callBtn}
            >
              <IconSymbol name="phone" size={18} color={colors.danger} />
            </Pressable>
          </View>
        )}
      </View>

      {!isRide && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 12, marginTop: -4 }]}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconSymbol name="shippingbox" size={16} color={colors.muted} />
            <ThemedText style={{ fontSize: 13, color: colors.text, flex: 1 }} numberOfLines={2}>
              {activeJob.orderItems?.length
                ? activeJob.orderItems.join(", ")
                : activeJob.packageDetails || "Package dropoff"}
            </ThemedText>
          </View>
          <Pressable 
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.danger + '10' }}
            onPress={() => setDetailsVisible(true)}
          >
            <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.danger }}>Details</ThemedText>
          </Pressable>
        </View>
      )}

      <JobItemDetailsModal
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        items={activeJob.itemDetails}
        packageDetails={activeJob.packageDetails}
      />

      <View style={styles.footer}>
        <Pressable
          disabled={!canArrive}
          onPress={async () => {
            await arriveAtDropoff();
            onAnimateToDropoff?.();
          }}
          style={({ pressed }) => [
            styles.mainBtn,
            {
              backgroundColor: colors.danger,
              opacity: !canArrive ? 0.4 : pressed ? 0.9 : 1,
            },
          ]}
        >
          <ThemedText style={styles.btnText}>ARRIVE AT DROP-OFF</ThemedText>
        </Pressable>

        <Pressable
          onPress={() => setCancelVisible(true)}
          style={styles.cancelBtn}
        >
          <ThemedText style={[styles.cancelText, { color: colors.muted }]}>
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
    backgroundColor: "#f0f0f020",
  },
  footer: { gap: 12 },
  mainBtn: {
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#FFF", fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  cancelBtn: { alignItems: "center" },
  cancelText: { fontSize: 13, fontWeight: "500" },
});
