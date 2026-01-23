// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  login,
  getAccessToken,
  refreshAccessToken,
  logout,
} from "@/services/auth";
import { fetchCurrentUser } from "@/services/auth-fetch";

type User = {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "PENDING" | "SUSPENDED" | "BANNED";
  storeId: string | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const accessToken = await getAccessToken();

        if (!accessToken) {
          if (isMounted) setUser(null);
          return;
        }

        try {
          await refreshAccessToken();
        } catch (refreshErr) {
          await logout();
          if (isMounted) setUser(null);
          return;
        }

        const userData = await fetchCurrentUser();

        if (isMounted) {
          setUser(userData);
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  async function signIn(identifier: string, password: string) {
    const { user } = await login(identifier, password);
    setUser(user);
  }

  async function signOut() {
    setUser(null);
    await logout();
  }

  async function getToken() {
    return await getAccessToken();
  }

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
