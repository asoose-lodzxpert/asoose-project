import { Stack } from "expo-router";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Providers & Context
import ConfirmProvider from "@/components/ui/ConfirmDialogProvider";
import ThemedToastProvider from "@/components/ui/ThemedToast";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { HomeProvider } from "@/context/HomeContext";
import { LocationProvider } from "@/context/LocationContext";
import { RideProvider } from "@/context/RideContext";
import { SendPackageProvider } from "@/context/SendPackageContext";

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
    <CartProvider userId={user?.id}>
      <HomeProvider>
        <RideProvider>
          <SendPackageProvider>{children}</SendPackageProvider>
        </RideProvider>
      </HomeProvider>
    </CartProvider>
  );
}

/**
 * Root Layout - sets up all providers and renders the navigator.
 * No conditional logic here - all routes are registered for production builds.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConfirmProvider>
        <ToastProvider>
          <AuthProvider>
            <LocationProvider>
              <AuthDependentProviders>
                <RootNavigator />
                <ThemedToastProvider />
              </AuthDependentProviders>
            </LocationProvider>
          </AuthProvider>
        </ToastProvider>
      </ConfirmProvider>
    </GestureHandlerRootView>
  );
}
