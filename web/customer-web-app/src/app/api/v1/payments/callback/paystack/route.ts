/**
 * GET /api/v1/payments/callback/paystack
 *
 * Safety net — NOT the real payment callback. The real handler lives on the
 * backend at /api/v1/payment/callback/paystack (singular "payment"). If the
 * Paystack Dashboard's configured Callback URL is ever stale/misrouted and
 * sends the browser to this (plural, frontend-hosted) URL instead of the
 * backend, the user would otherwise be stuck here needing two manual
 * back-button presses (past this page, then past Paystack's own page) to
 * get back to the store.
 *
 * A hit here means checkout already completed, so instead of leaving the
 * user stranded we try to close the tab outright. window.close() only
 * succeeds when the tab was opened by script (window.open) — most browsers
 * silently ignore it on a tab that got here via a normal same-tab redirect.
 * The setTimeout fallback covers that case by sending the user to the store
 * instead of leaving a dead page up.
 *
 * This only fires if the request ever resolves to the frontend's own domain
 * — it can't intercept traffic the browser sends straight to a separate
 * backend host (e.g. api.asoose.ng).
 */
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  const html = `<!doctype html>
<html>
<head><meta charset="utf-8" /><title>Payment complete</title></head>
<body style="margin:0;display:flex;min-height:100vh;flex-direction:column;gap:16px;align-items:center;justify-content:center;background:#f7f7f5;font-family:system-ui,-apple-system,sans-serif;">
  <a href="/main/store" aria-label="Go to Asoose store"><img src="/logo.png" alt="Asoose" width="56" height="56" style="border-radius:14px;" /></a>
  <p style="color:#171714;font-weight:700;font-size:14px;margin:0;">Payment complete — you can close this tab.</p>
  <script>
    window.close();
    setTimeout(function () { window.location.replace("/main/store"); }, 400);
  </script>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
