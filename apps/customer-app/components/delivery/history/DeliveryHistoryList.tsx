import React from "react";
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
import { useRouter } from "expo-router";

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
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const skeletonBg = useThemeColor({}, "surfaceBackground");
  const skeletonBorder = useThemeColor({}, "borderDefault");
  const textColor = useThemeColor({}, "textPrimary");
  const captionColor = useThemeColor({}, "textSecondary");

  const renderItem = ({ item }: { item: DeliveryHistoryItem }) => {
    // Format createdAt as e.g. 'Jan 5, 2026, 2:30 PM'
    let timeString = "";
    if (item.createdAt) {
      const date = new Date(item.createdAt);
      timeString = date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return (
      <Pressable
        style={[
          styles.card,
          { backgroundColor: surfaceCard, borderColor: border },
        ]}
        onPress={() => router.push(`/(delivery)/details?id=${item.id}`)}
      >
        <View style={styles.cardRow}>
          <IconSymbol
            name="truck"
            size={20}
            color={brandPrimary}
            style={styles.icon}
          />
          <View style={styles.cardContent}>
            <ThemedText style={[styles.cardFromTo, { color: textColor }]}>
              {item.description}
            </ThemedText>
            <ThemedText type="caption" style={{ color: captionColor }}>
              Recipient: {item.recipient}
            </ThemedText>
            <ThemedText type="caption" style={{ color: captionColor }}>
              ₦{item.total.toLocaleString()}
            </ThemedText>
            <ThemedText type="caption" style={{ color: captionColor }}>
              Status: {item.status}
            </ThemedText>
            {timeString && (
              <ThemedText
                type="caption"
                style={[styles.timeInitiated, { color: captionColor }]}
              >
                {timeString}
              </ThemedText>
            )}
          </View>
          <IconSymbol name="chevron.right" size={18} color={brandPrimary} />
        </View>
      </Pressable>
    );
  };

  // Skeleton loader
  if (loading && data.length === 0) {
    return (
      <View style={styles.listContent}>
        {[...Array(4)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.card,
              {
                backgroundColor: skeletonBg,
                borderColor: skeletonBorder,
                minHeight: 70,
                marginBottom: 12,
              },
            ]}
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
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={
        !loading ? (
          <ThemedText style={[styles.centerText, { color: textColor }]}>
            No deliveries found.
          </ThemedText>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerText: {
    textAlign: "center",
    marginTop: 32,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardFromTo: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
  },
  timeInitiated: {
    fontSize: 12,
    marginTop: 2,
  },
});
