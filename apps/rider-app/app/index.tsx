import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/context/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";

const ONBOARDING_KEY = "asoose_rider_onboarded";

export default function Index() {
  const { user, initialLoading } = useAuth();
  const segments: string[] = useSegments();
  const router = useRouter();
  const primaryColor = useThemeColor({}, "brandPrimary");

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasSeenWelcome(seen === "true");
      } catch {
        setHasSeenWelcome(false);
      } finally {
        setOnboardingChecked(true);
      }
    };
    checkOnboarding();
  }, []);

  // Handle navigation once we have all the info
  useEffect(() => {
    if (!onboardingChecked || initialLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inWelcome = segments[0] === "welcome";
    const inStatusGroup = segments[0] === "(status)";
    const inTabs = segments[0] === "(tabs)";

    if (!hasSeenWelcome && !inWelcome && !user) {
      router.replace("/welcome");
      return;
    }

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/signin");
      return;
    }

    if (user) {
      const status = user.status?.trim().toUpperCase() ?? "";
      const shouldRedirect = segments.length === 0 || inAuthGroup;

      if (shouldRedirect) {
        switch (status) {
          case "PENDING":
            router.replace("/(status)/pending");
            break;
          case "SUSPENDED":
            router.replace("/(status)/suspended");
            break;
          case "BANNED":
            router.replace("/(status)/banned");
            break;
          case "ACTIVE":
            router.replace("/(tabs)");
            break;
          default:
            router.replace("/(auth)/signin");
            break;
        }
        return;
      }

      if (status === "ACTIVE" && !inTabs) {
        router.replace("/(tabs)");
        return;
      }

      if (status !== "ACTIVE" && !inStatusGroup) {
        switch (status) {
          case "PENDING":
            router.replace("/(status)/pending");
            break;
          case "SUSPENDED":
            router.replace("/(status)/suspended");
            break;
          case "BANNED":
            router.replace("/(status)/banned");
            break;
          default:
            router.replace("/(auth)/signin");
            break;
        }
        return;
      }
    }
  }, [
    user,
    segments,
    onboardingChecked,
    initialLoading,
    hasSeenWelcome,
    router,
  ]);

  return (
    <ThemedView style={styles.container}>
      <Image
        source={require("@/assets/images/icon.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
      <ThemedText style={styles.loadingText}>Getting you ready...</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  spinnerContainer: {
    marginTop: 16,
    height: 40,
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "500",
  },
});
