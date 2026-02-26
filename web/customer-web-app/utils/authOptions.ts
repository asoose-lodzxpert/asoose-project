import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

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
    maxAge: 7 * 24 * 60 * 60,
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