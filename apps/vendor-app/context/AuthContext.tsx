import React, { createContext, useContext, useEffect, useState } from "react";
import {
  login,
  getAccessToken,
  refreshAccessToken,
  clearTokens,
} from "@/services/auth";
import { fetchCurrentUser } from "@/services/auth-fetch";

type User = {
  id: string;
  name: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
            await clearTokens();
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

  async function signOut() {
    setUser(null);
    await clearTokens();
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
