// components/notification/NotificationCard.tsx
import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Notification } from "@/types/notification";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";

interface Props {
  notification: Notification;
}

export const NotificationCard: React.FC<Props> = ({ notification }) => {
  const background = useThemeColor({}, "surfaceCard");
  const mutedText = useThemeColor({}, "textDisabled");
  const primary = useThemeColor({}, "brandPrimary");
  const grey = useThemeColor({}, "borderDefault");

  // Map type to icon
  const typeIconMap: Record<string, IconSymbolName> = {
    orders: "list",
    payouts: "dollar-sign",
    system: "info",
  };

  return (
    <View
      style={[styles.card, { backgroundColor: background, borderColor: grey }]}
    >
      <View style={styles.topRow}>
        <View style={styles.iconWrapper}>
          <IconSymbol
            name={typeIconMap[notification.type]}
            size={20}
            color={primary}
          />
        </View>
        <ThemedText type="defaultSemiBold" style={{ flex: 1, marginLeft: 8 }}>
          {notification.title}
        </ThemedText>
        <ThemedText type="caption" style={{ color: mutedText }}>
          {notification.timestamp}
        </ThemedText>
      </View>

      <ThemedText style={{ color: mutedText, marginVertical: 4 }}>
        {notification.summary}
      </ThemedText>

      {notification.actionLabel && notification.actionCallback && (
        <Pressable onPress={notification.actionCallback}>
          <ThemedText type="defaultSemiBold" style={{ color: primary }}>
            {notification.actionLabel}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
  },
});
