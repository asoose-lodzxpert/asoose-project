import React, { createContext, useContext, useEffect, useState } from "react";
import {
  login,
  getAccessToken,
  refreshAccessToken,
  logout,
} from "@/services/auth";
import { useBiometric } from "../hooks/useBiometric";
import { fetchCurrentUser } from "@/services/auth-fetch";

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
};

interface AuthContextType {
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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
            setUser(userData);
          } catch {
            await logout();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    }
    checkToken();
  }, []);

  const saveSession = async (u: User) => {
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
    setLoading(true);
    try {
      const resp = await login(email, password);
      await saveSession(resp.user);
    } finally {
      setLoading(false);
    }
  };

  const logoutHandler = async () => {
    setLoading(true);
    try {
      await logout();
      await clearSession();
    } finally {
      setLoading(false);
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
    setLoading(true);
    try {
      const resp = await login(creds.email, creds.password);
      await saveSession(resp.user);
      biometric.resetStatus();
    } catch (err) {
      biometric.resetStatus();
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login: loginHandler,
        logout: logoutHandler,
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
