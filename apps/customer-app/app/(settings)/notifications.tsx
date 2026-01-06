import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, Switch } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
import { NotificationConfig } from "@/types/notification-config";
import {
  fetchNotificationConfig,
  saveNotificationConfig,
} from "@/services/notification-config.service";

/* ------------------ Screen ------------------ */
export default function NotificationsScreen() {
  const router = useRouter();

  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");

  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof NotificationConfig | null>(
    null
  );

  const [config, setConfig] = useState<NotificationConfig | null>(null);

  /* ------------------ Load ------------------ */
  useEffect(() => {
    fetchNotificationConfig().then((data) => {
      setConfig(data);
      setLoading(false);
    });
  }, []);

  /* ------------------ Toggle ------------------ */
  const toggle = async (key: keyof NotificationConfig) => {
    if (!config) return;

    const updated = { ...config, [key]: !config[key] };
    setConfig(updated);
    setSavingKey(key);

    await saveNotificationConfig(updated);

    setSavingKey(null);
  };

  /* ------------------ Loading ------------------ */
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Header title="Notifications" onBack={() => router.back()} />
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Header title="Notifications" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <Setting
            title="Push notifications"
            description="Receive updates directly on your device"
            icon="bell"
            value={config!.push}
            loading={savingKey === "push"}
            onToggle={() => toggle("push")}
          />

          <Divider border={border} />

          <Setting
            title="SMS notifications"
            description="Get text messages for critical updates"
            icon="message-square"
            value={config!.sms}
            loading={savingKey === "sms"}
            onToggle={() => toggle("sms")}
          />

          <Divider border={border} />

          <Setting
            title="Email notifications"
            description="Receive notifications via email"
            icon="mail"
            value={config!.email}
            loading={savingKey === "email"}
            onToggle={() => toggle("email")}
          />

          <Divider border={border} />

          <Setting
            title="Emergency alerts"
            description="Critical safety and emergency messages"
            icon="alert-triangle"
            value={config!.emergencyAlerts}
            loading={savingKey === "emergencyAlerts"}
            onToggle={() => toggle("emergencyAlerts")}
          />

          <Divider border={border} />

          <Setting
            title="Trip updates"
            description="Status updates during active trips"
            icon="navigation"
            value={config!.tripUpdates}
            loading={savingKey === "tripUpdates"}
            onToggle={() => toggle("tripUpdates")}
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

/* ------------------ Components ------------------ */

function Setting({
  title,
  description,
  icon,
  value,
  onToggle,
  loading,
}: {
  title: string;
  description: string;
  icon: IconSymbolName;
  value: boolean;
  onToggle: () => void;
  loading?: boolean;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");

  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View style={styles.iconWrap}>
          <IconSymbol name={icon} size={18} color={primary} />
        </View>

        <View style={styles.settingText}>
          <ThemedText style={styles.settingTitle}>{title}</ThemedText>
          <ThemedText style={[styles.settingDesc, { color: muted }]}>
            {description}
          </ThemedText>
        </View>
      </View>

      <Switch value={value} onValueChange={onToggle} disabled={loading} />
    </View>
  );
}

function Divider({ border }: { border: string }) {
  return <View style={[styles.divider, { backgroundColor: border }]} />;
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const primary = useThemeColor({}, "brandPrimary");

  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <IconSymbol name="chevron.left" size={22} color={primary} />
      </Pressable>
      <ThemedText type="title" style={styles.headerTitle}>
        {title}
      </ThemedText>
    </View>
  );
}

function Skeleton() {
  return <View style={styles.skeleton} />;
}

/* ------------------ Styles ------------------ */

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700" },

  scrollContent: { paddingBottom: 32 },

  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 4,
  },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 12,
  },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
  },

  settingText: { flex: 1 },

  settingTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 2,
  },

  divider: {
    height: 1,
    marginHorizontal: 16,
  },

  skeleton: {
    height: 18,
    borderRadius: 6,
    backgroundColor: "#E6E6E6",
    marginVertical: 10,
    marginHorizontal: 16,
  },
});
