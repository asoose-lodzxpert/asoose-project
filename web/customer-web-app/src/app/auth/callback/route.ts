import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "ADMIN_MANAGER",
  "ADMIN_SUPPORT",
  "ADMIN_FINANCE",
]);

/**
 * OAuth role-aware redirect hub.
 *
 * All OAuth providers (Google, etc.) use /auth/callback as their callbackUrl.
 * After NextAuth sets the session, this handler reads the JWT role and routes:
 *   - Admin roles  → /super-admin/dashboard
 *   - Regular users → /main/store
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const role = token?.role as string | undefined;
  const isAdmin = role && ADMIN_ROLES.has(role);

  const destination = isAdmin ? "/super-admin/dashboard" : "/main/store";
  return NextResponse.redirect(`${origin}${destination}`);
}
