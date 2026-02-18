import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  DeliveryTabs,
  DeliveryTab,
} from "../../components/delivery/history/DeliveryTabs";
import {
  DeliveryHistoryList,
  DeliveryHistoryItem,
} from "../../components/delivery/history/DeliveryHistoryList";
import { fetchDeliveryHistory } from "../../services/delivery-history.service";

const PAGE_SIZE = 10;

export default function DeliveryHistoryScreen() {
  const router = useRouter();
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const headerBg = useThemeColor({}, "surfaceCard");
  const tabBg = useThemeColor({}, "surfaceCard");
  const listBg = useThemeColor({}, "surfaceBackground");
  const backBtnBg = useThemeColor({}, "surfaceSubtle");
  const headerText = useThemeColor({}, "textPrimary");

  const [tab, setTab] = useState<DeliveryTab>("active");
  const [data, setData] = useState<DeliveryHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // FIX: Using a ref to track the current active fetch to prevent race conditions
  const fetchId = useRef(0);

  const loadData = useCallback(
    async (
      targetTab: DeliveryTab,
      targetPage: number,
      isRefreshing = false,
    ) => {
      const currentFetchId = ++fetchId.current;
      setLoading(true);

      try {
        const result = await fetchDeliveryHistory(
          targetTab,
          targetPage,
          PAGE_SIZE,
        );

        // Only update state if this is still the most recent request
        if (currentFetchId === fetchId.current) {
          setData((prev) => (targetPage === 1 ? result : [...prev, ...result]));
          setHasMore(result.length === PAGE_SIZE);
          setPage(targetPage);
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        if (currentFetchId === fetchId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  // Triggered on Tab Change
  useEffect(() => {
    setData([]); // Clear immediately for better UX
    loadData(tab, 1);
  }, [tab, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(tab, 1, true);
  };

  const onEndReached = () => {
    if (!loading && hasMore) {
      loadData(tab, page + 1);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Redesigned Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: border, backgroundColor: headerBg },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: backBtnBg }]}
          hitSlop={20}
        >
          <IconSymbol name="arrow.left" size={22} color={brandPrimary} />
        </Pressable>
        <View style={styles.titleContainer}>
          <ThemedText style={[styles.headerTitle, { color: headerText }]}>
            My Deliveries
          </ThemedText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Modern Tabs Section */}
      <View style={[styles.tabsWrapper, { backgroundColor: tabBg }]}>
        <DeliveryTabs active={tab} onChange={setTab} />
      </View>

      <View style={[styles.listContainer, { backgroundColor: listBg }]}>
        <DeliveryHistoryList
          data={data}
          loading={loading && data.length === 0}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={onEndReached}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 54 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  tabsWrapper: {
    paddingVertical: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
  },
  listContainer: {
    flex: 1,
  },
});
