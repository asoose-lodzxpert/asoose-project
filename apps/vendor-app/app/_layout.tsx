import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { View, Image, StyleSheet, Animated } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NotificationPreferencesProvider } from "@/context/NotificationPreferencesContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toastConfig } from "@/components/ThemedToast";
import Toast from "react-native-toast-message";
import { useEffect, useRef } from "react";

function LoadingScreen() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, {
              toValue: -10,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ),
      ]);
    };

    Animated.parallel([
      createAnimation(dot1, 0),
      createAnimation(dot2, 150),
      createAnimation(dot3, 300),
    ]).start();
  }, []);

  return (
    <ThemedView style={styles.loadingContainer}>
      <Image
        source={require("@/assets/images/icon.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <ThemedText type="title" style={styles.appName}>
        ASOOSE VENDOR
      </ThemedText>
      <View style={styles.dotsContainer}>
        <Animated.View
          style={[styles.dot, { transform: [{ translateY: dot1 }] }]}
        />
        <Animated.View
          style={[styles.dot, { transform: [{ translateY: dot2 }] }]}
        />
        <Animated.View
          style={[styles.dot, { transform: [{ translateY: dot3 }] }]}
        />
      </View>
    </ThemedView>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const normalizedStatus = user?.status?.trim().toUpperCase();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView>
      <Stack screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="(auth)" />
        ) : normalizedStatus === "PENDING" ? (
          <Stack.Screen name="(status)/pending" />
        ) : normalizedStatus === "SUSPENDED" ? (
          <Stack.Screen name="(status)/suspended" />
        ) : normalizedStatus === "CLOSED_PERMANENTLY" ? (
          <Stack.Screen name="(status)/closed-permanently" />
        ) : normalizedStatus === "BANNED" ? (
          <Stack.Screen name="(status)/banned" />
        ) : (
          <Stack.Screen name="(main)" />
        )}
      </Stack>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <NotificationPreferencesProvider>
            <RootNavigator />
            <Toast config={toastConfig} />
          </NotificationPreferencesProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
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
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: 32,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E5A503",
  },
});
