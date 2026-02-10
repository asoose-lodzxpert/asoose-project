// app/_layout.tsx
import { StyleSheet, View, Image } from "react-native";
import { Stack } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LocationProvider } from "@/context/LocationContext";
import { CartProvider } from "@/context/CartContext";
import { SendPackageProvider } from "@/context/SendPackageContext";
import { HomeProvider } from "@/context/HomeContext";
import { RideProvider } from "@/context/RideContext";
import { ToastProvider } from "@/components/ui/toast";
import ConfirmProvider from "@/components/ui/ConfirmDialogProvider";
import ThemedToastProvider from "@/components/ui/ThemedToast";
import WelcomeScreen from "./onboarding";
import { useEffect, useState } from "react";

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
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
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

  // Add account status logic if needed
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <LocationProvider>
        <ConfirmProvider>
          <CartProvider>
            <HomeProvider>
              <RideProvider>
                <SendPackageProvider>
                  <ToastProvider>
                    <RootNavigator />
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
