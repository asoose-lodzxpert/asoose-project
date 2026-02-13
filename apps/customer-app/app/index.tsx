import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";

const ONBOARDING_KEY = "asoose_customer_onboarded";

/**
 * This is the initial route "/" that handles all redirects.
 * It determines where the user should go based on:
 * 1. Onboarding status
 * 2. Authentication status
 */
export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasSeenOnboarding(seen === "true");
      } catch (e) {
        setHasSeenOnboarding(true); // Default to true on error
      } finally {
        setOnboardingChecked(true);
      }
    };
    checkOnboarding();
  }, []);

  // Handle navigation once we have all the info
  useEffect(() => {
    if (!onboardingChecked || authLoading) {
      return; // Still loading, don't navigate yet
    }

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    // User hasn't seen onboarding
    if (!hasSeenOnboarding && !inOnboarding) {
      router.replace("/onboarding");
      return;
    }

    // User is not authenticated
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    // User is authenticated
    if (user && (inAuthGroup || segments.length === 0)) {
      router.replace("/(tabs)/home");
      return;
    }
  }, [user, segments, onboardingChecked, authLoading, hasSeenOnboarding]);

  // Show loading screen while checking state
  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/images/icon.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  spinner: {
    marginTop: 16,
  },
});
