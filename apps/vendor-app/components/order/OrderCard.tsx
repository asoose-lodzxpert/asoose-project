import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Order, OrderTab } from "@/types/order";
import { useCountdown } from "@/hooks/useCountdown";

interface Props {
  order: Order;
  tab: OrderTab;
  onAccept?: () => void;
  onDecline?: () => void;
  onPrepare?: () => void;
  onDeliver?: () => void;
}

export const OrderCard: React.FC<Props> = ({
  order,
  tab,
  onAccept,
  onDecline,
  onPrepare,
  onDeliver,
}) => {
  const background = useThemeColor({}, "surfaceCard");
  const primary = useThemeColor({}, "brandPrimary");
  const red = useThemeColor({}, "statusError");
  const green = useThemeColor({}, "statusSuccess");
  const grey = useThemeColor({}, "textDisabled");

  const countdown = useCountdown(order.deadline);

  return (
    <View style={[styles.card, { backgroundColor: background }]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image
            source={{ uri: order.customerProfile }}
            style={styles.profile}
          />
          <ThemedText style={{ marginLeft: 8 }}>
            {order.customerName}
          </ThemedText>
        </View>

        {tab !== "completed" && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {order.countdown && (
              <ThemedText style={{ color: primary }}>{countdown}</ThemedText>
            )}
            <IconSymbol name="chat" size={20} color={grey} />
          </View>
        )}
      </View>

      {/* Items and total */}
      <View style={styles.middleRow}>
        <View>
          {order.items.map((item) => (
            <ThemedText key={item.id}>
              {item.quantity}x {item.name}
            </ThemedText>
          ))}
        </View>
        <ThemedText style={{ fontWeight: "bold" }}>
          ₦{order.total.toLocaleString()}
        </ThemedText>
      </View>

      {/* Actions */}
      {tab === "pending" && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, { backgroundColor: primary }]}
            onPress={onAccept}
          >
            <ThemedText style={{ color: "#fff" }}>Accept</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.button, { backgroundColor: red }]}
            onPress={onDecline}
          >
            <ThemedText style={{ color: "#fff" }}>Decline</ThemedText>
          </Pressable>
        </View>
      )}

      {tab === "active" && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, { backgroundColor: primary }]}
            onPress={onPrepare}
          >
            <ThemedText style={{ color: "#fff" }}>Mark as Prepared</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.button, { backgroundColor: green }]}
            onPress={onDeliver}
          >
            <ThemedText style={{ color: "#fff" }}>Mark as Delivered</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  middleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  profile: { width: 40, height: 40, borderRadius: 20 },
  actions: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
});
