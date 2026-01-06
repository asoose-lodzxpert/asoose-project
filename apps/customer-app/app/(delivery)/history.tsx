import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
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
  const [tab, setTab] = useState<DeliveryTab>("active");
  const [data, setData] = useState<DeliveryHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const brandPrimary = useThemeColor({}, "brandPrimary");
  const router = useRouter();

  const loadData = useCallback(
    async (refresh = false, customTab?: DeliveryTab, customPage?: number) => {
      if (loading) return;
      setLoading(true);
      try {
        const currentTab = customTab ?? tab;
        const currentPage = customPage ?? (refresh ? 1 : page + 1);
        const result = await fetchDeliveryHistory(
          currentTab,
          currentPage,
          PAGE_SIZE
        );
        setData((prev) => (refresh ? result : [...prev, ...result]));
        setPage(currentPage);
        setHasMore(result.length === PAGE_SIZE);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tab, page, loading]
  );

  useEffect(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    // Wait for state to update, then load data for new tab
    loadData(true, tab, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true, tab, 1);
  }, [loadData, tab]);

  const onEndReached = useCallback(() => {
    if (!loading && hasMore) {
      loadData(false, tab, page + 1);
    }
  }, [loading, hasMore, loadData, tab, page]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={22} color={brandPrimary} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>
          Deliveries
        </ThemedText>
      </View>

      <DeliveryTabs active={tab} onChange={setTab} />

      <DeliveryHistoryList
        data={data}
        loading={loading && !refreshing && data.length === 0}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={onEndReached}
      />
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
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
});
