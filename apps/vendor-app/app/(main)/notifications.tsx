// screens/NotificationsScreen.tsx
import React, { useState } from "react";
import { ThemedView } from "@/components/themed-view";
import { NotificationCard } from "@/components/notification/NotificationCard";
import { FlatList, StyleSheet } from "react-native";
import { NotificationTab } from "@/types/notification";
import { NotificationsTabs } from "@/components/notification/NotificationTabs";
import { MOCK_NOTIFICATIONS } from "@/config/demo-notis";

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<NotificationTab>("orders");

  const filtered = MOCK_NOTIFICATIONS.filter((n) => n.type === activeTab);

  return (
    <ThemedView style={{ flex: 1 }}>
      <NotificationsTabs
        active={activeTab}
        onChange={setActiveTab}
        heading="Notifications"
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationCard notification={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
