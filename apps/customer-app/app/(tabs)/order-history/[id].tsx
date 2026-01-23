import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { fetchOrderById } from "@/services/order-history.service";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textColor = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const border = useThemeColor({}, "borderDefault");

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== "string") {
      setError("Invalid order id");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetchOrderById(id)
      .then(setOrder)
      .catch((e) => setError(e?.message || "Failed to load order"))
      .finally(() => setLoading(false));
  }, [id]);

  /* ---------------- Render Sections ---------------- */

  const renderTimeline = useCallback(() => {
    if (!order?.timeline?.length) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Order Timeline
        </ThemedText>

        {order.timeline.map((step: any, idx: number) => (
          <View key={idx} style={styles.timelineItem}>
            <IconSymbol
              name={step.icon || "clock"}
              size={20}
              color={brandPrimary}
              style={{ marginRight: 8 }}
            />
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: textColor, fontWeight: "600" }}>
                {step.label}
              </ThemedText>
              <ThemedText style={{ color: textSecondary, fontSize: 13 }}>
                {step.description}
              </ThemedText>
              {step.time && (
                <ThemedText style={{ color: textSecondary, fontSize: 12 }}>
                  {new Date(step.time).toLocaleString()}
                </ThemedText>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  }, [order, brandPrimary, textColor, textSecondary]);

  const renderItems = useCallback(() => {
    if (!order?.items?.length) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Items
        </ThemedText>

        {order.items.map((item: any) => (
          <View key={item.id} style={[styles.itemRow, { borderColor: border }]}>
            <ThemedText style={{ color: textColor }}>{item.name}</ThemedText>
            <ThemedText style={{ color: textSecondary }}>
              x{item.quantity}
            </ThemedText>
            <ThemedText style={{ color: textColor }}>
              ₦{item.price.toFixed(2)}
            </ThemedText>
          </View>
        ))}
      </View>
    );
  }, [order, textColor, textSecondary, border]);

  const renderInfo = () => {
    if (!order) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Order Info
        </ThemedText>

        <InfoRow label="Order ID" value={order.id} />
        <InfoRow label="Status" value={order.status} />
        <InfoRow
          label="Total"
          value={`₦${order.total?.toFixed(2) ?? "0.00"}`}
        />
        <InfoRow
          label="Created"
          value={new Date(order.createdAt).toLocaleString()}
        />

        {order.deliveredAt && (
          <InfoRow
            label="Delivered"
            value={new Date(order.deliveredAt).toLocaleString()}
          />
        )}

        {order.eta && <InfoRow label="ETA" value={order.eta} />}
        {order.distance && <InfoRow label="Distance" value={order.distance} />}
      </View>
    );
  };

  const renderStore = () =>
    order?.store ? (
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Store
        </ThemedText>

        <InfoRow label="Name" value={order.store.name} />
        {order.store.phone && (
          <InfoRow label="Phone" value={order.store.phone} />
        )}
        {order.store.location && (
          <InfoRow
            label="Location"
            value={`${order.store.location.lat}, ${order.store.location.lng}`}
          />
        )}
      </View>
    ) : null;

  const renderAddress = () =>
    order?.addressDetails ? (
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Delivery Address
        </ThemedText>

        <ThemedText style={{ color: textColor }}>
          {order.addressDetails.address}
        </ThemedText>
        <ThemedText style={{ color: textSecondary }}>
          {order.addressDetails.city}
        </ThemedText>
      </View>
    ) : null;

  const renderRider = () =>
    order?.rider ? (
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Rider
        </ThemedText>

        <InfoRow label="Name" value={order.rider.name} />
        <InfoRow label="Phone" value={order.rider.phone} />
        <InfoRow label="Vehicle" value={order.rider.vehicle} />
      </View>
    ) : null;

  const renderDispute = () =>
    order?.dispute ? (
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Dispute
        </ThemedText>

        <InfoRow label="Status" value={order.dispute.status} />
        <InfoRow label="ID" value={order.dispute.id} />
      </View>
    ) : null;

  /* ---------------- UI ---------------- */

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <IconSymbol name="chevron.left" size={22} color={brandPrimary} />
        </Pressable>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Order Details
        </ThemedText>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={brandPrimary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText
            style={{ color: brandPrimary, fontWeight: "600", fontSize: 16 }}
          >
            {error}
          </ThemedText>
        </View>
      ) : order ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderInfo()}
          {renderTimeline()}
          {renderItems()}
          {renderStore()}
          {renderAddress()}
          {renderRider()}
          {renderDispute()}
        </ScrollView>
      ) : null}
    </ThemedView>
  );
}

/* ---------------- Small Component ---------------- */

function InfoRow({ label, value }: { label: string; value: string }) {
  const textColor = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <ThemedText style={{ color: textColor }}>
      {label}: <ThemedText style={{ color: textSecondary }}>{value}</ThemedText>
    </ThemedText>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 12,
  },

  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },

  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
});
