import { Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import * as Location from "expo-location";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import ConfirmProvider from "@/components/ui/ConfirmDialogProvider";
import Toast from "react-native-toast-message";
import { LocationProvider } from "@/context/LocationContext";
import { CartProvider } from "@/context/CartContext";
import { SendPackageProvider } from "@/context/SendPackageContext";
import { ToastProvider } from "@/components/ui/toast";

/* ---------------------------------- */
/* Root Navigator */
/* ---------------------------------- */
function RootNavigator() {
  const { user, loading } = useAuth();

  const [hasLaunched, setHasLaunched] = useState<boolean | null>(null);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);

  /* ---------------------------------- */
  /* Check first launch */
  /* ---------------------------------- */
  useEffect(() => {
    async function checkFirstLaunch() {
      const value = await AsyncStorage.getItem("hasLaunched");
      if (!value) {
        await AsyncStorage.setItem("hasLaunched", "true");
        setHasLaunched(false);
      } else {
        setHasLaunched(true);
      }
    }

    checkFirstLaunch();
  }, []);

  /* ---------------------------------- */
  /* Check location permission (only if logged in) */
  /* ---------------------------------- */
  useEffect(() => {
    async function checkLocationPermission() {
      if (!user) {
        setLocationGranted(null);
        return;
      }

      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationGranted(status === Location.PermissionStatus.GRANTED);
    }

    checkLocationPermission();
  }, [user]);

  /* ---------------------------------- */
  /* Loading */
  /* ---------------------------------- */
  if (loading || hasLaunched === null || (user && locationGranted === null)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  /* ---------------------------------- */
  /* Navigation */
  /* ---------------------------------- */
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {!hasLaunched && <Stack.Screen name="onboarding" />}

        {hasLaunched && !user && <Stack.Screen name="(auth)" />}

        {hasLaunched && user && !locationGranted && (
          <Stack.Screen name="enable-location" />
        )}

        {hasLaunched && user && locationGranted && (
          <Stack.Screen name="(tabs)" />
        )}

        {/* Global modal routes (appear above tabs) */}
        <Stack.Screen
          name="location-picker"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

/* ---------------------------------- */
/* Root Layout */
/* ---------------------------------- */
export default function RootLayout() {
  return (
    <ToastProvider>
      <AuthProvider>
        <LocationProvider>
          <ConfirmProvider>
            <CartProvider>
              <SendPackageProvider>
                <RootNavigator />
                <Toast />
              </SendPackageProvider>
            </CartProvider>
          </ConfirmProvider>
        </LocationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
