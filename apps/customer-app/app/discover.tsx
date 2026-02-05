import React, { useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Stack } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { VendorCard } from "@/components/home/VendorCard";
import { CategoryPillFilter } from "@/components/home/CategoryPillFilter";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useHomeContext } from "@/context/HomeContext";
import type { StoreFilterSlug } from "@/types/home";
import type { IconSymbolName } from "@/components/ui/icon-symbol";

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

  const primary = useThemeColor({}, "brandPrimary");
  const mutedColor = useThemeColor({}, "textMuted");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshStores();
    } finally {
      setRefreshing(false);
    }
  }, [refreshStores]);

  const categories = React.useMemo(() => {
    const base = [
      {
        key: "all" as StoreFilterSlug,
        label: "All",
        icon: "storefront" as IconSymbolName,
      },
    ];
    const dynamic = verticals.map((section) => ({
      key: section.id as StoreFilterSlug,
      label: section.title,
      icon: getIconForType(section.type),
    }));
    const seen = new Set(base.map((item) => item.key));
    const merged = [...base];
    for (const item of dynamic) {
      if (seen.has(item.key)) continue;
      seen.add(item.key);
      merged.push(item);
    }
    return merged;
  }, [verticals]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Discover Stores",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />

      {/* Category Filter */}
      <View style={styles.filterContainer}>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
    borderBottomColor: "#e0e0e0",
  },
  storeItem: {
    marginBottom: 16,
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
  footer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  footerText: {
    textAlign: "center",
    fontSize: 14,
    paddingVertical: 16,
  },
});
