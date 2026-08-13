// as/customer-web-app/src/components/profile/ProfileTabs.tsx
import {
  ShoppingBag,
  Car,
  Package,
  MapPin,
  Settings,
  ShieldAlert,
  Wallet,
  BedDouble,
} from "lucide-react";

export const TABS = [
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "bookings", label: "Bookings", icon: BedDouble },
  { id: "rides", label: "Rides", icon: Car },
  { id: "deliveries", label: "Deliveries", icon: Package },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "disputes", label: "Disputes", icon: ShieldAlert },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export type ProfileTab = (typeof TABS)[number]["id"];

export const ProfileTabs = ({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (id: ProfileTab) => void;
}) => (
  <nav className="sticky top-[64px] z-20 border-y border-black/[0.05] bg-[#f7f7f5]/95 px-4 py-2 backdrop-blur-xl dark:border-white/5 dark:bg-[#0a0a0a]/95" aria-label="Profile sections">
    <div className="mx-auto flex max-w-5xl snap-x gap-2 overflow-x-auto py-1 scrollbar-hide">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id as ProfileTab)}
          aria-current={activeTab === tab.id ? "page" : undefined}
          className={`flex min-h-10 snap-start items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all sm:px-4 sm:text-sm ${
            activeTab === tab.id
              ? "bg-[#181816] text-white shadow-md shadow-black/10 dark:bg-yellow-400 dark:text-black"
              : "border border-black/[0.05] bg-white text-gray-500 hover:border-yellow-400/60 hover:text-gray-900 dark:border-white/[0.07] dark:bg-[#151515] dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          <tab.icon className="h-4 w-4 shrink-0" />
          {tab.label}
        </button>
      ))}
    </div>
  </nav>
);
