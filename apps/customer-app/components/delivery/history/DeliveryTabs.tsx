import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

export type DeliveryTab = "active" | "completed";

interface Props {
  active: DeliveryTab;
  onChange: (tab: DeliveryTab) => void;
}

export const DeliveryTabs: React.FC<Props> = ({ active, onChange }) => {
  const primary = useThemeColor({}, "brandPrimary");
  const border = useThemeColor({}, "borderDefault");

  return (
    <View style={[styles.container, { borderColor: border }]}>
      {(["active", "completed"] as DeliveryTab[]).map((tab) => (
        <Pressable
          key={tab}
          style={[styles.tab, active === tab && { borderBottomColor: primary }]}
          onPress={() => onChange(tab)}
        >
          <ThemedText
            type={active === tab ? "defaultSemiBold" : "default"}
            style={styles.tabText}
          >
            {tab === "active" ? "Active" : "Completed"}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    textAlign: "center",
  },
});
