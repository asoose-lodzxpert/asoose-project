import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";

const ONBOARDING_KEY = "asoose_rider_onboarded";

/**
 * This is the initial route "/" that handles all redirects.
 * It determines where the user should go based on:
 * 1. Onboarding/welcome status
 * 2. Authentication status
 */
export default function Index() {
  const { user, initialLoading } = useAuth();
  const segments: string[] = useSegments();
  const router = useRouter();

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasSeenWelcome(seen === "true");
      } catch (e) {
        setHasSeenWelcome(false); // Show welcome on error
      } finally {
        setOnboardingChecked(true);
      }
    };
    checkOnboarding();
  }, []);

  // Handle navigation once we have all the info
  useEffect(() => {
    if (!onboardingChecked || initialLoading) {
      return; // Still loading, don't navigate yet
    }

    const inAuthGroup = segments[0] === "(auth)";
    const inWelcome = segments[0] === "welcome";
    const inTabs = segments[0] === "(tabs)";

    // User hasn't seen welcome screen AND is not authenticated
    if (!hasSeenWelcome && !inWelcome && !user) {
      router.replace("/welcome");
      return;
    }

    // User is not authenticated (has seen welcome per previous check)
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/signin");
      return;
    }

    // User is authenticated - go to tabs
    if (user && (inAuthGroup || inWelcome || segments.length === 0)) {
      router.replace("/(tabs)");
      return;
    }
  }, [user, segments, onboardingChecked, initialLoading, hasSeenWelcome]);

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
