import React from "react";
import {
  View,
  StyleSheet,
  Switch,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  NotificationPreferencesProvider,
  useNotificationPreferences,
} from "../../context/NotificationPreferencesContext";

interface NotificationItem {
  key: string;
  title: string;
  description: string;
}

interface NotificationSection {
  title: string;
  items: NotificationItem[];
}

const SECTIONS: NotificationSection[] = [
  {
    title: "Order Notifications",
    items: [
      {
        key: "newOrders",
        title: "New Orders",
        description: "Get notified when you receive a new order",
      },
      {
        key: "orderUpdates",
        title: "Order Updates",
        description:
          "Notifications when order status changes or customer messages you",
      },
      {
        key: "orderReminders",
        title: "Order Reminders",
        description: "Reminders for pending orders needing attention",
      },
    ],
  },
  {
    title: "Financial Notifications",
    items: [
      {
        key: "paymentReceived",
        title: "Payment Received",
        description:
          "Notifications when payments are transferred to your account",
      },
      {
        key: "dailySummary",
        title: "Daily Sales Summary",
        description: "Daily report of your sales and earnings",
      },
      {
        key: "weeklyReports",
        title: "Weekly Reports",
        description: "Weekly performance and analytics reports",
      },
    ],
  },
  {
    title: "Marketing & Updates",
    items: [
      {
        key: "promotions",
        title: "Promotional Offers",
        description: "Get notified about special promotions and campaigns",
      },
    ],
  },
];

export default function NotificationSettingsScreen() {
  return (
    <NotificationPreferencesProvider>
      <NotificationSettingsContent />
    </NotificationPreferencesProvider>
  );
}

function NotificationSettingsContent() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "borderDefault");
  const { preferences, loading, updatePreferences } =
    useNotificationPreferences();
  const [updating, setUpdating] = React.useState<string | null>(null);

  const toggle = async (key: string) => {
    setUpdating(key);
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    await updatePreferences(newPrefs);
    setUpdating(null);
  };

  if (loading) {
    return (
      <ThemedView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={22} color={primary} />
          <ThemedText type="defaultSemiBold">Back</ThemedText>
        </Pressable>
        <ThemedText type="title">Notifications</ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <ThemedText type="subtitle">{section.title}</ThemedText>

            {section.items.map((item, index) => (
              <View
                key={item.key}
                style={[
                  styles.row,
                  index !== section.items.length - 1 && {
                    borderBottomWidth: 1,
                    borderColor,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                  <ThemedText style={{ color: textSecondary, marginTop: 4 }}>
                    {item.description}
                  </ThemedText>
                </View>

                <Switch
                  value={preferences[item.key]}
                  onValueChange={() => toggle(item.key)}
                  trackColor={{ false: "#D1D5DB", true: `${primary}66` }}
                  thumbColor={preferences[item.key] ? primary : "#F3F4F6"}
                  disabled={updating === item.key}
                />
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}
const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  section: {
    marginTop: 24,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 16,
  },
});
