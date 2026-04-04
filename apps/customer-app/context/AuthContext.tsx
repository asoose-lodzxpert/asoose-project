import {
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_USER_KEY,
} from "@/constants/static-config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const biometric = useBiometric();
  const isLoggingIn = React.useRef(false);
  const hasInitialized = React.useRef(false);

  // Destructure the stable useCallback([]) methods so the init effect deps are
  // constant references — this prevents the effect from re-firing on every render
  // (a fresh `biometric` object is returned each render by useBiometric()).
  const { clearCredentials: clearBiometricCreds, checkBiometricAvailability } =
    biometric;

  // Single atomic initialization flow
  useEffect(() => {
    let isMounted = true;
    async function initializeAuth() {
      // Skip init if actively logging in OR already initialized.
      // Do NOT call setLoading(false) here — the ongoing async init will do it.
      // Calling it here while user is still null causes a premature redirect to login.
      if (isLoggingIn.current || hasInitialized.current) {
        return;
      }

      hasInitialized.current = true;

      try {
        // 1. Check for access token in AsyncStorage
        const accessToken = await AsyncStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
        // if (!accessToken) {
        //   // No token: fail closed
        //   await clearSession();
        //   if (isMounted) {
        //     setUser(null);
        //     setLoading(false);
        //   }
        //   return;
        // }

        try {
          await refreshAccessToken();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("No refresh token available")) {
            // No token stored at all — user has never logged in or has explicitly logged out
            await clearSession();
            if (isMounted) {
              setUser(null);
              setLoading(false);
            }
            return;
          }
          // For ALL other errors (network blip, server error, token format mismatch,
          // expired token that the server rejected, etc.) restore the cached user and
          // let the normal request cycle handle token expiry via 401 → re-login flow.
          const cachedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
          if (cachedUser && isMounted) setUser(JSON.parse(cachedUser));
          if (isMounted) setLoading(false);
          return;
        }

        // 3. Restore user only if token is valid
        const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          await clearSession();
        }
      } catch {
        // Any error: fail closed
        await clearSession();
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    initializeAuth();
    checkBiometricAvailability();
    return () => {
      isMounted = false;
    };
    // checkBiometricAvailability is defined with useCallback([]) in useBiometric,
    // so it is a stable reference that never changes — this effect runs only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkBiometricAvailability]);

  // Save session: only after successful login
  const saveSession = async (
    u: User,
    accessToken?: string | null,
    refreshToken?: string | null,
  ) => {
    // Save tokens FIRST, before setting user state (to avoid race condition)
    if (
      accessToken &&
      typeof accessToken === "string" &&
      accessToken.length < 4096
    ) {
      await AsyncStorage.setItem(AUTH_ACCESS_TOKEN_KEY, accessToken);
    }

    if (refreshToken && typeof refreshToken === "string") {
      await AsyncStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
    }

    // Save user data and set state AFTER tokens are saved
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
    setUser(u);
  };

  // Clear all auth state and storage
  const clearSession = async () => {
    setUser(null);
    hasInitialized.current = false; // Reset so init can run again
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    await AsyncStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    await clearBiometricCreds();
  };

  // Login flow
  const login = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      try {
        isLoggingIn.current = true;
        hasInitialized.current = true; // Prevent init from running after login
        const resp = await loginService(email, password);
        await saveSession(
          resp.user,
          resp.accessToken || null,
          resp.refreshToken || null,
        );
        isLoggingIn.current = false;
        // Send expo push token to backend
        try {
          const token = await getExpoPushToken();
          if (token) {
            await sendExpoPushTokenToBackend(token);
          }
        } catch (pushErr) {
          // Silently handle push token errors
        }
      } catch (err) {
        isLoggingIn.current = false;
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
    hasInitialized.current = false;
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

  // Listen for global session-expiry events from authFetch
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("auth:session-expired", () => {
      logout();
    });
    return () => sub.remove();
  }, [logout]);

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
