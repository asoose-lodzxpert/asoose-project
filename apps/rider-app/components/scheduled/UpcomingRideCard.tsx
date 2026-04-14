import React from "react";
import { StyleSheet, View, Alert, TouchableOpacity } from "react-native";
import { DateTime } from "luxon";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { driverCancelRide } from "@/services/scheduled-rides.service";
import Toast from "react-native-toast-message";
import { router } from "expo-router";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";

interface UpcomingRideCardProps {
  ride: any;
}

export const UpcomingRideCard: React.FC<UpcomingRideCardProps> = ({ ride }) => {
  const surface = useThemeColor({}, "surfaceCard");
  const muted = useThemeColor({}, "textDisabled");
  const primaryText = useThemeColor({}, "textPrimary");
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const danger = useThemeColor({}, "statusError");
  const confirm = useConfirm();

  // Format date in WAT (West Africa Time)
  const now = DateTime.now();
  const scheduledDate = DateTime.fromISO(ride.scheduledAt, { zone: "UTC" }).setZone("Africa/Lagos");
  
  const diffInMinutes = scheduledDate.diff(now, 'minutes').minutes;
  const canCancel = diffInMinutes > 30;

  const handleCancel = async () => {
    const res = await confirm({
      title: "Cancel Scheduled Ride",
      message: "Are you sure you want to decline this scheduled ride? It will be reassigned to another driver.",
      confirmLabel: "Yes, Cancel",
      cancelLabel: "No, Keep it",
      variant: "danger"
    });
    
    if (res) {
      try {
        await driverCancelRide(ride.id);
        Toast.show({
          type: "success",
          text1: "Ride cancelled successfully",
        });
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "Failed to cancel ride",
          text2: (error as any)?.message || "Please try again later",
        });
      }
    }
  };
  const dayStr = scheduledDate.toFormat("ccc, LLL d");
  const timeStr = scheduledDate.toFormat("h:mm a");

  return (
    <View style={[styles.card, { backgroundColor: surface }]}>
      {/* Date/Time Banner */}
      <View style={styles.header}>
        <View style={[styles.dateBadge, { backgroundColor: brandPrimary + "15" }]}>
          <IconSymbol name="calendar" size={12} color={brandPrimary} />
          <ThemedText style={[styles.dateText, { color: brandPrimary }]}>{dayStr}</ThemedText>
        </View>
        <View style={styles.timeBadge}>
           <IconSymbol name="clock" size={12} color={muted} />
           <ThemedText style={[styles.timeText, { color: primaryText }]}>{timeStr}</ThemedText>
        </View>
      </View>

      <View style={styles.body}>
        {/* Route */}
        <View style={styles.routeContainer}>
          <View style={styles.routeRow}>
            <View style={styles.dotContainer}>
              <View style={[styles.dot, { backgroundColor: "#22C55E" }]} />
              <View style={styles.line} />
            </View>
            <View style={styles.addressBlock}>
              <ThemedText style={styles.addressLabel}>PICKUP</ThemedText>
              <ThemedText numberOfLines={1} style={[styles.addressText, { color: primaryText }]}>
                {ride.pickupAddress?.street || "Resolved Location"}
              </ThemedText>
            </View>
          </View>

          <View style={styles.routeRow}>
            <View style={styles.dotContainer}>
              <IconSymbol name="mappin.circle.fill" size={14} color="#EF4444" />
            </View>
            <View style={styles.addressBlock}>
              <ThemedText style={styles.addressLabel}>DROPOFF</ThemedText>
              <ThemedText numberOfLines={1} style={[styles.addressText, { color: primaryText }]}>
                {ride.dropoffAddress?.street || "Resolved Location"}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Separator */}
        <View style={[styles.separator, { backgroundColor: muted + "20" }]} />

        {/* Bottom Row: Vehicle + Earnings */}
        <View style={styles.footer}>
          <View style={styles.vehicleInfo}>
            <IconSymbol name="car.fill" size={14} color={muted} />
            <ThemedText style={[styles.vehicleText, { color: muted }]}>{ride.vehicleType}</ThemedText>
          </View>
          <View style={styles.earningsInfo}>
            <ThemedText style={[styles.earnLabel, { color: muted }]}>EST. EARNINGS</ThemedText>
            <ThemedText style={[styles.earnAmount, { color: brandPrimary }]}>₦{(ride.scheduledFare * 0.8).toLocaleString()}</ThemedText>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actions}>
          {diffInMinutes <= 30 ? (
            <TouchableOpacity 
              style={[styles.startButton, { backgroundColor: brandPrimary }]} 
              onPress={() => {
                 Toast.show({
                    type: "success",
                    text1: "Starting ride...",
                    text2: "Heading to pickup location",
                 });
                 router.replace("/(tabs)"); // Home shows active jobs
              }}
            >
              <ThemedText style={[styles.startButtonText, { color: "#FFF" }]}>Start Ride</ThemedText>
            </TouchableOpacity>
          ) : canCancel ? (
            <TouchableOpacity 
              style={[styles.cancelButton, { borderColor: danger + "40" }]} 
              onPress={handleCancel}
            >
              <ThemedText style={[styles.cancelButtonText, { color: danger }]}>Decline Ride</ThemedText>
            </TouchableOpacity>
          ) : (
            <View style={styles.lockedHint}>
              <IconSymbol name="lock.fill" size={12} color={muted} />
              <ThemedText style={[styles.lockedText, { color: muted }]}>
                Cancellation locked (less than 30 mins)
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  body: {
    padding: 16,
  },
  routeContainer: {
    gap: 12,
  },
  routeRow: {
    flexDirection: "row",
    gap: 12,
  },
  dotContainer: {
    alignItems: "center",
    width: 20,
    paddingTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    width: 1.5,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
    borderStyle: "dashed",
  },
  addressBlock: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#9CA3AF",
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    fontWeight: "600",
  },
  separator: {
    height: 1,
    marginVertical: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  vehicleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  vehicleText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  earningsInfo: {
    alignItems: "flex-end",
  },
  earnLabel: {
    fontSize: 9,
    fontWeight: "800",
    marginBottom: 2,
  },
  earnAmount: {
    fontSize: 18,
    fontWeight: "900",
  },
  actions: {
    marginTop: 20,
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  lockedHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 8,
  },
  lockedText: {
    fontSize: 11,
    fontWeight: "600",
  },
  startButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
