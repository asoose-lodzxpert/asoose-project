import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// Define custom types to avoid TS errors
interface CustomUser {
  id: string;
  role: string;
  accessToken: string;
  name?: string;
  email?: string;
  image?: string;
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

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/user/login`,
            {
              method: "POST",
              body: JSON.stringify(credentials),
              headers: { "Content-Type": "application/json" },
            },
          );

          const data = await res.json();

          if (res.ok && data.access_token) {
            return {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              image: data.user.image,
              role: data.user.role,
              accessToken: data.access_token,
            } as CustomUser;
          }
          return null;
        } catch (error) {
          console.error("Login Error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    // 1. ADD THIS: Handle Google OAuth Token Exchange
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          const googleProfile = profile as any;
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/user/oauth/google`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: user.email,
                googleId: account.providerAccountId,
                firstName:
                  googleProfile?.given_name || user.name?.split(" ")[0],
                lastName:
                  googleProfile?.family_name ||
                  user.name?.split(" ").slice(1).join(" "),
                profilePicture: user.image,
              }),
            },
          );

          const data = await res.json();

          if (res.ok && data.access_token) {
            // Mutate the user object so it is available in the 'jwt' callback
            user.id = data.user.id;
            (user as any).role = data.user.role;
            (user as any).accessToken = data.access_token;
            return true;
          }
          return false; // Deny sign in if backend exchange fails
        } catch (error) {
          console.error("OAuth sign-in error:", error);
          return false;
        }
      }
      return true;
    },
    // 2. UPDATE THIS: Persist the token to the JWT
    async jwt({ token, user }) {
      if (user) {
        const u = user as CustomUser;
        token.role = u.role;
        token.id = u.id;
        token.accessToken = u.accessToken;
      }
      return token;
    },
    // 3. VERIFY THIS: Pass token to client session
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
