import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useBiometric } from "../hooks/useBiometric";
import {
  login as loginService,
  logout as logoutService,
  refreshAccessToken,
} from "../services/auth.service";
import {
  deleteExpoPushTokenFromBackend,
  getExpoPushToken,
  sendExpoPushTokenToBackend,
} from "../services/expo-push-token.service";

type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  phone?: string | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  biometricAvailable: boolean;
  biometricEnrolled: boolean;
  biometricLogin: () => Promise<void>;
  enableBiometrics: (email: string, password: string) => Promise<void>;
  disableBiometrics: () => Promise<void>;
  isBiometricEnabled: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = "@auth/user";
const ACCESS_TOKEN_KEY = "@auth/access_token";
const REFRESH_TOKEN_KEY = "@auth/refresh_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const biometric = useBiometric();

  // Single atomic initialization flow
  useEffect(() => {
    let isMounted = true;
    async function initializeAuth() {
      try {
        // 1. Check for access token in SecureStore
        const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (!accessToken) {
          // No token: fail closed
          await clearSession();
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // 2. Optionally: try to refresh token (handles expiry)
        try {
          await refreshAccessToken();
        } catch {
          // Token refresh failed: fail closed
          await clearSession();
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // 3. Restore user only if token is valid
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          // No user data: treat as logged out
          await clearSession();
          setUser(null);
        }
      } catch {
        // Any error: fail closed
        await clearSession();
        setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    initializeAuth();
    biometric.checkBiometricAvailability();
    return () => {
      isMounted = false;
    };
  }, [biometric]);

  // Save session: only after successful login
  const saveSession = async (
    u: User,
    accessToken?: string | null,
    refreshToken?: string | null,
  ) => {
    setUser(u);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    if (accessToken)
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken)
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  };

  // Clear all auth state and storage
  const clearSession = async () => {
    setUser(null);
    await AsyncStorage.removeItem(USER_KEY);
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await biometric.clearCredentials();
  };

  // Login flow
  const login = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      try {
        const resp = await loginService(email, password);
        await saveSession(
          resp.user,
          resp.accessToken || null,
          resp.refreshToken || null,
        );
        // Send expo push token to backend
        try {
          const token = await getExpoPushToken();
          if (token) await sendExpoPushTokenToBackend(token);
        } catch {}
      } catch (err) {
        // On login failure, clear all state
        await clearSession();
        throw err;
      }
    },
    [],
  );

  // Logout: always clear all storage and state
  const logout = useCallback(async () => {
    setLoading(true);
    setUser(null);
    try {
      try {
        await logoutService();
      } catch {}
      try {
        await deleteExpoPushTokenFromBackend();
      } catch {}
      await clearSession();
    } finally {
      setLoading(false);
    }
  }, []);

  const enableBiometrics = useCallback(
    async (email: string, password: string) => {
      const success = await biometric.saveCredentials(email, password);
      if (!success) {
        throw new Error("Failed to enable biometric authentication");
      }
    },
    [biometric],
  );

  const disableBiometrics = useCallback(async () => {
    await biometric.clearCredentials();
  }, [biometric]);

  const isBiometricEnabled = useCallback(async (): Promise<boolean> => {
    const creds = await biometric.getCredentials();
    return creds !== null;
  }, [biometric]);

  const biometricLogin = useCallback(async () => {
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
    try {
      setLoading(true);
      const resp = await loginService(creds.email, creds.password);
      await saveSession(
        resp.user,
        resp.accessToken || null,
        resp.refreshToken || null,
      );
      biometric.resetStatus();
    } catch (err) {
      biometric.resetStatus();
      await clearSession();
      throw err;
    } finally {
      setLoading(false);
    }
  }, [biometric]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        biometricAvailable: biometric.isAvailable,
        biometricEnrolled: biometric.isEnrolled,
        biometricLogin,
        enableBiometrics,
        disableBiometrics,
        isBiometricEnabled,
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
