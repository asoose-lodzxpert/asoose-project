import { HomeHeader } from '@/app/main/components/home/HomeHeader';
import AppFooter from './components/layout/AppFooter';
import BottomNav from '@/app/main/components/layout/BottomNav';
import { GoogleMapsProvider } from '@/providers/GoogleMapsProvider'; // Import the new provider

export const dynamic = 'force-dynamic';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 1. Wrap the entire main layout
    <GoogleMapsProvider>
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
    </GoogleMapsProvider>
  );
}