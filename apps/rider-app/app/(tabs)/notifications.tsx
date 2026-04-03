import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "@/services/notifications.service";
import type { Notification } from "@/types/notification";
import { formatDistanceToNow } from "date-fns";
import { jobsService } from "@/services/jobs.service";
import { useRouter } from "expo-router";

export default function NotificationsScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textMuted = useThemeColor({}, "textMuted");

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();

  const fetchNotifications = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        const response = await getNotifications(pageNum, 20);

        const safeNotifications = Array.isArray(response.notifications)
          ? response.notifications
          : [];
        if (append) {
          setNotifications((prev) => [...prev, ...safeNotifications]);
        } else {
          setNotifications(safeNotifications);
        }

        setHasMore(response.hasMore);
        setPage(pageNum);
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Failed to load notifications",
          text2: error.message || "Please try again",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(1);
  }, [fetchNotifications]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchNotifications(page + 1, true);
    }
  }, [loadingMore, hasMore, page, fetchNotifications]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      );
    } catch {
      Toast.show({
        type: "error",
        text1: "Failed to mark as read",
      });
    }
  }, []);

  const handleAcceptJob = useCallback(
    async (notificationId: string, jobId: string, jobType: any) => {
      try {
        setProcessingId(notificationId);
        await jobsService.acceptJob(jobId, jobType);
        Toast.show({
          type: "success",
          text1: "Job Accepted! 🛵",
          text2: "Heading to pick up now.",
        });
        // Mark as read and refresh to reflect changes
        await handleMarkAsRead(notificationId);
        router.push("/(tabs)/orders");
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Failed to accept job",
          text2: error.message || "Job might be already taken",
        });
      } finally {
        setProcessingId(null);
      }
    },
    [handleMarkAsRead, router],
  );

  const handleDeclineJob = useCallback(
    async (notificationId: string, jobId: string, jobType: any) => {
      try {
        setProcessingId(notificationId);
        await jobsService.declineJob(jobId, jobType);
        Toast.show({
          type: "info",
          text1: "Job Declined",
        });
        await handleMarkAsRead(notificationId);
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Failed to decline job",
          text2: error.message,
        });
      } finally {
        setProcessingId(null);
      }
    },
    [handleMarkAsRead],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      Toast.show({
        type: "success",
        text1: "All notifications marked as read",
      });
    } catch {
      Toast.show({
        type: "error",
        text1: "Failed to mark all as read",
      });
    }
  }, []);

  const getNotificationIcon = (type: string): any => {
    switch (type.toLowerCase()) {
      case "order":
      case "delivery":
        return "shippingbox.fill";
      case "payout":
      case "payment":
        return "dollarsign.circle.fill";
      case "system":
        return "info.circle.fill";
      default:
        return "bell.fill";
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    return (
      <Pressable
        style={[
          styles.notificationItem,
          {
            backgroundColor: item.isRead ? surface : surfaceSubtle,
            borderColor: border,
          },
        ]}
        onPress={() => !item.isRead && handleMarkAsRead(item.id)}
      >
        <View style={styles.iconContainer}>
          <IconSymbol
            name={getNotificationIcon(item.type)}
            size={24}
            color={item.isRead ? textMuted : primary}
          />
        </View>
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="defaultSemiBold" style={styles.title}>
              {item.title}
            </ThemedText>
            {!item.isRead && (
              <View style={[styles.unreadDot, { backgroundColor: primary }]} />
            )}
          </View>
          <ThemedText style={[styles.message, { color: textSecondary }]}>
            {item.message}
          </ThemedText>
          <ThemedText style={[styles.time, { color: textMuted }]}>
            {formatDistanceToNow(new Date(item.createdAt), {
              addSuffix: true,
            })}
          </ThemedText>

          {/* Action Buttons for Job Assignments */}
          {item.metadata?.jobId && !item.isRead && (
            <View style={styles.actionRow}>
              <Pressable
                style={[
                  styles.actionButton,
                  styles.acceptButton,
                  { backgroundColor: primary },
                  processingId === item.id && styles.disabledButton,
                ]}
                onPress={() =>
                  handleAcceptJob(
                    item.id,
                    item.metadata.jobId,
                    item.metadata.jobType,
                  )
                }
                disabled={processingId !== null}
              >
                {processingId === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.actionText}>YES, ACCEPT ✅</ThemedText>
                )}
              </Pressable>
              <Pressable
                style={[
                  styles.actionButton,
                  styles.declineButton,
                  { borderColor: border },
                  processingId === item.id && styles.disabledButton,
                ]}
                onPress={() =>
                  handleDeclineJob(
                    item.id,
                    item.metadata.jobId,
                    item.metadata.jobType,
                  )
                }
                disabled={processingId !== null}
              >
                <ThemedText style={[styles.actionText, { color: textSecondary }]}>
                  NO ❌
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol name="bell" size={64} color={textMuted} />
        <ThemedText type="subtitle" style={{ color: textSecondary }}>
          No Notifications
        </ThemedText>
        <ThemedText style={{ color: textMuted, textAlign: "center" }}>
          You&apos;re all caught up! We&apos;ll notify you when something
          important happens.
        </ThemedText>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={primary} />
      </View>
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { borderBottomColor: border }]}>
        <ThemedText type="subtitle">Notifications</ThemedText>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAllAsRead}>
            <ThemedText style={[styles.markAllButton, { color: primary }]}>
              Mark all as read
            </ThemedText>
          </Pressable>
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
  },
  markAllButton: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  loadingFooter: {
    padding: 20,
    alignItems: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  acceptButton: {},
  declineButton: {},
  disabledButton: {
    opacity: 0.5,
  },
  actionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
