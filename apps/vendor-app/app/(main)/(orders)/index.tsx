import React, { useState, useCallback } from "react";
import { FlatList, RefreshControl, View, StyleSheet } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { OrderCard } from "@/components/order/OrderCard";
import { OrderTabs } from "@/components/order/OrderTabs";
import { OrderTab } from "@/types/order";
import { ThemedText } from "@/components/themed-text";
import { MOCK_ORDERS } from "@/config/demo-orders";
import { OrdersHeader } from "@/components/order/OrdersHeader";

export default function OrderScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "surfaceSubtle");
  const [tab, setTab] = useState<OrderTab>("pending");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const ordersToShow = MOCK_ORDERS.filter((o) => o.status === tab);

  return (
    <ThemedView style={{ flex: 1 }}>
      <OrdersHeader />
      <OrderTabs active={tab} onChange={setTab} />

      <View style={[styles.pullTextContainer, { backgroundColor: muted }]}>
        <ThemedText type="caption">Pull down to refresh</ThemedText>
      </View>

      <FlatList
        data={ordersToShow}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            tab={tab}
            onAccept={() => console.log("Accept", item.id)}
            onDecline={() => console.log("Decline", item.id)}
            onPrepare={() => console.log("Prepare", item.id)}
            onDeliver={() => console.log("Deliver", item.id)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  pullTextContainer: {
    paddingVertical: 8,
    alignItems: "center",
  },
});
