import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  fetchCategoryDetail,
  getCategorySortOptions,
} from "@/services/search.service";
import type { Vendor } from "@/types/home";
import type {
  CategoryDetailResponse,
  CategorySortOption,
} from "@/types/marketplace";
import {
  RelativePathString,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const H_PAD = 16;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - CARD_GAP) / 2;

const COVER_PLACEHOLDER = require("@/assets/placeholders/store-cover.jpg");
const LOGO_PLACEHOLDER = require("@/assets/placeholders/store-logo.avif");

// ── Compact 2-column store card ────────────────────────────────────────────
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
        <View style={[sc.logoWrap, { borderColor: card }]}>
          <Image
            source={logoUri ? { uri: logoUri } : LOGO_PLACEHOLDER}
            style={sc.logoImg}
            resizeMode="cover"
          />
        </View>
      </View>
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

// ── Main Screen ────────────────────────────────────────────────────────────
export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [categoryData, setCategoryData] =
    useState<CategoryDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<CategorySortOption>("all");
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Theme
  const primary = useThemeColor({}, "brandPrimary");
  const background = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  const subtle = useThemeColor({}, "surfaceSubtle");

  const sortOptions = getCategorySortOptions();
  const selectedSortLabel =
    sortOptions.find((o) => o.value === sortBy)?.label ?? "All";

  const loadCategory = useCallback(
    async (attempt = 0) => {
      if (!id || typeof id !== "string") {
        setError("Invalid category");
        setLoading(false);
        return;
      }
      if (attempt === 0) {
        setError(null);
        setRetryCount(0);
      }
      try {
        const data = await fetchCategoryDetail(id, sortBy);
        setCategoryData(data);
        setError(null);
        setRetryCount(0);
      } catch (err: any) {
        const msg = err.message || "Failed to load category";
        const isNetwork =
          msg.toLowerCase().includes("network") ||
          msg.toLowerCase().includes("fetch") ||
          msg.toLowerCase().includes("connection");
        const maxRetries = isNetwork ? 3 : 1;
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          setRetryCount(attempt + 1);
          retryTimeoutRef.current = setTimeout(
            () => loadCategory(attempt + 1),
            delay,
          );
        } else {
          setError(msg);
          setCategoryData(null);
          setRetryCount(0);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, sortBy],
  );

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    loadCategory();
  }, [loadCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCategory(0);
  }, [loadCategory]);

  const handleSortSelect = (option: CategorySortOption) => {
    setSortBy(option);
    setSortSheetOpen(false);
  };

  const vendors = categoryData?.vendors ?? [];
  const totalCount = categoryData?.meta?.total ?? vendors.length;

  // Pair vendors for 2-column grid
  const pairs: [Vendor, Vendor | null][] = [];
  for (let i = 0; i < vendors.length; i += 2) {
    pairs.push([vendors[i], vendors[i + 1] ?? null]);
  }

  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      {/* ── Custom Header ── */}
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
            <ThemedText
              style={[styles.headerTitle, { color: textPrimary }]}
              numberOfLines={1}
            >
              {categoryData?.title ?? (loading ? "Loading…" : "Category")}
            </ThemedText>
            {!loading && (
              <ThemedText style={[styles.headerSub, { color: textMuted }]}>
                {error
                  ? "Could not load stores"
                  : `${totalCount} store${totalCount !== 1 ? "s" : ""}`}
              </ThemedText>
            )}
          </View>

          {/* Sort chip */}
          <Pressable
            onPress={() => setSortSheetOpen(true)}
            style={[
              styles.sortChip,
              { backgroundColor: primary + "14", borderColor: primary + "30" },
            ]}
          >
            <IconSymbol name="arrow.up" size={13} color={primary} />
            <ThemedText style={[styles.sortChipText, { color: primary }]}>
              {selectedSortLabel}
            </ThemedText>
            <IconSymbol name="chevron.down" size={11} color={primary} />
          </Pressable>
        </View>

        {!!categoryData?.description && (
          <ThemedText style={[styles.description, { color: textMuted }]}>
            {categoryData.description}
          </ThemedText>
        )}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.listContent}>
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
      ) : error ? (
        <View style={styles.centered}>
          <View style={[styles.stateIcon, { backgroundColor: "#FEE2E2" }]}>
            <IconSymbol
              name="exclamationmark.triangle"
              size={32}
              color="#EF4444"
            />
          </View>
          <ThemedText style={[styles.stateTitle, { color: textPrimary }]}>
            Something went wrong
          </ThemedText>
          <ThemedText style={[styles.stateSub, { color: textMuted }]}>
            {error}
          </ThemedText>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: primary }]}
            onPress={onRefresh}
          >
            <IconSymbol name="arrow.clockwise" size={15} color="#fff" />
            <ThemedText style={styles.actionBtnText}>Try Again</ThemedText>
          </Pressable>
        </View>
      ) : (
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
            <View style={styles.centered}>
              <View
                style={[styles.stateIcon, { backgroundColor: primary + "14" }]}
              >
                <IconSymbol name="storefront" size={36} color={primary} />
              </View>
              <ThemedText style={[styles.stateTitle, { color: textPrimary }]}>
                No stores here yet
              </ThemedText>
              <ThemedText style={[styles.stateSub, { color: textMuted }]}>
                Try a different sort order or check back soon
              </ThemedText>
              {sortBy !== "all" && (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: primary }]}
                  onPress={() => setSortBy("all")}
                >
                  <ThemedText style={styles.actionBtnText}>Show All</ThemedText>
                </Pressable>
              )}
            </View>
          }
          ListFooterComponent={
            vendors.length > 0 ? (
              <View style={styles.footer}>
                <View
                  style={[styles.footerLine, { backgroundColor: border }]}
                />
                <ThemedText style={[styles.footerText, { color: textMuted }]}>
                  {totalCount} store{totalCount !== 1 ? "s" : ""} in this
                  category
                </ThemedText>
                <View
                  style={[styles.footerLine, { backgroundColor: border }]}
                />
              </View>
            ) : null
          }
        />
      )}

      {/* ── Sort Bottom Sheet ── */}
      <Modal
        visible={sortSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSortSheetOpen(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setSortSheetOpen(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheetWrap}
        >
          <View style={[styles.sheet, { backgroundColor: background }]}>
            <View style={styles.sheetHandleRow}>
              <View style={[styles.sheetHandle, { backgroundColor: border }]} />
            </View>
            <ThemedText style={[styles.sheetTitle, { color: textPrimary }]}>
              Sort Stores
            </ThemedText>
            <View style={styles.sheetOptions}>
              {sortOptions.map((opt) => {
                const isSelected = sortBy === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleSortSelect(opt.value)}
                    style={[
                      styles.sheetOption,
                      {
                        borderColor: isSelected ? primary : border,
                        backgroundColor: isSelected ? primary + "10" : subtle,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.sheetOptionText,
                        { color: isSelected ? primary : textPrimary },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                    {isSelected && (
                      <IconSymbol
                        name="checkmark.circle.fill"
                        size={20}
                        color={primary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setSortSheetOpen(false)}
              style={[
                styles.sheetDismiss,
                { backgroundColor: subtle, borderColor: border },
              ]}
            >
              <ThemedText
                style={[styles.sheetDismissText, { color: textPrimary }]}
              >
                Cancel
              </ThemedText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Retry progress badge */}
      {retryCount > 0 && (
        <View
          style={[styles.retryBadge, { backgroundColor: primary }]}
          pointerEvents="none"
        >
          <ActivityIndicator size="small" color="#fff" />
          <ThemedText style={styles.retryBadgeText}>
            Retrying… ({retryCount}/3)
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: H_PAD,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 6,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 19, fontWeight: "700", lineHeight: 24 },
  headerSub: { fontSize: 12, marginTop: 1 },
  description: { fontSize: 13, lineHeight: 18, paddingTop: 2 },

  /* Sort chip */
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  sortChipText: { fontSize: 12, fontWeight: "700" },

  /* Grid */
  listContent: { paddingHorizontal: H_PAD, paddingTop: 16 },
  rowPair: { flexDirection: "row", gap: CARD_GAP, marginBottom: CARD_GAP },

  /* Skeleton */
  skeletonCard: { height: 180, borderRadius: 16, opacity: 0.45 },

  /* Centered (error / empty) */
  centered: {
    alignItems: "center",
    padding: 32,
    gap: 10,
    paddingTop: 80,
  },
  stateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stateTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  stateSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

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

  /* Sort bottom sheet */
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetWrap: { position: "absolute", bottom: 0, left: 0, right: 0 },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandleRow: { alignItems: "center", paddingVertical: 10 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2 },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  sheetOptions: { gap: 8 },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  sheetOptionText: { fontSize: 15, fontWeight: "600" },
  sheetDismiss: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  sheetDismissText: { fontSize: 15, fontWeight: "600" },

  /* Retry badge */
  retryBadge: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  retryBadgeText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
