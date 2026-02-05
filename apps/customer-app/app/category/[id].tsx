import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { VendorCard } from "@/components/home/VendorCard";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  fetchCategoryDetail,
  getCategorySortOptions,
} from "@/services/search.service";
import type {
  CategoryDetailResponse,
  CategorySortOption,
} from "@/types/marketplace";
import type { Vendor } from "@/types/home";

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const [categoryData, setCategoryData] =
    useState<CategoryDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<CategorySortOption>("all");
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const primary = useThemeColor({}, "brandPrimary");
  const textColor = useThemeColor({}, "textPrimary");
  const mutedColor = useThemeColor({}, "textMuted");
  const cardBg = useThemeColor({}, "surfaceCard");

  const sortOptions = getCategorySortOptions();

  const loadCategory = useCallback(async () => {
    if (!id || typeof id !== "string") {
      setError("Invalid category");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await fetchCategoryDetail(id, sortBy);
      setCategoryData(data);
      console.log("Catrgory data:", JSON.stringify(data, null, 2));
    } catch (err: any) {
      setError(err.message || "Failed to load category");
      setCategoryData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, sortBy]);

  useEffect(() => {
    setLoading(true);
    loadCategory();
  }, [loadCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCategory();
  }, [loadCategory]);

  const handleSortChange = (option: CategorySortOption) => {
    setSortBy(option);
    setSortMenuVisible(false);
  };

  const renderVendor = ({ item }: { item: Vendor }) => (
    <View style={styles.vendorItem}>
      <VendorCard item={item} />
    </View>
  );

  const renderSkeleton = (_: any, idx: number) => (
    <View key={idx} style={[styles.skeletonCard, { backgroundColor: cardBg }]}>
      <View style={[styles.skeletonImage, { backgroundColor: "#e0e0e0" }]} />
      <View style={styles.skeletonContent}>
        <View
          style={[
            styles.skeletonLine,
            { width: "60%", backgroundColor: "#e0e0e0" },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { width: "40%", backgroundColor: "#e0e0e0" },
          ]}
        />
      </View>
    </View>
  );

  const selectedSortLabel =
    sortOptions.find((opt) => opt.value === sortBy)?.label || "All";

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: categoryData?.title || "Category",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />

      {/* Header with Sort */}
      <View style={styles.header}>
        {categoryData?.description && (
          <ThemedText style={[styles.description, { color: mutedColor }]}>
            {categoryData.description}
          </ThemedText>
        )}

        <View style={styles.sortContainer}>
          <ThemedText style={[styles.sortLabel, { color: mutedColor }]}>
            Sort by:
          </ThemedText>
          <TouchableOpacity
            style={[styles.sortButton, { backgroundColor: cardBg }]}
            onPress={() => setSortMenuVisible(!sortMenuVisible)}
          >
            <ThemedText style={{ color: textColor, fontWeight: "600" }}>
              {selectedSortLabel}
            </ThemedText>
            <IconSymbol
              name={sortMenuVisible ? "chevron.up" : "chevron.down"}
              size={16}
              color={mutedColor}
            />
          </TouchableOpacity>
        </View>

        {/* Sort Menu Dropdown */}
        {sortMenuVisible && (
          <View style={[styles.sortMenu, { backgroundColor: cardBg }]}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.sortMenuItem}
                onPress={() => handleSortChange(option.value)}
              >
                <ThemedText
                  style={{
                    color: sortBy === option.value ? primary : textColor,
                    fontWeight: sortBy === option.value ? "700" : "400",
                  }}
                >
                  {option.label}
                </ThemedText>
                {sortBy === option.value && (
                  <IconSymbol name="checkmark" size={18} color={primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ padding: 16 }}>
          {Array.from({ length: 4 }).map(renderSkeleton)}
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <IconSymbol name="exclamationmark" size={48} color="#ef4444" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: primary }]}
            onPress={onRefresh}
          >
            <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
              Try Again
            </ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={categoryData?.vendors || []}
          renderItem={renderVendor}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconSymbol name="storefront" size={64} color={mutedColor} />
              <ThemedText style={[styles.emptyText, { color: mutedColor }]}>
                No stores found in this category
              </ThemedText>
            </View>
          }
          ListFooterComponent={
            categoryData?.meta && categoryData.meta.total > 0 ? (
              <ThemedText style={[styles.footerText, { color: mutedColor }]}>
                {categoryData.meta.total} store
                {categoryData.meta.total !== 1 ? "s" : ""} found
              </ThemedText>
            ) : null
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
  },
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sortLabel: {
    fontSize: 14,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  sortMenu: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  sortMenuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  vendorItem: {
    marginBottom: 16,
  },
  skeletonCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
  },
  skeletonImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  skeletonLine: {
    height: 14,
    borderRadius: 4,
    marginBottom: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 16,
    color: "#ef4444",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
  },
  footerText: {
    textAlign: "center",
    fontSize: 14,
    paddingVertical: 16,
  },
});
