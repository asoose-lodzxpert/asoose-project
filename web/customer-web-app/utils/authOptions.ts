import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// ─── Constants ────────────────────────────────────────────────────────────────
interface CustomUser {
  id: string;
  role: string;
  accessToken: string;
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

// The backend issues a single access token with no `exp` claim — it stays
// valid until the session is explicitly revoked (logout, or an admin action),
// tracked server-side via a Session row keyed by the sessionId embedded in
// the token. There's no refresh-token pair to rotate, so unlike a typical
// short-lived-access-token setup, there's nothing here to proactively renew.
// The NextAuth session's own maxAge below is what bounds how long a browser
// stays signed in.

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

        try {
          const res = await fetch(`${SERVER_API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          let body: any = null;
          try {
            body = await res.json();
          } catch {
            throw new Error("ServerError");
          }

          if (res.ok && body?.success && body?.data?.accessToken) {
            const u = body.data.user;
            return {
              id: u.id,
              name: `${u.firstName} ${u.lastName}`.trim(),
              email: u.email,
              image: u.avatar ?? undefined,
              role: u.role,
              accessToken: body.data.accessToken,
            } as CustomUser;
          }

          // The backend intentionally returns a generic message for both a
          // wrong password and an unknown email (avoids leaking which one),
          // so there's no separate "UserNotFound" case to distinguish here —
          // only account-state messages are more specific than that.
          const message: string = (body?.message ?? "").toLowerCase();
          if (message.includes("deactivated")) throw new Error("AccountSuspended");
          if (message.includes("locked")) throw new Error("AccountSuspended");
          if (message.includes("sign in")) throw new Error("InvalidCredentials"); // Google/Apple-only account
          throw new Error("InvalidCredentials");
        } catch (error: any) {
          throw new Error(error.message ?? "ServerError");
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!account.id_token) {
          return "/sign-in?error=OAuthFailed";
        }

        try {
          const res = await fetch(`${SERVER_API_URL}/auth/social`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: "google",
              idToken: account.id_token,
            }),
          });

          let data: any = {};
          try {
            data = await res.json();
          } catch {}

          if (res.ok && data?.success && data?.data?.accessToken) {
            const u = data.data.user;
            user.id = u.id;
            (user as any).role = u.role;
            (user as any).accessToken = data.data.accessToken;
            return true;
          }

          return "/sign-in?error=OAuthFailed";
        } catch {
          return "/sign-in?error=OAuthFailed";
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        const u = user as CustomUser;
        token.role = u.role;
        token.id = u.id;
        token.accessToken = u.accessToken;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
