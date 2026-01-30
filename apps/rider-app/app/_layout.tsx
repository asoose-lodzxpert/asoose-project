import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { JobsProvider } from "@/context/JobContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { useConfirm } from "@/hooks/use-confirm";
import { useThemeColor } from "@/hooks/use-theme-color";
import Toast from "react-native-toast-message";

/* -------------------- Loading Screen -------------------- */

function LoadingScreen() {
  const primary = useThemeColor({}, "brandPrimary");

  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const animate = (dot: typeof dot1, delay: number) => {
      dot.value = withDelay(
        delay,
        withRepeat(
          withTiming(1, { duration: 400 }),
          -1,
          true, // reverse
        ),
      );
    };

    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  const style1 = useAnimatedStyle(() => ({
    transform: [{ translateY: -10 * dot1.value }],
    backgroundColor: primary,
  }));

  const style2 = useAnimatedStyle(() => ({
    transform: [{ translateY: -10 * dot2.value }],
    backgroundColor: primary,
  }));

  const style3 = useAnimatedStyle(() => ({
    transform: [{ translateY: -10 * dot3.value }],
    backgroundColor: primary,
  }));

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
  const [navReady, setNavReady] = useState(false);

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
    } else if (hasLaunched && atRoot) {
      if (user && segments[0] !== "(tabs)") {
        router.replace("/(tabs)");
      } else if (!user && segments[0] !== "(auth)") {
        router.replace("/(auth)/signin");
      }
    }

    setNavReady(true);
  }, [user, segments, loading, hasLaunched]);

  if (loading || hasLaunched === null || !navReady) {
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
      <Toast />
    </GestureHandlerRootView>
  );
}

/* -------------------- Root Layout -------------------- */

export default function RootLayout() {
  return (
    <AuthProvider>
      <JobsProvider>
        <NotificationProvider>
          <RootNavigator />
        </NotificationProvider>
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
});
