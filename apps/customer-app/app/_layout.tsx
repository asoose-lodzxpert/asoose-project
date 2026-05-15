import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";

// Providers & Context
import ConfirmProvider from "@/components/ui/ConfirmDialogProvider";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { HomeProvider } from "@/context/HomeContext";
import { LocationProvider } from "@/context/LocationContext";
import { RideProvider } from "@/context/RideContext";
import { SendPackageProvider } from "@/context/SendPackageContext";
import { NotificationProvider } from "@/context/PushNotificationContext";
import { NotificationPreferencesProvider } from "@/context/NotificationPreferencesContext";
import { toastConfig } from "@/components/ui/ThemedToast";
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

      {/* Onboarding screen */}
      <Stack.Screen name="onboarding" />

      {/* Auth screens */}
      <Stack.Screen name="(auth)" />

      {/* Main app screens */}
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(store)" />
      <Stack.Screen name="(settings)" />

      {/* Other screens */}
      <Stack.Screen name="cart" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="discover" />
      <Stack.Screen name="enable-location" />
      <Stack.Screen name="search" />
      <Stack.Screen name="category/[id]" />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}

function AuthDependentProviders({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <NotificationProvider>
      <NotificationPreferencesProvider>
        <CartProvider userId={user?.id}>
          <HomeProvider>
            <RideProvider>
              <SendPackageProvider>{children}</SendPackageProvider>
            </RideProvider>
          </HomeProvider>
        </CartProvider>
      </NotificationPreferencesProvider>
    </NotificationProvider>
  );
}

export default function RootLayout() {
  // Fetch service bounds from the backend once on startup.
  // Falls back to hardcoded Maiduguri bounds if offline.
  useEffect(() => {
    loadServiceBounds();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConfirmProvider>
        <AuthProvider>
          <LocationProvider>
            <AuthDependentProviders>
              <RootNavigator />
              <AppUpdateGuard />
              <Toast config={toastConfig} />
            </AuthDependentProviders>
          </LocationProvider>
        </AuthProvider>
      </ConfirmProvider>
    </GestureHandlerRootView>
  );
}
