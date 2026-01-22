import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt'; 

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_SUPPORT', 'ADMIN_FINANCE'];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // 1. Skip Static Files & API
  if (
    url.pathname.startsWith('/_next') || 
    url.pathname.includes('.') || 
    url.pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // 2. Get User Session (NextAuth v4)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;
  const userRole = token?.role as string | undefined;

  // 3. Check Maintenance Mode (Fetch from NestJS Backend)
  let isMaintenanceActive = false;
  
  try {
    // Ensure you have this endpoint or similar in your NestJS backend
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/maintenance-mode`, {
      next: { revalidate: 60 }, // Cache for 60 seconds to reduce backend load
    });
    
    if (res.ok) {
      const data = await res.json();
      isMaintenanceActive = data.isEnabled === true; // Adjust based on your API response structure
    }
  } catch (error) {
    // If backend is down, default to false (or true if you prefer safety)
    console.error("Middleware fetch error:", error);
  }

  const isAdmin = isLoggedIn && userRole && ADMIN_ROLES.includes(userRole);

  // 4. Redirect Logic
  
  // Maintenance Redirect
  if (isMaintenanceActive && !isAdmin && url.pathname !== '/maintenance') {
    return NextResponse.redirect(new URL('/maintenance', req.url));
  }

  // Admin Route Protection
  if (url.pathname.startsWith('/super-admin')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/sign-in', req.url));
    if (!isAdmin) return NextResponse.redirect(new URL('/main/store', req.url));
  }

  // Auth Page Redirect
  if (isLoggedIn && (url.pathname === '/sign-in' || url.pathname === '/sign-up')) {
    return NextResponse.redirect(new URL('/main/store', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};