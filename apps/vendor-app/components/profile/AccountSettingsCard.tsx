import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { useThemeColor } from "@/hooks/use-theme-color";

type AllowedRoute =
  | "/(main)/(profile)/edit"
  | "/(auth)/resetpassword"
  | "/(main)/(profile)/notifications"
  | "/(main)/(profile)/support"
  | "/(main)/(profile)/terms"
  | "/(main)/(profile)/privacy";

interface SettingItem {
  label: string;
  route: AllowedRoute;
}

const SETTINGS: SettingItem[] = [
  { label: "Edit business profile", route: "/(main)/(profile)/edit" },
  { label: "Change password", route: "/(auth)/resetpassword" },
  {
    label: "Notification preferences",
    route: "/(main)/(profile)/notifications",
  },
  { label: "Support and help", route: "/(main)/(profile)/support" },
  { label: "Terms of service", route: "/(main)/(profile)/terms" },
  { label: "Privacy policy", route: "/(main)/(profile)/privacy" },
];

export const AccountSettingsCard: React.FC = () => {
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
        Account Settings
      </ThemedText>
      <View style={styles.card}>
        {SETTINGS.map((s, idx) => (
          <Pressable
            key={s.label}
            style={[
              styles.row,
              idx !== SETTINGS.length - 1 && styles.separator,
            ]}
            onPress={() => router.push(s.route)}
          >
            <ThemedText>{s.label}</ThemedText>
            <IconSymbol name="chevron.right" size={20} color="#6B7280" />
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
});
