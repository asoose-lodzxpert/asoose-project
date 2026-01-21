import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useDelivery } from "@/context/DeliveryContext";
import { riderApiService } from "@/services/rider-api.service";

export default function OnlineWaitingScreen() {
  const { goOffline } = useDelivery();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");

  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalDeliveries: 0,
    onlineHours: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const data = await riderApiService.getEarningsStats("today");
        setStats({
          totalEarnings: data.totalEarnings || 0,
          totalDeliveries: data.totalDeliveries || 0,
          onlineHours: data.onlineHours || 0,
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
      <View style={styles.mapPlaceholder} />

      <View style={styles.onlineBadge}>
        <ThemedText style={styles.onlineText}>ONLINE</ThemedText>
      </View>

      <View style={[styles.bottomCard, { backgroundColor: surface }]}>
        <IconSymbol name="package" size={60} color={primary} />
        <ThemedText type="title" style={styles.waitingTitle}>
          Waiting for Orders...
        </ThemedText>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            {loading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <ThemedText type="title">{stats.totalDeliveries}</ThemedText>
            )}
            <ThemedText style={styles.statLabel}>Orders</ThemedText>
          </View>

          <View style={styles.stat}>
            {loading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <ThemedText type="title">
                ${stats.totalEarnings.toFixed(2)}
              </ThemedText>
            )}
            <ThemedText style={styles.statLabel}>Earned</ThemedText>
          </View>

          <View style={styles.stat}>
            {loading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <ThemedText type="title">
                {stats.onlineHours.toFixed(1)} hrs
              </ThemedText>
            )}
            <ThemedText style={styles.statLabel}>Online</ThemedText>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.goOfflineBtn} onPress={goOffline}>
            <IconSymbol name="power" size={18} color="#EF4444" />
            <ThemedText style={{ color: "#EF4444", fontWeight: "600" }}>
              Go Offline
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapPlaceholder: { flex: 1, backgroundColor: "#E8F5E9" },
  onlineBadge: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 30,
  },
  onlineText: { color: "#fff", fontWeight: "700" },
  bottomCard: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    alignItems: "center",
  },
  waitingTitle: { marginVertical: 16 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 24,
  },
  stat: { alignItems: "center" },
  statLabel: { fontSize: 12, color: "#666", marginTop: 4 },
  demandBanner: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    width: "100%",
    marginBottom: 24,
  },
  actionRow: { flexDirection: "row", gap: 16, width: "100%" },
  goOfflineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 12,
  },
  refreshBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
});
