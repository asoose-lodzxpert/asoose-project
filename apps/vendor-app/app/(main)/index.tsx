import React, { useState } from "react";
import { ThemedView } from "@/components/themed-view";
import { StoreHeader } from "@/components/store/StoreHeader";
import { MetricsCards } from "@/components/store/MetricsCards";
import { QuickActions } from "@/components/store/QuickActions";
import { RecentOrdersFeed } from "@/components/store/RecentOrdersFeed";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

import { StoreMetrics, StoreOrder } from "@/types/store";
import { useThemeColor } from "@/hooks/use-theme-color";

// Mock data
const metrics: StoreMetrics = {
  todaysOrders: 12,
  todaysSales: 1250050,
  pendingApprovals: 3,
  avgRating: 95,
};

const orders: StoreOrder[] = [
  {
    id: "1",
    customerName: "Sarah J.",
    customerProfile: "https://picsum.photos/50",
    items: [
      { id: "1", name: "Burger", quantity: 2 },
      { id: "2", name: "Fries", quantity: 1 },
    ],
    total: 1250,
    status: "pending",
    timestamp: "5 min ago",
  },
  {
    id: "2",
    customerName: "John D.",
    customerProfile: "https://picsum.photos/51",
    items: [{ id: "3", name: "Pizza", quantity: 1 }],
    total: 500,
    status: "accepted",
    timestamp: "10 min ago",
  },
];

export default function StoreDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const router = useRouter();

  const linkColor = useThemeColor({}, "brandPrimary");

  /** Open confirmation modal */
  const openConfirmation = () => setConfirmVisible(true);

  /** Confirm toggle */
  const handleConfirmToggle = () => {
    setIsOnline((prev) => !prev);
    setConfirmVisible(false);
  };

  /** Cancel modal */
  const handleCancel = () => setConfirmVisible(false);

  /** QuickActions data */
  const actions = [
    {
      label: isOnline ? "Go Offline" : "Go Online",
      icon: <IconSymbol name="power" size={16} color={linkColor} />,
      onPress: openConfirmation,
    },
    {
      label: "View Menu",
      icon: <IconSymbol name="menu" size={16} color={linkColor} />,
      onPress: () => router.push("/(main)/(menu)"),
    },
  ];

  return (
    <ThemedView style={{ flex: 1 }}>
      <StoreHeader
        storeName="Fresh Bites Bistro"
        approved
        isOnline={isOnline}
        onToggleOnline={openConfirmation}
      />

      <MetricsCards metrics={metrics} />

      <QuickActions heading="Quick Actions" actions={actions} />

      <RecentOrdersFeed
        orders={orders}
        heading="Recent Orders"
        actionLabel="View All"
        actionIcon={<IconSymbol name="arrow.right" size={16} color="#E5A503" />}
        onActionPress={() => router.push("/(main)/(orders)")}
      />

      <ConfirmationModal
        visible={confirmVisible}
        message={`Are you sure you want to ${isOnline ? "go offline" : "go online"}?`}
        onConfirm={handleConfirmToggle}
        onCancel={handleCancel}
      />
    </ThemedView>
  );
}
