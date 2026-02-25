import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "ADMIN_MANAGER",
  "ADMIN_SUPPORT",
  "ADMIN_FINANCE",
];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // 1. Skip Static Files & API
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.includes(".") ||
    url.pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // 2. Get User Session (NextAuth v4)
  // Utilizes the NextAuth secret to retrieve the JWT token containing user data like role
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;
  const userRole = token?.role as string | undefined;

  // 3. Check Maintenance Mode (Fetch from NestJS Backend)
  let isMaintenanceActive = false;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/settings/maintenance-mode`,
      {
        next: { revalidate: 60 },
      },
    );

    if (res.ok) {
      const data = await res.json();
      isMaintenanceActive = data.isEnabled === true;
    }
  } catch (error) {
    console.error("Middleware fetch error:", error);
  }

  // Checks if the logged-in user possesses an authorized admin role
  const isAdmin = isLoggedIn && userRole && ADMIN_ROLES.includes(userRole);

  // 4. Redirect Logic

  // Maintenance Redirect
  if (isMaintenanceActive && !isAdmin && url.pathname !== "/maintenance") {
    return NextResponse.redirect(new URL("/maintenance", req.url));
  }

  // Main App Protection — all /main/* routes require authentication
  if (url.pathname.startsWith("/main")) {
    if (!isLoggedIn) {
      const redirectUrl = new URL("/sign-in", req.url);
      redirectUrl.searchParams.set("callbackUrl", url.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Admin Route Protection
  if (url.pathname.startsWith("/super-admin")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/sign-in", req.url));
    if (!isAdmin) return NextResponse.redirect(new URL("/main/store", req.url));
  }

  // Auth Page Redirect
  if (
    isLoggedIn &&
    (url.pathname === "/sign-in" || url.pathname === "/sign-up")
  ) {
    // Redirect admins to their dashboard, regular users to the store.
    // NOTE: "/super-admin" (no trailing path) has no page.tsx — always target
    // the canonical entry point "/super-admin/dashboard" to avoid a 404.
    const target = isAdmin ? "/super-admin/dashboard" : "/main/store";
    return NextResponse.redirect(new URL(target, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
