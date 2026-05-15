import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";

// Components & Context
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toastConfig } from "@/components/ThemedToast";
import ConfirmProvider from "@/components/ui/ConfirmDialogProvider";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { NotificationPreferencesProvider } from "@/context/NotificationPreferencesContext";
import { BalanceProvider } from "@/context/BalanceContext";
import { loadServiceBounds } from "@/constants/service-bounds";
import { AppUpdateGuard } from "@/components/common/AppUpdateGuard";

/**
 * RootNavigator now ALWAYS renders all routes.
 * This ensures the route manifest is properly generated in production builds.
 * Navigation/redirect logic is handled in app/index.tsx instead.
 */
function RootNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Index route handles initial redirects */}
      <Stack.Screen name="index" />

      {/* Welcome/Onboarding screen */}
      <Stack.Screen name="welcome" />

      {/* Auth screens */}
      <Stack.Screen name="(auth)" />

      {/* Status screens (for pending, suspended, banned vendors) */}
      <Stack.Screen name="(status)" />

      {/* Main app screens (for active vendors) */}
      <Stack.Screen name="(main)" />
      <Stack.Screen name="(menu)" />
      <Stack.Screen name="(profile)" />

      {/* Modal screens */}
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}

/**
 * RootLayout handles top-level providers
 */
export default function RootLayout() {
  // Fetch service bounds from backend once at startup
  useEffect(() => {
    loadServiceBounds();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConfirmProvider>
        <ErrorBoundary>
          <AuthProvider>
            <BalanceProvider>
              <NotificationProvider>
                <NotificationPreferencesProvider>
                  <RootNavigator />
                  <AppUpdateGuard />
                  <Toast config={toastConfig} />
                </NotificationPreferencesProvider>
              </NotificationProvider>
            </BalanceProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ConfirmProvider>
    </GestureHandlerRootView>
  );
}
