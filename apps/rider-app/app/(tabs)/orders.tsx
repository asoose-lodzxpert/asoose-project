import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import { RelativePathString, useRouter } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

/* ---------------------------------- */
/* Types */
/* ---------------------------------- */

type OrderStatus =
  | "Assigned"
  | "Picked Up"
  | "En Route"
  | "Delivered"
  | "Cancelled";

type OrderTab = "pending" | "active" | "completed";

interface Order {
  id: string;
  vendor: string;
  customer: string;
  status: OrderStatus;
  earnings: number;
}

/* ---------------------------------- */
/* Mock Data - Maiduguri Locations */
/* ---------------------------------- */

const ORDERS_DATA = {
  pending: [
    {
      id: "ORD-2025-7843",
      vendor: "University of Maiduguri Cafeteria",
      customer: "Gwange Cemetery Road",
      status: "Assigned" as const,
      earnings: 1600,
    },
    {
      id: "ORD-2025-7844",
      vendor: "Customs Area Shawarma Spot",
      customer: "Abbaganaram",
      status: "Assigned" as const,
      earnings: 1750,
    },
  ],
  active: [
    {
      id: "ORD-2025-7841",
      vendor: "Alhaji Bukar Restaurant",
      customer: "Post Office Area, Maiduguri",
      status: "Picked Up" as const,
      earnings: 1850,
    },
    {
      id: "ORD-2025-7842",
      vendor: "Gamboru Market Food Court",
      customer: "London Ciki, Near Customs Roundabout",
      status: "En Route" as const,
      earnings: 2200,
    },
  ],
  completed: [
    {
      id: "ORD-2025-7839",
      vendor: "Baga Road Fish Market",
      customer: "Bulabulin Ngarnam",
      status: "Delivered" as const,
      earnings: 3100,
    },
    {
      id: "ORD-2025-7837",
      vendor: "Monday Market Suya Spot",
      customer: "West End, Near Stadium",
      status: "Delivered" as const,
      earnings: 1950,
    },
    {
      id: "ORD-2025-7835",
      vendor: "Damboa Road Shawarma Joint",
      customer: "Mairi Village, Along Kano Road",
      status: "Cancelled" as const,
      earnings: 0,
    },
  ],
};

/* ---------------------------------- */

export default function OrdersScreen() {
  const router = useRouter();

  const surface = useThemeColor({}, "surfaceBackground");
  const cardBg = useThemeColor({}, "surfaceSubtle");
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");

  const [activeTab, setActiveTab] = useState<OrderTab>("active");
  const [refreshing, setRefreshing] = useState(false);

  const currentOrders = ORDERS_DATA[activeTab];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case "Assigned":
        return "#F59E0B";
      case "Picked Up":
        return "#3B82F6";
      case "En Route":
        return "#8B5CF6";
      case "Delivered":
        return success || "#10B981";
      case "Cancelled":
        return danger;
    }
  };

  const renderOrderCard = (order: Order) => (
    <Pressable
      key={order.id}
      style={[styles.orderCard, { backgroundColor: cardBg }]}
      onPress={() => router.push(`/orders/${order.id}` as RelativePathString)}
    >
      {/* Order ID & Status */}
      <View style={styles.cardHeader}>
        <ThemedText type="defaultSemiBold" style={styles.orderId}>
          {order.id}
        </ThemedText>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(order.status) + "20" },
          ]}
        >
          <ThemedText
            style={{
              color: getStatusColor(order.status),
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {order.status}
          </ThemedText>
        </View>
      </View>

      {/* Route: From → To */}
      <View style={styles.routeContainer}>
        <View style={[styles.locationRow, { alignItems: "center" }]}>
          <IconSymbol name="storefront" size={20} color={primary} />
          <View style={{ flex: 1 }}>
            <ThemedText style={{ color: muted, fontSize: 13 }}>From</ThemedText>
            <ThemedText numberOfLines={1} style={styles.locationText}>
              {order.vendor}
            </ThemedText>
          </View>
        </View>

        {/* <IconSymbol
          name="arrow.down"
          size={24}
          color={muted}
          style={styles.arrow}
        /> */}

        <View style={[styles.locationRow, { alignItems: "center" }]}>
          <IconSymbol name="location.on" size={20} color={primary} />
          <View style={{ flex: 1 }}>
            <ThemedText style={{ color: muted, fontSize: 13 }}>To</ThemedText>
            <ThemedText numberOfLines={1} style={styles.locationText}>
              {order.customer}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Earnings */}
      <View style={styles.earningsRow}>
        <ThemedText style={{ color: muted }}>Earnings</ThemedText>
        <ThemedText type="title" style={styles.earningsAmount}>
          ₦{order.earnings.toLocaleString()}
        </ThemedText>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <ThemedText type="title" style={styles.pageTitle}>
        Orders
      </ThemedText>

      {/* Custom Order Tabs */}
      <OrderTabs active={activeTab} onChange={setActiveTab} />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {currentOrders.length === 0 ? (
          <EmptyState message="No orders in this section" />
        ) : (
          <View style={styles.cardsList}>
            {currentOrders.map(renderOrderCard)}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

/* ---------------------------------- */
/* OrderTabs Component (Exactly as provided) */
/* ---------------------------------- */

// import { OrderTab } from "@/types/order"; // Assuming you have this type

interface OrderTabsProps {
  active: OrderTab;
  onChange: (tab: OrderTab) => void;
}

export const OrderTabs: React.FC<OrderTabsProps> = ({ active, onChange }) => {
  const primary = useThemeColor({}, "brandPrimary");
  const inactive = useThemeColor({}, "textSecondary");

  const tabs: { key: OrderTab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "active", label: "Active" },
    { key: "completed", label: "History" },
  ];

  return (
    <View style={tabStyles.container}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => onChange(tab.key)}
          style={[
            tabStyles.tab,
            active === tab.key && { borderBottomColor: primary },
          ]}
        >
          <ThemedText
            type={active === tab.key ? "defaultSemiBold" : "default"}
            style={{ color: active === tab.key ? primary : inactive }}
          >
            {tab.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
};

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
});

/* ---------------------------------- */
/* Empty State */
/* ---------------------------------- */

function EmptyState({ message }: { message: string }) {
  const muted = useThemeColor({}, "textMuted");
  return (
    <View style={styles.emptyState}>
      <ThemedText style={{ color: muted, textAlign: "center", fontSize: 16 }}>
        {message}
      </ThemedText>
    </View>
  );
}

/* ---------------------------------- */
/* Styles */
/* ---------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  pageTitle: {
    fontSize: 28,
    marginBottom: 16,
  },
  cardsList: {
    gap: 16,
  },
  orderCard: {
    borderRadius: 20,
    padding: 20,
    gap: 18,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  routeContainer: {
    gap: 16,
  },
  locationRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  locationText: {
    fontSize: 15,
    flex: 1,
  },
  arrow: {
    marginLeft: 14,
  },
  earningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  earningsAmount: {
    fontSize: 24,
  },
  emptyState: {
    padding: 60,
    alignItems: "center",
  },
});
