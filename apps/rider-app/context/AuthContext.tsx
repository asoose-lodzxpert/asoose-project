import React, { createContext, useContext, useEffect, useState } from "react";
import {
  login,
  getAccessToken,
  refreshAccessToken,
  logout,
  isBiometricSupported,
  isBiometricEnrolled,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  authenticateWithBiometric,
  getBiometricCredentials,
} from "@/services/auth";
import { fetchCurrentUser } from "@/services/auth-fetch";

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
};

type BiometricState = {
  isSupported: boolean;
  isEnrolled: boolean;
  isEnabled: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  biometric: BiometricState;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithBiometric: () => Promise<void>;
  enableBiometricAuth: (identifier: string, password: string) => Promise<void>;
  disableBiometricAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometric, setBiometric] = useState<BiometricState>({
    isSupported: false,
    isEnrolled: false,
    isEnabled: false,
  });

  // Check biometric availability on mount
  useEffect(() => {
    async function checkBiometric() {
      const supported = await isBiometricSupported();
      const enrolled = await isBiometricEnrolled();
      const enabled = await isBiometricEnabled();

      setBiometric({
        isSupported: supported,
        isEnrolled: enrolled,
        isEnabled: enabled,
      });
    }

    checkBiometric();
  }, []);

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

  async function signIn(identifier: string, password: string) {
    const { user } = await login(identifier, password);
    setUser(user);
  }

  async function signInWithBiometric() {
    // First authenticate with biometric
    const authenticated = await authenticateWithBiometric();
    if (!authenticated) {
      throw new Error("Biometric authentication failed");
    }

    // Get stored credentials
    const credentials = await getBiometricCredentials();
    if (!credentials) {
      throw new Error("No biometric credentials found");
    }

    // Login with stored credentials
    const { user } = await login(credentials.identifier, credentials.password);
    setUser(user);
  }

  async function enableBiometricAuth(identifier: string, password: string) {
    await enableBiometric(identifier, password);
    setBiometric((prev) => ({ ...prev, isEnabled: true }));
  }

  async function disableBiometricAuth() {
    await disableBiometric();
    setBiometric((prev) => ({ ...prev, isEnabled: false }));
  }

  async function signOut() {
    setUser(null);
    await logout();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        biometric,
        signIn,
        signOut,
        signInWithBiometric,
        enableBiometricAuth,
        disableBiometricAuth,
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
