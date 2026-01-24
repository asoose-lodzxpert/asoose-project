import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  TouchableOpacity,
} from "react-native";
import { ThemedInput } from "@/components/ThemedInput";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CategoryFilter } from "@/components/store/CategoryFilter";

// Mock data for demonstration
const MOCK_PRODUCTS = [
  {
    id: "1",
    name: "Apple",
    price: 100,
    images: [],
    image: "https://via.placeholder.com/150",
    description: "Fresh apple",
    category: { name: "Fruits" },
    modifierGroups: [],
  },
  {
    id: "2",
    name: "Banana",
    price: 80,
    images: [],
    image: "https://via.placeholder.com/150",
    description: "Sweet banana",
    category: { name: "Fruits" },
    modifierGroups: [],
  },
  {
    id: "3",
    name: "Carrot",
    price: 50,
    images: [],
    image: "https://via.placeholder.com/150",
    description: "Organic carrot",
    category: { name: "Vegetables" },
    modifierGroups: [],
  },
  {
    id: "4",
    name: "Milk",
    price: 200,
    images: [],
    image: "https://via.placeholder.com/150",
    description: "Dairy milk",
    category: { name: "Dairy" },
    modifierGroups: [],
  },
];

const ALL_CATEGORIES = [
  "All",
  ...Array.from(new Set(MOCK_PRODUCTS.map((p) => p.category.name))),
];

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);

  // Fuzzy search (simple includes for demo)
  const filteredResults = useMemo(() => {
    let results = MOCK_PRODUCTS;
    if (activeCategory !== "All") {
      results = results.filter((p) => p.category.name === activeCategory);
    }
    if (query.trim()) {
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase()),
      );
    }
    results = results.filter((p) => p.price >= minPrice && p.price <= maxPrice);
    return results;
  }, [query, activeCategory, minPrice, maxPrice]);

  // Skeleton loader
  const renderSkeleton = (_: any, idx: number) => (
    <View key={idx} style={[styles.resultCard, { opacity: 0.5 }]}>
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
  const renderResult = ({ item }: { item: (typeof MOCK_PRODUCTS)[0] }) => (
    <View style={styles.resultCard}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View>
          <View style={styles.resultImageWrap}>
            <View style={styles.resultImageBorder}>
              <View style={styles.resultImageShadow}>
                <View style={styles.resultImage}>
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: 60, height: 60, borderRadius: 8 }}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <ThemedText style={{ fontWeight: "bold", fontSize: 16 }}>
            {item.name}
          </ThemedText>
          <ThemedText style={{ color: "#666", fontSize: 13 }}>
            {item.description}
          </ThemedText>
          <ThemedText style={{ color: "#888", fontSize: 13 }}>
            {item.category.name}
          </ThemedText>
          <ThemedText
            style={{ color: "#222", fontWeight: "bold", marginTop: 4 }}
          >
            ₦{item.price}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ThemedInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search for groceries, food or items"
        autoFocus
        containerStyle={{ marginBottom: 10 }}
        iconRight={
          <TouchableOpacity onPress={() => setFilterVisible(true)}>
            <IconSymbol name="settings" size={22} color="#888" />
          </TouchableOpacity>
        }
      />

      <View style={{ marginBottom: 10 }}>
        <CategoryFilter
          categories={ALL_CATEGORIES}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </View>

      {loading ? (
        Array.from({ length: 3 }).map(renderSkeleton)
      ) : (
        <FlatList
          data={filteredResults}
          renderItem={renderResult}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<ThemedText>No results found.</ThemedText>}
        />
      )}

      <Modal
        visible={filterVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText
              style={{ fontWeight: "bold", fontSize: 18, marginBottom: 12 }}
            >
              Filters
            </ThemedText>
            <ThemedText>Category</ThemedText>
            <CategoryFilter
              categories={ALL_CATEGORIES}
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
                style={{ width: 60, marginRight: 16 }}
              />
              <ThemedText>Max Price: </ThemedText>
              <ThemedInput
                value={String(maxPrice)}
                onChangeText={(v) => setMaxPrice(Number(v) || 0)}
                keyboardType="numeric"
                style={{ width: 60 }}
              />
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setFilterVisible(false)}
            >
              <ThemedText style={{ color: "#fff", textAlign: "center" }}>
                Close
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  resultCard: {
    backgroundColor: "#fafafa",
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
    backgroundColor: "#eee",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  resultsText: { fontWeight: "bold", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 24,
  },
  closeBtn: {
    backgroundColor: "#222",
    borderRadius: 8,
    marginTop: 24,
    padding: 12,
  },
});
