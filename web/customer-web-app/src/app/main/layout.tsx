import { HomeHeader } from '@/app/main/components/home/HomeHeader';
import AppFooter from './components/layout/AppFooter';
import BottomNav from '@/app/main/components/layout/BottomNav';

// Removed duplicate GoogleMapsProvider — it is already mounted at the app root
// in providers.tsx. Double-mounting caused the Google Maps JS API to be loaded
// twice, producing console errors and unnecessary re-initialization.

// Removed `export const dynamic = 'force-dynamic'` — it forced full SSR on
// every navigation to any /main/* route. The middleware already handles auth
// checks, and client components manage their own data fetching. Forcing dynamic
// SSR on every page transition compounded the re-render/re-fetch cycle.

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0a0a0a]">
      <HomeHeader />

      <main className="flex-1">
        {children}
      </main>

      <div className="hidden md:block">
        <AppFooter />
      </div>

      <BottomNav />
    </div>
  );
}