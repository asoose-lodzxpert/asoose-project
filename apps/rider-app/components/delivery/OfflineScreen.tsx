import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getEarnings } from "@/services/earnings.service";
import { getRiderProfile, type RiderProfile } from "@/services/profile.service";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OfflineScreen() {
  const { goOnline, isOnlineLoading } = useJobs();
  const confirm = useConfirm();

  const primary = useThemeColor({}, "brandPrimary");
  const background = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const border = useThemeColor({}, "borderDefault");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const statusNeutral = useThemeColor({}, "statusNeutral");

  const [stats, setStats] = useState({
    totalDeliveries: 0,
    totalRides: 0,
    totalEarnings: 0,
    rating: 0,
  });

  const [role, setRole] = useState<RiderProfile["role"]>("RIDER");
  const [loading, setLoading] = useState(true);
  const isDriver = role === "DRIVER";

  useEffect(() => {
    const loadStatsAndRole = async () => {
      setLoading(true);
      try {
        const [profile, data] = await Promise.all([
          getRiderProfile(),
          getEarnings("today"),
        ]);
        setRole(profile.role);
        setStats({
          totalDeliveries: data.rides || 0,
          totalRides: data.rides || 0,
          totalEarnings: data.total || 0,
          rating: data.rating || 0,
        });
      } finally {
        setLoading(false);
      }
    };
    loadStatsAndRole();
  }, []);

  return (
    <View style={[styles.mainWrapper, { backgroundColor: background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.masterContainer}>
          {/* 1. Header - Tightened top spacing */}
          <View style={styles.header}>
            <View
              style={[styles.statusPill, { backgroundColor: surfaceSubtle }]}
            >
              <View style={[styles.dot, { backgroundColor: statusNeutral }]} />
              <ThemedText style={[styles.statusText, { color: textSecondary }]}>
                Offline
              </ThemedText>
            </View>
            <ThemedText style={[styles.greeting, { color: textPrimary }]}>
              {isDriver ? "Ready for a ride?" : "Ready for a delivery?"}
            </ThemedText>
          </View>

          {/* 2. Stats Section - Increased vertical breathing room */}
          <View style={styles.centerContent}>
            <View
              style={[
                styles.statsCard,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <View style={styles.statsRow}>
                <StatItem
                  label="Today"
                  value={`₦${stats.totalEarnings.toLocaleString()}`}
                  loading={loading}
                  primary={primary}
                  color={textPrimary}
                />
                <View style={[styles.vDivider, { backgroundColor: border }]} />
                <StatItem
                  label={isDriver ? "Rides" : "Orders"}
                  value={isDriver ? stats.totalRides : stats.totalDeliveries}
                  loading={loading}
                  color={textPrimary}
                />
                <View style={[styles.vDivider, { backgroundColor: border }]} />
                <StatItem
                  label="Rating"
                  value={`${stats.rating.toFixed(1)} ★`}
                  loading={loading}
                  color={textPrimary}
                />
              </View>
            </View>
          </View>

          {/* 3. Action Footer */}
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.mainBtn,
                {
                  backgroundColor: primary,
                  opacity: pressed || isOnlineLoading ? 0.7 : 1,
                },
              ]}
              disabled={isOnlineLoading}
              onPress={async () => {
                const confirmed = await confirm({
                  title: "Go Online",
                  message: "Ready to start receiving requests?",
                  confirmLabel: "Go Online",
                  cancelLabel: "Cancel",
                });
                if (confirmed) goOnline();
              }}
            >
              {isOnlineLoading ? (
                <ActivityIndicator color={textOnPrimary} size="small" />
              ) : (
                <ThemedText style={[styles.btnText, { color: textOnPrimary }]}>
                  GO ONLINE
                </ThemedText>
              )}
              <View
                style={[styles.btnCircle, { backgroundColor: textOnPrimary }]}
              >
                {isOnlineLoading ? (
                  <ActivityIndicator color={primary} size="small" />
                ) : (
                  <IconSymbol name="chevron.right" size={16} color={primary} />
                )}
              </View>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function StatItem({ label, value, loading, primary, color }: any) {
  return (
    <View style={styles.statBox}>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={primary || "#9CA3AF"}
          style={{ marginTop: 8 }}
        />
      ) : (
        <ThemedText style={[styles.statValue, { color: primary || color }]}>
          {value}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  safeArea: {
    flex: 1,
  },
  masterContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 5,
    paddingBottom: 5,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 50,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: 15,
    fontWeight: "700",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    marginVertical: 20,
  },
  statsCard: {
    paddingVertical: 32, // More internal breathing room
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  vDivider: {
    width: 1,
    height: 40, // Taller divider for better separation
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#9CA3AF",
  },
  statValue: {
    fontSize: 20, // Slightly larger for better readability
    fontWeight: "800",
    marginTop: 8, // More gap between label and value
  },
  footer: {
    marginBottom: Platform.OS === "ios" ? 10 : 20,
  },
  mainBtn: {
    height: 72, // Taller, more modern button
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  btnText: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  btnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
