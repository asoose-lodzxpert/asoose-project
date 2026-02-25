import { CategoryPillFilter } from "@/components/home/CategoryPillFilter";
import { ThemedText } from "@/components/themed-text";
import type { IconSymbolName } from "@/components/ui/icon-symbol";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useHomeContext } from "@/context/HomeContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { StoreFilterSlug, Vendor } from "@/types/home";
import { RelativePathString, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const H_PAD = 16;
const CARD_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - CARD_GAP) / 2;

const COVER_PLACEHOLDER = require("@/assets/placeholders/store-cover.jpg");
const LOGO_PLACEHOLDER = require("@/assets/placeholders/store-logo.avif");

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

// ── Compact 2-column store card ───────────────────────────────────────────────
function StoreCard({ item }: { item: Vendor }) {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const card = useThemeColor({}, "surfaceCard");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  const coverUri = item.cover || item.image || null;
  const logoUri = item.logo || item.image || null;
  const rating = typeof item.rating === "number" ? item.rating : 0;
  const deliveryText = item.deliveryTime || item.eta || "30-45 min";

  return (
    <Pressable
      style={[sc.card, { backgroundColor: card, width: CARD_WIDTH }]}
      onPress={() =>
        router.push({
          pathname: "/(store)/store-screen" as RelativePathString,
          params: { slug: item.slug },
        })
      }
    >
      {/* Cover */}
      <View style={sc.coverWrap}>
        <Image
          source={coverUri ? { uri: coverUri } : COVER_PLACEHOLDER}
          style={sc.coverImg}
          resizeMode="cover"
        />
        {typeof item.discount === "number" && item.discount > 0 && (
          <View style={[sc.discountBadge, { backgroundColor: primary }]}>
            <ThemedText style={sc.discountText}>
              {item.discount}% OFF
            </ThemedText>
          </View>
        )}
        {/* Logo overlay */}
        <View style={[sc.logoWrap, { borderColor: card }]}>
          <Image
            source={logoUri ? { uri: logoUri } : LOGO_PLACEHOLDER}
            style={sc.logoImg}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Info */}
      <View style={sc.info}>
        <ThemedText style={[sc.name, { color: textPrimary }]} numberOfLines={1}>
          {item.name}
        </ThemedText>
        <View style={sc.meta}>
          <IconSymbol name="star.fill" size={11} color={primary} />
          <ThemedText style={[sc.metaText, { color: textMuted }]}>
            {rating.toFixed(1)}
          </ThemedText>
          <View style={sc.dot} />
          <ThemedText
            style={[sc.metaText, { color: textMuted }]}
            numberOfLines={1}
          >
            {deliveryText}
          </ThemedText>
        </View>
        {item.tags?.length ? (
          <ThemedText style={[sc.tags, { color: textMuted }]} numberOfLines={1}>
            {item.tags.slice(0, 2).join(" · ")}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const sc = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  coverWrap: { height: 100, position: "relative" },
  coverImg: { width: "100%", height: "100%" },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  logoWrap: {
    position: "absolute",
    bottom: -14,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    overflow: "hidden",
  },
  logoImg: { width: "100%", height: "100%" },
  info: { padding: 10, paddingTop: 18 },
  name: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  metaText: { fontSize: 11 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#9CA3AF" },
  tags: { fontSize: 10, marginTop: 3 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const [query, setQuery] = useState("");

  // Theme colors
  const primary = useThemeColor({}, "brandPrimary");
  const mutedColor = useThemeColor({}, "textMuted");
  const background = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const text = useThemeColor({}, "textPrimary");
  const card = useThemeColor({}, "surfaceCard");
  const subtle = useThemeColor({}, "surfaceSubtle");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshStores();
    } finally {
      setRefreshing(false);
    }
  }, [refreshStores]);

  const categories = useMemo(() => {
    const base = [
      {
        key: "all" as StoreFilterSlug,
        label: "All",
        icon: "storefront" as IconSymbolName,
      },
    ];

    const dynamic = (verticals || []).map((section) => ({
      key: section.id as StoreFilterSlug,
      label: section.title,
      icon: getIconForType(section.type),
    }));

    return [...base, ...dynamic];
  }, [verticals]);

  // Client-side search filter
  const filteredStores = useMemo(() => {
    if (!query.trim()) return stores;
    const q = query.trim().toLowerCase();
    return stores.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q)) ||
        s.type?.toString().toLowerCase().includes(q),
    );
  }, [stores, query]);

  // Pair stores for 2-column grid
  const pairs = useMemo(() => {
    const result: [Vendor, Vendor | null][] = [];
    for (let i = 0; i < filteredStores.length; i += 2) {
      result.push([filteredStores[i], filteredStores[i + 1] ?? null]);
    }
    return result;
  }, [filteredStores]);

  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: background,
            borderBottomColor: border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={8}
          >
            <IconSymbol name="chevron.left" size={22} color={primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.headerTitle, { color: text }]}>
              Discover Stores
            </ThemedText>
            <ThemedText style={[styles.headerSub, { color: mutedColor }]}>
              {storeLoading && !refreshing
                ? "Loading…"
                : `${filteredStores.length} store${filteredStores.length !== 1 ? "s" : ""} available`}
            </ThemedText>
          </View>
          <View style={[styles.iconBadge, { backgroundColor: primary + "18" }]}>
            <IconSymbol name="storefront" size={18} color={primary} />
          </View>
        </View>

        {/* Search bar */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: subtle, borderColor: border },
          ]}
        >
          <IconSymbol name="magnifyingglass" size={16} color={mutedColor} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search stores or cuisine…"
            placeholderTextColor={mutedColor}
            style={[styles.searchInput, { color: text }]}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <IconSymbol
                name="xmark.circle.fill"
                size={16}
                color={mutedColor}
              />
            </Pressable>
          )}
        </View>

        {/* Category pills */}
        <CategoryPillFilter
          categories={categories}
          value={category}
          onChange={setCategory}
        />
      </View>

      {/* ── Grid ── */}
      <FlatList
        data={pairs}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primary}
          />
        }
        onEndReached={query ? undefined : loadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: [left, right] }) => (
          <View style={styles.rowPair}>
            <StoreCard item={left} />
            {right ? (
              <StoreCard item={right} />
            ) : (
              <View style={{ width: CARD_WIDTH }} />
            )}
          </View>
        )}
        ListEmptyComponent={
          storeLoading ? (
            <View style={styles.skeletonWrap}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.rowPair}>
                  <View
                    style={[
                      styles.skeletonCard,
                      { backgroundColor: card, width: CARD_WIDTH },
                    ]}
                  />
                  <View
                    style={[
                      styles.skeletonCard,
                      { backgroundColor: card, width: CARD_WIDTH },
                    ]}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <View
                style={[styles.emptyIcon, { backgroundColor: primary + "14" }]}
              >
                <IconSymbol name="storefront" size={40} color={primary} />
              </View>
              <ThemedText style={[styles.emptyTitle, { color: text }]}>
                {query
                  ? "No matches found"
                  : storesError
                    ? "Couldn't load stores"
                    : "No stores yet"}
              </ThemedText>
              <ThemedText style={[styles.emptySub, { color: mutedColor }]}>
                {query
                  ? "Try a different search term or category"
                  : storesError || "Check back soon for stores in your area"}
              </ThemedText>
              {(query || storesError) && (
                <Pressable
                  onPress={() => {
                    setQuery("");
                    if (storesError) refreshStores();
                  }}
                  style={[styles.emptyBtn, { backgroundColor: primary }]}
                >
                  <ThemedText style={styles.emptyBtnText}>
                    {query ? "Clear Search" : "Try Again"}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          )
        }
        ListFooterComponent={
          !storeLoading && !hasMore && filteredStores.length > 0 ? (
            <View style={styles.footer}>
              <View style={[styles.footerLine, { backgroundColor: border }]} />
              <ThemedText style={[styles.footerText, { color: mutedColor }]}>
                All stores loaded
              </ThemedText>
              <View style={[styles.footerLine, { backgroundColor: border }]} />
            </View>
          ) : storeLoading && stores.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: H_PAD,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", lineHeight: 24 },
  headerSub: { fontSize: 12, marginTop: 1 },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Search */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  /* Grid */
  listContent: { paddingHorizontal: H_PAD, paddingTop: 16 },
  rowPair: { flexDirection: "row", gap: CARD_GAP, marginBottom: CARD_GAP },

  /* Skeleton */
  skeletonWrap: {},
  skeletonCard: { height: 180, borderRadius: 16, opacity: 0.5 },

  /* Empty */
  emptyWrap: {
    paddingTop: 80,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  /* Footer */
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  footerLine: { flex: 1, height: 1 },
  footerText: { fontSize: 12, textAlign: "center" },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
});
