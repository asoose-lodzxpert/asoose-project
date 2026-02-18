import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { fetchDeliveryDetails } from "@/services/delivery-details.service";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatCurrency(value: string | number | undefined | null) {
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "₦0.00";
  return `₦${num.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function DeliveryDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const success = useThemeColor({}, "statusSuccess");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [delivery, setDelivery] = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await fetchDeliveryDetails(id as string);
      setDelivery(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading && !refreshing) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={primary} />
      </ThemedView>
    );
  }

  const renderStatusHeader = () => {
    const isCancelled = delivery.status === "CANCELLED";
    const color = isCancelled ? "#EF4444" : primary;

    return (
      <View style={[styles.statusHeader, { backgroundColor: card }]}>
        <View
          style={[styles.statusIconCircle, { backgroundColor: `${color}15` }]}
        >
          <IconSymbol name="shippingbox.fill" size={32} color={color} />
        </View>
        <ThemedText style={[styles.statusMainLabel, { color }]}>
          {delivery.status.replace("_", " ")}
        </ThemedText>
        <ThemedText style={styles.orderIdText}>
          Order #{delivery.orderId.slice(-8).toUpperCase()}
        </ThemedText>
      </View>
    );
  };

  const renderRouteCard = () => (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <ThemedText style={styles.cardTitle}>Route</ThemedText>
      <View style={styles.routeContainer}>
        <View style={styles.routeVisual}>
          <View style={[styles.dot, { backgroundColor: success }]} />
          <View style={[styles.line, { backgroundColor: border }]} />
          <View style={[styles.dot, { backgroundColor: primary }]} />
        </View>
        <View style={styles.routeTexts}>
          <View>
            <ThemedText style={styles.routeLabel}>PICKUP (STORE)</ThemedText>
            <ThemedText style={styles.addressText}>
              {delivery.pickupAddress.address}
            </ThemedText>
          </View>
          <View style={{ marginTop: 24 }}>
            <ThemedText style={styles.routeLabel}>DROPOFF (HOME)</ThemedText>
            <ThemedText style={styles.addressText}>
              {delivery.dropoffAddress.address}
            </ThemedText>
          </View>
        </View>
      </View>
    </View>
  );

  const renderDeliverySpecs = () => (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <ThemedText style={styles.cardTitle}>Package Details</ThemedText>
      <View style={styles.grid}>
        <DetailItem
          label="Weight"
          value={delivery.weightKg ? `${delivery.weightKg}kg` : "Not weighed"}
        />
        <DetailItem label="Distance" value={`${delivery.distanceKm} km`} />
        <DetailItem label="Fragile" value={delivery.isFragile ? "Yes" : "No"} />
        <DetailItem
          label="Liquid"
          value={delivery.containsLiquid ? "Yes" : "No"}
        />
      </View>
      <View style={[styles.priceRow, { borderTopColor: border }]}>
        <ThemedText style={styles.priceLabel}>Delivery Fee</ThemedText>
        <ThemedText style={[styles.priceValue, { color: primary }]}>
          {formatCurrency(delivery.deliveryFee)}
        </ThemedText>
      </View>
    </View>
  );

  const renderContactCard = () => (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <ThemedText style={styles.cardTitle}>Recipient Info</ThemedText>
      <View style={styles.contactRow}>
        <View style={styles.contactAvatar}>
          <IconSymbol
            name="person.crop.circle.fill"
            size={40}
            color={textSecondary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.contactName}>
            {delivery.recipientName}
          </ThemedText>
          <ThemedText style={{ color: textSecondary }}>
            {delivery.recipientPhone}
          </ThemedText>
        </View>
        <Pressable
          style={[styles.callBtn, { backgroundColor: primary + "15" }]}
        >
          <IconSymbol name="phone.fill" size={20} color={primary} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <View style={styles.headerNav}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color={textPrimary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Delivery Details</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primary}
          />
        }
        contentContainerStyle={styles.scrollPadding}
      >
        {renderStatusHeader()}
        {renderRouteCard()}
        {renderContactCard()}
        {renderDeliverySpecs()}

        <ThemedText style={styles.timestampText}>
          Created on {new Date(delivery.createdAt).toLocaleString()}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.gridItem}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={styles.detailValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  backBtn: { padding: 8 },
  scrollPadding: { padding: 16, gap: 16 },
  statusHeader: {
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 8,
  },
  statusIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statusMainLabel: {
    fontSize: 22,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  orderIdText: { fontSize: 14, opacity: 0.5, marginTop: 4 },
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    opacity: 0.4,
    marginBottom: 16,
  },
  routeContainer: { flexDirection: "row", gap: 16 },
  routeVisual: { alignItems: "center", paddingVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { width: 2, flex: 1, marginVertical: 4 },
  routeTexts: { flex: 1 },
  routeLabel: {
    fontSize: 10,
    fontWeight: "800",
    opacity: 0.5,
    marginBottom: 4,
  },
  addressText: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  gridItem: { width: "45%" },
  detailLabel: { fontSize: 12, opacity: 0.5 },
  detailValue: { fontSize: 15, fontWeight: "600", marginTop: 2 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  priceLabel: { fontSize: 16, fontWeight: "600" },
  priceValue: { fontSize: 18, fontWeight: "800" },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
  },
  contactName: { fontSize: 16, fontWeight: "700" },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  timestampText: {
    textAlign: "center",
    opacity: 0.3,
    fontSize: 12,
    marginTop: 10,
    marginBottom: 40,
  },
});
