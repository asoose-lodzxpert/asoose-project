import { HomeHeader } from '@/app/main/components/home/HomeHeader';
import  AppFooter  from './components/layout/AppFooter';
import BottomNav from '@/app/main/components/layout/BottomNav';

// Force all pages under /main to be dynamically rendered
// This prevents SSR issues with localStorage, useSearchParams, and other client-side APIs
export const dynamic = 'force-dynamic';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0a0a0a]">
      {/* 1. Global Header (Visible on Desktop & Mobile) */}
      <HomeHeader />

      {/* 2. Main Content Area */}
      <main className="flex-1">
        {children}
      </main>

      {/* 3. Global Footer (Hidden on Mobile, Visible on Desktop) */}
      <div className="hidden md:block">
        <AppFooter />
      </div>

      {/* 4. Bottom Navigation (Visible on Mobile, Hidden on Desktop) */}
      <BottomNav />
    </div>
  );
}