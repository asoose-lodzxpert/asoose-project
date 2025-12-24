import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useDelivery } from "@/context/DeliveryContext";

// Mock online stats fetch
const fetchOnlineStats = async () => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return {
    orders: 5,
    earnings: 52.3,
    onlineHours: 3.2,
  };
};

// Mock high demand area fetch
const fetchHighDemand = async () => {
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Randomly return null to simulate no demand available
  if (Math.random() < 0.5) return null;

  return {
    message: "Move closer to Downtown for more orders",
    area: "High demand area nearby",
  };
};

export default function OnlineWaitingScreen() {
  const { goOffline } = useDelivery(); // Use context
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");

  const [stats, setStats] = useState({
    orders: 0,
    earnings: 0,
    onlineHours: 0,
  });
  const [demand, setDemand] = useState<{
    message: string;
    area: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDemand, setLoadingDemand] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await fetchOnlineStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch online stats");
    } finally {
      setLoading(false);
    }
  };

  const loadDemand = async () => {
    setLoadingDemand(true);
    try {
      const data = await fetchHighDemand();
      setDemand(data); // could be null
    } catch (error) {
      console.error("Failed to fetch high demand area");
      setDemand(null);
    } finally {
      setLoadingDemand(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadStats(), loadDemand()]);
  };

  useEffect(() => {
    refreshAll(); // initial load
    const interval = setInterval(refreshAll, 10000); // poll every 10s
    return () => clearInterval(interval);
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
              <ThemedText type="title">{stats.orders}</ThemedText>
            )}
            <ThemedText style={styles.statLabel}>Orders</ThemedText>
          </View>

          <View style={styles.stat}>
            {loading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <ThemedText type="title">${stats.earnings.toFixed(2)}</ThemedText>
            )}
            <ThemedText style={styles.statLabel}>Earned</ThemedText>
          </View>

          <View style={styles.stat}>
            {loading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <ThemedText type="title">{stats.onlineHours} hrs</ThemedText>
            )}
            <ThemedText style={styles.statLabel}>Online</ThemedText>
          </View>
        </View>

        {/* Show demand only if available */}
        {demand && (
          <View style={styles.demandBanner}>
            {loadingDemand ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <IconSymbol name="lightbulb" size={20} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontWeight: "600", color: "#000" }}>
                    {demand.area}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 14, color: "#000" }}>
                    {demand.message}
                  </ThemedText>
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.actionRow}>
          <Pressable style={styles.goOfflineBtn} onPress={goOffline}>
            <IconSymbol name="power" size={18} color="#EF4444" />
            <ThemedText style={{ color: "#EF4444", fontWeight: "600" }}>
              Go Offline
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.refreshBtn, { backgroundColor: primary }]}
            onPress={refreshAll}
          >
            <IconSymbol name="arrow.clockwise" size={18} color="#fff" />
            <ThemedText style={{ color: "#fff" }}>Refresh</ThemedText>
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
