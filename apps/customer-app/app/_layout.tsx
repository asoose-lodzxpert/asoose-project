import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import * as Location from "expo-location";

// Context Imports
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ConfirmProvider from "@/components/ui/ConfirmDialogProvider";
import { LocationProvider } from "@/context/LocationContext";
import { CartProvider } from "@/context/CartContext";
import { SendPackageProvider } from "@/context/SendPackageContext";
import ThemedToastProvider from "@/components/ui/ThemedToast";
import { HomeProvider } from "@/context/HomeContext";
import { ToastProvider } from "@/components/ui/toast";
import { RideProvider } from "@/context/RideContext";

/* ---------------------------------- */
/* Helper: App Providers Wrapper      */
/* ---------------------------------- */
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useRouter, useSegments } from "expo-router";
import { Stack } from "expo-router";

// Combining providers here cleans up the RootLayout significantly
function AppProviders({ children }: { children: React.ReactNode }) {
  return (
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
}

/* ---------------------------------- */
/* Root Navigator                     */
/* ---------------------------------- */
function RootNavigator() {
  const { user, loading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [isReady, setIsReady] = useState(false);
  const [hasLaunched, setHasLaunched] = useState<boolean | null>(null);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);

  // 1. Check First Launch
  useEffect(() => {
    async function prepare() {
      try {
        const value = await AsyncStorage.getItem("hasLaunched");
        if (!value) {
          await AsyncStorage.setItem("hasLaunched", "true");
          setHasLaunched(false);
        } else {
          setHasLaunched(true);
        }
      } catch {
        setHasLaunched(true);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  // 2. Check Location (Only if logged in)
  useEffect(() => {
    if (!user) return;

    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationGranted(status === Location.PermissionStatus.GRANTED);
    })();
  }, [user]);

  // 3. PROTECTION LAYER: Handle Redirections
  useEffect(() => {
    // Wait until basic checks are done and auth is loaded
    if (!isReady || authLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";
    const inOnboarding = segments[0] === "onboarding";

    // A. User hasn't launched app before -> Onboarding
    if (hasLaunched === false && !inOnboarding) {
      router.replace("/onboarding");
      return;
    }

    // B. User is NOT logged in -> Go to Auth (unless already there or correctly in onboarding)
    if (hasLaunched === true && !user && !inAuthGroup) {
      router.replace("/(auth)/login"); // Or your login route
      return;
    }

    // C. User IS logged in logic
    if (user) {
      // If location not granted yet, go to enable location
      if (locationGranted === false) {
        router.replace("/enable-location");
        return;
      }

      // If everything is good, but we are in auth or onboarding -> Go Home
      if (inAuthGroup || inOnboarding) {
        router.replace("/(tabs)/home");
      }
    }
  }, [user, hasLaunched, locationGranted, isReady, authLoading, segments]);

  /* ---------- Loading State ---------- */
  if (!isReady || authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /* ---------- Navigation ---------- */
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Note: We no longer need initialRouteName logic here.
           The useEffect above handles the routing enforcement.
           Just list the screens.
        */}
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="enable-location" />
        <Stack.Screen name="(tabs)" />

        <Stack.Screen
          name="(delivery)/location-picker"
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
/* Root Layout                        */
/* ---------------------------------- */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <RootNavigator />
      </AppProviders>
    </SafeAreaProvider>
  );
}
