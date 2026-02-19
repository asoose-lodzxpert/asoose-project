import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  NotificationCountProvider,
  useNotificationCount,
} from "@/context/NotificationCountContext";

import { View, Text, StyleSheet } from "react-native";

function NotificationsTabIcon({ color }: { color: string }) {
  const count = useNotificationCount();
  return (
    <View style={{ position: "relative" }}>
      <IconSymbol size={28} name="bell" color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];

  return (
    <NotificationCountProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: themeColors.tint,
          tabBarInactiveTintColor: themeColors.textSecondary,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: themeColors.surfaceBackground,
            borderTopColor: themeColors.borderDefault,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="home" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ride"
          options={{
            title: "Ride",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="car.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="delivery"
          options={{
            title: "Delivery",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="box.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: "Notifications",
            tabBarIcon: NotificationsTabIcon,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="gearshape.fill" color={color} />
            ),
          }}
        />
      </Tabs>
    </NotificationCountProvider>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    paddingHorizontal: 3,
  },
});
