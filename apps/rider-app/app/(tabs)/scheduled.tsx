import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { EmptyState } from "@/components/orders/EmptyState";
import { UpcomingRideCard } from "@/components/scheduled/UpcomingRideCard";
import { OrderCardSkeleton } from "@/components/orders/OrderCardSkeleton";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getDriverUpcomingRides } from "@/services/scheduled-rides.service";
import Toast from "react-native-toast-message";

export default function ScheduledScreen() {
  const surface = useThemeColor({}, "surfaceBackground");
  const primary = useThemeColor({}, "brandPrimary");

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<any[]>([]);

  const fetchRides = useCallback(async () => {
    try {
      const data = await getDriverUpcomingRides();
      setRides(data);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to fetch scheduled rides",
        text2: "Please try again",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRides();
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <ThemedText type="subtitle" style={styles.pageTitle}>
        Upcoming Rides
      </ThemedText>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {loading ? (
          <View style={styles.cardsList}>
            {Array.from({ length: 3 }).map((_, index) => (
              <OrderCardSkeleton key={index} />
            ))}
          </View>
        ) : rides.length === 0 ? (
          <EmptyState message="No upcoming scheduled rides" />
        ) : (
          <View style={styles.cardsList}>
            {rides.map((ride) => (
              <UpcomingRideCard key={ride.id} ride={ride} />
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  pageTitle: {
    fontSize: 24,
    marginBottom: 16,
    fontWeight: "900",
  },
  cardsList: {
    gap: 16,
  },
});
