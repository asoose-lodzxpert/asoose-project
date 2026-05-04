import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScheduledRideService } from "@/services/scheduled-ride.service";

interface UpcomingRide {
  id: string;
  scheduledAt: string;
  pickupAddress?: { street: string };
  dropoffAddress?: { street: string };
  passengerName?: string;
}

/**
 * Compact banner displayed on the customer home screen when the user has
 * an upcoming scheduled ride within the next 3 hours.
 */
export default function UpcomingRideBanner() {
  const router = useRouter();
  const [ride, setRide] = useState<UpcomingRide | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rides: UpcomingRide[] = await ScheduledRideService.getUpcomingRides();
        if (!active) return;

        const now = Date.now();
        const threeHoursMs = 3 * 60 * 60 * 1000;

        // Show the earliest ride within the next 3 hours
        const soon = rides
          .filter((r) => {
            const t = new Date(r.scheduledAt).getTime();
            return t >= now && t - now <= threeHoursMs;
          })
          .sort(
            (a, b) =>
              new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
          );

        setRide(soon[0] ?? null);
      } catch {
        // Silently fail — banner is decorative
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading || !ride) return null;

  const time = new Date(ride.scheduledAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => router.push("/ride/scheduled")}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Upcoming scheduled ride"
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>🕒</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>Upcoming Ride · {time}</Text>
        {ride.passengerName ? (
          <Text style={styles.sub}>Passenger: {ride.passengerName}</Text>
        ) : (
          <Text style={styles.sub} numberOfLines={1}>
            To: {ride.dropoffAddress?.street ?? "—"}
          </Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 20 },
  info: { flex: 1 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4338CA",
  },
  sub: {
    fontSize: 12,
    color: "#6366F1",
    marginTop: 2,
  },
  chevron: { fontSize: 20, color: "#6366F1" },
});
