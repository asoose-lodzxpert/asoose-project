import React, { useCallback, useState, useEffect } from "react";
import { View, FlatList, StyleSheet, Pressable } from "react-native";
import { StoreOrder } from "@/types/store";
import { OrderCard } from "@/components/order/OrderCard";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  useWebSocketOrders,
  OrderStreamEvent,
} from "@/hooks/use-websocket-orders";
import Toast from "react-native-toast-message";

interface Props {
  orders: StoreOrder[];
  heading?: string;
  onActionPress?: () => void;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  loading?: boolean;
  onRefresh?: () => void;
}

export const RecentOrdersFeed: React.FC<Props> = ({
  orders,
  heading,
  onActionPress,
  actionLabel,
  actionIcon,
  loading,
  onRefresh,
}) => {
  const mutedText = useThemeColor({}, "textDisabled");
  const primary = useThemeColor({}, "brandPrimary");
  const background = useThemeColor({}, "surfaceCard");
  const borderColor = useThemeColor({}, "borderDefault");
  const green = useThemeColor({}, "statusSuccess");

  const [showLiveIndicator, setShowLiveIndicator] = useState(false);

  // WebSocket event handlers
  const handleNewOrder = useCallback(
    (orderData: OrderStreamEvent) => {
      // Show live indicator with animation
      setShowLiveIndicator(true);
      setTimeout(() => setShowLiveIndicator(false), 2000);

      // Show toast notification
      Toast.show({
        type: "success",
        text1: "🎉 New Order!",
        text2: `Order from ${orderData.customerName}`,
        visibilityTime: 3000,
      });

      // Refresh the feed
      onRefresh?.();
    },
    [onRefresh],
  );

  const handleOrderUpdate = useCallback(
    (orderData: OrderStreamEvent) => {
      // Refresh the feed
      onRefresh?.();
    },
    [onRefresh],
  );

  // WebSocket Connection
  const { isConnected } = useWebSocketOrders({
    onNewOrder: handleNewOrder,
    onOrderUpdate: handleOrderUpdate,
    enabled: true,
  });

  const getTab = (status: string): "pending" | "active" | "history" => {
    switch (status) {
      case "pending":
        return "pending";
      case "accepted":
        return "active";
      default:
        return "history";
    }
  };

  return (
    <View style={styles.wrapper}>
      {heading && (
        <View style={styles.headingRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ThemedText type="defaultSemiBold" style={{ color: mutedText }}>
              {heading}
            </ThemedText>
            {/* Live indicator */}
            {isConnected && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                  backgroundColor: showLiveIndicator
                    ? green + "30"
                    : green + "15",
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: green,
                  }}
                />
                <ThemedText
                  style={{
                    fontSize: 10,
                    fontWeight: "600",
                    color: green,
                  }}
                >
                  LIVE
                </ThemedText>
              </View>
            )}
          </View>

          {onActionPress && actionLabel && (
            <Pressable style={styles.actionButton} onPress={onActionPress}>
              <ThemedText type="defaultSemiBold" style={{ color: primary }}>
                {actionLabel}
              </ThemedText>
              {actionIcon && (
                <View style={{ marginRight: 4 }}>{actionIcon}</View>
              )}
            </Pressable>
          )}
        </View>
      )}

      {loading ? (
        <View style={{ paddingHorizontal: 16 }}>
          {[...Array(3)].map((_, i) => (
            <View
              key={i}
              style={{
                backgroundColor: background,
                borderRadius: 10,
                marginBottom: 12,
                padding: 12,
              }}
            >
              {/* Profile row skeleton */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: borderColor,
                    opacity: 0.3,
                  }}
                />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <View
                    style={{
                      width: "40%",
                      height: 16,
                      backgroundColor: borderColor,
                      borderRadius: 4,
                      opacity: 0.3,
                      marginBottom: 4,
                    }}
                  />
                  <View
                    style={{
                      width: "30%",
                      height: 12,
                      backgroundColor: borderColor,
                      borderRadius: 4,
                      opacity: 0.3,
                    }}
                  />
                </View>
                <View
                  style={{
                    width: 70,
                    height: 24,
                    backgroundColor: borderColor,
                    borderRadius: 12,
                    opacity: 0.3,
                  }}
                />
              </View>

              {/* Items skeleton */}
              <View style={{ marginBottom: 12 }}>
                {[0, 1].map((idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <View
                      style={{
                        width: "50%",
                        height: 14,
                        backgroundColor: borderColor,
                        borderRadius: 4,
                        opacity: 0.3,
                      }}
                    />
                    <View
                      style={{
                        width: "20%",
                        height: 14,
                        backgroundColor: borderColor,
                        borderRadius: 4,
                        opacity: 0.3,
                      }}
                    />
                  </View>
                ))}
              </View>

              {/* Total skeleton */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    width: "20%",
                    height: 18,
                    backgroundColor: borderColor,
                    borderRadius: 4,
                    opacity: 0.3,
                  }}
                />
                <View
                  style={{
                    width: "30%",
                    height: 18,
                    backgroundColor: borderColor,
                    borderRadius: 4,
                    opacity: 0.3,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard
              order={
                {
                  ...item,
                  user: {
                    name: item.customerName,
                    phone: "",
                    image: item.customerProfile,
                  },
                  total: item.total,
                  createdAt: item.timestamp,
                  items: Array.isArray(item.items)
                    ? item.items.map((it: any) => ({
                        ...it,
                        nameSnap: it.name,
                      }))
                    : [],
                } as any
              }
              tab={getTab(item.status)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    marginVertical: 12,
  },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
  },
});
