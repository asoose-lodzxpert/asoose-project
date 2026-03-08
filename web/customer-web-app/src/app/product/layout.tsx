import { HomeHeader } from "@/app/main/components/home/HomeHeader";
import AppFooter from "@/app/main/components/layout/AppFooter";
import BottomNav from "@/app/main/components/layout/BottomNav";
import { FloatingCart } from "@/app/main/components/home/FloatingCart";

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5] dark:bg-[#0a0a0a]">
      <HomeHeader />

      <main className="flex-1">{children}</main>

      <div className="hidden md:block">
        <AppFooter />
      </div>

      <FloatingCart />
      <BottomNav />
    </div>
  );
}
