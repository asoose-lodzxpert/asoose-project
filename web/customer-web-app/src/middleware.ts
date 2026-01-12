import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Authorized administrative roles for bypass
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_SUPPORT', 'ADMIN_FINANCE'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const url = request.nextUrl.clone();
  
  // 1. PERFORMANCE: Skip static assets and internal Next.js files immediately
  if (
    url.pathname.startsWith('/_next') || 
    url.pathname.includes('.') || 
    url.pathname.startsWith('/api')
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // 2. DATA FETCHING: Parallel fetch for Maintenance and User Session
  // 
  const [maintRes, userRes] = await Promise.all([
    supabase.from('SystemSetting').select('value').eq('key', 'maintenance_mode').single(),
    supabase.auth.getUser()
  ]);

  const isMaintenanceActive = maintRes.data?.value === 'true';
  const user = userRes.data.user;

  // 3. ROLE CHECK: Check if the logged-in user is an admin
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('User')
      .select('role')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.role && ADMIN_ROLES.includes(profile.role);
  }

  const isMaintenancePage = url.pathname === '/maintenance';

  // --- TERMINAL LOGGING (View this in your VS Code terminal) ---
  console.log(`🛡️ Middleware Running: ${url.pathname} | Maint Active: ${isMaintenanceActive} | Is Admin: ${isAdmin}`);

  // 4. MAINTENANCE REDIRECTION LOGIC
  if (isMaintenanceActive && !isAdmin && !isMaintenancePage) {
    console.log('🚀 REDIRECTING GUEST TO MAINTENANCE PAGE');
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // 5. PROTECT ADMIN ROUTES
  if (url.pathname.startsWith('/super-admin')) {
    if (!user) return NextResponse.redirect(new URL('/sign-in', request.url));
    if (!isAdmin) return NextResponse.redirect(new URL('/store', request.url));
  }

  return response;
}

export const config = {
  // Matches all routes except APIs and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};