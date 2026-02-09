import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toastConfig } from "@/components/ThemedToast";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { NotificationPreferencesProvider } from "@/context/NotificationPreferencesContext";
import {
  checkStartupPermissions,
  requestStartupPermissions,
} from "@/utils/permissions";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";

function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) {
    // Keep splash screen active by rendering nothing
    return null;
  }

  if (!user) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
        </Stack>
      </GestureHandlerRootView>
    );
  }

  const status = user.status?.trim().toUpperCase() ?? "";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {status === "PENDING" ? (
          <Stack.Screen name="(status)/pending" />
        ) : status === "SUSPENDED" ? (
          <Stack.Screen name="(status)/suspended" />
        ) : status === "CLOSED_PERMANENTLY" ? (
          <Stack.Screen name="(status)/closed-permanently" />
        ) : status === "BANNED" ? (
          <Stack.Screen name="(status)/banned" />
        ) : status === "ACTIVE" ? (
          <Stack.Screen name="(main)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [permissionsReady, setPermissionsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initPermissions = async () => {
      try {
        await requestStartupPermissions();
        await checkStartupPermissions();
      } catch (e) {
        if (__DEV__) {
          console.warn("Startup permission check failed:", e);
        }
      } finally {
        if (mounted) setPermissionsReady(true);
      }
    };

    initPermissions();

    return () => {
      mounted = false;
    };
  }, []);

  if (!permissionsReady) {
    // Keep splash screen active by rendering nothing
    return null;
  }
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
