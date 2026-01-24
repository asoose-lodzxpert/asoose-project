import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter, useLocalSearchParams } from "expo-router";
import { fetchDeliveryDetails } from "@/services/delivery-details.service";

type Delivery = any;

export default function DeliveryDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const muted = useThemeColor({}, "textMuted");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [delivery, setDelivery] = useState<Delivery | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const deliveryId = Array.isArray(id) ? id[0] : id;
      const data = await fetchDeliveryDetails(deliveryId as string);
      setDelivery(data);
    } catch (e) {
      setDelivery(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={22} color={primary} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>
          Delivery Details
        </ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <SkeletonCard />
        ) : !delivery ? (
          <View style={{ alignItems: "center", marginTop: 32 }}>
            <ThemedText style={styles.centerText}>
              Delivery not found
            </ThemedText>
            <ThemedText style={styles.pullToRefresh}>
              Pull down to refresh
            </ThemedText>
          </View>
        ) : (
          <>
            {/* ROUTE */}
            <View
              style={[
                styles.card,
                { backgroundColor: surface, borderColor: border },
              ]}
            >
              <View style={styles.routeRow}>
                <IconSymbol name="radio" size={18} color={primary} />
                <ThemedText style={[styles.liveText, { color: primary }]}>
                  Live Route
                </ThemedText>
              </View>
              <RouteItem
                icon="map-pin"
                label="Pickup"
                value={delivery.pickupAddress?.address || "Unknown Address"}
                color={primary}
              />
              <View style={styles.routeDivider} />
              <RouteItem
                icon="flag"
                label="Drop-off"
                value={delivery.dropoffAddress?.address || "Unknown Address"}
                color={primary}
              />
            </View>

            {/* SUMMARY */}
            <View
              style={[
                styles.card,
                { backgroundColor: surface, borderColor: border },
              ]}
            >
              <SummaryItem
                icon="wallet"
                label="Delivery Fee"
                value={`₦${delivery.deliveryFee?.toLocaleString?.() ?? delivery.deliveryFee}`}
                highlight
              />
              <SummaryItem
                icon="box"
                label="Package Details"
                value={delivery.packageDetails || "-"}
              />
              <SummaryItem
                icon="user-check"
                label="Recipient"
                value={`${delivery.recipientName} (${delivery.recipientPhone})`}
              />
              <SummaryItem
                icon="user"
                label="Rider"
                value={
                  delivery.riderName
                    ? `${delivery.riderName} (${delivery.riderPhone || "-"})`
                    : "Not assigned"
                }
              />
              <SummaryItem icon="flag" label="Status" value={delivery.status} />
              <SummaryItem
                icon="clock"
                label="Created At"
                value={new Date(delivery.createdAt).toLocaleString()}
              />
              {delivery.deliveredAt && (
                <SummaryItem
                  icon="check-circle"
                  label="Delivered At"
                  value={new Date(delivery.deliveredAt).toLocaleString()}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

/* ---------------- Components ---------------- */

function RouteItem({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.routeItem}>
      <IconSymbol name={icon as any} size={18} color={color} />
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.routeLabel}>{label}</ThemedText>
        <ThemedText style={styles.routeValue}>{value}</ThemedText>
      </View>
    </View>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");

  return (
    <View style={styles.summaryRow}>
      <IconSymbol
        name={icon as any}
        size={18}
        color={highlight ? primary : muted}
      />
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.summaryLabel}>{label}</ThemedText>
        <ThemedText
          style={[
            styles.summaryValue,
            highlight && { color: primary, fontWeight: "600" },
          ]}
        >
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

function SkeletonCard() {
  const border = useThemeColor({}, "borderDefault");
  return (
    <View style={[styles.card, { borderColor: border }]}>
      <View style={styles.skeleton} />
      <View style={styles.skeleton} />
      <View style={styles.skeleton} />
    </View>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  pullToRefresh: {
    color: "#888",
    fontSize: 13,
    marginTop: 8,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  liveText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
  },
  routeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  routeDivider: {
    height: 1,
    marginVertical: 12,
    backgroundColor: "#E5E7EB",
  },
  routeLabel: {
    fontSize: 12,
    color: "#777",
  },
  routeValue: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#777",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  centerText: {
    textAlign: "center",
    marginTop: 32,
  },
  skeleton: {
    height: 16,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
    marginBottom: 12,
    opacity: 0.5,
  },
});
