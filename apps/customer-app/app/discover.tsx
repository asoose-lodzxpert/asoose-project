import { CategoryPillFilter } from "@/components/home/CategoryPillFilter";
import { VendorCard } from "@/components/home/VendorCard";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import type { IconSymbolName } from "@/components/ui/icon-symbol";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useHomeContext } from "@/context/HomeContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { StoreFilterSlug } from "@/types/home";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const TYPE_ICON_MAP: Record<string, IconSymbolName> = {
  RESTAURANT: "fork.knife",
  FOOD: "fork.knife",
  GROCERY: "cart",
  PHARMACY: "cross",
  MARKET: "storefront",
};

function getIconForType(type?: string): IconSymbolName {
  if (!type) return "storefront";
  return (
    TYPE_ICON_MAP[type] || TYPE_ICON_MAP[type.toUpperCase()] || "storefront"
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const {
    stores,
    storesError,
    storeLoading,
    hasMore,
    loadMore,
    refreshStores,
    category,
    setCategory,
    verticals,
  } = useHomeContext();

  const [refreshing, setRefreshing] = useState(false);

  // Theme colors
  const primary = useThemeColor({}, "brandPrimary");
  const mutedColor = useThemeColor({}, "textMuted");
  const background = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const text = useThemeColor({}, "textPrimary");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshStores();
    } finally {
      setRefreshing(false);
    }
  }, [refreshStores]);

  // FIXED: Properly closed useMemo and logic
  const categories = useMemo(() => {
    const base = [
      {
        key: "all" as StoreFilterSlug,
        label: "All",
        icon: "storefront" as IconSymbolName,
      },
    ];

    const dynamic = (verticals || []).map((section) => ({
      key: section.id as StoreFilterSlug,
      label: section.title,
      icon: getIconForType(section.type),
    }));

    return [...base, ...dynamic];
  }, [verticals]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: background }]}>
      {/* Custom Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 60, // Added padding for status bar area
          paddingBottom: 8,
          backgroundColor: background,
          borderBottomWidth: 1,
          borderBottomColor: border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 8, marginRight: 8 }}
        >
          <IconSymbol name="chevron.left" size={24} color={primary} />
        </TouchableOpacity>
        <ThemedText
          type="title"
          style={{ fontSize: 20, fontWeight: "bold", color: text }}
        >
          Discover Stores
        </ThemedText>
      </View>

      {/* Category Filter */}
      <View style={[styles.filterContainer, { borderBottomColor: border }]}>
        <CategoryPillFilter
          categories={categories}
          value={category}
          onChange={setCategory}
        />
      </View>

      {/* Store List */}
      <FlatList
        data={stores}
        renderItem={({ item }) => (
          <View style={styles.storeItem}>
            <VendorCard item={item} />
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !storeLoading ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="storefront" size={64} color={mutedColor} />
              <ThemedText style={[styles.emptyText, { color: mutedColor }]}>
                {storesError || "No stores available yet."}
              </ThemedText>
            </View>
          ) : null
        }
        ListFooterComponent={
          storeLoading ? (
            <View style={styles.footer}>
              <ThemedText style={{ color: mutedColor }}>Loading...</ThemedText>
            </View>
          ) : !hasMore && stores.length > 0 ? (
            <ThemedText style={[styles.footerText, { color: mutedColor }]}>
              You've reached the end
            </ThemedText>
          ) : null
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  storeItem: {
    marginBottom: 16,
  },
  emptyContainer: {
    paddingVertical: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
  },
  footer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  footerText: {
    textAlign: "center",
    fontSize: 14,
    paddingVertical: 24,
  },
});
