/**
 * GET /api/v1/payments/callback/paystack
 *
 * Safety net — NOT the real payment callback. The real handler lives on the
 * backend at /api/v1/payment/callback/paystack (singular "payment"). If the
 * Paystack Dashboard's configured Callback URL is ever stale/misrouted and
 * sends the browser to this (plural, frontend-hosted) URL instead of the
 * backend, the user would otherwise land on a raw 404 with no way back into
 * the app. The underlying payment is still reconciled independently via
 * Paystack's server-to-server webhook, so it's safe to just recover the UX
 * here rather than re-run verification.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/main/store", req.url));
}
