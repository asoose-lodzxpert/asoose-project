import React from "react";
import { StyleSheet, View, Pressable, Dimensions, Switch } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useDelivery } from "@/context/DeliveryContext";

import { useRouter } from "expo-router";
import { useConfirm } from "@/hooks/use-confirm";

const { width } = Dimensions.get("window");

export default function FloatingHeader() {
  const router = useRouter();
  const { status, goOnline, goOffline } = useDelivery();
  const { confirm, ConfirmModal } = useConfirm();

  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const primary = useThemeColor({}, "brandPrimary");
  const isOnline = status !== "offline";
  const statusColor = useThemeColor(
    {},
    isOnline ? "statusSuccess" : "statusError",
  );

  const handleToggle = async (value: boolean) => {
    if (value) {
      const ok = await confirm({
        title: "Go Online?",
        message:
          "Are you sure you want to go online and start receiving orders?",
        confirmText: "Go Online",
        cancelText: "Cancel",
        type: "info",
      });
      if (ok) goOnline();
    } else {
      const ok = await confirm({
        title: "Go Offline?",
        message:
          "Are you sure you want to go offline and stop receiving orders?",
        confirmText: "Go Offline",
        cancelText: "Cancel",
        type: "warning",
      });
      if (ok) goOffline();
    }
  };

  const handleProfilePress = () => {
    router.push("/(profile)/profile");
  };

  return (
    <>
      <View style={styles.wrapper} pointerEvents="box-none">
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <Pressable onPress={handleProfilePress} hitSlop={10}>
            <IconSymbol name="person.circle" size={28} color={primary} />
          </Pressable>

          {/* Centered status text */}
          <View style={styles.statusContainer}>
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {status.replace("-", " ")}
            </ThemedText>
          </View>

          <Switch
            value={isOnline}
            onValueChange={handleToggle}
            trackColor={{ false: statusColor, true: primary }}
            thumbColor="#fff"
          />
        </View>
      </View>
      <ConfirmModal />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 40,
    width: "100%",
    alignItems: "center",
  },
  card: {
    width: width - 32,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    justifyContent: "space-between",
  },
  statusContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  statusText: {
    fontWeight: "600",
    textTransform: "capitalize",
    fontSize: 16,
  },
});
