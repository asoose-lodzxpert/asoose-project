import React, { useState, useCallback, useEffect } from "react";
import { ThemedView } from "@/components/themed-view";
import { NotificationCard } from "@/components/notification/NotificationCard";
import {
  FlatList,
  StyleSheet,
  ActivityIndicator,
  View,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { NotificationTab } from "@/types/notification";
import { NotificationsTabs } from "@/components/notification/NotificationTabs";
import Toast from "react-native-toast-message";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedText } from "@/components/themed-text";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchNotifications,
  markAllAsRead,
  getApiTypeFromTab,
  Notification,
} from "@/services/notifications.service";
import { useNotifications } from "@/context/NotificationContext";
import { useFocusEffect } from "expo-router";

export default function NotificationsScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  const [activeTab, setActiveTab] = useState<NotificationTab>("orders");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const { setUnreadCount, refreshUnreadCount } = useNotifications();

  const loadNotifications = async (pageNum: number, isRefresh = false) => {
    try {
      if (pageNum === 1 && !isRefresh) {
        setLoading(true);
      } else if (pageNum > 1) {
        setLoadingMore(true);
      }

      // Get type filter based on active tab
      const typeFilter = getApiTypeFromTab(activeTab);

      const response = await fetchNotifications(pageNum, typeFilter);

      if (isRefresh || pageNum === 1) {
        setNotifications(response.data);
      } else {
        setNotifications((prev) => [...prev, ...response.data]);
      }

      setHasMore(pageNum < response.meta.pages);
      setPage(pageNum);

      // Refresh global unread count
      await refreshUnreadCount();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to load notifications",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Load notifications when screen focuses or tab changes
  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setHasMore(true);
      loadNotifications(1);
    }, [activeTab])
  );

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadNotifications(1, true);
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    loadNotifications(1, true);
  }, []);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadNotifications(page + 1);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await refreshUnreadCount();
      Toast.show({
        type: "success",
        text1: "All notifications marked as read",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to mark all as read",
      });
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationRead = async (notificationId: string) => {
    // Optimistically update UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );

    // Refresh global unread count
    await refreshUnreadCount();
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={primary} />
        <ThemedText style={{ marginLeft: 8, color: primary }}>
          Loading more...
        </ThemedText>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="notifications-off-outline"
          size={48}
          color={textSecondary}
        />
        <ThemedText type="subtitle" style={{ marginTop: 16, opacity: 0.5 }}>
          No {activeTab} notifications
        </ThemedText>
        <ThemedText style={{ marginTop: 8, opacity: 0.5 }}>
          You're all caught up!
        </ThemedText>
      </View>
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const borderColor = useThemeColor({}, "borderDefault");
  const background = useThemeColor({}, "surfaceCard");

  return (
    <ThemedView style={{ flex: 1 }}>
      <View style={styles.headerContainer}>
        <NotificationsTabs active={activeTab} onChange={setActiveTab} />
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            style={styles.markAllButton}
            disabled={markingAllRead}
          >
            {markingAllRead ? (
              <ActivityIndicator size="small" color={primary} />
            ) : (
              <ThemedText style={{ color: primary, fontSize: 14 }}>
                Mark all read
              </ThemedText>
            )}
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {[...Array(5)].map((_, i) => (
            <View
              key={i}
              style={{
                backgroundColor: background,
                borderRadius: 10,
                marginBottom: 12,
                padding: 12,
              }}
            >
              {/* Top row skeleton */}
              <View style={{ flexDirection: "row", marginBottom: 8 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: borderColor,
                    opacity: 0.3,
                  }}
                />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <View
                    style={{
                      width: "70%",
                      height: 16,
                      backgroundColor: borderColor,
                      borderRadius: 4,
                      opacity: 0.3,
                      marginBottom: 6,
                    }}
                  />
                  <View
                    style={{
                      width: "40%",
                      height: 12,
                      backgroundColor: borderColor,
                      borderRadius: 4,
                      opacity: 0.3,
                    }}
                  />
                </View>
              </View>

              {/* Message skeleton */}
              <View
                style={{
                  width: "90%",
                  height: 14,
                  backgroundColor: borderColor,
                  borderRadius: 4,
                  opacity: 0.3,
                  marginBottom: 4,
                }}
              />
              <View
                style={{
                  width: "70%",
                  height: 14,
                  backgroundColor: borderColor,
                  borderRadius: 4,
                  opacity: 0.3,
                }}
              />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationCard
              notification={item}
              onRead={handleNotificationRead}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Toast />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    position: "relative",
  },
  markAllButton: {
    position: "absolute",
    right: 16,
    top: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
});
