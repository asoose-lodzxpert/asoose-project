import React from "react";
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Order } from "@/services/orders.service";

interface Props {
  order: Order;
  tab: "pending" | "active" | "history";
  onAccept?: () => void;
  onDecline?: () => void;
  onPrepare?: () => void;
  onMarkReady?: () => void;
  accepting?: boolean;
  declining?: boolean;
  preparing?: boolean;
  markingReady?: boolean;
}

export const OrderCard: React.FC<Props> = ({
  order,
  tab,
  onAccept,
  onDecline,
  onPrepare,
  onMarkReady,
  accepting = false,
  declining = false,
  preparing = false,
  markingReady = false,
}) => {
  const background = useThemeColor({}, "surfaceCard");
  const primary = useThemeColor({}, "brandPrimary");
  const red = useThemeColor({}, "statusError");
  const grey = useThemeColor({}, "textDisabled");
  const borderColor = useThemeColor({}, "borderDefault");

  const getStatusBadge = () => {
    const statusColors: Record<string, string> = {
      PENDING: useThemeColor({}, "statusPending"),
      CONFIRMED: primary,
      PREPARING: primary,
      READY: useThemeColor({}, "statusSuccess"),
      DELIVERED: useThemeColor({}, "statusSuccess"),
      CANCELLED: grey,
      REJECTED: red,
    };

    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: (statusColors[order.status] || grey) + "20" },
        ]}
      >
        <ThemedText
          style={{
            color: statusColors[order.status] || grey,
            fontSize: 12,
            fontWeight: "600",
          }}
        >
          {order.status}
        </ThemedText>
      </View>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: background }]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {order.user?.image ? (
            <Image source={{ uri: order.user.image }} style={styles.profile} />
          ) : (
            <View style={[styles.profile, { backgroundColor: borderColor }]}>
              <IconSymbol
                name="person.crop.circle.fill"
                size={24}
                color={grey}
              />
            </View>
          )}
          <View style={{ marginLeft: 8 }}>
            <ThemedText type="defaultSemiBold">
              {order.user?.name || ""}
            </ThemedText>
            {order.user?.phone && (
              <ThemedText style={{ color: grey, fontSize: 12 }}>
                {order.user.phone}
              </ThemedText>
            )}
          </View>
        </View>

        {getStatusBadge()}
      </View>

      {/* Items */}
      <View style={[styles.itemsSection, { borderTopColor: borderColor }]}>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemBlock}>
            <View style={styles.itemRow}>
              <ThemedText>
                {item.quantity}x {item.nameSnap}
              </ThemedText>
              <ThemedText style={{ color: grey }}>
                ₦
                {(
                  (Number(item.price) || 0) * (Number(item.quantity) || 0)
                ).toLocaleString()}
              </ThemedText>
            </View>

            {/* 🔹 Minimal modifiers */}
            {item.modifierGroups?.length ? (
              <View style={styles.modifiers}>
                {item.modifierGroups.map((group, idx) => (
                  <ThemedText
                    key={idx}
                    style={styles.modifierText}
                    numberOfLines={2}
                  >
                    • {group.name}:{" "}
                    {group.modifiers.map((m) => m.name).join(", ")}
                  </ThemedText>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {/* Special Instructions */}
      {order.specialInstructions && (
        <View
          style={[
            styles.instructionsSection,
            { backgroundColor: primary + "10", borderColor: primary },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <IconSymbol name="info.circle" size={16} color={primary} />
            <ThemedText
              type="defaultSemiBold"
              style={{ color: primary, fontSize: 12 }}
            >
              Special Instructions
            </ThemedText>
          </View>
          <ThemedText style={{ fontSize: 12, marginTop: 4 }}>
            {order.specialInstructions}
          </ThemedText>
        </View>
      )}

      {/* Total */}
      <View style={styles.totalRow}>
        <ThemedText type="defaultSemiBold">Total</ThemedText>
        <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>
          ₦{(Number(order.total) || 0).toLocaleString()}
        </ThemedText>
      </View>

      {/* Mark as Ready */}
      {order.status === "PREPARING" && (
        <Pressable
          style={[
            styles.fullButton,
            { backgroundColor: primary, opacity: markingReady ? 0.5 : 1 },
          ]}
          onPress={onMarkReady}
          disabled={markingReady}
        >
          {markingReady ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ThemedText style={{ color: "#fff" }}>Mark as Ready</ThemedText>
          )}
        </Pressable>
      )}

      {/* Actions */}
      {tab === "pending" && order.status === "PENDING" && (
        <View style={styles.actions}>
          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: primary,
                opacity: accepting || declining ? 0.5 : 1,
              },
            ]}
            onPress={onAccept}
            disabled={accepting || declining}
          >
            {accepting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={{ color: "#fff" }}>Accept</ThemedText>
            )}
          </Pressable>

          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: red,
                opacity: accepting || declining ? 0.5 : 1,
              },
            ]}
            onPress={onDecline}
            disabled={accepting || declining}
          >
            {declining ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={{ color: "#fff" }}>Decline</ThemedText>
            )}
          </Pressable>
        </View>
      )}

      {tab === "active" && order.status === "CONFIRMED" && (
        <Pressable
          style={[
            styles.fullButton,
            { backgroundColor: primary, opacity: preparing ? 0.5 : 1 },
          ]}
          onPress={onPrepare}
          disabled={preparing}
        >
          {preparing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ThemedText style={{ color: "#fff" }}>Start Preparing</ThemedText>
          )}
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profile: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  itemsSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  itemBlock: {
    gap: 4,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modifiers: {
    paddingLeft: 8,
    gap: 2,
  },
  modifierText: {
    fontSize: 11,
    color: "#6B7280",
  },
  instructionsSection: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  fullButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
});
