import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Pressable,
} from "react-native";
import { RelativePathString, useRouter } from "expo-router";
import { ThemedInput } from "@/components/ThemedInput";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CategoryFilter } from "@/components/store/CategoryFilter";
import { ThemedView } from "@/components/themed-view";
import { VendorCard } from "@/components/home/VendorCard";
import { useThemeColor } from "@/hooks/use-theme-color";
import { searchMarketplace } from "@/services/search.service";
import type { SearchResult, SearchFilters } from "@/types/marketplace";
import type { Product } from "@/types/store-types";
import type { Vendor } from "@/types/home";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(10000);
  const [searchResults, setSearchResults] = useState<SearchResult>({
    stores: [],
    products: [],
  });
  const [error, setError] = useState<string | null>(null);

  const textColor = useThemeColor({}, "textPrimary");
  const mutedColor = useThemeColor({}, "textMuted");
  const cardBg = useThemeColor({}, "surfaceCard");
  const primary = useThemeColor({}, "brandPrimary");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setSearchResults({ stores: [], products: [] });
      setError(null);
      return;
    }

    performSearch();
  }, [debouncedQuery, activeCategory, minPrice, maxPrice]);

  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const filters: SearchFilters = {
        category: activeCategory !== "all" ? activeCategory : undefined,
        minPrice: minPrice > 0 ? minPrice : undefined,
        maxPrice: maxPrice < 10000 ? maxPrice : undefined,
      };

      const results = await searchMarketplace(debouncedQuery, filters);
      setSearchResults(results);
    } catch (err) {
      setError("Failed to search. Please try again.");
      setSearchResults({ stores: [], products: [] });
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, activeCategory, minPrice, maxPrice]);

  const allCategories = useMemo(() => {
    const categories = new Set<string>(["all"]);
    searchResults.products.forEach((p) => {
      if (p.category?.name) {
        categories.add(p.category.name.toLowerCase());
      }
    });
    return Array.from(categories);
  }, [searchResults.products]);

  // Skeleton loader
  const renderSkeleton = (_: any, idx: number) => (
    <View
      key={idx}
      style={[styles.resultCard, { opacity: 0.5, backgroundColor: cardBg }]}
    >
      <View style={[styles.resultImage, { backgroundColor: "#eee" }]} />
      <View
        style={{
          width: "60%",
          height: 18,
          backgroundColor: "#eee",
          borderRadius: 4,
          marginBottom: 4,
          marginTop: 8,
        }}
      />
      <View
        style={{
          width: "80%",
          height: 14,
          backgroundColor: "#eee",
          borderRadius: 4,
          marginBottom: 8,
        }}
      />
      <View
        style={{
          width: 60,
          height: 16,
          backgroundColor: "#eee",
          borderRadius: 4,
        }}
      />
    </View>
  );

  // Product card
  const renderProduct = ({ item }: { item: Product }) => (
    <Pressable
      style={[styles.resultCard, { backgroundColor: cardBg }]}
      onPress={() => router.push(`/product/${item.id}` as RelativePathString)}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View>
          <View style={styles.resultImageWrap}>
            <View style={styles.resultImageBorder}>
              <View style={styles.resultImageShadow}>
                {item.images && item.images[0] ? (
                  <Image
                    source={{ uri: item.images[0] }}
                    style={styles.resultImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[styles.resultImage, { backgroundColor: "#eee" }]}
                  />
                )}
              </View>
            </View>
          </View>
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <ThemedText style={{ fontWeight: "bold", fontSize: 16 }}>
            {item.name}
          </ThemedText>
          <ThemedText style={{ color: mutedColor, fontSize: 13 }}>
            {item.description}
          </ThemedText>
          <ThemedText style={{ color: mutedColor, fontSize: 13 }}>
            {item.category?.name || "Uncategorized"}
          </ThemedText>
          <ThemedText
            style={{ color: primary, fontWeight: "bold", marginTop: 4 }}
          >
            ₦{item.price.toLocaleString()}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );

  const renderStore = ({ item }: { item: Vendor }) => (
    <View style={{ marginBottom: 12 }}>
      <VendorCard item={item} />
    </View>
  );

  const totalResults =
    searchResults.stores.length + searchResults.products.length;

  return (
    <ThemedView style={styles.container}>
      <ThemedInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search for groceries, food or items"
        autoFocus
        containerStyle={{ marginBottom: 10 }}
        iconRight={
          <TouchableOpacity onPress={() => setFilterVisible(true)}>
            <IconSymbol
              name="slider.horizontal.3"
              size={22}
              color={mutedColor}
            />
          </TouchableOpacity>
        }
      />

      <View style={{ marginBottom: 10 }}>
        <CategoryFilter
          categories={allCategories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </View>

      {query.trim().length < 2 ? (
        <View style={{ paddingTop: 40, alignItems: "center" }}>
          <IconSymbol name="search" size={48} color={mutedColor} />
          <ThemedText
            style={{ marginTop: 16, color: mutedColor, textAlign: "center" }}
          >
            Start typing to search for stores and products
          </ThemedText>
        </View>
      ) : loading ? (
        <View style={{ paddingTop: 20 }}>
          {Array.from({ length: 3 }).map(renderSkeleton)}
        </View>
      ) : error ? (
        <View style={{ paddingTop: 40, alignItems: "center" }}>
          <ThemedText style={{ color: "#ef4444", textAlign: "center" }}>
            {error}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={[
            ...searchResults.stores.map((s) => ({ type: "store", data: s })),
            ...searchResults.products.map((p) => ({
              type: "product",
              data: p,
            })),
          ]}
          renderItem={({ item }) =>
            item.type === "store"
              ? renderStore({ item: item.data as Vendor })
              : renderProduct({ item: item.data as Product })
          }
          keyExtractor={(item, idx) =>
            item.type === "store"
              ? `store-${(item.data as Vendor).id}`
              : `product-${(item.data as Product).id}`
          }
          ListHeaderComponent={
            totalResults > 0 ? (
              <ThemedText style={styles.resultsText}>
                {totalResults} result{totalResults !== 1 ? "s" : ""} found
              </ThemedText>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ paddingTop: 40, alignItems: "center" }}>
              <ThemedText style={{ color: mutedColor }}>
                No results found for "{debouncedQuery}"
              </ThemedText>
            </View>
          }
        />
      )}

      <Modal
        visible={filterVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <ThemedText
              style={{ fontWeight: "bold", fontSize: 18, marginBottom: 12 }}
            >
              Filters
            </ThemedText>
            <ThemedText style={{ marginTop: 16 }}>Category</ThemedText>
            <CategoryFilter
              categories={allCategories}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 16,
              }}
            >
              <ThemedText>Min Price: </ThemedText>
              <ThemedInput
                value={String(minPrice)}
                onChangeText={(v) => setMinPrice(Number(v) || 0)}
                keyboardType="numeric"
                containerStyle={{ width: 80, marginRight: 16 }}
              />
              <ThemedText>Max Price: </ThemedText>
              <ThemedInput
                value={String(maxPrice)}
                onChangeText={(v) => setMaxPrice(Number(v) || 10000)}
                keyboardType="numeric"
                containerStyle={{ width: 80 }}
              />
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: primary }]}
              onPress={() => setFilterVisible(false)}
            >
              <ThemedText
                style={{
                  color: "#fff",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                Apply Filters
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  resultCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  resultImageWrap: { marginRight: 0 },
  resultImageBorder: { borderRadius: 8, overflow: "hidden" },
  resultImageShadow: {},
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  resultsText: { fontWeight: "bold", fontSize: 16, marginBottom: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 24,
  },
  closeBtn: {
    borderRadius: 8,
    marginTop: 24,
    padding: 14,
  },
});
