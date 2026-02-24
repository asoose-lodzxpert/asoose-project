/**
 * ⚠️  DEAD CODE — This file is NOT used by the application.
 *
 * The active NextAuth configuration lives at:
 *   utils/authOptions.ts   ← authOptions object used everywhere
 *   src/app/api/auth/[...nextauth]/route.ts  ← the actual route handler
 *
 * Keeping this file only as a reference.  Do not edit it expecting the
 * changes to take effect; edit utils/authOptions.ts instead.
 */
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export const { handlers, signIn, signOut, auth } = NextAuth({
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
        try {
          const res = await fetch(`${API_URL}/auth/user/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials?.email,
              password: credentials?.password,
            }),
          });

          const data = await res.json();

          if (res.ok && data.access_token) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
              accessToken: data.access_token,
            };
          }

          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle OAuth sign-in (Google)
      if (account?.provider === "google") {
        try {
          // ✅ FIX: Cast profile to 'any' to access Google-specific properties
          const googleProfile = profile as any;

          // Send OAuth user data to backend
          const res = await fetch(`${API_URL}/auth/user/oauth/google`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: user.email,
              googleId: account.providerAccountId,
              // ✅ Use the casted variable here
              firstName: googleProfile?.given_name || user.name?.split(" ")[0],
              lastName:
                googleProfile?.family_name ||
                user.name?.split(" ").slice(1).join(" "),
              profilePicture: user.image,
            }),
          });

          const data = await res.json();

          if (res.ok && data.access_token) {
            user.id = data.user.id;
            user.role = data.user.role;
            user.accessToken = data.access_token;
            return true;
          }

          return false;
        } catch (error) {
          console.error("OAuth sign-in error:", error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.accessToken = user.accessToken;
        token.role = user.role;
        token.id = user.id;
      }

      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.accessToken = token.accessToken as string;

      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
    signOut: "/sign-in",
    error: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
});
