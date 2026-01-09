import React from "react";
import { View, FlatList, StyleSheet, Pressable } from "react-native";
import { StoreOrder } from "@/types/store";
import { OrderCard } from "@/components/order/OrderCard";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Props {
  orders: StoreOrder[];
  heading?: string;
  onActionPress?: () => void;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  loading?: boolean;
}

export const RecentOrdersFeed: React.FC<Props> = ({
  orders,
  heading,
  onActionPress,
  actionLabel,
  actionIcon,
  loading,
}) => {
  const mutedText = useThemeColor({}, "textDisabled");
  const primary = useThemeColor({}, "brandPrimary");

  const getTab = (status: string): "pending" | "active" | "completed" => {
    switch (status) {
      case "pending":
        return "pending";
      case "accepted":
        return "active";
      default:
        return "completed";
    }
  };

  return (
    <View style={styles.wrapper}>
      {heading && (
        <View style={styles.headingRow}>
          <ThemedText type="defaultSemiBold" style={{ color: mutedText }}>
            {heading}
          </ThemedText>

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
                height: 60,
                backgroundColor: "#eee",
                borderRadius: 10,
                marginBottom: 12,
              }}
            />
          ))}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard order={item as any} tab={getTab(item.status)} />
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
