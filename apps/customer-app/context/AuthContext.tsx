import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginWithDemo } from "../services/auth.service";

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
  signIn: (credentials: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = "@auth/user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const stored = await AsyncStorage.getItem(USER_KEY);
        if (stored) setUser(JSON.parse(stored));
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  async function signIn({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    // Call service for login
    const user = await loginWithDemo(email, password);
    setUser(user);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  async function signOut() {
    // Mock sign-out using service
    // await authService.logout(); // If implemented
    setUser(null);
    await AsyncStorage.removeItem(USER_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
