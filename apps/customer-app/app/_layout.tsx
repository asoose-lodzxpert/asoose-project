import React, { useEffect, useState } from "react";
import { StyleSheet, View, Image } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

function RootNavigator() {
  const { user, loading: authLoading } = useAuth();
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);

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

  if (authLoading || showWelcome === null) {
    return (
      <View style={styles.loadingContainer}>
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

  if (!user) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
      </Stack>
    );
  }

  // You can add account status logic here if needed, similar to vendor app
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(store)" />
      <Stack.Screen name="(settings)" />
      <Stack.Screen name="(delivery)" />
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

export default function RootLayout() {
  const [permissionsReady, setPermissionsReady] = useState(true); // No permissions logic for now

  if (!permissionsReady) {
    return (
      <View style={styles.loadingContainer}>
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
});
