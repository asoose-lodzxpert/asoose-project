import { FlatList, View, RefreshControl, Animated } from "react-native";
import { useState, useCallback, useRef } from "react";
import { ThemedView } from "@/components/themed-view";
import { PromotionsCarousel } from "@/components/home/PromotionsCarousel";
import { VendorCard } from "@/components/home/VendorCard";
import { FloatingCart } from "@/components/home/FloatingCart";
import { HomeHeader } from "@/components/home/HomeHeader";
import { LocationPickerModal } from "@/components/home/LocationPickerModal";
import { CategoryPillFilter } from "@/components/home/CategoryPillFilter";
import { SectionHeader } from "@/components/home/SectionHeader";
import { SkeletonCard } from "@/components/home/SkeletonCard";
import { HorizontalSpacer } from "@/components/home/HorizontalSpacer";
import { PROMOTIONS, POPULAR, TOP } from "@/data/home";
import { ItemCard } from "@/components/common/ItemCard";
import { getPagedRestaurants } from "@/services/home.service";
import { getCategories } from "@/services/categories.service";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function HomeScreen() {
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("all");
  const card = useThemeColor({}, "surfaceCard");
  const pullAnim = useRef(new Animated.Value(0)).current;
  const CATEGORIES = getCategories();
  const data = getPagedRestaurants(category, page);

  function loadMore() {
    setPage((p) => p + 1);
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Animated.timing(pullAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      setPage(1);
      setRefreshing(false);
      pullAnim.setValue(0);
    }, 800);
  }, []);

  return (
    <ThemedView style={{ flex: 1 }} pointerEvents="box-none">
      <View style={{ paddingBottom: 0 }}>
        <HomeHeader />
        <CategoryPillFilter
          categories={CATEGORIES}
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
            <PromotionsCarousel data={PROMOTIONS} />
            <SectionHeader title="Popular Near You" href="/popular" />
            {refreshing ? (
              <FlatList
                horizontal
                data={[1, 2, 3]}
                renderItem={() => <SkeletonCard />}
                showsHorizontalScrollIndicator={false}
              />
            ) : (
              <FlatList
                horizontal
                data={POPULAR}
                renderItem={({ item }) => <VendorCard item={item} />}
                ItemSeparatorComponent={HorizontalSpacer}
                showsHorizontalScrollIndicator={false}
              />
            )}
            <SectionHeader title="Hot Restaurants" href="/hot" />
            {refreshing ? (
              <FlatList
                horizontal
                data={[1, 2, 3]}
                renderItem={() => <SkeletonCard />}
                showsHorizontalScrollIndicator={false}
              />
            ) : (
              <FlatList
                horizontal
                data={TOP}
                renderItem={({ item }) => <VendorCard item={item} />}
                ItemSeparatorComponent={HorizontalSpacer}
                showsHorizontalScrollIndicator={false}
              />
            )}
          </>
        }
        data={data}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 12,
        }}
        renderItem={({ item }) => <ItemCard item={item} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
      />
      <FloatingCart />
      <LocationPickerModal />
    </ThemedView>
  );
}
