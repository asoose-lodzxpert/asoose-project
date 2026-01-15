// components/notification/NotificationsTabs.tsx
import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { NotificationTab } from "@/types/notification";

interface Props {
  active: NotificationTab;
  onChange: (tab: NotificationTab) => void;
  heading?: string;
}

export const NotificationsTabs: React.FC<Props> = ({
  active,
  onChange,
  heading,
}) => {
  const primary = useThemeColor({}, "brandPrimary");
  const inactive = useThemeColor({}, "textSecondary");
  const borderDefault = useThemeColor({}, "borderDefault");

  const tabs: { key: NotificationTab; label: string; icon: string }[] = [
    { key: "orders", label: "New Orders", icon: "bell" },
    { key: "payouts", label: "Payouts", icon: "dollar-sign" },
    { key: "system", label: "System", icon: "settings" },
  ];

  return (
    <View>
      {heading && (
        <ThemedText type="title" style={[styles.heading]}>
          {heading}
        </ThemedText>
      )}
      <View
        style={[styles.tabsContainer, { borderBottomColor: borderDefault }]}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[
              styles.tab,
              active === tab.key && { borderBottomColor: primary },
            ]}
          >
            <ThemedText
              type={active === tab.key ? "defaultSemiBold" : "default"}
              style={{ color: active === tab.key ? primary : inactive }}
            >
              {tab.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heading: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
});
