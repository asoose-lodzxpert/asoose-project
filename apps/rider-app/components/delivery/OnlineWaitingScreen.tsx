import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/context/AuthContext";
import { useJobs } from "@/context/JobContext";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getEarnings } from "@/services/earnings.service";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function OnlineWaitingScreen() {
  const { goOffline, activeJob, incomingJob, isOnlineLoading } = useJobs();
  const { user } = useAuth();
  const confirm = useConfirm();

  const primary = useThemeColor({}, "brandPrimary");
  const background = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const border = useThemeColor({}, "borderDefault");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");

  const { bottom: bottomInset } = useSafeAreaInsets();

  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalDeliveries: 0,
    totalRides: 0,
    onlineHours: 0,
  });
  const [loading, setLoading] = useState(true);

  const defaultJobType = user?.role === "DRIVER" ? "ride" : "delivery";
  const jobType = activeJob?.jobType || incomingJob?.jobType || defaultJobType;
  const isRide = jobType === "ride";

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const data = await getEarnings("today");
        setStats({
          totalEarnings: data.total || 0,
          totalDeliveries: data.rides || 0,
          totalRides: data.rides || 0,
          onlineHours: data.hoursOnline || 0,
        });
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [jobType]);

  return (
    <View style={[styles.container]}>
      <View style={[styles.mapBackground]} />

      <SafeAreaView style={[styles.safeArea]} edges={["top"]}>
        <View style={[styles.contentWrapper, { backgroundColor: background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <View style={[styles.pulseDot, { backgroundColor: success }]} />
              <ThemedText style={[styles.statusText, { color: textPrimary }]}>
                Searching for {isRide ? "rides" : "orders"}...
              </ThemedText>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.powerButton,
                {
                  backgroundColor: card,
                  borderColor: border,
                  opacity: pressed || isOnlineLoading ? 0.7 : 1,
                },
              ]}
              disabled={isOnlineLoading}
              onPress={async () => {
                const confirmed = await confirm({
                  title: "Go Offline",
                  message: "Ready to wrap up? You won't receive new requests.",
                  confirmLabel: "Go Offline",
                  cancelLabel: "Cancel",
                });
                if (confirmed) goOffline();
              }}
            >
              {isOnlineLoading ? (
                <ActivityIndicator size="small" color={danger} />
              ) : (
                <IconSymbol name="power" size={20} color={danger} />
              )}
            </Pressable>
          </View>

          <View style={{ flex: 1 }} />

          {/* Bottom Stats Sheet */}
          <View style={[styles.footer, { paddingBottom: bottomInset + 16 }]}>
            <View
              style={[
                styles.statsCard,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <View style={styles.statsRow}>
                <StatBox
                  label={isRide ? "Rides" : "Orders"}
                  value={isRide ? stats.totalRides : stats.totalDeliveries}
                  loading={loading}
                  primary={primary}
                  textColor={textPrimary}
                  labelColor={textSecondary}
                />

                <View style={[styles.divider, { backgroundColor: border }]} />

                <StatBox
                  label="Today"
                  value={`₦${stats.totalEarnings.toLocaleString()}`}
                  loading={loading}
                  primary={primary}
                  textColor={textPrimary}
                  labelColor={textSecondary}
                />

                <View style={[styles.divider, { backgroundColor: border }]} />

                <StatBox
                  label="Online"
                  value={`${stats.onlineHours.toFixed(1)}h`}
                  loading={loading}
                  primary={primary}
                  textColor={textPrimary}
                  labelColor={textSecondary}
                />
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function StatBox({
  label,
  value,
  loading,
  primary,
  textColor,
  labelColor,
}: any) {
  return (
    <View style={styles.statBox}>
      <ThemedText style={[styles.statLabel, { color: labelColor }]}>
        {label}
      </ThemedText>

      {loading ? (
        <ActivityIndicator
          size="small"
          color={primary}
          style={{ marginTop: 6 }}
        />
      ) : (
        <ThemedText style={[styles.statValue, { color: textColor }]}>
          {value}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  mapBackground: {
    ...StyleSheet.absoluteFillObject,
  },

  safeArea: {
    flex: 1,
  },

  contentWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 8 : 20,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    justifyContent: "space-between",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
  },

  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  statusText: {
    fontSize: 14,
    fontWeight: "700",
  },

  powerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },

  footer: {
    marginTop: 16,
  },

  statsCard: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },

  divider: {
    width: 1,
    height: 36,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  statValue: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
  },
});
