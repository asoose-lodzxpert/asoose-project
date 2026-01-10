// components/notification/NotificationCard.tsx
import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { markAsRead, Notification } from "@/services/notifications.service";
import Toast from "react-native-toast-message";

interface Props {
  notification: Notification;
  onRead?: (notificationId: string) => void;
}

export const NotificationCard: React.FC<Props> = ({ notification, onRead }) => {
  const background = useThemeColor({}, "surfaceCard");
  const mutedText = useThemeColor({}, "textDisabled");
  const primary = useThemeColor({}, "brandPrimary");
  const grey = useThemeColor({}, "borderDefault");
  const unreadBg = useThemeColor({}, "surfaceSubtle");
  const router = useRouter();
  const [isReading, setIsReading] = useState(false);

  // Map type to icon
  const typeIconMap: Record<string, IconSymbolName> = {
    ORDER_CREATED: "list",
    ORDER_UPDATE: "list",
    PAYOUT_APPROVED: "dollar-sign",
    PAYOUT_REJECTED: "dollar-sign",
    PAYOUT_COMPLETED: "dollar-sign",
    SYSTEM: "info",
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 2592000)}mo ago`;
  };

  const handlePress = async () => {
    // Mark as read if not already
    if (!notification.isRead && !isReading) {
      setIsReading(true);
      try {
        await markAsRead(notification.id);
        onRead?.(notification.id);
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      } finally {
        setIsReading(false);
      }
    }

    // Navigate based on notification type and metadata
    if (notification.metadata?.orderId) {
      router.push("/(main)/(orders)");
    } else if (notification.metadata?.payoutId) {
      router.push("/");
    }
  };

  const icon = typeIconMap[notification.type] || "info";

  return (
    <Pressable onPress={handlePress}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: notification.isRead ? background : unreadBg,
            borderColor: notification.isRead ? grey : primary,
            borderWidth: notification.isRead ? 1 : 2,
          },
        ]}
      >
        <View style={styles.topRow}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: notification.isRead
                  ? "#F3F3F3"
                  : primary + "20",
              },
            ]}
          >
            <IconSymbol name={icon} size={20} color={primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <ThemedText type="defaultSemiBold">{notification.title}</ThemedText>
            <ThemedText
              type="caption"
              style={{ color: mutedText, marginTop: 2 }}
            >
              {getTimeAgo(notification.createdAt)}
            </ThemedText>
          </View>
          {!notification.isRead && (
            <View style={[styles.unreadDot, { backgroundColor: primary }]} />
          )}
        </View>

        <ThemedText
          style={{ color: mutedText, marginTop: 8, lineHeight: 20 }}
          numberOfLines={3}
        >
          {notification.message}
        </ThemedText>

        {notification.metadata?.orderId && (
          <ThemedText
            type="defaultSemiBold"
            style={{ color: primary, marginTop: 8 }}
          >
            View Order →
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
    marginTop: 5,
  },
});
