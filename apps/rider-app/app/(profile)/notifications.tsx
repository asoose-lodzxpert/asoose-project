import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  RefreshControl,
  Pressable,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";

type NotificationSettings = {
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

  const [refreshing, setRefreshing] = useState(false);

  const [settings, setSettings] = useState<NotificationSettings>({
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setSettings((prev) => ({ ...prev }));
      setRefreshing(false);
    }, 1000);
  }, []);

  const toggleMaster = (value: boolean) => {
    setSettings((prev) => ({
      ...prev,
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
    }));
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border + "40" }]}>
        <Pressable onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={primary} />
        </Pressable>
        <ThemedText type="title" style={{ flex: 1, textAlign: "center" }}>
          Notifications
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      {/* <ThemedText style={styles.subHeader}>Manage your alerts</ThemedText> */}

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 28 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
            onChange={(v) =>
              setSettings((p) => ({
                ...p,
                delivery: { ...p.delivery, newOrders: v },
              }))
            }
          />
          <ToggleRow
            label="Status changes and messages"
            value={settings.delivery.orderUpdates}
            onChange={(v) =>
              setSettings((p) => ({
                ...p,
                delivery: { ...p.delivery, orderUpdates: v },
              }))
            }
          />
          <ToggleRow
            label="Vibration"
            value={settings.delivery.vibration}
            onChange={(v) =>
              setSettings((p) => ({
                ...p,
                delivery: { ...p.delivery, vibration: v },
              }))
            }
          />
        </Section>

        {/* Earnings Notifications */}
        <Section title="Earnings Notifications">
          <ToggleRow
            label="Payment updates"
            value={settings.earnings.paymentUpdates}
            onChange={(v) =>
              setSettings((p) => ({
                ...p,
                earnings: { ...p.earnings, paymentUpdates: v },
              }))
            }
          />
          <ToggleRow
            label="Daily summary"
            value={settings.earnings.dailySummary}
            onChange={(v) =>
              setSettings((p) => ({
                ...p,
                earnings: { ...p.earnings, dailySummary: v },
              }))
            }
          />
          <ToggleRow
            label="Weekly summary"
            value={settings.earnings.weeklySummary}
            onChange={(v) =>
              setSettings((p) => ({
                ...p,
                earnings: { ...p.earnings, weeklySummary: v },
              }))
            }
          />
        </Section>

        {/* Account & Safety */}
        <Section title="Account & Safety">
          <ToggleRow
            label="Security alerts"
            value={settings.accountSafety.alerts}
            onChange={(v) =>
              setSettings((p) => ({
                ...p,
                accountSafety: { alerts: v },
              }))
            }
          />
        </Section>
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
