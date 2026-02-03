import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

export type OrderTab = "pending" | "active" | "completed";

interface OrderTabsProps<T extends OrderTab = OrderTab> {
  active: T;
  onChange: (tab: T) => void;
  tabs?: T[];
}

export const OrderTabs = <T extends OrderTab = OrderTab>({
  active,
  onChange,
  tabs,
}: OrderTabsProps<T>) => {
  const primary = useThemeColor({}, "brandPrimary");
  const inactive = useThemeColor({}, "textSecondary");

  const allTabs: { key: OrderTab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "active", label: "Active" },
    { key: "completed", label: "History" },
  ];
  const shownTabs = tabs
    ? allTabs.filter((tab) => tabs.includes(tab.key as T))
    : allTabs;

  return (
    <View style={styles.container}>
      {shownTabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => onChange(tab.key as T)}
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
