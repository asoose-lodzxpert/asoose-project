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

// ---------------------------------------------------------------------------
// Resolve the server-side API base URL.
// Preference order:
//   1. INTERNAL_API_URL  — private network URL (container-to-container)
//   2. NEXT_PUBLIC_API_URL — public URL (always present, baked in at build)
//   3. hard-coded fallback for local dev
// ---------------------------------------------------------------------------
const SERVER_API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000/api/v1";

// ---------------------------------------------------------------------------
// Log the exact OAuth redirect_uri this instance will advertise to Google.
// This runs once when the module is imported (i.e. on server startup).
// Secrets are never printed — only the public NEXTAUTH_URL is logged.
// ---------------------------------------------------------------------------
const _nextAuthUrl = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
const _effectiveRedirectUri = _nextAuthUrl
  ? `${_nextAuthUrl}/api/auth/callback/google`
  : "(NEXTAUTH_URL is not set — redirect_uri will be wrong!)";

console.log(
  `[authOptions] Google OAuth redirect_uri: ${_effectiveRedirectUri}`,
);

export const authOptions: NextAuthOptions = {
  // ---------------------------------------------------------------------------
  // Reverse-proxy note (next-auth v4):
  // Unlike v5, v4 has no "trustHost" flag.  Instead, next-auth v4 derives the
  // redirect_uri entirely from NEXTAUTH_URL.  Behind Vercel / Railway / Nginx:
  //   • Set NEXTAUTH_URL to the public HTTPS URL of this app.
  //   • Optionally set NEXTAUTH_URL_INTERNAL if the server needs a different
  //     URL for internal callbacks (e.g. container-to-container).
  // Do NOT set NEXTAUTH_URL to an internal/http URL — that value is what Google
  // receives as the redirect_uri and it must match Google Cloud Console exactly.
  // ---------------------------------------------------------------------------

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
            `${SERVER_API_URL}/auth/user/login`,
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
    // Handle Google OAuth Token Exchange
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        // SERVER_API_URL resolves INTERNAL_API_URL → NEXT_PUBLIC_API_URL → fallback
        const apiUrl = SERVER_API_URL;

        try {
          const googleProfile = profile as any;
          const res = await fetch(`${apiUrl}/auth/user/oauth/google`, {
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
          });

          let data: any = {};
          try {
            data = await res.json();
          } catch {
            // Body not parseable — treat as generic failure
          }

          if (res.ok && data.access_token) {
            // Mutate the user object so it is available in the 'jwt' callback
            user.id = data.user.id;
            (user as any).role = data.user.role;
            (user as any).accessToken = data.access_token;
            return true;
          }

          // Surface structured error codes for the sign-in page to display
          if (res.status === 401) {
            // Suspended / Banned
            return "/sign-in?error=AccountSuspended";
          }

          if (res.status === 409) {
            // Should no longer happen after auto-link fix, but kept as a safety net
            return "/sign-in?error=OAuthEmailConflict";
          }

          console.error(
            `[OAuth] Backend responded with ${res.status}:`,
            JSON.stringify(data),
          );
          return "/sign-in?error=OAuthFailed";
        } catch (error) {
          console.error("[OAuth] Network/fetch error:", error);
          return "/sign-in?error=OAuthFailed";
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
