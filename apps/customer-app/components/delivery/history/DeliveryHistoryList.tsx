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
  from: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  to: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  price: number;
  status: string;
  time_initiated: string; // ISO string or timestamp
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

  const renderItem = ({ item }: { item: DeliveryHistoryItem }) => {
    // Format time_initiated as e.g. 'Jan 5, 2026, 2:30 PM'
    let timeString = "";
    if (item.time_initiated) {
      const date = new Date(item.time_initiated);
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
            <ThemedText style={styles.cardFromTo}>
              {item.from.address} → {item.to.address}
            </ThemedText>
            <ThemedText type="caption">
              ₦{item.price.toLocaleString()}
            </ThemedText>
            {timeString && (
              <ThemedText type="caption" style={styles.timeInitiated}>
                {timeString}
              </ThemedText>
            )}
          </View>

          <IconSymbol name="chevron.right" size={18} color={brandPrimary} />
        </View>
      </Pressable>
    );
  };

  if (loading && data.length === 0) {
    return (
      <ThemedText style={styles.centerText}>Loading deliveries…</ThemedText>
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
          <ThemedText style={styles.centerText}>
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
    color: "#888",
    marginTop: 2,
  },
});
