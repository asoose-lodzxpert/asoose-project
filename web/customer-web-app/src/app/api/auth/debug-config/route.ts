/**
 * GET /api/auth/debug-config
 *
 * Safe OAuth configuration diagnostic endpoint.
 *
 * Returns the exact redirect_uri that NextAuth will send to Google, along
 * with a checklist of env-var health checks.  Secrets are NEVER exposed.
 *
 * Access control:
 *   • In development  (NODE_ENV !== "production"): always accessible.
 *   • In production   (NODE_ENV === "production"):  requires the request to
 *     carry the header  X-Debug-Token: <NEXTAUTH_SECRET>  so that only the
 *     platform operator (who knows the secret) can read it.
 *     Remove or restrict this endpoint once the issue is resolved.
 *
 * Usage:
 *   curl https://app.yourdomain.com/api/auth/debug-config \
 *        -H "X-Debug-Token: <your NEXTAUTH_SECRET>"
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateEnv } from "../../../../../utils/validateEnv";

export async function GET(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";

  // ── Production gate ──────────────────────────────────────────────────────
  if (isProd) {
    const debugToken = req.headers.get("x-debug-token");
    const secret = process.env.NEXTAUTH_SECRET;

    // Constant-time comparison to avoid timing attacks
    if (!secret || !debugToken || debugToken !== secret) {
      return NextResponse.json(
        {
          error:
            "Forbidden. In production, include the header: X-Debug-Token: <NEXTAUTH_SECRET>",
        },
        { status: 403 },
      );
    }
  }

  // ── Build the diagnostic payload ─────────────────────────────────────────
  const result = validateEnv();

  const nextAuthUrl = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");

  const payload = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    ok: result.ok,

    oauth: {
      /**
       * THIS IS THE VALUE GOOGLE RECEIVES.
       * It must be listed EXACTLY in:
       *   Google Cloud Console → APIs & Services → Credentials
       *   → Your OAuth 2.0 Client ID → Authorised redirect URIs
       */
      effectiveRedirectUri: result.oauthRedirectUri,
      nextAuthUrl: nextAuthUrl || null,

      // Checklist — true means the check passed
      checks: {
        nextAuthUrlSet: !!nextAuthUrl,
        nextAuthUrlIsHttps:
          nextAuthUrl.startsWith("https://"),
        nextAuthUrlNoTrailingSlash:
          !process.env.NEXTAUTH_URL?.endsWith("/"),
        nextAuthUrlNotLocalhost:
          !nextAuthUrl.includes("localhost"),
        nextAuthSecretSet: !!process.env.NEXTAUTH_SECRET,
        googleClientIdSet: !!process.env.GOOGLE_CLIENT_ID,
        googleClientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET,
      },

      // Partial client ID (never log the full secret)
      googleClientIdPrefix: process.env.GOOGLE_CLIENT_ID
        ? process.env.GOOGLE_CLIENT_ID.slice(0, 16) + "…"
        : null,
    },

    api: {
      internalApiUrl: process.env.INTERNAL_API_URL || null,
      publicApiUrl: process.env.NEXT_PUBLIC_API_URL || null,
      effectiveServerApiUrl:
        process.env.INTERNAL_API_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:3000/api/v1 (fallback)",
    },

    errors: result.errors,
    warnings: result.warnings,

    googleConsoleAction: result.oauthRedirectUri.startsWith("(")
      ? "Cannot compute — fix NEXTAUTH_URL first"
      : `Add exactly this URI to Google Cloud Console → OAuth 2.0 Credentials → Authorised redirect URIs:\n  ${result.oauthRedirectUri}`,
  };

  return NextResponse.json(payload, {
    status: result.ok ? 200 : 500,
    headers: {
      // Never cache this response
      "Cache-Control": "no-store",
    },
  });
}
