import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";

const ONBOARDING_KEY = "asoose_vendor_onboarded";

/**
 * This is the initial route "/" that handles all redirects.
 * It determines where the user should go based on:
 * 1. Onboarding status (Welcome Screen)
 * 2. Authentication status
 * 3. Vendor account status (PENDING, ACTIVE, SUSPENDED, BANNED, etc.)
 */
export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const segments: string[] = useSegments();
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

  // ...existing code...

  // Handle navigation once we have all the info
  useEffect(() => {
    if (!onboardingChecked || authLoading) {
      return; // Still loading, don't navigate yet
    }

    const inAuthGroup = segments[0] === "(auth)";
    const inWelcome = segments[0] === "welcome";
    const inStatusGroup = segments[0] === "(status)";
    const inMainGroup = segments[0] === "(main)";

    // User hasn't seen onboarding
    if (!hasSeenOnboarding && !inWelcome) {
      router.replace("/welcome");
      return;
    }

    // User is not authenticated
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    // User is authenticated - check vendor status and route accordingly
    if (user) {
      const status = user.status?.trim().toUpperCase() ?? "";

      // Determine current route group
      const currentRouteGroup =
        segments[0] === "(status)"
          ? "(status)"
          : segments[0] === "(main)"
            ? "(main)"
            : null;

      // Check if we're in the wrong group or at root
      const shouldRedirect =
        segments.length === 0 || // At root
        inAuthGroup; // In auth when should be authenticated

      if (shouldRedirect) {
        // Route based on vendor status
        switch (status) {
          case "PENDING":
            router.replace("/(status)/pending");
            break;
          case "SUSPENDED":
            router.replace("/(status)/suspended");
            break;
          case "CLOSED_PERMANENTLY":
            router.replace("/(status)/closed-permanently");
            break;
          case "BANNED":
            router.replace("/(status)/banned");
            break;
          case "ACTIVE":
            router.replace("/(main)");
            break;
          default:
            router.replace("/(auth)/login");
            break;
        }
        return;
      }

      // Also redirect if status changed (e.g., was active, now suspended)
      if (status === "ACTIVE" && !inMainGroup) {
        router.replace("/(main)");
        return;
      }

      if (status !== "ACTIVE" && !inStatusGroup) {
        // Non-active vendor but not in status pages
        switch (status) {
          case "PENDING":
            router.replace("/(status)/pending");
            break;
          case "SUSPENDED":
            router.replace("/(status)/suspended");
            break;
          case "CLOSED_PERMANENTLY":
            router.replace("/(status)/closed-permanently");
            break;
          case "BANNED":
            router.replace("/(status)/banned");
            break;
          default:
            router.replace("/(auth)/login");
            break;
        }
        return;
      }
    }
  }, [
    user,
    segments,
    onboardingChecked,
    authLoading,
    hasSeenOnboarding,
    router,
  ]);

  // Show loading screen while checking state
  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/images/icon.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#E5A503" style={styles.spinner} />
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
