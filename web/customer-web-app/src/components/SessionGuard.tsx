"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef } from "react";

/**
 * Watches the session for the `error` field set by the NextAuth `jwt` callback
 * when token refresh fails. When detected, forces a signOut so the user is
 * redirected to the login page instead of silently making unauthenticated API
 * calls with a stale token.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const signingOut = useRef(false);

  useEffect(() => {
    if (session?.error === "RefreshTokenExpired" && !signingOut.current) {
      signingOut.current = true;
      console.warn("[SessionGuard] Refresh token expired — forcing sign-out");
      signOut({ callbackUrl: "/sign-in?reason=session_expired" });
    }
  }, [session?.error]);

  return <>{children}</>;
}
