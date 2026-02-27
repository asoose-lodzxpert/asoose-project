import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    /** Set to "RefreshTokenExpired" when the refresh flow fails */
    error?: string;
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    accessToken: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    accessToken: string;
    refreshToken?: string;
    /** Epoch-ms when the current access token expires */
    accessTokenExpiry?: number;
    /** Set to "RefreshTokenExpired" when the refresh flow fails */
    error?: string;
  }
}
