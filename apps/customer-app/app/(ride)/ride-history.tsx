import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { RelativePathString, useRouter } from "expo-router";
// import { CustomDropdown } from "@/components/CustomDropdown"; // Uncomment if you want to filter by status
// import { fetchRideHistory } from "@/services/ride-history.service"; // Implement this service
// import { RideStatus, Ride } from "@/types/ride-types"; // Implement these types

// Placeholder data and fetch function for demonstration
const fetchRideHistory = async () => {
  // Replace with real API call
  return [
    {
      id: "ride1",
      status: "COMPLETED",
      total: 2500,
      createdAt: new Date().toISOString(),
      pickup: "Lekki Phase 1",
      dropoff: "Victoria Island",
      rider: { name: "John Doe", phone: "08012345678" },
    },
  ];
};

export default function RideHistoryScreen() {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textColor = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const cardBg = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const router = useRouter();

  const loadRides = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRideHistory();
      setRides(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRides();
  }, [loadRides]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRides();
    setRefreshing(false);
  };

  const renderItem = ({ item: ride }: { item: any }) => (
    <>
      <Pressable
        key={ride.id}
        style={[styles.rideCard, { backgroundColor: cardBg }]}
        onPress={() =>
          router.push(("/ride-history/" + ride.id) as RelativePathString)
        }
      >
        <ThemedText style={[styles.rideId, { color: textColor }]}>
          Ride #{ride.id.slice(-6)}
        </ThemedText>
        <ThemedText style={{ color: textSecondary }}>
          Status: {ride.status}
        </ThemedText>
        <ThemedText style={{ color: textColor }}>
          Total: ₦{ride.total.toFixed(2)}
        </ThemedText>
        <ThemedText style={{ color: textSecondary }}>
          From: {ride.pickup}
        </ThemedText>
        <ThemedText style={{ color: textSecondary }}>
          To: {ride.dropoff}
        </ThemedText>
        <ThemedText style={{ color: textSecondary }}>
          Rider: {ride.rider?.name}
        </ThemedText>
        <ThemedText style={{ color: textSecondary }}>
          Date: {new Date(ride.createdAt).toLocaleString()}
        </ThemedText>
      </Pressable>
      <View style={[styles.separator, { backgroundColor: border }]} />
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <IconSymbol
        name="car.fill"
        size={48}
        color={brandPrimary}
        style={{ marginBottom: 12 }}
      />
      <ThemedText
        style={{
          fontSize: 18,
          fontWeight: "600",
          marginBottom: 6,
          color: textColor,
        }}
      >
        No rides yet
      </ThemedText>
      <ThemedText style={{ color: textSecondary, textAlign: "center" }}>
        You haven't taken any rides yet. When you do, they'll show up here!
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={22} color={brandPrimary} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>
          Rides
        </ThemedText>
      </View>
      {/* <CustomDropdown ... /> */}
      <View style={styles.list}>
        {loading ? (
          <View style={{ marginTop: 32 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.rideCard,
                  { backgroundColor: cardBg, opacity: 0.5 },
                ]}
              >
                <View
                  style={[
                    styles.skeletonLine,
                    { backgroundColor: useThemeColor({}, "surfaceSubtle") },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    { backgroundColor: useThemeColor({}, "surfaceSubtle") },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    { backgroundColor: useThemeColor({}, "surfaceSubtle") },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    { backgroundColor: useThemeColor({}, "surfaceSubtle") },
                  ]}
                />
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={rides}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={renderEmpty}
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  list: {
    flex: 1,
    padding: 16,
  },
  rideCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 0,
    elevation: 1,
  },
  rideId: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  skeletonLine: {
    height: 16,
    borderRadius: 8,
    marginBottom: 10,
    width: "80%",
    alignSelf: "center",
  },
  separator: {
    height: 1,
    marginVertical: 12,
    marginHorizontal: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 48,
    paddingHorizontal: 24,
  },
});
