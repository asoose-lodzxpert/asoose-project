import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

/* ─────────────────── Screen ─────────────────── */
export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const bg = useThemeColor({}, "background");

  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof NotificationConfig | null>(
    null,
  );
  const [config, setConfig] = useState<NotificationConfig | null>(null);

  /* ── Load ── */
  useEffect(() => {
    fetchNotificationConfig().then((data) => {
      setConfig(data);
      setLoading(false);
    });
  }, []);

  /* ── Toggle ── */
  const toggle = async (key: keyof NotificationConfig) => {
    if (!config) return;
    const updated = { ...config, [key]: !config[key] };
    setConfig(updated);
    setSavingKey(key);
    await saveNotificationConfig(updated);
    setSavingKey(null);
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Notifications" onBack={() => router.back()} />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { backgroundColor: bg },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText style={styles.sectionLabel}>PREFERENCES</ThemedText>
          <View
            style={[
              styles.card,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <React.Fragment key={i}>
                <SkeletonRow />
                {i < 4 && (
                  <View style={[styles.divider, { backgroundColor: border }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Notifications" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.sectionLabel}>PREFERENCES</ThemedText>

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

          <View style={[styles.divider, { backgroundColor: border }]} />

          <Setting
            title="SMS notifications"
            description="Get text messages for critical updates"
            icon="message-square"
            value={config!.sms}
            loading={savingKey === "sms"}
            onToggle={() => toggle("sms")}
          />

          <View style={[styles.divider, { backgroundColor: border }]} />

          <Setting
            title="Email notifications"
            description="Receive notifications via email"
            icon="mail"
            value={config!.email}
            loading={savingKey === "email"}
            onToggle={() => toggle("email")}
          />

          <View style={[styles.divider, { backgroundColor: border }]} />

          <Setting
            title="Emergency alerts"
            description="Critical safety and emergency messages"
            icon="alert-triangle"
            value={config!.emergencyAlerts}
            loading={savingKey === "emergencyAlerts"}
            onToggle={() => toggle("emergencyAlerts")}
          />

          <View style={[styles.divider, { backgroundColor: border }]} />

          <Setting
            title="Trip updates"
            description="Status updates during active trips"
            icon="navigation"
            value={config!.tripUpdates}
            loading={savingKey === "tripUpdates"}
            onToggle={() => toggle("tripUpdates")}
          />
        </View>

        <ThemedText style={styles.footerNote}>
          You can change these preferences at any time. Some notifications may
          still be sent for account security reasons.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

/* ─────────────────── Setting row ─────────────────── */
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
        <View style={[styles.iconWrap, { backgroundColor: primary + "18" }]}>
          <IconSymbol name={icon} size={18} color={primary} />
        </View>

        <View style={styles.settingText}>
          <ThemedText style={styles.settingTitle}>{title}</ThemedText>
          <ThemedText style={[styles.settingDesc, { color: muted }]}>
            {description}
          </ThemedText>
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={loading}
        trackColor={{ false: "#D1D5DB", true: primary + "60" }}
        thumbColor={value ? primary : "#F9FAFB"}
        ios_backgroundColor="#D1D5DB"
      />
    </View>
  );
}

/* ─────────────────── Skeleton row ─────────────────── */
function SkeletonRow() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  const S = ({
    w,
    h,
    r = 6,
  }: {
    w: number | string;
    h: number;
    r?: number;
  }) => (
    <Animated.View
      style={{
        width: w as any,
        height: h,
        borderRadius: r,
        backgroundColor: "#B0B0B0",
        opacity,
      }}
    />
  );

  return (
    <View style={styles.settingRow}>
      {/* icon circle */}
      <S w={38} h={38} r={11} />

      {/* text block */}
      <View style={{ flex: 1, marginLeft: 12, gap: 7 }}>
        <S w="55%" h={13} />
        <S w="80%" h={11} />
      </View>

      {/* switch pill */}
      <S w={48} h={28} r={14} />
    </View>
  );
}

/* ─────────────────── Header ─────────────────── */
function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const primary = useThemeColor({}, "brandPrimary");
  const border = useThemeColor({}, "borderDefault");

  return (
    <View style={[styles.header, { borderBottomColor: border }]}>
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
        <IconSymbol name="chevron.left" size={22} color={primary} />
      </Pressable>
      <ThemedText type="title" style={styles.headerTitle}>
        {title}
      </ThemedText>
    </View>
  );
}

/* ─────────────────── Styles ─────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700" },

  scrollContent: { paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    opacity: 0.45,
    marginTop: 20,
    marginBottom: 8,
    marginHorizontal: 20,
  },

  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
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
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  settingText: { flex: 1 },

  settingTitle: { fontSize: 14, fontWeight: "600" },
  settingDesc: { fontSize: 12, marginTop: 2, lineHeight: 17 },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },

  footerNote: {
    fontSize: 12,
    opacity: 0.45,
    lineHeight: 18,
    marginTop: 16,
    marginHorizontal: 20,
    textAlign: "center",
  },
});
