import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import { View, Switch, StyleSheet, Pressable, Dimensions, ActivityIndicator } from "react-native";

import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { useRouter } from "expo-router";
import { ConnectionStatusIndicator } from "@/components/ConnectionStatusIndicator";

const { width } = Dimensions.get("window");

export default function FloatingHeader() {
  const router = useRouter();
  const { status, goOnline, goOffline, isOnlineLoading } = useJobs();
  const confirm = useConfirm();

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
        confirmLabel: "Go Online",
        cancelLabel: "Cancel",
      });
      if (ok) goOnline();
    } else {
      const ok = await confirm({
        title: "Go Offline?",
        message:
          "Are you sure you want to go offline and stop receiving orders?",
        confirmLabel: "Go Offline",
        cancelLabel: "Cancel",
        variant: "danger"
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
            {/* Connection indicator */}
            <ConnectionStatusIndicator />
          </View>

          {isOnlineLoading ? (
            <ActivityIndicator
              size="small"
              color={primary}
              style={styles.switchLoader}
            />
          ) : (
            <Switch
              value={isOnline}
              onValueChange={handleToggle}
              trackColor={{ false: statusColor, true: primary }}
              thumbColor="#fff"
              disabled={isOnlineLoading}
            />
          )}
        </View>
      </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  statusText: {
    fontWeight: "600",
    textTransform: "capitalize",
    fontSize: 16,
  },
  switchLoader: {
    width: 51,
    alignItems: "center",
    justifyContent: "center",
  },
});
