import {
  FlatList,
  View,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useState, useCallback, useMemo, useEffect } from "react";
import { ThemedView } from "@/components/themed-view";
import {
  PromotionsCarousel,
  type Promotion,
} from "@/components/home/PromotionsCarousel";
import { VendorCard } from "@/components/home/VendorCard";
import { FloatingCart } from "@/components/home/FloatingCart";
import { HomeHeader } from "@/components/home/HomeHeader";
import { LocationPickerModal } from "@/components/home/LocationPickerModal";
import { CategoryPillFilter } from "@/components/home/CategoryPillFilter";
import { SectionHeader } from "@/components/home/SectionHeader";
import { SkeletonCard } from "@/components/home/SkeletonCard";
import { HorizontalSpacer } from "@/components/home/HorizontalSpacer";
import { ThemedText } from "@/components/themed-text";
import {
  fetchMarketplaceHome,
  fetchPaginatedStores,
} from "@/services/marketplace.service";
import { Banner, HomeVertical, StoreFilterSlug, Vendor } from "@/types/home";
import type { IconSymbolName } from "@/components/ui/icon-symbol";

type CategoryOption = {
  key: StoreFilterSlug | string;
  label: string;
  icon?: IconSymbolName;
};

const TYPE_ICON_MAP: Record<string, IconSymbolName> = {
  RESTAURANT: "restaurant",
  FOOD: "restaurant",
  GROCERY: "shopping-bag",
  PHARMACY: "plus",
  MARKET: "storefront",
};

function getIconForType(type?: string): IconSymbolName {
  if (!type) return "storefront";
  return (
    TYPE_ICON_MAP[type] || TYPE_ICON_MAP[type.toUpperCase()] || "storefront"
  );
}

function transformBannerToPromotion(banner: Banner): Promotion {
  return {
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle ?? undefined,
    actionText: banner.buttonText ?? undefined,
    backgroundImage: banner.image ?? undefined,
    textColor: banner.type === "AD" ? "#fff" : undefined,
    backgroundColor: banner.type === "AD" ? "#111827" : undefined,
    onPress: banner.link
      ? () => {
          Linking.openURL(banner.link!).catch(() => null);
        }
      : undefined,
  };
}

export default function HomeScreen() {
  const [category, setCategory] = useState<StoreFilterSlug | string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const [homeSections, setHomeSections] = useState<HomeVertical[]>([]);
  const [homeLoading, setHomeLoading] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);

  const [stores, setStores] = useState<Vendor[]>([]);
  const [storesError, setStoresError] = useState<string | null>(null);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [initialStoreLoading, setInitialStoreLoading] = useState(true);
  const [storeLoading, setStoreLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPage, setNextPage] = useState(1);

  const loadHomeData = useCallback(async () => {
    try {
      setHomeLoading(true);
      setHomeError(null);
      const response = await fetchMarketplaceHome();
      setHomeSections(response.verticals ?? []);
      setBanners(response.banners ?? []);
    } catch (error) {
      console.error("Failed to fetch home data", error);
      setHomeError(
        error instanceof Error ? error.message : "Unable to load promotions",
      );
    } finally {
      setHomeLoading(false);
    }
  }, []);

  const loadStores = useCallback(
    async (pageToLoad: number, reset = false) => {
      try {
        setStoreLoading(true);
        if (reset) {
          setStoresError(null);
        }

        const { stores: fetchedStores, meta } = await fetchPaginatedStores({
          page: pageToLoad,
          limit: 10,
          type: category === "all" ? undefined : category,
        });

        setStores((prev) =>
          reset ? fetchedStores : [...prev, ...fetchedStores],
        );
        setHasMore(meta.hasMore);
        setNextPage(meta.hasMore ? meta.page + 1 : meta.page);
      } catch (error) {
        console.error("Failed to fetch stores", error);
        setStoresError(
          error instanceof Error ? error.message : "Unable to load stores",
        );
      } finally {
        setStoreLoading(false);
        if (reset) {
          setInitialStoreLoading(false);
        }
      }
    },
    [category],
  );

  const refreshStores = useCallback(async () => {
    setInitialStoreLoading(true);
    setStores([]);
    setHasMore(true);
    setNextPage(1);
    await loadStores(1, true);
  }, [loadStores]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  useEffect(() => {
    refreshStores();
  }, [refreshStores]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadHomeData(), refreshStores()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadHomeData, refreshStores]);

  const loadMore = useCallback(() => {
    if (storeLoading || initialStoreLoading || !hasMore) return;
    loadStores(nextPage);
  }, [storeLoading, initialStoreLoading, hasMore, loadStores, nextPage]);

  const promotions = useMemo<Promotion[]>(
    () => (banners?.length ? banners.map(transformBannerToPromotion) : []),
    [banners],
  );

  const categories: CategoryOption[] = useMemo(() => {
    const base: CategoryOption[] = [
      { key: "all", label: "All", icon: "storefront" },
    ];

    const dynamic = homeSections.map((section) => ({
      key: section.id,
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
  }, [homeSections]);

  return (
    <ThemedView style={{ flex: 1 }} pointerEvents="box-none">
      <View style={{ paddingBottom: 0 }}>
        <HomeHeader />
        <CategoryPillFilter
          categories={categories}
          value={category}
          onChange={setCategory}
        />
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            <PromotionsCarousel data={promotions} />

            {homeError && !homeSections.length ? (
              <ThemedText style={{ marginVertical: 12 }}>
                {homeError}
              </ThemedText>
            ) : null}

            {homeLoading && !homeSections.length ? (
              <FlatList
                horizontal
                data={[1, 2, 3]}
                renderItem={() => <SkeletonCard />}
                ItemSeparatorComponent={HorizontalSpacer}
                showsHorizontalScrollIndicator={false}
              />
            ) : (
              homeSections
                .filter((section) => section.vendors?.length)
                .map((section) => (
                  <View key={section.id} style={{ marginTop: 16 }}>
                    <SectionHeader
                      title={section.title}
                      href={`/category/${section.id}`}
                    />
                    <FlatList
                      horizontal
                      data={section.vendors}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => <VendorCard item={item} />}
                      ItemSeparatorComponent={HorizontalSpacer}
                      showsHorizontalScrollIndicator={false}
                    />
                  </View>
                ))
            )}

            <SectionHeader title="Discover Stores" href="/discover" />
          </>
        }
        data={stores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 16 }}>
            <VendorCard item={item} />
          </View>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !initialStoreLoading && !storeLoading ? (
            <View style={{ paddingVertical: 40 }}>
              <ThemedText style={{ textAlign: "center" }}>
                {storesError || "No stores available yet."}
              </ThemedText>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            {storeLoading && stores.length > 0 ? <ActivityIndicator /> : null}
            {!hasMore && stores.length > 0 ? (
              <ThemedText style={{ color: "#6B7280", marginTop: 8 }}>
                {"You\u2019ve reached the end."}
              </ThemedText>
            ) : null}
          </View>
        }
      />
      <FloatingCart />
      <LocationPickerModal />
    </ThemedView>
  );
}
