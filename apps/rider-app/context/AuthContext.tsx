import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  login,
  getAccessToken,
  refreshAccessToken,
  logout,
} from "@/services/auth";
import { useBiometric } from "../hooks/useBiometric";
import { fetchCurrentUser } from "@/services/auth-fetch";
import { fetchRealtimeOnlineStatus } from "@/services/status-fetch";

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: "RIDER" | "DRIVER";
  status: "ACTIVE" | "PENDING" | "SUSPENDED" | "BANNED";
  isOnline?: boolean;
};

interface AuthContextType {
  user: User | null;
  initialLoading: boolean;
  actionLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  biometricAvailable: boolean;
  biometricEnrolled: boolean;
  biometricLogin: () => Promise<void>;
  enableBiometrics: (email: string, password: string) => Promise<void>;
  disableBiometrics: () => Promise<void>;
  isBiometricEnabled: () => Promise<boolean>;
  refreshOnlineStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);
  const biometric = useBiometric();
  useEffect(() => {
    biometric.checkBiometricAvailability();
  }, [biometric]);

  // Check for existing session on mount
  useEffect(() => {
    async function checkToken() {
      try {
        const accessToken = await getAccessToken();
        if (accessToken) {
          try {
            await refreshAccessToken();
            const userData = await fetchCurrentUser();

            // Fetch real-time online status from matching system
            try {
              const realtimeStatus = await fetchRealtimeOnlineStatus();
              userData.isOnline = realtimeStatus.isOnline;
            } catch (statusError) {
              console.error(
                "[AuthContext] Failed to fetch realtime status:",
                statusError,
              );
              // Keep the isOnline from userData if realtime fetch fails
            }

            setUser(userData);
          } catch {
            await logout();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setInitialLoading(false);
      }
    }
    checkToken();
  }, []);

  const saveSession = async (u: User) => {
    // Fetch real-time online status from matching system
    try {
      const realtimeStatus = await fetchRealtimeOnlineStatus();
      u.isOnline = realtimeStatus.isOnline;
    } catch (error) {
      console.error("[AuthContext] Failed to fetch realtime status:", error);
      // Keep isOnline from login response if fetch fails
    }
    setUser(u);
  };

  const clearSession = async () => {
    setUser(null);
    await biometric.clearCredentials();
  };

  const loginHandler = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    setActionLoading(true);
    try {
      const resp = await login(email, password);
      await saveSession(resp.user);
    } finally {
      setActionLoading(false);
    }
  };

  const logoutHandler = async () => {
    setActionLoading(true);
    try {
      await logout();
      router.replace("/");
      await clearSession();
    } finally {
      setActionLoading(false);
    }
  };

  const enableBiometrics = async (email: string, password: string) => {
    const success = await biometric.saveCredentials(email, password);
    if (!success) throw new Error("Failed to enable biometric authentication");
  };

  const disableBiometrics = async () => {
    await biometric.clearCredentials();
  };

  const isBiometricEnabled = async (): Promise<boolean> => {
    const creds = await biometric.getCredentials();
    return creds !== null;
  };

  const refreshOnlineStatus = async () => {
    if (!user) return;
    try {
      const realtimeStatus = await fetchRealtimeOnlineStatus();
      setUser({
        ...user,
        isOnline: realtimeStatus.isOnline,
      });
      console.log(
        "[AuthContext] Updated online status:",
        realtimeStatus.status,
      );
    } catch (error) {
      console.error("[AuthContext] Failed to refresh online status:", error);
    }
  };

  const biometricLogin = async () => {
    if (!biometric.isAvailable || !biometric.isEnrolled) {
      throw new Error("Biometric authentication not available on this device");
    }
    const authResult = await biometric.authenticate(
      "Verify your fingerprint to login",
    );
    if (!authResult.success) {
      throw new Error(authResult.error || "Biometric verification failed");
    }
    const creds = await biometric.getCredentials();
    if (!creds) {
      throw new Error("No biometric credentials saved");
    }
    setActionLoading(true);
    try {
      const resp = await login(creds.email, creds.password);
      await saveSession(resp.user);
      biometric.resetStatus();
    } catch (err) {
      biometric.resetStatus();
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        initialLoading,
        actionLoading,
        login: loginHandler,
        logout: logoutHandler,
        biometricAvailable: biometric.isAvailable,
        biometricEnrolled: biometric.isEnrolled,
        biometricLogin,
        enableBiometrics,
        disableBiometrics,
        isBiometricEnabled,
        refreshOnlineStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
