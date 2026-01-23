import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { IconSymbolName } from "@/components/ui/icon-symbol";
import StoreSearchBar from "./StoreSearchBar";

export function ActionTabs({
  currentTab,
  onTabChange,
  loading = false,
  searchValue = "",
  onSearchChange,
  searchLoading = false,
}: {
  currentTab: "all" | "favorites" | "info";
  onTabChange: (tab: "all" | "favorites" | "info") => void;
  loading?: boolean;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  searchLoading?: boolean;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  const cardBg = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const text = useThemeColor({}, "textPrimary");
  const muted = useThemeColor({}, "textMuted");
  const skeleton = useThemeColor({}, "surfaceSubtle");
  const tabs = [
    { key: "all" as const, label: "All", icon: "grid" as IconSymbolName },
    {
      key: "favorites" as const,
      label: "Favorites",
      icon: "heart" as IconSymbolName,
    },
    { key: "info" as const, label: "Info", icon: "info" as IconSymbolName },
  ];
  return (
    <>
      <StoreSearchBar
        value={searchValue}
        onChangeText={onSearchChange || (() => {})}
        loading={searchLoading}
      />
      <View style={styles.actionTabsRow}>
        {loading
          ? Array.from({ length: 3 }).map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.actionTab,
                  {
                    backgroundColor: skeleton,
                    borderColor: border,
                    opacity: 0.5,
                  },
                ]}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    backgroundColor: skeleton,
                    borderRadius: 10,
                  }}
                />
                <View
                  style={{
                    width: 40,
                    height: 14,
                    backgroundColor: skeleton,
                    borderRadius: 4,
                    marginLeft: 4,
                  }}
                />
              </View>
            ))
          : tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.actionTab,
                  { backgroundColor: cardBg, borderColor: border },
                  currentTab === tab.key && { backgroundColor: primary },
                ]}
                onPress={() => onTabChange(tab.key)}
              >
                <IconSymbol
                  name={tab.icon}
                  size={20}
                  color={currentTab === tab.key ? text : muted}
                />
                <ThemedText
                  style={[
                    styles.actionTabText,
                    { color: currentTab === tab.key ? text : muted },
                  ]}
                >
                  {tab.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  actionTabsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actionTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  actionTabText: {
    marginLeft: 4,
    fontSize: 14,
  },
});
