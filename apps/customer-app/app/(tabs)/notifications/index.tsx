import React, { useEffect, useState, useCallback } from "react";
import type { Notification } from "@/types/notification-config";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  fetchUserNotifications,
  markAllAsRead,
  markNotificationAsRead,
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

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const textSecondary = useThemeColor({}, "textSecondary");
  const border = useThemeColor({}, "borderDefault");

  const loadNotifications = useCallback(
    async (reset = false) => {
      if (loading && !reset) return;
      if (!hasMore && !reset) return;
      setLoading(true);
      try {
        const res = await fetchUserNotifications(reset ? 1 : page);
        setNotifications(reset ? res.data : [...notifications, ...res.data]);
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

  async function handleNotificationPress(item: Notification) {
    if (item.isRead) return;
    setActionLoading(true);
    await markNotificationAsRead(item.id);
    await loadNotifications(true);
    setActionLoading(false);
  }

  const renderItem = ({ item }: { item: Notification }) => (
    <Pressable
      onPress={() => handleNotificationPress(item)}
      style={({ pressed }) => [
        styles.notificationItem,
        { borderBottomColor: border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.contentRow}>
        {/* Unread Indicator Dot */}
        <View style={styles.indicatorContainer}>
          {!item.isRead && (
            <View style={[styles.unreadDot, { backgroundColor: primary }]} />
          )}
        </View>

        <View style={styles.textContainer}>
          <ThemedText
            style={[styles.title, { opacity: item.isRead ? 0.6 : 1 }]}
          >
            {item.title}
          </ThemedText>
          <ThemedText
            style={[styles.message, { color: textSecondary }]}
            numberOfLines={2}
          >
            {item.message}
          </ThemedText>
          <ThemedText style={[styles.meta, { color: textSecondary }]}>
            {new Date(item.createdAt).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Minimal Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithCount}>
          <ThemedText style={styles.headerText}>Notifications</ThemedText>
          {badgeCount > 0 && (
            <View style={[styles.badge, { backgroundColor: primary }]}>
              <ThemedText style={styles.badgeText}>{badgeCount}</ThemedText>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={handleMarkAllAsRead}
          disabled={actionLoading || badgeCount === 0}
        >
          <ThemedText
            style={[
              styles.markReadText,
              { color: primary, opacity: badgeCount === 0 ? 0.3 : 1 },
            ]}
          >
            Mark all read
          </ThemedText>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listPadding}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primary}
          />
        }
        onEndReached={() => {
          if (hasMore && !loading) {
            setPage((p) => p + 1);
            loadNotifications();
          }
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.emptyLoader} color={primary} />
          ) : (
            <View style={styles.emptyContainer}>
              <IconSymbol name="bell.slash" size={48} color={border} />
              <ThemedText style={{ color: textSecondary, marginTop: 12 }}>
                All caught up!
              </ThemedText>
            </View>
          )
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  titleWithCount: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerText: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  badge: {
    paddingHorizontal: 8,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  markReadText: { fontSize: 14, fontWeight: "600" },
  listPadding: { paddingBottom: 40 },
  notificationItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contentRow: { flexDirection: "row", alignItems: "flex-start" },
  indicatorContainer: { width: 12, paddingTop: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  textContainer: { flex: 1, paddingLeft: 4 },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  message: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  meta: { fontSize: 12, fontWeight: "500" },
  emptyLoader: { marginTop: 40 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
});
