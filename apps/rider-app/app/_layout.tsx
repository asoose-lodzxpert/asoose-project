import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DeliveryProvider } from "@/context/DeliveryContext";
import Toast from "react-native-toast-message";

function LoadingScreen() {
  const [dot1] = useState(new Animated.Value(0));
  const [dot2] = useState(new Animated.Value(0));
  const [dot3] = useState(new Animated.Value(0));

  useEffect(() => {
    const createAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
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
      );
    };

    Animated.parallel([
      createAnimation(dot1, 0),
      createAnimation(dot2, 200),
      createAnimation(dot3, 400),
    ]).start();
  }, []);

  const translateY1 = dot1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const translateY2 = dot2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const translateY3 = dot3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <View style={styles.loadingContainer}>
      <Image
        source={require("@/assets/images/icon.png")}
        style={styles.logo}
        contentFit="contain"
      />
      <View style={styles.dotsContainer}>
        <Animated.View
          style={[styles.dot, { transform: [{ translateY: translateY1 }] }]}
        />
        <Animated.View
          style={[styles.dot, { transform: [{ translateY: translateY2 }] }]}
        />
        <Animated.View
          style={[styles.dot, { transform: [{ translateY: translateY3 }] }]}
        />
      </View>
    </View>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const [hasLaunched, setHasLaunched] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

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

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";
    const onWelcome = segments[0] === "welcome";

    if (!hasLaunched && !onWelcome) {
      router.replace("/welcome");
    } else if (hasLaunched) {
      if (user && !inTabsGroup) {
        router.replace("/(tabs)");
      } else if (!user && !inAuthGroup) {
        router.replace("/(auth)/signin");
      }
    }
  }, [user, segments, loading, hasLaunched]);

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
      <Toast />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <DeliveryProvider>
        <RootNavigator />
      </DeliveryProvider>
    </AuthProvider>
  );
}

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
    backgroundColor: "#007AFF",
  },
});
