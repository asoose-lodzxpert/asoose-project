import {
  FlatList,
  View,
  RefreshControl,
  Pressable,
  Animated,
} from "react-native";
import { useState, useCallback, useRef, useMemo } from "react";
import { RelativePathString, router } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { PromotionsCarousel } from "@/components/home/PromotionsCarousel";
import { VendorCard } from "@/components/home/VendorCard";
import { FloatingCart } from "@/components/home/FloatingCart";
import { HomeHeader } from "@/components/home/HomeHeader";
import { LocationPickerModal } from "@/components/home/LocationPickerModal";
import { CategoryPillFilter } from "@/components/home/CategoryPillFilter";

import { PROMOTIONS, POPULAR, TOP } from "@/data/home";
import { ItemCard } from "@/components/common/ItemCard";
import { ITEMS } from "@/types/item";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function HomeScreen() {
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("all");
  const card = useThemeColor({}, "surfaceCard");

  const pullAnim = useRef(new Animated.Value(0)).current;

  const CATEGORIES = [
    { key: "all", label: "All" },
    { key: "restaurants", label: "Restaurants", icon: "restaurant" },
    { key: "groceries", label: "Groceries", icon: "bag" },
    { key: "pharmacy", label: "Pharmacy", icon: "plus" },
  ];

  /** CATEGORY FILTERING */
  const filteredRestaurants = useMemo(() => {
    if (category === "all") return ITEMS;
    return ITEMS.filter((r) => r.category === category);
  }, [category]);

  const data = filteredRestaurants.slice(0, page * 6);

  function loadMore() {
    setPage((p) => p + 1);
  }

  /** ANIMATED REFRESH */
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

  const HorizontalSpacer = () => <View style={{ width: 12 }} />;

  /** REUSABLE SECTION HEADER */
  const SectionHeader = ({ title, href }: { title: string; href: string }) => (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginVertical: 12,
      }}
    >
      <ThemedText type="subtitle">{title}</ThemedText>
      <Pressable onPress={() => router.push(href as RelativePathString)}>
        <ThemedText type="link">View all</ThemedText>
      </Pressable>
    </View>
  );

  /** SKELETON CARD */
  const SkeletonCard = () => (
    <View
      style={{
        width: 160,
        height: 180,
        borderRadius: 16,
        backgroundColor: card,
        marginRight: 12,
      }}
    />
  );

  return (
    <ThemedView style={{ flex: 1 }}>
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
