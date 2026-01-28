import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  RefreshControl,
  Pressable,
  Animated,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/services/notification-settings.service";

// Skeleton loader component
const SkeletonBox = ({
  width,
  height,
  radius = 8,
}: {
  width: number | string;
  height: number;
  radius?: number;
}) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;
  const surfaceCard = useThemeColor({}, "surfaceCard");

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          height,
          backgroundColor: surfaceCard,
          borderRadius: radius,
          opacity,
        },
        typeof width === "number" ? { width } : { width: width as any },
      ]}
    />
  );
};

const ToggleRowSkeleton = () => {
  return (
    <View style={styles.row}>
      <SkeletonBox width={180} height={18} />
      <SkeletonBox width={51} height={31} radius={16} />
    </View>
  );
};

const SectionSkeleton = ({ border }: { border: string }) => {
  return (
    <View style={[styles.section, { borderColor: border }]}>
      <SkeletonBox width={140} height={20} />
      <ToggleRowSkeleton />
      <ToggleRowSkeleton />
      <ToggleRowSkeleton />
    </View>
  );
};

type NotificationSettingsState = {
  masterEnabled: boolean;
  delivery: {
    newOrders: boolean;
    orderUpdates: boolean;
    vibration: boolean;
  };
  earnings: {
    paymentUpdates: boolean;
    dailySummary: boolean;
    weeklySummary: boolean;
  };
  accountSafety: {
    alerts: boolean;
  };
};

export default function NotificationsScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<NotificationSettingsState>({
    masterEnabled: true,
    delivery: {
      newOrders: true,
      orderUpdates: true,
      vibration: true,
    },
    earnings: {
      paymentUpdates: true,
      dailySummary: false,
      weeklySummary: true,
    },
    accountSafety: {
      alerts: true,
    },
  });

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotificationSettings();

      // Map API response to local state structure
      setSettings({
        masterEnabled: data.masterEnabled,
        delivery: {
          newOrders: data.newOrders,
          orderUpdates: data.orderUpdates,
          vibration: data.vibration,
        },
        earnings: {
          paymentUpdates: data.paymentUpdates,
          dailySummary: data.dailySummary,
          weeklySummary: data.weeklySummary,
        },
        accountSafety: {
          alerts: data.securityAlerts,
        },
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load settings",
        text2: error.message || "Please try again",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (updatedSettings: NotificationSettingsState) => {
    try {
      await updateNotificationSettings({
        masterEnabled: updatedSettings.masterEnabled,
        newOrders: updatedSettings.delivery.newOrders,
        orderUpdates: updatedSettings.delivery.orderUpdates,
        vibration: updatedSettings.delivery.vibration,
        paymentUpdates: updatedSettings.earnings.paymentUpdates,
        dailySummary: updatedSettings.earnings.dailySummary,
        weeklySummary: updatedSettings.earnings.weeklySummary,
        securityAlerts: updatedSettings.accountSafety.alerts,
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to update settings",
        text2: error.message || "Please try again",
      });
      // Revert to previous settings on error
      fetchSettings();
    }
  };

  const toggleMaster = (value: boolean) => {
    const updatedSettings = {
      ...settings,
      masterEnabled: value,
      delivery: {
        newOrders: value,
        orderUpdates: value,
        vibration: value,
      },
      earnings: {
        paymentUpdates: value,
        dailySummary: value,
        weeklySummary: value,
      },
      accountSafety: {
        alerts: value,
      },
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border + "40" }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={primary} />
          <ThemedText type="link">Back</ThemedText>
        </Pressable>
        <ThemedText type="subtitle" style={{ flex: 1, textAlign: "center" }}>
          Notifications
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[primary]}
          />
        }
      >
        {loading ? (
          <>
            <SectionSkeleton border={border} />
            <SectionSkeleton border={border} />
            <SectionSkeleton border={border} />
            <SectionSkeleton border={border} />
          </>
        ) : (
          <>
            {/* Master Toggle */}
            <View style={[styles.section, { borderColor: border }]}>
              <ToggleRow
                label="Enable Notifications"
                value={settings.masterEnabled}
                onChange={toggleMaster}
              />
            </View>

            {/* Delivery Notifications */}
            <Section title="Delivery Notifications">
              <ToggleRow
                label="Alert for new delivery requests"
                value={settings.delivery.newOrders}
                onChange={(v) => {
                  const updated = {
                    ...settings,
                    delivery: { ...settings.delivery, newOrders: v },
                  };
                  setSettings(updated);
                  saveSettings(updated);
                }}
              />
              <ToggleRow
                label="Status changes and messages"
                value={settings.delivery.orderUpdates}
                onChange={(v) => {
                  const updated = {
                    ...settings,
                    delivery: { ...settings.delivery, orderUpdates: v },
                  };
                  setSettings(updated);
                  saveSettings(updated);
                }}
              />
              <ToggleRow
                label="Vibration"
                value={settings.delivery.vibration}
                onChange={(v) => {
                  const updated = {
                    ...settings,
                    delivery: { ...settings.delivery, vibration: v },
                  };
                  setSettings(updated);
                  saveSettings(updated);
                }}
              />
            </Section>

            {/* Earnings Notifications */}
            <Section title="Earnings Notifications">
              <ToggleRow
                label="Payment updates"
                value={settings.earnings.paymentUpdates}
                onChange={(v) => {
                  const updated = {
                    ...settings,
                    earnings: { ...settings.earnings, paymentUpdates: v },
                  };
                  setSettings(updated);
                  saveSettings(updated);
                }}
              />
              <ToggleRow
                label="Daily summary"
                value={settings.earnings.dailySummary}
                onChange={(v) => {
                  const updated = {
                    ...settings,
                    earnings: { ...settings.earnings, dailySummary: v },
                  };
                  setSettings(updated);
                  saveSettings(updated);
                }}
              />
              <ToggleRow
                label="Weekly summary"
                value={settings.earnings.weeklySummary}
                onChange={(v) => {
                  const updated = {
                    ...settings,
                    earnings: { ...settings.earnings, weeklySummary: v },
                  };
                  setSettings(updated);
                  saveSettings(updated);
                }}
              />
            </Section>

            {/* Account & Safety */}
            <Section title="Account & Safety">
              <ToggleRow
                label="Security alerts"
                value={settings.accountSafety.alerts}
                onChange={(v) => {
                  const updated = {
                    ...settings,
                    accountSafety: { alerts: v },
                  };
                  setSettings(updated);
                  saveSettings(updated);
                }}
              />
            </Section>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

/* ───────── Components ───────── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const border = useThemeColor({}, "borderDefault");

  return (
    <View style={[styles.section, { borderColor: border }]}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const primary = useThemeColor({}, "brandPrimary");

  return (
    <View style={styles.row}>
      <ThemedText>{label}</ThemedText>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: primary }}
        thumbColor={primary}
      />
    </View>
  );
}

/* ───────── Styles ───────── */

const styles = StyleSheet.create({
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },

  subHeader: {
    paddingHorizontal: 20,
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
  },

  section: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "transparent",
    gap: 14,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
