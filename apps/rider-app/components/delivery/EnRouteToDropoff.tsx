import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useDelivery } from "@/context/DeliveryContext";
import * as Location from "expo-location";
import { Keys } from "@/config/keys";
import axios from "axios";

export default function EnRouteToDropoff({
  onAnimateToDropoff,
}: {
  onAnimateToDropoff?: () => void;
}) {
  const { activeDelivery, arriveAtDropoff } = useDelivery();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const cardBg = useThemeColor({}, "surfaceSubtle");

  const [distanceToCustomer, setDistanceToCustomer] = useState<number | null>(
    null
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
          if (!activeDelivery) return;

          const d = getDistanceMeters(
            loc.coords.latitude,
            loc.coords.longitude,
            Keys.CUSTOMER_COORD.latitude,
            Keys.CUSTOMER_COORD.longitude
          );
          setDistanceToCustomer(d);

          try {
            const res = await axios.get(
              `https://maps.googleapis.com/maps/api/directions/json?origin=${loc.coords.latitude},${loc.coords.longitude}&destination=${Keys.CUSTOMER_COORD.latitude},${Keys.CUSTOMER_COORD.longitude}&mode=driving&key=${Keys.GOOGLE_MAPS_API_KEY}`
            );

            if (res.data.status === "OK") {
              const leg = res.data.routes[0].legs[0];
              setEta(leg.duration.text);

              let closestStep = null;
              let minDistance = Infinity;

              for (const step of leg.steps) {
                const dist = getDistanceMeters(
                  loc.coords.latitude,
                  loc.coords.longitude,
                  step.end_location.lat,
                  step.end_location.lng
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
      );
    })();

    return () => subscription?.remove();
  }, [activeDelivery]);

  if (!activeDelivery) return null;

  const canArrive = true; // 50ft
  // const canArrive = distanceToCustomer !== null && distanceToCustomer <= 15.24; // 50ft

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
        {/* Customer card */}
        <View style={[styles.vendorCard, { backgroundColor: cardBg }]}>
          <View style={styles.vendorInfo}>
            <IconSymbol name="person.circle" size={36} color={primary} />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">
                {activeDelivery.customerName}
              </ThemedText>
              <ThemedText style={{ color: "#666", fontSize: 14 }}>
                {activeDelivery.customerAddress}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Distance + ETA */}
        <View style={styles.row}>
          {distanceToCustomer !== null && (
            <Text style={[styles.infoText, { marginRight: 16 }]}>
              {(distanceToCustomer / 1000).toFixed(2)} km
            </Text>
          )}
          {eta && <Text style={styles.infoText}>{eta}</Text>}
        </View>

        {/* Direction (KEY UI) */}
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
              ARRIVED AT DROP-OFF
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ---------- Utils ---------- */
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
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
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
