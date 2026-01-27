import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

export type OrderTab = "pending" | "active" | "completed";

interface OrderTabsProps {
  active: OrderTab;
  onChange: (tab: OrderTab) => void;
}

export const OrderTabs: React.FC<OrderTabsProps> = ({ active, onChange }) => {
  const primary = useThemeColor({}, "brandPrimary");
  const inactive = useThemeColor({}, "textSecondary");

  const tabs: { key: OrderTab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "active", label: "Active" },
    { key: "completed", label: "History" },
  ];

  return (
    <View style={styles.container}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
});
