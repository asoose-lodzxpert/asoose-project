import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";

// ─── Constants ────────────────────────────────────────────────────────────────
interface CustomUser {
  id: string;
  role: string;
  accessToken: string;
  refreshToken?: string;
  name?: string;
  email?: string;
  image?: string;
}

const SERVER_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

if (
  process.env.NODE_ENV === "production" &&
  SERVER_API_URL.startsWith("http://localhost")
) {
  throw new Error(
    "NEXT_PUBLIC_API_URL must be set in production. Currently falling back to localhost."
  );
}

/**
 * Backend access tokens expire in 7 days. We proactively refresh 1 hour before
 * expiry so API calls never hit a stale token.
 */
const ACCESS_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const REFRESH_BUFFER_MS = 60 * 60 * 1000; // 1 hour before expiry

// ─── Token refresh helper ─────────────────────────────────────────────────────
/**
 * Calls the backend's POST /auth/refresh endpoint with the stored refresh token.
 * Returns a new access token, or throws if the refresh token is itself expired
 * or revoked.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(`${SERVER_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("[auth] Refresh token rejected by backend:", res.status, body);
      throw new Error("RefreshTokenExpired");
    }

    const data = await res.json();

    if (!data.access_token) {
      throw new Error("No access_token in refresh response");
    }

    console.log("[auth] Access token refreshed successfully for user:", token.id);

    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpiry: Date.now() + ACCESS_TOKEN_LIFETIME_MS,
      // If the backend ever rotates the refresh token, pick it up:
      refreshToken: data.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error: any) {
    console.error("[auth] Token refresh failed:", error.message);
    // Surface the error so the session callback can force sign-out
    return {
      ...token,
      error: "RefreshTokenExpired",
    };
  }
}

// ─── NextAuth config ──────────────────────────────────────────────────────────
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const loginUrl = `${SERVER_API_URL}/auth/user/login`;

        try {
          const res = await fetch(loginUrl, {
            method: "POST",
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
            headers: { "Content-Type": "application/json" },
          });

          let data: any = null;
          try {
            data = await res.json();
          } catch {
            throw new Error("ServerError");
          }

          if (res.ok && data?.access_token) {
            return {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              image: data.user.image,
              role: data.user.role,
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
            } as CustomUser;
          }

          if (res.status === 401) throw new Error("InvalidCredentials");
          if (res.status === 403) throw new Error("AccountSuspended");
          if (res.status === 404) throw new Error("UserNotFound");

          throw new Error(data?.message ?? "ServerError");
        } catch (error: any) {
          throw new Error(error.message ?? "ServerError");
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days — matches backend refresh token lifetime
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          const googleProfile = profile as any;
          const res = await fetch(`${SERVER_API_URL}/auth/user/oauth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              googleId: account.providerAccountId,
              firstName: googleProfile?.given_name || user.name?.split(" ")[0],
              lastName:
                googleProfile?.family_name ||
                user.name?.split(" ").slice(1).join(" "),
              profilePicture: user.image,
            }),
          });

          let data: any = {};
          try {
            data = await res.json();
          } catch {}

          if (res.ok && data.access_token) {
            user.id = data.user.id;
            (user as any).role = data.user.role;
            (user as any).accessToken = data.access_token;
            (user as any).refreshToken = data.refresh_token;
            return true;
          }

          if (res.status === 401) return "/sign-in?error=AccountSuspended";
          if (res.status === 409) return "/sign-in?error=OAuthEmailConflict";

          return "/sign-in?error=OAuthFailed";
        } catch {
          return "/sign-in?error=OAuthFailed";
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      // ── Initial sign-in: store both tokens + compute expiry ──────────
      if (user) {
        const u = user as CustomUser;
        token.role = u.role;
        token.id = u.id;
        token.accessToken = u.accessToken;
        token.refreshToken = u.refreshToken;
        token.accessTokenExpiry = Date.now() + ACCESS_TOKEN_LIFETIME_MS;
        token.error = undefined;
        return token;
      }

      // ── Subsequent requests: check if access token needs refresh ─────
      const expiry = token.accessTokenExpiry ?? 0;
      const needsRefresh = Date.now() > expiry - REFRESH_BUFFER_MS;

      if (!needsRefresh) {
        // Token is still fresh — return as-is
        return token;
      }

      // ── Refresh the access token ────────────────────────────────────
      if (!token.refreshToken) {
        console.error("[auth] No refresh token available — forcing re-login");
        return { ...token, error: "RefreshTokenExpired" };
      }

      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      session.accessToken = token.accessToken as string;

      // Propagate refresh failure to the client so it can trigger sign-out
      if (token.error) {
        session.error = token.error as string;
      }

      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  secret: process.env.NEXTAUTH_SECRET,
};