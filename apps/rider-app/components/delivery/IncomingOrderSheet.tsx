import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useDelivery } from "@/context/DeliveryContext";

const AUTO_DECLINE_TIMEOUT = 90;

export default function IncomingOrderSheet() {
  const { incomingOrder, acceptOrder, declineOrder } = useDelivery();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const danger = useThemeColor({}, "statusError");

  const [timer, setTimer] = useState(AUTO_DECLINE_TIMEOUT);
  const [loadingAccept, setLoadingAccept] = useState(false);

  useEffect(() => {
    if (!incomingOrder) return;

    setTimer(AUTO_DECLINE_TIMEOUT);

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          declineOrder();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [incomingOrder]);

  if (!incomingOrder) return null;

  const handleAccept = async () => {
    setLoadingAccept(true);
    try {
      await acceptOrder(incomingOrder.id);
    } catch (error) {
      setLoadingAccept(false);
    }
  };

  const handleDecline = async () => {
    await declineOrder();
  };

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder} />

      <View style={[styles.sheet, { backgroundColor: surface }]}>
        <View style={styles.newDeliveryBadge}>
          <ThemedText style={{ color: primary, fontWeight: "600" }}>
            NEW DELIVERY
          </ThemedText>
          <View style={styles.timerBadge}>
            <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
              {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
            </ThemedText>
          </View>
        </View>

        <View style={styles.vendorRow}>
          <IconSymbol name="pizza" size={32} color={primary} />
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold">
              {incomingOrder.vendorName}
            </ThemedText>
            <ThemedText style={{ color: "#666" }}>
              Restaurant • {incomingOrder.distanceToVendor} mi away
            </ThemedText>
          </View>
        </View>

        <View style={styles.addressRow}>
          <View style={styles.iconCircle}>
            <IconSymbol name="p.square" size={18} color="#fff" />
          </View>
          <ThemedText>Pickup: {incomingOrder.vendorAddress}</ThemedText>
        </View>

        <View style={styles.addressRow}>
          <View style={[styles.iconCircle, { backgroundColor: "#EF4444" }]}>
            <IconSymbol name="d.square" size={18} color="#fff" />
          </View>
          <ThemedText>Drop-off: {incomingOrder.customerAddress}</ThemedText>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <IconSymbol name="clock" size={18} color="#666" />
            <ThemedText>~{incomingOrder.estimatedTime} min</ThemedText>
          </View>
          <View style={styles.infoItem}>
            <IconSymbol name="arrow.right.circle" size={18} color="#666" />
            <ThemedText>{incomingOrder.totalDistance} mi</ThemedText>
          </View>
          <ThemedText type="title" style={{ color: primary }}>
            ₦{incomingOrder.earnings.toFixed(2)}
          </ThemedText>
        </View>

        {incomingOrder.note && (
          <View style={styles.noteBanner}>
            <IconSymbol name="info" size={16} color={primary} />
            <ThemedText style={{ fontSize: 14, color: primary }}>
              {incomingOrder.note}
            </ThemedText>
          </View>
        )}

        <ThemedText style={{ color: "#666", marginBottom: 16 }}>
          {incomingOrder.items}
        </ThemedText>

        <View style={styles.actionButtons}>
          <Pressable style={styles.declineBtn} onPress={handleDecline}>
            <ThemedText style={{ color: danger, fontWeight: "600" }}>
              DECLINE
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.acceptBtn, { backgroundColor: primary }]}
            onPress={handleAccept}
          >
            {loadingAccept ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={{ color: "#fff", fontWeight: "700" }}>
                ACCEPT
              </ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapPlaceholder: { flex: 1, backgroundColor: "#E5E7EB" },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    gap: 16,
  },
  newDeliveryBadge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timerBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
  },
  vendorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  noteBanner: {
    flexDirection: "row",
    backgroundColor: "#FFF7ED",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtons: { flexDirection: "row", gap: 12 },
  declineBtn: {
    flex: 1,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 12,
    alignItems: "center",
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
});
