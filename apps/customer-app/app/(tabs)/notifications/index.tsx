import React, { useEffect, useState, useCallback } from "react";
import type { Notification } from "@/types/notification-config";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  fetchUserNotifications,
  fetchUnreadCount,
  markAllAsRead,
  markNotificationAsRead,
  deleteNotification,
} from "@/services/user-notifications.service";
import { useNotificationCount } from "@/context/NotificationCountContext";

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const badgeCount = useNotificationCount();

  const cardBg = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const skeletonColor = useThemeColor({}, "surfaceSubtle");

  const loadNotifications = useCallback(
    async (reset = false) => {
      if (loading && !reset) return;
      if (!hasMore && !reset) return;
      setLoading(true);
      try {
        const res = await fetchUserNotifications(reset ? 1 : page);
        if (reset) {
          setNotifications(res.data);
        } else {
          setNotifications((prev) => [
            ...prev,
            ...(res.data as Notification[]),
          ]);
        }
        setHasMore(res.meta.page < res.meta.pages);
      } finally {
        setLoading(false);
      }
    },
    [page, hasMore, loading],
  );

  useEffect(() => {
    loadNotifications(true);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(true);
    setPage(1);
    setRefreshing(false);
  };

  async function handleMarkAllAsRead() {
    setActionLoading(true);
    await markAllAsRead();
    await loadNotifications(true);
    setActionLoading(false);
  }

  async function handleMarkAsRead(id: string) {
    setActionLoading(true);
    await markNotificationAsRead(id);
    await loadNotifications(true);
    setActionLoading(false);
  }

  async function handleDelete(id: string) {
    setActionLoading(true);
    await deleteNotification(id);
    await loadNotifications(true);
    setActionLoading(false);
  }

  const renderItem = ({ item }: { item: Notification }) => (
    <View
      style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}
    >
      <IconSymbol
        name="bell"
        size={24}
        style={{ marginRight: 12 }}
        color={border}
      />
      <View style={{ flex: 1 }}>
        <ThemedText
          style={[
            styles.title,
            { fontWeight: item.isRead ? "normal" : "bold" },
          ]}
        >
          {item.title}
        </ThemedText>
        <ThemedText style={styles.message}>{item.message}</ThemedText>
        <ThemedText style={styles.meta}>
          {new Date(item.createdAt).toLocaleString()}
        </ThemedText>
      </View>
      {!item.isRead && (
        <TouchableOpacity
          onPress={() => handleMarkAsRead(item.id)}
          disabled={actionLoading}
          style={{ marginLeft: 8 }}
        >
          <ThemedText type="link" style={{ fontWeight: "bold" }}>
            Mark as read
          </ThemedText>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={() => handleDelete(item.id)}
        disabled={actionLoading}
        style={{ marginLeft: 8 }}
      >
        <ThemedText
          type="link"
          style={{ fontWeight: "bold", color: "#EF4444" }}
        >
          Delete
        </ThemedText>
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <ThemedText style={styles.header}>Notifications</ThemedText>
        <TouchableOpacity
          onPress={handleMarkAllAsRead}
          disabled={actionLoading || badgeCount === 0}
          style={{ opacity: actionLoading || badgeCount === 0 ? 0.5 : 1 }}
        >
          <ThemedText type="link" style={{ fontWeight: "bold" }}>
            Mark all as read
          </ThemedText>
        </TouchableOpacity>
      </View>
      {loading ? (
        <>
          {[...Array(5)].map((_, i) => (
            <SkeletonCard
              key={i}
              style={{ backgroundColor: skeletonColor, marginBottom: 12 }}
            />
          ))}
        </>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={() => {
            if (hasMore && !loading) {
              setPage((p) => p + 1);
              loadNotifications();
            }
          }}
          onEndReachedThreshold={0.2}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={{ marginTop: 32 }} />
            ) : (
              <ThemedText style={{ textAlign: "center", marginTop: 32 }}>
                No notifications yet.
              </ThemedText>
            )
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: "#888",
  },
});
