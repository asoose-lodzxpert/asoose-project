import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useDelivery } from "@/context/DeliveryContext";
import * as Location from "expo-location";
import { Keys } from "@/config/keys";
import axios from "axios";

export default function EnRouteToPickup({
  onAnimateToPickup,
}: {
  onAnimateToPickup?: () => void;
}) {
  const { activeDelivery, arriveAtPickup } = useDelivery();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const cardBg = useThemeColor({}, "surfaceSubtle");

  const [riderLocation, setRiderLocation] =
    useState<Location.LocationObject | null>(null);
  const [distanceToVendor, setDistanceToVendor] = useState<number | null>(null);
  const [eta, setEta] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<{
    text: string;
    maneuver?: string;
  } | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setRiderLocation(loc);

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 1,
          timeInterval: 3000,
        },
        async (newLoc) => {
          setRiderLocation(newLoc);

          if (activeDelivery) {
            const d = getDistanceMeters(
              newLoc.coords.latitude,
              newLoc.coords.longitude,
              Keys.VENDOR_COORD.latitude,
              Keys.VENDOR_COORD.longitude
            );
            setDistanceToVendor(d);

            try {
              const res = await axios.get(
                `https://maps.googleapis.com/maps/api/directions/json?origin=${newLoc.coords.latitude},${newLoc.coords.longitude}&destination=${Keys.VENDOR_COORD.latitude},${Keys.VENDOR_COORD.longitude}&key=${Keys.GOOGLE_MAPS_API_KEY}&mode=driving`
              );

              if (res.data.status === "OK") {
                const leg = res.data.routes[0].legs[0];
                setEta(leg.duration.text);

                let closestStep = null;
                let minDistance = Infinity;

                for (const step of leg.steps) {
                  const stepLat = step.end_location.lat;
                  const stepLng = step.end_location.lng;
                  const dist = getDistanceMeters(
                    newLoc.coords.latitude,
                    newLoc.coords.longitude,
                    stepLat,
                    stepLng
                  );
                  if (dist < minDistance) {
                    minDistance = dist;
                    closestStep = step;
                  }
                }

                if (closestStep) {
                  setCurrentStep({
                    text: closestStep.html_instructions.replace(/<[^>]+>/g, ""),
                    maneuver: closestStep.maneuver,
                  });
                }
              }
            } catch (err) {
              console.log("Directions API error:", err);
            }
          }
        }
      );
    })();

    return () => subscription?.remove();
  }, [activeDelivery]);

  if (!activeDelivery) return null;

  const canArrive = true;
  //   const canArrive = distanceToVendor !== null && distanceToVendor <= 15.24;

  const getManeuverIcon = (maneuver?: string) => {
    switch (maneuver) {
      case "turn-left":
        return "arrow-left";
      case "turn-right":
        return "arrow-right";
      case "uturn-left":
        return "arrow-u-turn-left";
      case "uturn-right":
        return "arrow-u-turn-right";
      case "straight":
      default:
        return "arrow-up";
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.bottomContainer, { backgroundColor: surface }]}>
        <View style={[styles.vendorCard, { backgroundColor: cardBg }]}>
          <View style={styles.vendorInfo}>
            <IconSymbol name="pizza" size={36} color={primary} />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">
                {activeDelivery.vendorName}
              </ThemedText>
              <ThemedText style={{ color: "#666", fontSize: 14 }}>
                {activeDelivery.vendorAddress}
              </ThemedText>
            </View>
          </View>

          <Pressable style={styles.callBtn}>
            <IconSymbol name="phone" size={22} color={primary} />
          </Pressable>
        </View>

        {/* Distance and ETA in a row */}
        <View style={styles.row}>
          {distanceToVendor !== null && (
            <Text style={[styles.infoText, { marginRight: 16 }]}>
              Distance: {(distanceToVendor / 1000).toFixed(2)} km
            </Text>
          )}
          {eta && <Text style={styles.infoText}>ETA: {eta}</Text>}
        </View>

        {/* Current step */}
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
              ARRIVED AT PICKUP
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
