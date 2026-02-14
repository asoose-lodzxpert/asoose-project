import React, { useEffect, useState } from "react";
import { StyleSheet, View, Image } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { JobsProvider } from "@/context/JobContext";

const ONBOARDING_KEY = "asoose_rider_onboarded";

function RootNavigator() {
  const { user, initialLoading } = useAuth();
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
  if (initialLoading || showWelcome === null) {
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

  // 1. Onboarding Flow
  if (showWelcome) {
    // Inline import to avoid circular dependency
    const WelcomeScreen = require("./welcome").default;
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

  // 3. Authenticated Flow
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(earnings)" />
      <Stack.Screen name="(profile)" />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}

function AuthDependentProviders({ children }: { children: React.ReactNode }) {
  return <JobsProvider>{children}</JobsProvider>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AuthDependentProviders>
          <RootNavigator />
        </AuthDependentProviders>
      </AuthProvider>
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
