// app/_layout.tsx
import React, { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Redirect, RelativePathString, Stack } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

// ── Providers ──────────────────────────────────────────────────
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ConfirmProvider from "@/components/ui/ConfirmDialogProvider";
import { LocationProvider } from "@/context/LocationContext";
import { CartProvider } from "@/context/CartContext";
import { SendPackageProvider } from "@/context/SendPackageContext";
import ThemedToastProvider from "@/components/ui/ThemedToast";
import { HomeProvider } from "@/context/HomeContext";
import { ToastProvider } from "@/components/ui/toast";
import { RideProvider } from "@/context/RideContext";

SplashScreen.preventAutoHideAsync();

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <LocationProvider>
      <ConfirmProvider>
        <CartProvider>
          <HomeProvider>
            <RideProvider>
              <SendPackageProvider>
                <ToastProvider>
                  {children}
                  <ThemedToastProvider />
                </ToastProvider>
              </SendPackageProvider>
            </RideProvider>
          </HomeProvider>
        </CartProvider>
      </ConfirmProvider>
    </LocationProvider>
  </AuthProvider>
);

function AuthAwareNavigator() {
  const { user, loading: authLoading } = useAuth(); // ← SAFE here: inside AuthProvider

  const [ready, setReady] = useState(false);
  const [initialPath, setInitialPath] = useState<string | null>(null);

  useEffect(() => {
    async function decide() {
      if (authLoading) return;

      try {
        const [launchStr, perm] = await Promise.all([
          AsyncStorage.getItem("hasLaunched"),
          Location.getForegroundPermissionsAsync(),
        ]);

        const hasLaunched = launchStr !== null;
        const locGranted = perm.status === "granted";

        if (!hasLaunched) {
          setInitialPath("/onboarding");
        } else if (!user) {
          setInitialPath("/(auth)/login");
        } else if (!locGranted) {
          setInitialPath("/enable-location");
        } else {
          setInitialPath("/(tabs)/home");
        }
      } catch (err) {
        console.warn("Init failed:", err);
        setInitialPath("/(tabs)/home");
      } finally {
        setReady(true);
      }
    }

    decide();
  }, [authLoading, user]);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(console.warn);
    }
  }, [ready]);

  if (!ready || authLoading || initialPath === null) {
    return null; // Splash stays
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="enable-location" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
      </Stack>

      <Redirect href={initialPath as RelativePathString} />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <AuthAwareNavigator />
      </AppProviders>
    </SafeAreaProvider>
  );
}
