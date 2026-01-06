import React from "react";
import { View, StyleSheet, Pressable, FlatList } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";

export type Category = {
  key: string;
  label: string;
  icon?: any;
};

type Props = {
  categories: Category[];
  value: string;
  onChange: (key: string) => void;
};

export function CategoryPillFilter({ categories, value, onChange }: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const text = useThemeColor({}, "textPrimary");
  const muted = useThemeColor({}, "textMuted");

  return (
    <FlatList
      data={categories}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.key}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => {
        const active = item.key === value;

        return (
          <Pressable
            onPress={() => onChange(item.key)}
            style={[
              styles.pill,
              {
                backgroundColor: active ? primary : surface,
                borderColor: active ? primary : border,
              },
            ]}
          >
            {item.icon && (
              <IconSymbol
                name={item.icon}
                size={16}
                color={active ? "#000" : muted}
              />
            )}

            <ThemedText
              style={{
                color: active ? "#000" : text,
                fontWeight: active ? "700" : "500",
              }}
            >
              {item.label}
            </ThemedText>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    padding: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
});
