import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

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
import WelcomeScreen from "./onboarding";

const ONBOARDING_KEY = "asoose_customer_onboarded";
const AUTH_GROUPS = ["(auth)"];

/**
 * 1. Simple Loading Component
 */
const LoadingSplash = () => (
  <View style={styles.loadingContainer}>
    <Image
      source={require("@/assets/images/icon.png")}
      style={styles.logo}
      resizeMode="contain"
    />
  </View>
);

/**
 * 2. Navigation Logic
 * Handles guards, onboarding, and routing
 */
function RootNavigator() {
  const { user, loading: authLoading } = useAuth();
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // Onboarding check
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        setShowWelcome(seen !== "true");
      } catch (e) {
        setShowWelcome(false);
      }
    };
    checkOnboarding();
  }, []);

  // Centralized route guard
  useEffect(() => {
    if (authLoading || showWelcome === null) return;

    const inAuthGroup = AUTH_GROUPS.includes(segments[0]);

    if (showWelcome) {
      // If we need to show welcome, we stay put;
      // the conditional return below handles the UI.
      return;
    }

    if (!user && !inAuthGroup) {
      // Not logged in -> Redirect to Login
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      // Logged in but trying to access Login/Signup -> Redirect to Home
      router.replace("/(tabs)/home");
    }
  }, [user, authLoading, showWelcome, segments]);

  if (authLoading || showWelcome === null) return <LoadingSplash />;

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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(store)" />
      <Stack.Screen name="(settings)" />
      <Stack.Screen name="(delivery)" />
      <Stack.Screen name="(ride)" />
      <Stack.Screen name="(notifications)" />
    </Stack>
  );
}

/**
 * 3. Inner Provider Wrapper
 * This allows providers like CartProvider to access the Auth context safely
 */
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
 * 4. Main Entry Point
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <LocationProvider>
        <ConfirmProvider>
          <ToastProvider>
            <AuthDependentProviders>
              <RootNavigator />
              <ThemedToastProvider />
            </AuthDependentProviders>
          </ToastProvider>
        </ConfirmProvider>
      </LocationProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff", // Match your app theme
  },
  logo: {
    width: 120,
    height: 120,
  },
});
