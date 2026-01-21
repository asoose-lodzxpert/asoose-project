import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useDelivery } from "@/context/DeliveryContext";
import { riderApiService } from "@/services/rider-api.service";

export default function OfflineScreen() {
  const { goOnline } = useDelivery();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");

  const [stats, setStats] = useState({
    totalDeliveries: 0,
    totalEarnings: 0.0,
    rating: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const data = await riderApiService.getEarningsStats("today");
        setStats({
          totalDeliveries: data.totalDeliveries || 0,
          totalEarnings: data.totalEarnings || 0.0,
          rating: data.rating || 0,
        });
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.bottomCard, { backgroundColor: surface }]}>
        <IconSymbol name="bag" size={60} color="#999" />

        <ThemedText type="title" style={styles.offlineTitle}>
          You're currently offline
        </ThemedText>

        <ThemedText style={styles.subtitle}>
          Go online to receive delivery requests
        </ThemedText>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            {loading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <ThemedText type="title">{stats.totalDeliveries}</ThemedText>
            )}
            <ThemedText style={styles.statLabel}>Deliveries Today</ThemedText>
          </View>

          <View style={styles.stat}>
            {loading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <ThemedText type="title">
                ${stats.totalEarnings.toFixed(2)}
              </ThemedText>
            )}
            <ThemedText style={styles.statLabel}>Earned Today</ThemedText>
          </View>

          <View style={styles.stat}>
            {loading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <ThemedText type="title">{stats.rating.toFixed(1)} ★</ThemedText>
            )}
            <ThemedText style={styles.statLabel}>Your Rating</ThemedText>
          </View>
        </View>

        <Pressable
          style={[styles.goOnlineBtn, { backgroundColor: primary }]}
          onPress={goOnline}
        >
          <IconSymbol name="power" size={20} color="#fff" />
          <ThemedText style={styles.goOnlineText}>Go Online</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  bottomCard: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  offlineTitle: {
    marginVertical: 12,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 24,
    fontSize: 15,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 32,
  },
  stat: {
    alignItems: "center",
    minHeight: 60,
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
  },
  goOnlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 10,
    width: "100%",
  },
  goOnlineText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
});
