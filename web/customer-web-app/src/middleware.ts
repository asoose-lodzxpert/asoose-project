import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

// Authorized administrative roles for bypass
const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN_MANAGER",
  "ADMIN_SUPPORT",
  "ADMIN_FINANCE",
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/sign-in", "/sign-up", "/forgot-password", "/"];

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // 1. PERFORMANCE: Skip static assets and internal Next.js files immediately
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.includes(".") ||
    url.pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // 2. Allow public routes
  if (PUBLIC_ROUTES.some((route) => url.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 3. Check authentication
  const session = await auth();

  if (!session) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", url.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // 4. Check maintenance mode via backend API
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
  let isMaintenanceActive = false;

  try {
    const response = await fetch(
      `${API_URL}/system/settings/maintenance_mode`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      isMaintenanceActive = data.value === "true";
    }
  } catch (error) {
    console.error("Failed to fetch maintenance mode:", error);
  }

  // 5. Check if user is admin
  const isAdmin = session.user.role && ADMIN_ROLES.includes(session.user.role);
  const isMaintenancePage = url.pathname === "/maintenance";

  // --- TERMINAL LOGGING (View this in your VS Code terminal) ---
  console.log(
    `🛡️ Middleware Running: ${url.pathname} | Maint Active: ${isMaintenanceActive} | Is Admin: ${isAdmin}`,
  );

  // 6. MAINTENANCE REDIRECTION LOGIC
  if (isMaintenanceActive && !isAdmin && !isMaintenancePage) {
    console.log("🚀 REDIRECTING GUEST TO MAINTENANCE PAGE");
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }

  // 7. PROTECT ADMIN ROUTES
  if (url.pathname.startsWith("/super-admin")) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/store", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Matches all routes except APIs and static files
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
