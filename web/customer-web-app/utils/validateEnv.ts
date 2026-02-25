/**
 * validateEnv.ts
 *
 * Runtime environment variable validation.
 * Called once at server startup (next.config.ts) in production.
 *
 * Throws descriptive errors for any misconfiguration that would cause
 * "Error 400: redirect_uri_mismatch" from Google OAuth.
 */

interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** The exact redirect URI NextAuth will send to Google */
  oauthRedirectUri: string;
}

/**
 * Validate every env var that is critical for Google OAuth to work in
 * production.  Returns a result object so callers can log it or throw.
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const isProd = process.env.NODE_ENV === "production";

  // ── 1. NEXTAUTH_SECRET ──────────────────────────────────────────────────
  if (!process.env.NEXTAUTH_SECRET) {
    errors.push(
      "NEXTAUTH_SECRET is not set.  Generate one with: openssl rand -base64 32",
    );
  } else if (process.env.NEXTAUTH_SECRET === "your-nextauth-secret-key-here") {
    errors.push(
      "NEXTAUTH_SECRET is still the placeholder value from .env.example.  Replace it.",
    );
  }

  // ── 2. NEXTAUTH_URL ─────────────────────────────────────────────────────
  const nextAuthUrl = process.env.NEXTAUTH_URL ?? "";

  if (!nextAuthUrl) {
    errors.push(
      "NEXTAUTH_URL is not set.  In production this MUST be the exact public URL " +
        "of the app (e.g. https://app.yourdomain.com).  NextAuth uses it to build " +
        "the redirect_uri sent to Google.",
    );
  } else {
    // Parse and audit the URL
    let parsedNextAuthUrl: URL | null = null;
    try {
      parsedNextAuthUrl = new URL(nextAuthUrl);
    } catch {
      errors.push(
        `NEXTAUTH_URL "${nextAuthUrl}" is not a valid URL.  ` +
          "Set it to the exact public URL of the app, e.g. https://app.yourdomain.com",
      );
    }

    if (parsedNextAuthUrl) {
      // Production must use HTTPS
      if (isProd && parsedNextAuthUrl.protocol !== "https:") {
        errors.push(
          `NEXTAUTH_URL uses "${parsedNextAuthUrl.protocol}" but production requires "https:". ` +
            `Current value: "${nextAuthUrl}"`,
        );
      }

      // Warn about localhost in production
      if (isProd && parsedNextAuthUrl.hostname === "localhost") {
        errors.push(
          `NEXTAUTH_URL is pointing at localhost ("${nextAuthUrl}") in production. ` +
            "Set it to the deployed domain, e.g. https://app.yourdomain.com",
        );
      }

      // Trailing slash causes a mismatch with the URI Google has stored
      if (nextAuthUrl.endsWith("/")) {
        errors.push(
          `NEXTAUTH_URL has a trailing slash: "${nextAuthUrl}".  ` +
            "Remove the trailing slash — Google OAuth URIs are compared exactly.",
        );
      }

      // Non-standard port in production is usually a misconfiguration
      if (
        isProd &&
        parsedNextAuthUrl.port &&
        parsedNextAuthUrl.port !== "443" &&
        parsedNextAuthUrl.port !== "80"
      ) {
        warnings.push(
          `NEXTAUTH_URL includes port ${parsedNextAuthUrl.port} in production.  ` +
            "Make sure the exact same URL (with port) is registered in Google Cloud Console.",
        );
      }

      // www vs non-www — warn if both might be in use
      if (
        isProd &&
        !parsedNextAuthUrl.hostname.startsWith("www.") &&
        !parsedNextAuthUrl.hostname.startsWith("app.")
      ) {
        warnings.push(
          `NEXTAUTH_URL uses hostname "${parsedNextAuthUrl.hostname}". ` +
            "Confirm this exactly matches the Authorised redirect URI in Google Cloud Console " +
            "(www. and non-www. are different origins).",
        );
      }
    }

    // Dev placeholder still set in production
    if (isProd && nextAuthUrl.includes("localhost")) {
      errors.push(
        `NEXTAUTH_URL still contains "localhost" in a production build: "${nextAuthUrl}". ` +
          "This is usually caused by a .env.local value leaking into the production container. " +
          "Set NEXTAUTH_URL to the deployed domain in your deployment platform's env var settings.",
      );
    }
  }

  // ── 3. Google OAuth credentials ─────────────────────────────────────────
  if (!process.env.GOOGLE_CLIENT_ID) {
    errors.push("GOOGLE_CLIENT_ID is not set.");
  } else if (process.env.GOOGLE_CLIENT_ID === "your-google-client-id") {
    errors.push("GOOGLE_CLIENT_ID is still the .env.example placeholder.");
  }

  if (!process.env.GOOGLE_CLIENT_SECRET) {
    errors.push("GOOGLE_CLIENT_SECRET is not set.");
  } else if (
    process.env.GOOGLE_CLIENT_SECRET === "your-google-client-secret"
  ) {
    errors.push("GOOGLE_CLIENT_SECRET is still the .env.example placeholder.");
  }

  // ── 4. Backend API URL ───────────────────────────────────────────────────
  if (!process.env.NEXT_PUBLIC_API_URL) {
    warnings.push(
      "NEXT_PUBLIC_API_URL is not set; server-side OAuth token exchange will fail.",
    );
  }

  // ── 5. Derive and report the exact redirect URI NextAuth will use ────────
  const baseUrl = nextAuthUrl.replace(/\/$/, ""); // strip trailing slash
  const oauthRedirectUri = baseUrl
    ? `${baseUrl}/api/auth/callback/google`
    : "(cannot compute — NEXTAUTH_URL is missing or invalid)";

  return { ok: errors.length === 0, errors, warnings, oauthRedirectUri };
}

/**
 * Call this during server startup.
 * Logs the result and throws in production if there are hard errors.
 */
export function assertValidEnv(): void {
  const result = validateEnv();

  const separator = "─".repeat(70);

  console.log(`\n${separator}`);
  console.log("  OAUTH ENVIRONMENT CHECK");
  console.log(separator);
  console.log(
    `  NODE_ENV          : ${process.env.NODE_ENV ?? "(not set)"}`,
  );
  console.log(
    `  NEXTAUTH_URL      : ${process.env.NEXTAUTH_URL ?? "(not set)"}`,
  );
  console.log(
    `  GOOGLE_CLIENT_ID  : ${process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.slice(0, 12) + "…" : "(not set)"}`,
  );
  console.log(
    `  INTERNAL_API_URL  : ${process.env.INTERNAL_API_URL ?? "(not set — will use NEXT_PUBLIC_API_URL)"}`,
  );
  console.log(`\n  → Google redirect_uri that will be sent:`);
  console.log(`    ${result.oauthRedirectUri}`);
  console.log(
    `\n  Ensure this URI is listed EXACTLY in Google Cloud Console →`,
  );
  console.log(`  APIs & Services → Credentials → Authorised redirect URIs.`);

  if (result.warnings.length > 0) {
    console.log(`\n  WARNINGS (${result.warnings.length}):`);
    result.warnings.forEach((w) => console.warn(`  ⚠  ${w}`));
  }

  if (result.errors.length > 0) {
    console.error(`\n  ERRORS (${result.errors.length}):`);
    result.errors.forEach((e) => console.error(`  ✗  ${e}`));
    console.error(separator + "\n");

    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `[validateEnv] ${result.errors.length} critical OAuth environment error(s) detected. ` +
          "The server will not start to prevent a broken production deployment. " +
          "Fix the errors listed above and redeploy.",
      );
    }
  } else {
    console.log(`\n  ✓  All critical OAuth env vars look correct.`);
  }

  console.log(separator + "\n");
}
