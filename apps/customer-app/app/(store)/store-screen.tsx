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
import Toast from "react-native-toast-message";
import { ModifierSelectionModal } from "@/components/ModifierSelectionModal";
import type { ModifierGroup } from "@/components/ModifierSelectionModal";
import { fetchActiveBanners } from "@/services/banner.service";
import type { Banner } from "@/services/banner.service";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type TabType = "all" | "favorites" | "info";

interface ProductWithModifiers {
  id: string;
  name: string;
  price: number;
  description?: string;
  images?: string[];
  modifierGroups?: ModifierGroup[];
}

export default function StoreScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const router = useRouter();

  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = React.useRef<number | null>(null);

  const [currentTab, setCurrentTab] = useState<TabType>("all");
  const [activeCategory, setActiveCategory] = useState("Popular");
  const [searchValue, setSearchValue] = useState("");

  // Banners
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);

  // Modifier modal state
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithModifiers | null>(null);

  const border = useThemeColor({}, "borderDefault");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const errorColor = useThemeColor({}, "statusError");

  // Derived availability state
  const isStoreClosed = storeData ? !storeData.isCurrentlyOpen : false;
  const closedMessage =
    storeData?.closedMessage ||
    (storeData && !storeData.isCurrentlyOpen
      ? storeData.closedReason === "MANUAL_CLOSE"
        ? "The vendor has temporarily closed this store."
        : "This store is currently outside its operating hours."
      : null);

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

  useEffect(() => {
    setBannersLoading(true);
    fetchActiveBanners()
      .then((data) => setBanners(data))
      .catch(() => setBanners([]))
      .finally(() => setBannersLoading(false));
  }, []);

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
  const handleAddToCart = useCallback(
    async (productId: string) => {
      if (!storeData) return;

      // Guard: prevent ordering from a closed store
      if (isStoreClosed) {
        Toast.show({
          type: "error",
          text1: "Store is currently closed",
          text2:
            closedMessage ?? "This store is not accepting orders right now.",
        });
        return;
      }

      const product = storeData.products.find((p) => p.id === productId);
      if (!product) return;

      // Check if product has modifiers
      if (product.modifierGroups && product.modifierGroups.length > 0) {
        setSelectedProduct(product as ProductWithModifiers);
        setShowModifierModal(true);
        return;
      }

      // No modifiers, add directly
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
        Toast.show({
          type: "error",
          text1:
            "Could not add to cart. Please try again." +
            (e instanceof Error ? e.message : ""),
        });
      }
    },
    [addItem, storeData, isStoreClosed, closedMessage],
  );

  const handleModifierConfirm = useCallback(
    async (selectedModifiersMap: { [groupId: string]: string[] }) => {
      if (!selectedProduct || !storeData) return;

      try {
        // Convert selectedModifiersMap to ModifierGroupSelection[] format
        const modifierGroups = (selectedProduct.modifierGroups || []).map(
          (group) => {
            const selectedModifierIds = selectedModifiersMap[group.id] || [];
            const selectedModifiers = group.modifiers
              .filter((m) => selectedModifierIds.includes(m.id))
              .map((m) => ({
                id: m.id,
                name: m.name,
                price: m.price,
              }));

            return {
              id: group.id,
              name: group.name,
              selectedModifiers,
            };
          },
        );

        await addItem({
          id: selectedProduct.id,
          name: selectedProduct.name,
          image:
            Array.isArray(selectedProduct.images) &&
            selectedProduct.images.length > 0
              ? selectedProduct.images[0]
              : null,
          price: selectedProduct.price,
          qty: 1,
          vendorId: storeData.id,
          description:
            typeof selectedProduct.description === "string"
              ? selectedProduct.description
              : "",
          available: true,
          modifierGroups,
        });

        Toast.show({
          type: "success",
          text1: "Added to cart",
          text2: `${selectedProduct.name} with modifiers added to your cart`,
        });

        setShowModifierModal(false);
        setSelectedProduct(null);
      } catch (e) {
        Toast.show({
          type: "error",
          text1: "Could not add to cart. Please try again.",
          text2: e instanceof Error ? e.message : "",
        });
      }
    },
    [selectedProduct, storeData, addItem],
  );

  /* -------------- Skeleton Components ------------- */
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
          <PromoBanner banners={banners} loading={bannersLoading} />
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
        <PromoBanner banners={banners} loading={bannersLoading} />
        <ActionTabs
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />
        {/* ── Closed banner ──────────────────────────────────────────── */}
        {isStoreClosed && (
          <View
            style={[
              styles.closedBanner,
              {
                backgroundColor: `${errorColor}18`,
                borderColor: `${errorColor}60`,
              },
            ]}
          >
            <View style={styles.closedBannerDot} />
            <View style={{ flex: 1 }}>
              <ThemedText
                style={[styles.closedBannerTitle, { color: errorColor }]}
              >
                {storeData?.closedReason === "MANUAL_CLOSE"
                  ? "🔴 Store Temporarily Closed"
                  : "🕐 Outside Opening Hours"}
              </ThemedText>
              <ThemedText
                style={[styles.closedBannerSub, { color: errorColor }]}
              >
                {closedMessage}
              </ThemedText>
            </View>
          </View>
        )}
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
          disabled={isStoreClosed}
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

      {selectedProduct && (
        <ModifierSelectionModal
          visible={showModifierModal}
          modifierGroups={selectedProduct.modifierGroups || []}
          basePrice={selectedProduct.price}
          quantity={1}
          productName={selectedProduct.name}
          onConfirm={handleModifierConfirm}
          onCancel={() => {
            setShowModifierModal(false);
            setSelectedProduct(null);
          }}
        />
      )}

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
  closedBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  closedBannerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
    marginTop: 3,
  },
  closedBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  closedBannerSub: {
    fontSize: 12,
    opacity: 0.85,
  },
});
