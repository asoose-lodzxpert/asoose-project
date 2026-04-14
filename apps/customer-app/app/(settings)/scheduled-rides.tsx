import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRide } from "@/context/RideContext";
import Toast from "react-native-toast-message";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";

export default function ScheduledRidesScreen() {
  const { scheduledRides, fetchScheduledRides, cancelScheduledRide, loading } = useRide();
  const [refreshing, setRefreshing] = useState(false);
  const confirm = useConfirm();

  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textColor = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const cardBg = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const accentGreen = useThemeColor({}, "statusSuccess");
  const accentRed = useThemeColor({}, "statusError");
  const router = useRouter();

  useEffect(() => {
    fetchScheduledRides();
  }, [fetchScheduledRides]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchScheduledRides();
    setRefreshing(false);
  }, [fetchScheduledRides]);

  const handleCancel = async (rideId: string) => {
    const result = await confirm({
      title: "Cancel Ride",
      message: "Are you sure you want to cancel this scheduled ride?",
      confirmLabel: "Yes, Cancel",
      cancelLabel: "No",
      variant: "danger"
    });
    
    if (result) {
      cancelScheduledRide(rideId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderRideCard = ({ item: ride }: { item: any }) => {
    return (
      <View style={[styles.rideCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.rideHeader}>
          <View style={styles.timeContainer}>
            <IconSymbol name="clock.fill" size={16} color={brandPrimary} />
            <ThemedText style={styles.timeText}>
              {formatDate(ride.scheduledAt)} • {formatTime(ride.scheduledAt)}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${accentGreen}22` }]}>
            <ThemedText style={[styles.statusText, { color: accentGreen }]}>Confirmed</ThemedText>
          </View>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.locationRow}>
            <View style={[styles.dot, { backgroundColor: accentGreen }]} />
            <ThemedText numberOfLines={1} style={styles.locationText}>
              {ride.pickupAddress || "Pickup location"}
            </ThemedText>
          </View>
          <View style={styles.line} />
          <View style={styles.locationRow}>
            <View style={[styles.dot, { backgroundColor: accentRed }]} />
            <ThemedText numberOfLines={1} style={styles.locationText}>
              {ride.dropoffAddress || "Dropoff location"}
            </ThemedText>
          </View>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.priceText}>
            ₦{ride.estimatedFare?.toLocaleString() || ride.totalFare?.toLocaleString() || "0"}
          </ThemedText>
          <Pressable 
            onPress={() => handleCancel(ride.id)}
            style={[styles.cancelBtn, { borderColor: border }]}
          >
            <ThemedText style={{ color: accentRed, fontSize: 13, fontWeight: "600" }}>Cancel</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color={textColor} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>Scheduled Rides</ThemedText>
      </View>

      <FlatList
        data={scheduledRides}
        renderItem={renderRideCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={brandPrimary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="calendar" size={64} color={textSecondary} />
              <ThemedText style={styles.emptyText}>No scheduled rides yet</ThemedText>
              <ThemedText style={{ color: textSecondary, textAlign: 'center' }}>
                Your upcoming scheduled trips will appear here.
              </ThemedText>
            </View>
          ) : (
            <ActivityIndicator style={{ marginTop: 40 }} color={brandPrimary} />
          )
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  listContent: { padding: 16, paddingBottom: 40 },
  rideCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  rideHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeText: {
    fontSize: 15,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  routeContainer: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationText: {
    fontSize: 14,
    opacity: 0.8,
    flex: 1,
  },
  line: {
    width: 1,
    height: 12,
    backgroundColor: "#ddd",
    marginLeft: 3.5,
    marginVertical: 2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 12,
  },
  priceText: {
    fontSize: 18,
    fontWeight: "800",
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
  },
});
