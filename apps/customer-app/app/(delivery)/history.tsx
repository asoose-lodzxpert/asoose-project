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
    async (refresh = false) => {
      if (loading) return;

      setLoading(true);

      const nextPage = refresh ? 1 : page + 1;
      const result = await fetchDeliveryHistory(tab, nextPage, PAGE_SIZE);

      setData((prev) => (refresh ? result : [...prev, ...result]));
      setPage(nextPage);
      setHasMore(result.length === PAGE_SIZE);

      setLoading(false);
      setRefreshing(false);
    },
    [tab, page, loading]
  );

  useEffect(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    loadData(true);
  }, [tab, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const onEndReached = useCallback(() => {
    if (!loading && hasMore) {
      loadData();
    }
  }, [loading, hasMore, loadData]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="arrow-left" size={22} color={brandPrimary} />
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
    paddingTop: 32,
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
