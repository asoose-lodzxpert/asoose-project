import React from "react";
import { ScrollView, TouchableOpacity, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

export function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
  loading = false,
}: {
  categories: string[];
  activeCategory: string;
  onCategoryChange?: (category: string) => void;
  loading?: boolean;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  const chipBg = useThemeColor({}, "surfaceCard");
  const chipBorder = useThemeColor({}, "borderDefault");
  const chipText = useThemeColor({}, "textPrimary");
  const chipTextActive = useThemeColor({}, "textPrimary");
  const skeleton = useThemeColor({}, "surfaceSubtle");

  const renderChip = (item: string) => (
    <TouchableOpacity
      key={item}
      style={[
        styles.categoryChip,
        {
          backgroundColor: item === activeCategory ? primary : chipBg,
          borderColor: chipBorder,
        },
      ]}
      onPress={() => onCategoryChange?.(item)}
    >
      <ThemedText
        style={[
          styles.categoryChipText,
          { color: item === activeCategory ? chipTextActive : chipText },
        ]}
      >
        {item}
      </ThemedText>
    </TouchableOpacity>
  );

  const renderSkeleton = (_: any, idx: number) => (
    <View
      key={idx}
      style={[
        styles.categoryChip,
        { backgroundColor: skeleton, borderColor: chipBorder, width: 70 },
      ]}
    />
  );

  return (
    <View style={styles.categoryFilter}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}
      >
        {loading
          ? Array.from({ length: 4 }).map(renderSkeleton)
          : categories.map(renderChip)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  categoryFilter: {
    paddingVertical: 8,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
