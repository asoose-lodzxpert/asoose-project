import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  DimensionValue,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { FloatingCart } from "@/components/home/FloatingCart";
import { ActionTabs } from "@/components/store/ActionTabs";
import { CategoryFilter } from "@/components/store/CategoryFilter";
import { ProductList } from "@/components/store/ProductList";
import { PromoBanner } from "@/components/store/PromoBanner";
import { ReviewModal } from "@/components/store/ReviewModal";
import { StoreHero } from "@/components/store/StoreHero";
import { StoreInfo } from "@/components/store/StoreInfo";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { fetchStoreBySlug } from "@/services/store.service";
import type { StoreData } from "@/types/store-types";


import { useCart } from "@/context/CartContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type TabType = "all" | "favorites" | "info";

export default function StoreScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const router = useRouter();

  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const [currentTab, setCurrentTab] = useState<TabType>("all");
  const [activeCategory, setActiveCategory] = useState("Popular");
  const [searchValue, setSearchValue] = useState("");

  const border = useThemeColor({}, "borderDefault");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");

  const loadStore = useCallback(
    async (attempt = 0) => {
      if (!slug || typeof slug !== "string") {
        setError("Missing store slug");
        setStoreData(null);
        setLoading(false);
        return;
      }

      if (attempt === 0) {
        setError(null);
        setRetryCount(0);
      }

      try {
        const data = await fetchStoreBySlug(slug);
        setStoreData(data);
        setError(null);
        setRetryCount(0);
        setLoading(false);
        setRefreshing(false);
      } catch (e) {
        const errorMessage = "Failed to load store";
        const isNetworkError = true; // Assume network error for stores

        const maxRetries = isNetworkError ? 3 : 1;

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          setRetryCount(attempt + 1);

          retryTimeoutRef.current = setTimeout(() => {
            loadStore(attempt + 1);
          }, delay);
        } else {
          setError(errorMessage);
          setStoreData(null);
          setLoading(false);
          setRefreshing(false);
          setRetryCount(0);
        }
      }
    },
    [slug],
  );

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    loadStore();
  }, [loadStore]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStore(0);
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
  const Toast = require('react-native-toast-message');
  const handleAddToCart = useCallback(
    async (productId: string) => {
      if (!storeData) return;
      const product = storeData.products.find((p) => p.id === productId);
      if (!product) return;
      try {
        await addItem({
          id: product.id,
          name: product.name,
          image:
            Array.isArray(product.images) && product.images.length > 0
              ? product.images[0]
              : null,
          price: product.price,
          qty: 1,
          vendorId: storeData.id,
          description:
            typeof product.description === "string" ? product.description : "",
          available: true,
        });
      } catch (e) {
        showToast({
            Toast.show({
          variant: "error",
          message:
            "Could not add to cart. Please try again." +
            (e instanceof Error ? e.message : ""),
        });
      }
    },
    [addItem, storeData, showToast],
  );

  /* ---------------- Skeleton Components ---------------- */
  const SkeletonLine = ({
    width = "100%",
    height = 14,
    radius = 8,
  }: {
    width?: DimensionValue;
    height?: number;
    radius?: number;
  }) => {
    const progress = useSharedValue(-SCREEN_WIDTH);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: progress.value }],
    }));

    useEffect(() => {
      progress.value = withRepeat(
        withTiming(SCREEN_WIDTH, { duration: 1400, easing: Easing.linear }),
        -1,
        false,
      );
    }, []);

    return (
      <View
        style={{
          width,
          height,
          borderRadius: radius,
          backgroundColor: surfaceSubtle,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={[
            {
              width: "40%",
              height: "100%",
              backgroundColor: border,
              opacity: 0.4,
            },
            animatedStyle,
          ]}
        />
      </View>
    );
  };

  const SkeletonHero = () => (
    <View style={styles.skeletonHero}>
      <SkeletonLine width="100%" height={240} radius={0} />
    </View>
  );

  const SkeletonBanner = () => (
    <View style={styles.skeletonBanner}>
      <SkeletonLine width="80%" height={16} />
    </View>
  );

  const SkeletonTabs = () => (
    <View style={styles.skeletonTabs}>
      {[1, 2, 3].map((i) => (
        <SkeletonLine key={i} width={80} height={36} radius={18} />
      ))}
    </View>
  );

  const SkeletonCategories = () => (
    <View style={styles.skeletonCategories}>
      {[1, 2, 3, 4].map((i) => (
        <SkeletonLine key={i} width={100} height={32} radius={16} />
      ))}
    </View>
  );

  const SkeletonProducts = () => (
    <View style={styles.skeletonProducts}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeletonProduct}>
          <SkeletonLine width={120} height={120} radius={12} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonLine width="80%" height={16} />
            <SkeletonLine width="60%" height={14} />
            <SkeletonLine width="40%" height={18} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderContent = () => {
    if (!storeData) return null;

    if (currentTab === "info") {
      return (
        <>
          <PromoBanner promoText="20% off orders over ₦5000 🎉" />
          <ActionTabs
            currentTab={currentTab}
            onTabChange={setCurrentTab}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />
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
        <ActionTabs
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />
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
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonHero />
          <SkeletonBanner />
          <SkeletonTabs />
          <SkeletonCategories />
          <SkeletonProducts />
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
      <StoreHero store={storeData} onBack={() => router.back()} />

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
  skeletonHero: {
    width: "100%",
    height: 240,
    marginBottom: 0,
  },
  skeletonBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  skeletonTabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  skeletonCategories: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  skeletonProducts: {
    padding: 16,
    gap: 16,
  },
  skeletonProduct: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
});
