/**
 * Centralised error-reporting shim (M5 fix).
 *
 * Swap the console.error call below for `Sentry.captureException(error, extra)`
 * once @sentry/nextjs is installed and configured (`sentry.client.config.ts` /
 * `sentry.server.config.ts` / `next.config.ts` → withSentryConfig).
 *
 * Usage:
 *   import { reportError } from "@/lib/reportError";
 *   reportError(error, { context: "GlobalErrorBoundary", componentStack: info.componentStack });
 */
export function reportError(
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  // eslint-disable-next-line no-console
  console.error("[reportError]", error, extra ?? "");

  // TODO: replace the line above with:
  // import * as Sentry from "@sentry/nextjs";
  // Sentry.captureException(error, { extra });
}
