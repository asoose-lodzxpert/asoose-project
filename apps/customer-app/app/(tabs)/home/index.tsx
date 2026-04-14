import { CategoryPillFilter } from "@/components/home/CategoryPillFilter";
import { FloatingCart } from "@/components/home/FloatingCart";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HorizontalSpacer } from "@/components/home/HorizontalSpacer";
import { LocationPickerModal } from "@/components/home/LocationPickerModal";
import {
  PromotionsCarousel,
  type Promotion,
} from "@/components/home/PromotionsCarousel";
import { SectionHeader } from "@/components/home/SectionHeader";
import { SkeletonCard } from "@/components/home/SkeletonCard";
import { VendorCard } from "@/components/home/VendorCard";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import type { IconSymbolName } from "@/components/ui/icon-symbol";
import { useHomeContext } from "@/context/HomeContext";
import { useLocation } from "@/context/LocationContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { Banner, StoreFilterSlug } from "@/types/home";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  View,
} from "react-native";

export type CategoryOption = {
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
  const {
    banners,
    bannersLoading,
    refreshBanners,
    verticals,
    verticalsLoading,
    verticalsError,
    refreshVerticals,
    stores,
    initialStoreLoading,
    storeLoading,
    hasMore,
    loadMore,
    refreshStores,
    category,
    setCategory,
  } = useHomeContext();
  const { city } = useLocation();

  const [refreshing, setRefreshing] = useState(false);
  const hasLoaded = useRef(false);

  // Load data only when screen is fully mounted and focused
  useFocusEffect(
    useCallback(() => {
      if (!hasLoaded.current) {
        hasLoaded.current = true;
        Promise.all([refreshBanners(), refreshVerticals(), refreshStores()]);
      }
    }, [refreshBanners, refreshVerticals, refreshStores]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshBanners(),
        refreshVerticals(),
        refreshStores(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshBanners, refreshVerticals, refreshStores]);

  const primary = useThemeColor({}, "brandPrimary");

  const promotions = useMemo<Promotion[]>(
    () => (banners?.length ? banners.map(transformBannerToPromotion) : []),
    [banners],
  );

  const categories: CategoryOption[] = useMemo(() => {
    const base: CategoryOption[] = [
      { key: "all", label: "All", icon: "storefront" },
    ];
    const dynamic = verticals.map((section) => ({
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
  }, [verticals]);

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

            {/* Banner errors are intentionally hidden from the user */}

            {verticalsError && verticals.length === 0 ? (
              <View
                style={{
                  marginVertical: 12,
                  padding: 16,
                  borderRadius: 8,
                  backgroundColor: "#F3F4F6",
                  alignItems: "center",
                }}
              >
                <ThemedText style={{ marginBottom: 8, fontWeight: "bold" }}>
                  Unable to load categories.
                </ThemedText>
                <ThemedText style={{ marginBottom: 8 }}>
                  Please pull down to refresh.
                </ThemedText>
              </View>
            ) : null}

            {verticalsLoading && verticals.length === 0 ? (
              <FlatList
                horizontal
                data={[1, 2, 3]}
                renderItem={() => <SkeletonCard />}
                ItemSeparatorComponent={HorizontalSpacer}
                showsHorizontalScrollIndicator={false}
              />
            ) : (
              verticals
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
            <View style={{ paddingVertical: 60, alignItems: "center", paddingHorizontal: 32 }}>
              <View style={{ 
                width: 80, 
                height: 80, 
                borderRadius: 40, 
                backgroundColor: `${primary}15`, 
                alignItems: "center", 
                justifyContent: "center",
                marginBottom: 20
              }}>
                <IconSymbol name="mappin.slash" size={40} color={primary} />
              </View>
              <ThemedText style={{ fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 8 }}>
                Services not available yet
              </ThemedText>
              <ThemedText style={{ textAlign: "center", color: "#6B7280", lineHeight: 20 }}>
                {city?.name 
                  ? `We haven't reached ${city.name} yet. Stay tuned as we expand to more cities!`
                  : "We haven't reached your current location yet. Stay tuned as we expand!"}
              </ThemedText>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            {storeLoading && stores.length > 0 ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                <ActivityIndicator size="small" color={primary} />
              </View>
            ) : null}
            {!hasMore && stores.length > 0 ? (
              <ThemedText style={{ color: "#6B7280", marginTop: 8 }}>
                {"You've reached the end."}
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
