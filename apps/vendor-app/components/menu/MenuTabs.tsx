import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { MenuTab } from "@/types/menu";

interface Props {
  active: MenuTab;
  onChange: (tab: MenuTab) => void;
}

export const MenuTabs: React.FC<Props> = ({ active, onChange }) => {
  const primary = useThemeColor({}, "brandPrimary");
  const border = useThemeColor({}, "borderDefault");

  return (
    <View style={[styles.container, { borderColor: border }]}>
      {(["items", "categories"] as MenuTab[]).map((tab) => (
        <Pressable
          key={tab}
          style={[styles.tab, active === tab && { borderBottomColor: primary }]}
          onPress={() => onChange(tab)}
        >
          <ThemedText
            type={active === tab ? "defaultSemiBold" : "default"}
            style={styles.tabText}
          >
            {tab === "items" ? "All items" : "Categories"}
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
