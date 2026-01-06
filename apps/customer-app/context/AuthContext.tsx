import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import {
  login as loginService,
  refreshToken as refreshTokenService,
  logout as logoutService,
} from "../services/auth.service";

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
  enableBiometrics: (email: string, password: string) => Promise<void>;
  biometricLogin: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = "@auth/user";
const ACCESS_TOKEN_KEY = "@auth/access_token";
const REFRESH_TOKEN_KEY = "@auth/refresh_token";
const BIOMETRIC_KEY = "@auth/biometric";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    async function loadSession() {
      try {
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        if (storedUser) setUser(JSON.parse(storedUser));
      } finally {
        setLoading(false);
      }
    }
    loadSession();

    (async () => {
      const has = await LocalAuthentication.hasHardwareAsync();
      if (!has) return;
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(enrolled);
    })();
  }, []);

  const saveSession = async (
    u: User,
    accessToken?: string | null,
    refreshToken?: string | null
  ) => {
    setUser(u);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    if (accessToken) await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken)
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  };

  const clearSession = async () => {
    setUser(null);
    await AsyncStorage.multiRemove([
      USER_KEY,
      ACCESS_TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      BIOMETRIC_KEY,
    ]);
  };

  const login = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      setLoading(true);
      try {
        const resp = await loginService(email, password);
        // resp expected: { user, accessToken, refreshToken }
        await saveSession(
          resp.user,
          resp.accessToken || null,
          resp.refreshToken || null
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      try {
        await logoutService();
      } catch {}
      await clearSession();
    } finally {
      setLoading(false);
    }
  }, []);

  const enableBiometrics = useCallback(
    async (email: string, password: string) => {
      // WARNING: For production, use SecureStore / Keychain instead of AsyncStorage
      await AsyncStorage.setItem(
        BIOMETRIC_KEY,
        JSON.stringify({ email, password })
      );
    },
    []
  );

  const biometricLogin = useCallback(async () => {
    const creds = await AsyncStorage.getItem(BIOMETRIC_KEY);
    if (!creds) throw new Error("No biometric credentials saved");
    const { email, password } = JSON.parse(creds);
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Login with biometrics",
    });
    if (!result.success) throw new Error("Biometric authentication failed");
    await login({ email, password });
  }, [login]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        biometricAvailable,
        enableBiometrics,
        biometricLogin,
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
