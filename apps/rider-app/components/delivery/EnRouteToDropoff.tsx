import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getDirections, getDistanceMeters } from "@/services/maps";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function EnRouteToDropoff({
  onAnimateToDropoff,
}: {
  onAnimateToDropoff?: () => void;
}) {
  const { activeJob, arriveAtDropoff } = useJobs();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const cardBg = useThemeColor({}, "surfaceSubtle");

  const [distanceToCustomer, setDistanceToCustomer] = useState<number | null>(
    null,
  );
  const [eta, setEta] = useState("");
  const [currentStep, setCurrentStep] = useState<{
    text: string;
    maneuver?: string;
  } | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 1,
          timeInterval: 3000,
        },
        async (loc) => {
          if (!activeJob) return;
          const dropoffLat =
            activeJob.dropoffAddress?.latitude ?? activeJob.dropoffAddress?.lat;
          const dropoffLng =
            activeJob.dropoffAddress?.longitude ??
            activeJob.dropoffAddress?.lng;
          if (
            typeof dropoffLat === "number" &&
            typeof dropoffLng === "number"
          ) {
            try {
              const distData = await getDistanceMeters({
                originLat: loc.coords.latitude,
                originLng: loc.coords.longitude,
                destLat: dropoffLat,
                destLng: dropoffLng,
              });
              if (typeof distData.distance === "number") {
                setDistanceToCustomer(distData.distance);
              }
            } catch (err) {
              setDistanceToCustomer(null);
            }
            try {
              const data = await getDirections({
                originLat: loc.coords.latitude,
                originLng: loc.coords.longitude,
                destLat: dropoffLat,
                destLng: dropoffLng,
              });
              if (!data.error && data.duration && data.coordinates) {
                setEta(data.duration.text);
                let closestStep = null;
                let minDistance = Infinity;
                for (const coord of data.coordinates) {
                  const stepDistData = await getDistanceMeters({
                    originLat: loc.coords.latitude,
                    originLng: loc.coords.longitude,
                    destLat: coord.latitude,
                    destLng: coord.longitude,
                  });
                  const dist =
                    typeof stepDistData.distance === "number"
                      ? stepDistData.distance
                      : Infinity;
                  if (dist < minDistance) {
                    minDistance = dist;
                    closestStep = coord;
                  }
                }
                if (closestStep) {
                  setCurrentStep({
                    text: `Continue to drop-off`,
                    maneuver: undefined,
                  });
                }
              }
            } catch (err) {
              console.log("Directions API error:", err);
            }
          }
        },
      );
    })();
    return () => subscription?.remove();
  }, [activeJob]);

  if (!activeJob) return null;

  const isRide = activeJob.jobType === "ride";

  const canArrive = distanceToCustomer !== null && distanceToCustomer <= 15.24;

  const getManeuverIcon = (maneuver?: string) => {
    switch (maneuver) {
      case "turn-left":
        return "arrow.left";
      case "turn-right":
        return "arrow.right";
      case "uturn-left":
      case "uturn-right":
        return "arrow.clockwise";
      default:
        return "arrow.up";
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.bottomContainer, { backgroundColor: surface }]}>
        <View style={[styles.vendorCard, { backgroundColor: cardBg }]}>
          <View style={styles.vendorInfo}>
            <IconSymbol
              name={isRide ? "car" : "person.circle"}
              size={36}
              color={primary}
            />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">
                {activeJob.customerName}
              </ThemedText>
              <ThemedText style={{ color: "#666", fontSize: 14 }}>
                {activeJob.dropoffAddress?.address ||
                  activeJob.dropoffAddress ||
                  ""}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          {distanceToCustomer !== null && (
            <Text style={[styles.infoText, { marginRight: 16 }]}>
              {" "}
              {(distanceToCustomer / 1000).toFixed(2)} km{" "}
            </Text>
          )}
          {eta && <Text style={styles.infoText}>{eta}</Text>}
        </View>

        {currentStep && (
          <View style={styles.currentStepContainer}>
            <IconSymbol
              name={getManeuverIcon(currentStep.maneuver)}
              size={26}
              color={primary}
            />
            <Text style={[styles.currentStepText, { color: primary }]}>
              {currentStep.text}
            </Text>
          </View>
        )}

        {canArrive && (
          <Pressable
            style={styles.arrivedBtn}
            onPress={async () => {
              await arriveAtDropoff();
              onAnimateToDropoff?.();
            }}
          >
            <ThemedText style={styles.arrivedText}>
              {isRide ? "ARRIVED AT DROP-OFF" : "ARRIVED AT DROP-OFF"}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  bottomContainer: {
    marginTop: "auto",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 16,
  },
  vendorCard: {
    padding: 18,
    borderRadius: 20,
    elevation: 4,
  },
  vendorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  row: { flexDirection: "row", alignItems: "center" },
  infoText: { fontSize: 14, color: "#444", fontWeight: "500" },
  currentStepContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  currentStepText: {
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 10,
    flexShrink: 1,
  },
  arrivedBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
  },
  arrivedText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
