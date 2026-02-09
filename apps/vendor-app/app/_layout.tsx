import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

// Components & Context
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toastConfig } from "@/components/ThemedToast";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { NotificationPreferencesProvider } from "@/context/NotificationPreferencesContext";
import WelcomeScreen from "./welcome";

// Utils
import {
  checkStartupPermissions,
  requestStartupPermissions,
} from "@/utils/permissions";

const ONBOARDING_KEY = "asoose_vendor_onboarded";

/**
 * RootNavigator handles the conditional rendering of screens based on:
 * 1. Onboarding status (Welcome Screen)
 * 2. Authentication status
 * 3. Account status (Pending, Active, Banned, etc.)
 */
function RootNavigator() {
  const { user, loading: authLoading } = useAuth();
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);

  // Check if user has completed onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        setShowWelcome(seen !== "true");
      } catch (e) {
        setShowWelcome(false); // Fallback to app if storage fails
      }
    };
    checkOnboarding();
  }, []);

  // Prevent flicker: Wait for both Auth and Onboarding checks
  if (authLoading || showWelcome === null) {
    return (
      <View style={styles.loadingContainer}>
        {/* App Logo as loading screen */}
        <View>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  }

  // 1. Onboarding Flow
  if (showWelcome) {
    return (
      <WelcomeScreen
        onDone={async () => {
          await AsyncStorage.setItem(ONBOARDING_KEY, "true");
          setShowWelcome(false);
        }}
      />
    );
  }

  // 2. Unauthenticated Flow
  if (!user) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
      </Stack>
    );
  }

  // 3. Authenticated & Account Status Flow
  const status = user.status?.trim().toUpperCase() ?? "";

  // Mapping statuses to their respective route groups
  const statusRoutes: Record<string, string> = {
    PENDING: "(status)/pending",
    SUSPENDED: "(status)/suspended",
    CLOSED_PERMANENTLY: "(status)/closed-permanently",
    BANNED: "(status)/banned",
    ACTIVE: "(main)",
  };

  const currentRoute = statusRoutes[status] || "(auth)";

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name={currentRoute} />
    </Stack>
  );
}

/**
 * RootLayout handles top-level providers and app-wide initialization (Permissions)
 */
export default function RootLayout() {
  const [permissionsReady, setPermissionsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initPermissions = async () => {
      try {
        await requestStartupPermissions();
        await checkStartupPermissions();
      } catch (e) {
        if (__DEV__) console.warn("Startup permission check failed:", e);
      } finally {
        if (isMounted) setPermissionsReady(true);
      }
    };

    initPermissions();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!permissionsReady) {
    return (
      <View style={styles.loadingContainer}>
        {/* App Logo as loading screen */}
        <View>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <NotificationProvider>
            <NotificationPreferencesProvider>
              <RootNavigator />
              <Toast config={toastConfig} />
            </NotificationPreferencesProvider>
          </NotificationProvider>
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

import { Image } from "react-native";
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: 32,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E5A503",
  },
});
