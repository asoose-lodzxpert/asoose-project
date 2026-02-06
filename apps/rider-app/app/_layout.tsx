import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View, Text } from "react-native";
import { Stack, useRouter, useSegments, ErrorBoundaryProps } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useThemeColor } from "@/hooks/use-theme-color";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { JobsProvider } from "@/context/JobContext";
import { useConfirm } from "@/hooks/use-confirm";

/* -------------------- Error Boundary -------------------- */

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <Text style={styles.errorRetry} onPress={retry}>
        Try Again
      </Text>
    </View>
  );
}

/* -------------------- Loading Screen -------------------- */
// Loading
function LoadingScreen() {
  const primary = useThemeColor({}, "brandPrimary");

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  const style1 = {
    transform: [
      {
        translateY: dot1.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
    ],
    backgroundColor: primary,
  };

  const style2 = {
    transform: [
      {
        translateY: dot2.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
    ],
    backgroundColor: primary,
  };

  const style3 = {
    transform: [
      {
        translateY: dot3.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
    ],
    backgroundColor: primary,
  };

  return (
    <View style={styles.loadingContainer}>
      <Image
        source={require("@/assets/images/icon.png")}
        style={styles.logo}
        contentFit="contain"
      />
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, style1]} />
        <Animated.View style={[styles.dot, style2]} />
        <Animated.View style={[styles.dot, style3]} />
      </View>
    </View>
  );
}

/* -------------------- Root Navigator -------------------- */

function RootNavigator() {
  const { user, loading } = useAuth();
  const [hasLaunched, setHasLaunched] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();
  const { ConfirmModal } = useConfirm();

  useEffect(() => {
    async function checkFirstLaunch() {
      const value = await AsyncStorage.getItem("hasLaunched");
      if (!value) {
        await AsyncStorage.setItem("hasLaunched", "true");
        setHasLaunched(false);
      } else {
        setHasLaunched(true);
      }
    }

    checkFirstLaunch();
  }, []);

  useEffect(() => {
    if (loading || hasLaunched === null) return;

    const onWelcome = segments[0] === "welcome";

    const atRoot = segments.length === 1 && !segments[0];
    if (!hasLaunched && !onWelcome && atRoot) {
      router.replace("/welcome");
    } else if (hasLaunched) {
      if (user && atRoot) {
        router.replace("/(tabs)");
      } else if (!user && atRoot) {
        router.replace("/(auth)/signin");
      }
    }
  }, [user, segments, loading, hasLaunched, router]);

  if (loading || hasLaunched === null) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
      </Stack>
      <ConfirmModal />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <JobsProvider>
        <RootNavigator />
      </JobsProvider>
    </AuthProvider>
  );
}

/* -------------------- Styles -------------------- */

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  errorMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  errorRetry: {
    fontSize: 16,
    color: "#E5A503",
    fontWeight: "600",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
});
