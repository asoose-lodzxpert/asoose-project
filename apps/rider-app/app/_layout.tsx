import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { JobsProvider } from "@/context/JobContext";

const ONBOARDING_KEY = "asoose_rider_onboarded";

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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" />
      </Stack>
    );
  }

  if (!user) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
      </Stack>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

function AuthDependentProviders({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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
