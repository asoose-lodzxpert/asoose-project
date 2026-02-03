import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { fetchStoreBySlug } from "@/services/store.service";
import { useThemeColor } from "@/hooks/use-theme-color";
import { FloatingCart } from "@/components/home/FloatingCart";
import { StoreHero } from "@/components/store/StoreHero";
import { PromoBanner } from "@/components/store/PromoBanner";
import { ActionTabs } from "@/components/store/ActionTabs";
import { CategoryFilter } from "@/components/store/CategoryFilter";
import { ProductList } from "@/components/store/ProductList";
import { StoreInfo } from "@/components/store/StoreInfo";
import { ReviewModal } from "@/components/store/ReviewModal";
import type { StoreData, Product } from "@/types/store-types";

import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ui/ThemedToast";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

type TabType = "all" | "favorites" | "info";

export default function StoreScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const router = useRouter();

  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  const [currentTab, setCurrentTab] = useState<TabType>("all");
  const [activeCategory, setActiveCategory] = useState("Popular");

  const primary = useThemeColor({}, "brandPrimary");

  const loadStore = useCallback(async () => {
    if (!slug || typeof slug !== "string") {
      setError("Missing store slug");
      setStoreData(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await fetchStoreBySlug(slug);
      setStoreData(data);
    } catch (e) {
      setError("Failed to load store");
      setStoreData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    loadStore();
  }, [loadStore]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStore();
  }, [loadStore]);

  const isRestaurant = storeData?.type === "RESTAURANT";

  const categories = storeData
    ? ["Popular", ...new Set(storeData.products.map((p) => p.category.name))]
    : ["Popular"];

  const favorites = storeData
    ? storeData.products.filter((_, index) => index === 0)
    : [];

  const productsToShow =
    currentTab === "favorites" ? favorites : (storeData?.products ?? []);

  const { addItem } = useCart();
  const showToast = useToast();
  const handleAddToCart = useCallback(
    async (productId: string) => {
      if (!storeData) return;
      const product = storeData.products.find((p) => p.id === productId);
      if (!product) return;
      try {
        await addItem({
          id: product.id,
          name: product.name,
          image: product.images[0],
          price: product.price,
          qty: 1,
          vendorId: storeData.id,
          description: product.description,
          available: true,
        });
      } catch (e) {
        showToast({
          variant: "error",
          message: "Could not add to cart. Please try again.",
        });
      }
    },
    [addItem, storeData, showToast],
  );

  const renderContent = () => {
    if (!storeData) return null;

    if (currentTab === "info") {
      return (
        <>
          <PromoBanner promoText="20% off orders over ₦5000 🎉" />
          <ActionTabs currentTab={currentTab} onTabChange={setCurrentTab} />
          <StoreInfo
            store={storeData}
            reviews={storeData.reviews}
            onWriteReview={() => setReviewModalVisible(true)}
          />
        </>
      );
    }

    return (
      <>
        <PromoBanner promoText="20% off orders over ₦5000 🎉" />
        <ActionTabs currentTab={currentTab} onTabChange={setCurrentTab} />
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
        <ProductList
          products={productsToShow}
          isRestaurant={!!isRestaurant}
          onAddToCart={handleAddToCart}
          vendorId={storeData.id}
        />
      </>
    );
  };

  // ---------- STATES ----------

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView>
          <Skeleton width="100%" height={200} borderRadius={0} />
          <View style={{ padding: 16 }}>
            <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
            <Skeleton width="40%" height={16} style={{ marginBottom: 16 }} />
            <SkeletonText lines={3} />
            <View style={{ marginTop: 24 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  width="100%"
                  height={100}
                  borderRadius={12}
                  style={{ marginBottom: 12 }}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  // Empty / Error State with Pull-to-Refresh
  if (!storeData) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <ThemedText style={styles.emptyTitle}>
            Oops! Store not available
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            {error ?? "Pull down to try again."}
          </ThemedText>
        </ScrollView>
      </ThemedView>
    );
  }

  // ---------- NORMAL VIEW ----------

  return (
    <ThemedView style={styles.container}>
      <StoreHero
        store={storeData}
        onBack={() => router.back()}
        onShare={() => console.log("Share")}
      />

      <ScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderContent()}
      </ScrollView>

      <FloatingCart />

      {storeData && (
        <ReviewModal
          visible={reviewModalVisible}
          onClose={() => setReviewModalVisible(false)}
          storeId={storeData.id}
          storeName={storeData.name}
          onSuccess={() => {
            loadStore();
          }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },

  contentContainer: { flex: 1 },

  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
});
