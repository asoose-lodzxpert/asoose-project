import React, { useState, useEffect, useCallback } from "react";
import { ThemedView } from "@/components/themed-view";
import { StoreHeader } from "@/components/store/StoreHeader";
import { MetricsCards } from "@/components/store/MetricsCards";
import { QuickActions } from "@/components/store/QuickActions";
import { RecentOrdersFeed } from "@/components/store/RecentOrdersFeed";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ScrollView, RefreshControl } from "react-native";

import { StoreMetrics, StoreOrder } from "@/types/store";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  fetchStoreMetrics,
  fetchStoreOrders,
  fetchStoreOnlineStatus,
  toggleStoreOnline,
} from "@/services/home.services";
import { fetchStorePublicDetails } from "@/services/store.services";
import Toast from "react-native-toast-message";

export default function StoreDashboardPage() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [orders, setOrders] = useState<StoreOrder[] | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [loadingOnline, setLoadingOnline] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingStore, setLoadingStore] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const linkColor = useThemeColor({}, "brandPrimary");

  // Fetch store public details
  const fetchStore = useCallback(async () => {
    setLoadingStore(true);
    try {
      const res = await fetchStorePublicDetails();
      setStoreName(res?.name || "Unknown");
    } catch (e: any) {
      setStoreName("Unknown");
    } finally {
      setLoadingStore(false);
    }
  }, []);

  // Fetch online status
  const fetchOnline = useCallback(async () => {
    setLoadingOnline(true);
    try {
      const res = await fetchStoreOnlineStatus();
      setIsOnline(!!res.isOnline);
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: e.message || "Failed to fetch online status",
      });
    } finally {
      setLoadingOnline(false);
    }
  }, []);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetchStoreMetrics();
      setMetrics(res);
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: e.message || "Failed to fetch metrics",
      });
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetchStoreOrders();
      setOrders(res);
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: e.message || "Failed to fetch orders",
      });
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    fetchOnline();
    fetchMetrics();
    fetchOrders();
    fetchStore();
  }, [fetchOnline, fetchMetrics, fetchOrders, fetchStore]);

  /** Handle pull to refresh */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchOnline(),
        fetchMetrics(),
        fetchOrders(),
        fetchStore(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOnline, fetchMetrics, fetchOrders, fetchStore]);

  /** Open confirmation modal */
  const openConfirmation = () => setConfirmVisible(true);

  /** Confirm toggle */
  const handleConfirmToggle = async () => {
    setToggleLoading(true);
    try {
      const res = await toggleStoreOnline();
      setIsOnline(!!res.isOnline);
      Toast.show({
        type: "success",
        text1: `Store is now ${res.isOnline ? "online" : "offline"}`,
      });
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: e.message || "Failed to toggle online status",
      });
    } finally {
      setToggleLoading(false);
      setConfirmVisible(false);
    }
  };

  /** Cancel modal */
  const handleCancel = () => setConfirmVisible(false);

  /** QuickActions data */
  const actions = [
    {
      label: isOnline ? "Go Offline" : "Go Online",
      icon: <IconSymbol name="power" size={16} color={linkColor} />,
      onPress: openConfirmation,
      loading: toggleLoading,
    },
    {
      label: "View Menu",
      icon: <IconSymbol name="menu" size={16} color={linkColor} />,
      onPress: () => router.push("/(main)/(menu)"),
    },
  ];

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={linkColor}
          />
        }
      >
        <StoreHeader
          storeName={storeName}
          isOnline={!!isOnline}
          onToggleOnline={openConfirmation}
          loading={loadingOnline || loadingStore}
        />

        <MetricsCards
          metrics={
            metrics || {
              todaysOrders: 0,
              todaysSales: 0,
              pendingApprovals: 0,
              avgRating: 0,
            }
          }
          loading={loadingMetrics}
        />

        <QuickActions heading="Quick Actions" actions={actions} />

        <RecentOrdersFeed
          orders={orders || []}
          heading="Recent Orders"
          actionLabel="View All"
          actionIcon={
            <IconSymbol name="arrow.right" size={16} color="#E5A503" />
          }
          onActionPress={() => router.push("/(main)/(orders)")}
          onRefresh={fetchOrders}
          loading={loadingOrders}
        />
      </ScrollView>

      <ConfirmationModal
        visible={confirmVisible}
        message={`Are you sure you want to ${isOnline ? "go offline" : "go online"}?`}
        onConfirm={handleConfirmToggle}
        onCancel={handleCancel}
        loading={toggleLoading}
      />
    </ThemedView>
  );
}
