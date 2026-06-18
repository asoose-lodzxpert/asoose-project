import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";

import { AuthProvider } from "@/context/AuthContext";
import ConfirmProvider from "@/components/ui/ConfirmDialogProvider";
import { JobsProvider } from "@/context/JobContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { NotificationPreferencesProvider } from "@/context/NotificationPreferencesContext";
import { toastConfig } from "@/components/ThemedToast";
import { loadServiceBounds } from "@/constants/service-bounds";
import { AppUpdateGuard } from "@/components/common/AppUpdateGuard";

function RootNavigator() {
  // Always render all routes - navigation logic is handled by index.tsx
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(status)" />
      <Stack.Screen name="(tabs)" />
      {/* <Stack.Screen name="(earnings)" />
      <Stack.Screen name="(profile)" /> */}
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}

function AuthDependentProviders({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <NotificationPreferencesProvider>
        <JobsProvider>{children}</JobsProvider>
      </NotificationPreferencesProvider>
    </NotificationProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    loadServiceBounds();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConfirmProvider>
        <AuthProvider>
          <AuthDependentProviders>
            <RootNavigator />
            <AppUpdateGuard />
            <Toast config={toastConfig} />
          </AuthDependentProviders>
        </AuthProvider>
      </ConfirmProvider>
    </GestureHandlerRootView>
  );
}
