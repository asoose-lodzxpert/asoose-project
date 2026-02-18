import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getDirections, getDistanceMeters } from "@/services/maps";

export default function EnRouteToPickup({
  onAnimateToPickup,
}: {
  onAnimateToPickup?: () => void;
}) {
  const { activeJob, arriveAtPickup } = useJobs();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const cardBg = useThemeColor({}, "surfaceSubtle");

  // const [riderLocation, setRiderLocation] = useState<Location.LocationObject | null>(null);
  const [distanceToPickup, setDistanceToPickup] = useState<number | null>(null);
  const [eta, setEta] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<{
    text: string;
    maneuver?: string;
  } | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          // ...existing code...
          return;
        }

        if (!isMounted) return;

        await Location.getCurrentPositionAsync({});

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 1,
            timeInterval: 1000, // Improved: 1 second for real-time updates
          },
          async (newLoc) => {
            if (!isMounted || !activeJob) return;

            // Validate GPS accuracy
            if (newLoc.coords.accuracy && newLoc.coords.accuracy > 50) {
              // ...existing code...
              // Still update but with warning
            }

            const pickupLat =
              activeJob.pickupAddress?.latitude ?? activeJob.pickupAddress?.lat;
            const pickupLng =
              activeJob.pickupAddress?.longitude ??
              activeJob.pickupAddress?.lng;

            if (
              typeof pickupLat === "number" &&
              typeof pickupLng === "number"
            ) {
              try {
                const distData = await getDistanceMeters({
                  originLat: newLoc.coords.latitude,
                  originLng: newLoc.coords.longitude,
                  destLat: pickupLat,
                  destLng: pickupLng,
                });
                if (typeof distData.distance === "number" && isMounted) {
                  setDistanceToPickup(distData.distance);
                }
              } catch (error) {
                // ...existing code...
                if (isMounted) setDistanceToPickup(null);
              }

              try {
                const data = await getDirections({
                  originLat: newLoc.coords.latitude,
                  originLng: newLoc.coords.longitude,
                  destLat: pickupLat,
                  destLng: pickupLng,
                });
                if (
                  !data.error &&
                  data.duration &&
                  data.coordinates &&
                  isMounted
                ) {
                  setEta(data.duration.text);
                  let closestStep = null;
                  let minDistance = Infinity;
                  for (const coord of data.coordinates) {
                    const stepDistData = await getDistanceMeters({
                      originLat: newLoc.coords.latitude,
                      originLng: newLoc.coords.longitude,
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
                  if (closestStep && isMounted) {
                    setCurrentStep({
                      text: `Continue to pickup`,
                      maneuver: undefined,
                    });
                  }
                }
              } catch (err) {
                // ...existing code...
              }
            }
          },
        );
      } catch (error) {
        // ...existing code...
      }
    };

    startTracking();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
        subscription = null;
      }
    };
  }, [activeJob]);

  if (!activeJob) return null;
  const isRide = activeJob.jobType === "ride";

  const canArrive = distanceToPickup !== null && distanceToPickup <= 15.24;

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
              name={isRide ? "car" : "storefront"}
              size={36}
              color={primary}
            />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">
                {isRide
                  ? activeJob.customerName
                  : activeJob.pickupAddress?.name || "Pickup"}
              </ThemedText>
              <ThemedText style={{ color: "#666", fontSize: 14 }}>
                {isRide
                  ? activeJob.pickupAddress?.address || activeJob.pickupAddress
                  : activeJob.pickupAddress?.address || activeJob.pickupAddress}
              </ThemedText>
            </View>
          </View>
          <Pressable style={styles.callBtn}>
            <IconSymbol name="phone" size={22} color={primary} />
          </Pressable>
        </View>

        <View style={styles.row}>
          {distanceToPickup !== null && (
            <Text style={[styles.infoText, { marginRight: 16 }]}>
              {(distanceToPickup / 1000).toFixed(2)} km
            </Text>
          )}
          {eta && <Text style={styles.infoText}>{eta}</Text>}
        </View>

        {currentStep && (
          <View style={styles.currentStepContainer}>
            <IconSymbol
              name={getManeuverIcon(currentStep.maneuver)}
              size={24}
              color={primary}
            />
            <Text style={[styles.currentStepText, { color: primary }]}>
              {currentStep.text}
            </Text>
          </View>
        )}

        {canArrive && (
          <Pressable
            style={[styles.arrivedBtn, !canArrive && { opacity: 0.5 }]}
            disabled={!canArrive}
            onPress={async () => {
              if (!canArrive) return;
              await arriveAtPickup();
              onAnimateToPickup?.();
            }}
          >
            <ThemedText style={styles.arrivedText}>
              {isRide ? "ARRIVED AT PICKUP" : "ARRIVED AT PICKUP"}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bottomContainer: {
    marginTop: "auto",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  vendorCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  vendorInfo: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  callBtn: {
    width: 52,
    height: 52,
    backgroundColor: "#F0FDF4",
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  row: { flexDirection: "row", alignItems: "center" },
  infoText: { fontSize: 14, color: "#444" },
  currentStepContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  currentStepText: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
    flexShrink: 1,
  },
  arrivedBtn: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
  },
  arrivedText: { color: "#374151", fontWeight: "600", fontSize: 16 },
});
