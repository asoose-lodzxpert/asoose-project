import React, { useCallback } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { RelativePathString, useRouter } from "expo-router";

export type DeliveryHistoryItem = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  description: string;
  recipient: string;
};

interface Props {
  data: DeliveryHistoryItem[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
}

export const DeliveryHistoryList: React.FC<Props> = ({
  data,
  loading,
  refreshing,
  onRefresh,
  onEndReached,
}) => {
  const router = useRouter();

  // ✅ All hooks at top level
  const primary = useThemeColor({}, "brandPrimary");
  const white = useThemeColor({}, "surfaceCard");
  const bgGrey = useThemeColor({}, "surfaceBackground");
  const textMain = useThemeColor({}, "textPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  const borderLight = useThemeColor({}, "surfaceSubtle");
  const success = useThemeColor({}, "statusSuccess");
  const error = useThemeColor({}, "statusError");
  const pending = useThemeColor({}, "statusPending");

  const getStatusConfig = useCallback(
    (status: string) => {
      const s = status.toLowerCase();

      if (s.includes("delivered") || s.includes("success")) {
        return { color: success, label: "DELIVERED" };
      }

      if (s.includes("cancel")) {
        return { color: error, label: "CANCELLED" };
      }

      return {
        color: pending,
        label: status.toUpperCase(),
      };
    },
    [success, error, pending],
  );

  const renderItem = ({ item }: { item: DeliveryHistoryItem }) => {
    const status = getStatusConfig(item.status);

    const dateString = new Date(item.createdAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return (
      <Pressable
        style={({ pressed }) => [
          styles.itemRow,
          {
            backgroundColor: white,
            opacity: pressed ? 0.85 : 1,
            borderBottomColor: borderLight,
          },
        ]}
        onPress={() =>
          router.push(
            `/(settings)/delivery-history/${item.id}` as RelativePathString,
          )
        }
      >
        <View style={styles.topLine}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${status.color}15` },
            ]}
          >
            <ThemedText style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </ThemedText>
          </View>

          <ThemedText style={[styles.dateText, { color: textMuted }]}>
            {dateString}
          </ThemedText>
        </View>

        <View style={styles.mainContent}>
          <View
            style={[styles.imagePlaceholder, { backgroundColor: borderLight }]}
          >
            <IconSymbol name="shippingbox.fill" size={24} color={textMuted} />
          </View>

          <View style={styles.infoCol}>
            <ThemedText
              style={[styles.description, { color: textMain }]}
              numberOfLines={1}
            >
              {item.description}
            </ThemedText>

            <ThemedText style={[styles.orderId, { color: textMuted }]}>
              Order #{item.id.slice(-8).toUpperCase()}
            </ThemedText>

            <ThemedText style={[styles.recipient, { color: textMuted }]}>
              To: {item.recipient}
            </ThemedText>
          </View>

          <View style={styles.priceCol}>
            <ThemedText style={[styles.priceText, { color: textMain }]}>
              ₦{item.total.toLocaleString()}
            </ThemedText>
            <IconSymbol name="chevron.right" size={14} color={textMuted} />
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading && data.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: bgGrey, padding: 15 }}>
        {[...Array(5)].map((_, i) => (
          <View
            key={i}
            style={[styles.skeletonCard, { backgroundColor: borderLight }]}
          />
        ))}
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      style={{ backgroundColor: bgGrey }}
      contentContainerStyle={styles.listPadding}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={primary}
        />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={
        !loading ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="tray.fill" size={60} color={borderLight} />
            <ThemedText style={{ color: textMuted, marginTop: 10 }}>
              No history found
            </ThemedText>
          </View>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  listPadding: { paddingBottom: 40 },

  itemRow: {
    padding: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },

  topLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  dateText: {
    fontSize: 12,
    fontWeight: "500",
  },

  mainContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  imagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  infoCol: {
    flex: 1,
  },

  description: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },

  orderId: {
    fontSize: 12,
    marginBottom: 2,
  },

  recipient: {
    fontSize: 12,
  },

  priceCol: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
  },

  priceText: {
    fontSize: 16,
    fontWeight: "700",
  },

  skeletonCard: {
    height: 100,
    width: "100%",
    marginBottom: 10,
    borderRadius: 4,
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
});
